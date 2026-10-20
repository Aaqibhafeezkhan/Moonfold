import { OrchestrationV2TurnItem } from "@moonfold/contracts";
import * as DateTime from "effect/DateTime";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "@effect/vitest";

import { buildHandoffBrief, type HandoffBriefInput } from "./handoffBrief.ts";

const decodeItems = Schema.decodeUnknownSync(Schema.Array(OrchestrationV2TurnItem));

let ordinal = 0;
/** One turn item as the projection stores it, with the fields every item carries. */
const item = (fields: Record<string, unknown>) => {
  ordinal += 1;
  const at = DateTime.makeUnsafe(Date.UTC(2026, 9, 20, 9, 0, ordinal));
  return {
    id: `item-${ordinal}`,
    threadId: "thread-1",
    runId: "run-1",
    nodeId: null,
    providerThreadId: "provider-thread-1",
    providerTurnId: null,
    nativeItemRef: null,
    parentItemId: null,
    ordinal: ordinal * 100,
    status: "completed",
    title: null,
    startedAt: at,
    completedAt: at,
    updatedAt: at,
    ...fields,
  };
};

// A thread as recorded from a Codex task that hit its usage limit mid-way.
const items = decodeItems([
  item({
    type: "user_message",
    messageId: "message-1",
    inputIntent: "turn_start",
    createdBy: "user",
    creationSource: "web",
    text: "Add a --json flag to the report command and cover it with tests.",
    attachments: [],
  }),
  item({
    type: "todo_list",
    planId: "plan-1",
    steps: [
      { id: "1", text: "Parse the --json flag", status: "completed" },
      { id: "2", text: "Print the report as JSON", status: "running" },
      { id: "3", text: "Add tests", status: "pending" },
    ],
  }),
  item({ type: "file_change", fileName: "src/cli.ts", additions: 12, deletions: 2 }),
  item({ type: "file_change", fileName: "src/cli.ts", additions: 3, deletions: 1 }),
  item({
    type: "checkpoint",
    checkpointId: "checkpoint-1",
    scopeId: "scope-1",
    files: [
      { path: "src/cli.ts", kind: "modified", additions: 15, deletions: 3 },
      { path: "src/report.ts", kind: "modified", additions: 4, deletions: 0 },
    ],
  }),
  item({
    type: "user_message",
    messageId: "message-2",
    inputIntent: "turn_start",
    createdBy: "user",
    creationSource: "web",
    text: "Keep the text output exactly as it is. Our deploy token is DEPLOY_TOKEN=9f8e7d6c5b4a.",
    attachments: [],
  }),
  item({
    type: "command_execution",
    input: "npm test",
    output:
      "FAIL test/report.test.ts\n  expected '{}' to equal '{\"rows\":[]}'\nTests: 1 failed, 11 passed",
    exitCode: 1,
  }),
  item({
    type: "error",
    status: "failed",
    failure: {
      class: "usage_limit",
      message: "You've hit your usage limit. Try again at 14:05.",
      code: "usage_limit_exceeded",
      retryable: true,
      resetAt: "2026-10-20T14:05:00.000Z",
    },
  }),
]);

const input: HandoffBriefInput = {
  items,
  goal: null,
  from: "Codex (gpt-5.6-luna)",
  to: "Claude Code (claude-sonnet-5-5)",
  reason: "usage_limit",
  pendingRequests: 1,
  gitStatus: " M src/cli.ts\n M src/report.ts\n",
  diffStat:
    " src/cli.ts    | 16 +++++++++++-----\n src/report.ts |  4 ++++\n 2 files changed, 15 insertions(+), 3 deletions(-)\n",
  instructions: { file: "AGENTS.md", text: "Run `npm test` before you finish." },
};

describe("buildHandoffBrief", () => {
  it("matches the golden brief for a task that hit its usage limit", async () => {
    const brief = buildHandoffBrief(input);
    await expect(brief.text).toMatchFileSnapshot("./__golden__/usage-limit-brief.txt");
    expect(brief.redactions).toEqual([{ kind: "secret_assignment", count: 1 }]);
  });

  it("gives the same brief for the same thread", () => {
    expect(buildHandoffBrief(input)).toEqual(buildHandoffBrief(input));
  });

  it("prefers an unfinished goal as the objective", () => {
    const brief = buildHandoffBrief({
      ...input,
      goal: { objective: "Ship the JSON report", status: "active" },
    });
    expect(brief.text).toContain("The goal set for this thread:\n```\nShip the JSON report\n```");
  });

  it("drops a failure the previous agent fixed by rerunning the command", () => {
    const fixed = decodeItems([
      ...items.filter((entry) => entry.type !== "error"),
      item({
        type: "command_execution",
        input: "npm test",
        output: "Tests: 12 passed",
        exitCode: 0,
      }),
    ]);
    const brief = buildHandoffBrief({ ...input, items: fixed, pendingRequests: 0 });
    expect(brief.text).not.toContain("## Open problems");
  });

  it("says so when the workspace is not a git repository", () => {
    const brief = buildHandoffBrief({ ...input, gitStatus: null, diffStat: null });
    expect(brief.text).toContain("The workspace is not a git repository");
  });
});
