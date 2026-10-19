import { describe, expect, it } from "vite-plus/test";

import { mcpServerSummary, pluginSourceLabel } from "./pluginsSettings.logic";

describe("pluginSourceLabel", () => {
  it("shows a repository with its ref, or a folder path", () => {
    expect(pluginSourceLabel({ type: "git", url: "https://example.com/p.git", ref: "v1" })).toBe(
      "https://example.com/p.git @ v1",
    );
    expect(pluginSourceLabel({ type: "git", url: "https://example.com/p.git" })).toBe(
      "https://example.com/p.git",
    );
    expect(pluginSourceLabel({ type: "folder", path: "/home/me/plugin" })).toBe("/home/me/plugin");
  });
});

describe("mcpServerSummary", () => {
  const base = { name: "lint", cwd: null, envVars: [] };

  it("quotes arguments that a shell would split", () => {
    expect(
      mcpServerSummary({
        ...base,
        command: "node",
        args: ["/opt/plugin/server.js", "--title", "two words"],
        url: null,
      }),
    ).toBe('node /opt/plugin/server.js --title "two words"');
  });

  it("shows a remote server's URL", () => {
    expect(
      mcpServerSummary({ ...base, command: null, args: [], url: "https://mcp.example.com" }),
    ).toBe("https://mcp.example.com");
  });
});
