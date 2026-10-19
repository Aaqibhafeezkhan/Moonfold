import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import { assert, describe, it } from "@effect/vitest";
import { ThreadId } from "@moonfold/contracts";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Stream from "effect/Stream";
import * as TestClock from "effect/testing/TestClock";

import * as SqlitePersistence from "../persistence/Sqlite.ts";
import * as BrowserSitePermissions from "./BrowserSitePermissions.ts";

const layer = BrowserSitePermissions.layer.pipe(
  Layer.provideMerge(Layer.mergeAll(SqlitePersistence.layerMemory, NodeCrypto.layer)),
);
const thread = ThreadId.make("thread-1");
const otherThread = ThreadId.make("thread-2");

/** The first request that waits for an answer. */
const nextRequest = (sites: BrowserSitePermissions.BrowserSitePermissions["Service"]) =>
  sites.pending.pipe(
    Stream.filter((pending) => pending.requests.length > 0),
    Stream.runHead,
    Effect.map((pending) => Option.getOrThrow(pending).requests[0]!),
  );

describe("siteOfUrl", () => {
  it("reads an address the way the browser will, with or without a scheme", () => {
    const site = (url: string) => BrowserSitePermissions.siteOfUrl(url);
    assert.deepStrictEqual(site("https://Docs.Example.com/a?b"), {
      kind: "site",
      site: "docs.example.com",
    });
    assert.deepStrictEqual(site("blocked.com"), { kind: "site", site: "blocked.com" });
    assert.deepStrictEqual(site("blocked.com:443/x"), { kind: "site", site: "blocked.com" });
    assert.deepStrictEqual(site("http://[2606:4700::1]/"), {
      kind: "site",
      site: "[2606:4700::1]",
    });
    assert.deepStrictEqual(site("http://localhost:5173/"), { kind: "exempt" });
    assert.deepStrictEqual(site("http://app.localhost/"), { kind: "exempt" });
    assert.deepStrictEqual(site("http://127.0.0.1:8080"), { kind: "exempt" });
    assert.deepStrictEqual(site("about:blank"), { kind: "exempt" });
    assert.deepStrictEqual(site("not a url"), { kind: "invalid" });
  });

  it("matches a rule for a parent domain, preferring the closest", () => {
    const rules = [{ site: "example.com" }, { site: "docs.example.com" }];
    assert.strictEqual(
      BrowserSitePermissions.ruleFor(rules, "api.docs.example.com")?.site,
      "docs.example.com",
    );
    assert.strictEqual(BrowserSitePermissions.ruleFor(rules, "example.com")?.site, "example.com");
    assert.strictEqual(BrowserSitePermissions.ruleFor(rules, "notexample.com"), undefined);
  });
});

it.effect("allows browsing by default and blocks a site with a block rule", () =>
  Effect.gen(function* () {
    const sites = yield* BrowserSitePermissions.BrowserSitePermissions;
    yield* sites.check({ threadId: thread, url: "https://example.com/", capability: "browse" });
    yield* sites.setRule({ site: "example.com", browse: "block", upload: "block" });
    const denied = yield* sites
      .check({ threadId: thread, url: "https://shop.example.com/", capability: "browse" })
      .pipe(Effect.flip);
    assert.include(denied.message, "blocks agents from opening shop.example.com");
    // Local dev servers are never blocked.
    yield* sites.check({ threadId: thread, url: "http://localhost:3000/", capability: "browse" });

    // An address without a scheme is the same site.
    for (const url of ["shop.example.com", "shop.example.com:443/cart"]) {
      const bare = yield* sites
        .check({ threadId: thread, url, capability: "browse" })
        .pipe(Effect.flip);
      assert.include(bare.message, "blocks agents from opening shop.example.com");
    }
    yield* sites.removeRule("example.com");
    yield* sites.check({
      threadId: thread,
      url: "https://shop.example.com/",
      capability: "browse",
    });
  }).pipe(Effect.provide(layer)),
);

it.effect("asks before an upload and remembers 'this chat' for the thread only", () =>
  Effect.gen(function* () {
    const sites = yield* BrowserSitePermissions.BrowserSitePermissions;
    const waiting = yield* sites
      .check({ threadId: thread, url: "https://forms.example.org/new", capability: "upload" })
      .pipe(Effect.forkChild);
    const request = yield* nextRequest(sites);
    assert.deepInclude(request, {
      threadId: thread,
      site: "forms.example.org",
      capability: "upload",
      url: "https://forms.example.org/new",
    });
    yield* sites.answer({ id: request.id, answer: "allow_thread" });
    yield* Fiber.join(waiting);

    // The same thread does not ask again; another thread does.
    yield* sites.check({
      threadId: thread,
      url: "https://forms.example.org/x",
      capability: "upload",
    });
    const other = yield* sites
      .check({ threadId: otherThread, url: "https://forms.example.org/x", capability: "upload" })
      .pipe(Effect.forkChild);
    const second = yield* nextRequest(sites);
    yield* sites.answer({ id: second.id, answer: "deny" });
    const denied = yield* Fiber.join(other).pipe(Effect.flip);
    assert.include(denied.message, "declined");
  }).pipe(Effect.provide(layer)),
);

it.effect("'always' answers become rules that keep the other capability", () =>
  Effect.gen(function* () {
    const sites = yield* BrowserSitePermissions.BrowserSitePermissions;
    yield* sites.setDefaults({ browse: "ask", upload: "ask" });
    const waiting = yield* sites
      .check({ threadId: thread, url: "https://news.example.net/", capability: "browse" })
      .pipe(Effect.forkChild);
    const request = yield* nextRequest(sites);
    yield* sites.answer({ id: request.id, answer: "always_allow" });
    yield* Fiber.join(waiting);
    const policy = yield* sites.policy;
    assert.deepStrictEqual(
      policy.rules.map(({ site, browse, upload }) => ({ site, browse, upload })),
      [{ site: "news.example.net", browse: "allow", upload: "ask" }],
    );
    assert.deepStrictEqual(policy.defaults, { browse: "ask", upload: "ask" });
  }).pipe(Effect.provide(layer)),
);

it.effect("gives up when nobody answers, and the request stops waiting", () =>
  Effect.gen(function* () {
    const sites = yield* BrowserSitePermissions.BrowserSitePermissions;
    const waiting = yield* sites
      .check({ threadId: thread, url: "https://slow.example.com/", capability: "upload" })
      .pipe(Effect.forkChild);
    const request = yield* nextRequest(sites);
    yield* TestClock.adjust("6 minutes");
    const denied = yield* Fiber.join(waiting).pipe(Effect.flip);
    assert.include(denied.message, "did not answer");
    const late = yield* sites.answer({ id: request.id, answer: "allow_once" }).pipe(Effect.flip);
    assert.include(late.message, "no longer waiting");
  }).pipe(Effect.provide(layer)),
);

it.effect("hosts no rule can name follow the defaults instead of slipping through", () =>
  Effect.gen(function* () {
    const sites = yield* BrowserSitePermissions.BrowserSitePermissions;
    yield* sites.setDefaults({ browse: "block", upload: "block" });
    for (const url of ["http://[2606:4700::1]/", "https://a_b.example.com/"]) {
      const denied = yield* sites
        .check({ threadId: thread, url, capability: "browse" })
        .pipe(Effect.flip);
      assert.include(denied.message, "blocks agents from opening");
    }
    const invalid = yield* sites
      .check({ threadId: thread, url: "not a url", capability: "browse" })
      .pipe(Effect.flip);
    assert.include(invalid.message, "cannot tell which site");
  }).pipe(Effect.provide(layer)),
);
