import { describe, expect, it } from "vite-plus/test";

import {
  MOONFOLD_MCP_TOOL_NAMES,
  resolveMoonfoldMcpToolPresentation,
} from "./moonfoldMcpToolPresentation.ts";

describe("resolveMoonfoldMcpToolPresentation", () => {
  it("recognizes every Moonfold tool across provider prefixes and completion suffixes", () => {
    for (const tool of MOONFOLD_MCP_TOOL_NAMES) {
      const presentation = resolveMoonfoldMcpToolPresentation(tool);
      for (const prefix of [
        "mcp__moonfold__",
        "Moonfold.",
        "moonfold/",
        "moonfold:",
        "mcp_moonfold_",
        "Moonfold ",
        "moonfold · ",
      ]) {
        expect(resolveMoonfoldMcpToolPresentation(`${prefix}${tool} completed`), tool).toEqual(
          presentation,
        );
      }
      expect(resolveMoonfoldMcpToolPresentation(`mcp__another-server__${tool}`), tool).toBeNull();
    }
  });
  it("pretty prints Claude and Cursor Moonfold MCP tool names", () => {
    expect(resolveMoonfoldMcpToolPresentation("mcp__moonfold__moonfold_thread_read")).toEqual({
      displayName: "Read a Moonfold thread",
      logo: "moonfold",
    });
  });

  it("pretty prints Codex Moonfold MCP tool names", () => {
    expect(resolveMoonfoldMcpToolPresentation("moonfold.create_threads")).toEqual({
      displayName: "Create Moonfold threads",
      logo: "moonfold",
    });
  });

  it("pretty prints thread metadata updates", () => {
    expect(resolveMoonfoldMcpToolPresentation("mcp__moonfold__moonfold_thread_update")).toEqual({
      displayName: "Update Moonfold thread metadata",
      logo: "moonfold",
    });
  });

  it("pretty prints bare Moonfold MCP toolkit names", () => {
    expect(resolveMoonfoldMcpToolPresentation("list_scheduled_tasks")).toEqual({
      displayName: "List scheduled tasks",
      logo: "moonfold",
    });
  });

  it("pretty prints worktree Moonfold MCP tool names", () => {
    expect(resolveMoonfoldMcpToolPresentation("mcp__moonfold__moonfold_worktree_handoff")).toEqual({
      displayName: "Hand off thread to a git worktree",
      logo: "moonfold",
    });
    expect(resolveMoonfoldMcpToolPresentation("moonfold.moonfold_worktree_status")).toEqual({
      displayName: "Get thread worktree status",
      logo: "moonfold",
    });
  });

  it("pretty prints preview Moonfold MCP tool names", () => {
    expect(resolveMoonfoldMcpToolPresentation("moonfold.preview_open")).toEqual({
      displayName: "Open a page in the preview browser",
      logo: "moonfold",
    });
    expect(resolveMoonfoldMcpToolPresentation("mcp__moonfold__preview_status")).toEqual({
      displayName: "Get preview browser status",
      logo: "moonfold",
    });
  });

  it("matches the separator variants ACP registry agents emit", () => {
    for (const name of [
      "mcp_moonfold_delegate_task",
      "moonfold:delegate_task",
      "moonfold/delegate_task",
      "moonfold delegate_task",
      "Moonfold delegate_task",
      "moonfold__delegate_task",
    ]) {
      expect(resolveMoonfoldMcpToolPresentation(name)?.displayName).toBe("Delegate a child task");
    }
  });

  it("matches OpenCode 2's per-thread server names, whose thread ids hold underscores", () => {
    expect(
      resolveMoonfoldMcpToolPresentation("moonfold-thread_opencode2-adapter_delegate_task")
        ?.displayName,
    ).toBe("Delegate a child task");
    expect(
      resolveMoonfoldMcpToolPresentation("moonfold-thread_opencode2-adapter_not_a_tool"),
    ).toBeNull();
  });

  it("keeps unknown MCP tools on the generic renderer path", () => {
    expect(resolveMoonfoldMcpToolPresentation("mcp__github__search_issues")).toBeNull();
    expect(resolveMoonfoldMcpToolPresentation("moonfold.not_a_real_tool")).toBeNull();
  });
});
