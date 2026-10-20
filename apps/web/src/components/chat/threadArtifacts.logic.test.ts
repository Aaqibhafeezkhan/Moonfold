import type { OrchestrationV2ProjectedTurnItem } from "@moonfold/contracts";
import { describe, expect, it } from "vite-plus/test";

import { artifactLabel, threadArtifacts } from "./threadArtifacts.logic";

// Only the fields threadArtifacts reads; the rest of a turn item does not matter here.
const projected = (item: Record<string, unknown>) =>
  ({ item }) as unknown as OrchestrationV2ProjectedTurnItem;

const fileAttachment = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  type: "file",
  id,
  name,
  mimeType: "application/pdf",
  sizeBytes: 10,
  ...extra,
});

describe("threadArtifacts", () => {
  it("lists each changed file once, newest first, and follows renames and deletions", () => {
    const artifacts = threadArtifacts([
      projected({ type: "file_change", status: "completed", fileName: "src/a.ts" }),
      projected({
        type: "file_change",
        status: "completed",
        fileName: "two files",
        changes: [
          { operation: "update", path: "src/b.ts" },
          { operation: "rename", path: "src/c.ts", oldPath: "src/a.ts" },
        ],
      }),
      projected({ type: "file_change", status: "failed", fileName: "src/never.ts" }),
      projected({
        type: "file_change",
        status: "completed",
        fileName: "src/b.ts",
        changes: [{ operation: "delete", path: "src/b.ts" }],
      }),
    ]);
    expect(artifacts).toEqual([
      { kind: "file", path: "src/b.ts", deleted: true },
      { kind: "file", path: "src/c.ts", deleted: false },
    ]);
  });

  it("adds file attachments from both sides but not images or folded clipboard text", () => {
    const artifacts = threadArtifacts([
      projected({
        type: "user_message",
        attachments: [
          fileAttachment("att-1", "brief.pdf"),
          fileAttachment("att-2", "pasted.txt", { source: { _tag: "pasted-text" } }),
          { type: "image", id: "img-1", name: "shot.png", mimeType: "image/png", sizeBytes: 5 },
        ],
      }),
      projected({
        type: "assistant_message",
        attachments: [fileAttachment("att-3", "chart.html")],
      }),
    ]);
    expect(artifacts.map(artifactLabel)).toEqual(["chart.html", "brief.pdf"]);
    expect(artifacts.map((artifact) => artifact.kind === "attachment" && artifact.from)).toEqual([
      "agent",
      "user",
    ]);
  });

  it("labels a file by its name", () => {
    expect(artifactLabel({ kind: "file", path: "C:\\work\\docs\\notes.md", deleted: false })).toBe(
      "notes.md",
    );
  });
});
