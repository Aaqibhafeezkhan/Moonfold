import { describe, expect, it } from "vite-plus/test";

import { normalizeSiteInput } from "./browserSitePermissions.logic";

describe("normalizeSiteInput", () => {
  it("takes the host from a typed name or a pasted URL", () => {
    expect(normalizeSiteInput("Example.com")).toBe("example.com");
    expect(normalizeSiteInput("https://www.example.com/path?q=1")).toBe("example.com");
    expect(normalizeSiteInput("docs.example.org:8443/x")).toBe("docs.example.org");
  });

  it("rejects text that names no web host", () => {
    expect(normalizeSiteInput("")).toBeNull();
    expect(normalizeSiteInput("localhost")).toBeNull();
    expect(normalizeSiteInput("not a site")).toBeNull();
  });
});
