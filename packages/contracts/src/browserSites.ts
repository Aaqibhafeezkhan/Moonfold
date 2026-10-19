/**
 * What agents may do on each website through Moonfold's browser tools: open or navigate to it,
 * and upload files to it. Each is allowed, asked about, or blocked, per site with defaults.
 * Local dev servers are always allowed.
 */
import * as Schema from "effect/Schema";

import { ThreadId, TrimmedNonEmptyString } from "./baseSchemas.ts";

export const BrowserSiteCapability = Schema.Literals(["browse", "upload"]);
export type BrowserSiteCapability = typeof BrowserSiteCapability.Type;

export const BrowserSiteDecision = Schema.Literals(["allow", "ask", "block"]);
export type BrowserSiteDecision = typeof BrowserSiteDecision.Type;

/** A host name such as `example.com`; it also covers that host's subdomains. */
export const BrowserSiteHost = TrimmedNonEmptyString.check(
  Schema.isPattern(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/),
  Schema.isMaxLength(253),
).annotate({ description: "Lowercase host name, without scheme, port or path." });
export type BrowserSiteHost = typeof BrowserSiteHost.Type;

export const BrowserSiteDecisions = Schema.Struct({
  browse: BrowserSiteDecision,
  upload: BrowserSiteDecision,
});
export type BrowserSiteDecisions = typeof BrowserSiteDecisions.Type;

export const BrowserSiteRule = Schema.Struct({
  site: BrowserSiteHost,
  browse: BrowserSiteDecision,
  upload: BrowserSiteDecision,
  updatedAt: Schema.String,
});
export type BrowserSiteRule = typeof BrowserSiteRule.Type;

export const BrowserSitePolicy = Schema.Struct({
  /** What applies to a site without a rule of its own. */
  defaults: BrowserSiteDecisions,
  rules: Schema.Array(BrowserSiteRule),
});
export type BrowserSitePolicy = typeof BrowserSitePolicy.Type;

export const BrowserSiteRuleInput = Schema.Struct({
  site: BrowserSiteHost,
  browse: BrowserSiteDecision,
  upload: BrowserSiteDecision,
});
export type BrowserSiteRuleInput = typeof BrowserSiteRuleInput.Type;

export const BrowserSiteRemoveInput = Schema.Struct({ site: BrowserSiteHost });
export type BrowserSiteRemoveInput = typeof BrowserSiteRemoveInput.Type;

/** An agent waiting for the user to decide whether it may use a site. */
export const BrowserSitePermissionRequest = Schema.Struct({
  id: TrimmedNonEmptyString,
  threadId: ThreadId,
  site: BrowserSiteHost,
  capability: BrowserSiteCapability,
  /** The page the agent wants to open, or the page it wants to upload files to. */
  url: Schema.String,
  createdAt: Schema.String,
});
export type BrowserSitePermissionRequest = typeof BrowserSitePermissionRequest.Type;

export const BrowserSitePendingRequests = Schema.Struct({
  requests: Schema.Array(BrowserSitePermissionRequest),
});
export type BrowserSitePendingRequests = typeof BrowserSitePendingRequests.Type;

export const BrowserSiteAnswer = Schema.Literals([
  /** This one action. */
  "allow_once",
  /** Everything of this kind on this site, in this thread, until the server restarts. */
  "allow_thread",
  "always_allow",
  "deny",
  "always_block",
]);
export type BrowserSiteAnswer = typeof BrowserSiteAnswer.Type;

export const BrowserSiteAnswerInput = Schema.Struct({
  id: TrimmedNonEmptyString,
  answer: BrowserSiteAnswer,
});
export type BrowserSiteAnswerInput = typeof BrowserSiteAnswerInput.Type;

export class BrowserSiteError extends Schema.TaggedError<BrowserSiteError>()("BrowserSiteError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Defect()),
}) {}
