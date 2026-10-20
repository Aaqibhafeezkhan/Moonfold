import { describe, expect, it } from "@effect/vitest";
import * as DateTime from "effect/DateTime";
import {
  DEFAULT_SERVER_SETTINGS,
  type OrchestrationV2Run,
  type OrchestrationV2TurnItem,
  ProjectId,
  ProviderInstanceId,
  RunId,
  ThreadId,
} from "@moonfold/contracts";

import { autoHandoffCommand, limitedInstances } from "./HandoffWorker.ts";

const codex = { instanceId: ProviderInstanceId.make("codex"), model: "gpt-5.6-luna" };
const claude = { instanceId: ProviderInstanceId.make("claudeAgent"), model: "claude-sonnet-5-5" };
const projectId = ProjectId.make("project-1");
const nowMs = Date.parse("2026-10-20T10:00:00.000Z");

const run = (
  id: string,
  ordinal: number,
  selection: typeof codex,
  status: OrchestrationV2Run["status"],
) =>
  ({
    id: RunId.make(id),
    ordinal,
    modelSelection: selection,
    providerInstanceId: selection.instanceId,
    rootNodeId: null,
    status,
  }) as unknown as OrchestrationV2Run;

const limitError = (runId: string, resetAt: string | null) =>
  ({
    type: "error",
    id: `error-${runId}`,
    status: "failed",
    nodeId: null,
    ordinal: 1,
    updatedAt: DateTime.makeUnsafe(0),
    runId: RunId.make(runId),
    failure: {
      class: "usage_limit",
      message: "Usage limit reached",
      code: null,
      retryable: true,
      resetAt,
    },
  }) as unknown as OrchestrationV2TurnItem;

const projection = (
  runs: ReadonlyArray<OrchestrationV2Run>,
  turnItems: ReadonlyArray<OrchestrationV2TurnItem>,
) => ({
  thread: { id: ThreadId.make("thread-1"), projectId } as never,
  runs,
  turnItems,
});

const settings = (mode: "ask" | "auto") => ({
  ...DEFAULT_SERVER_SETTINGS,
  providerHandoff: {
    ...DEFAULT_SERVER_SETTINGS.providerHandoff,
    mode,
    fallbackOrder: [codex, claude],
  },
});

describe("autoHandoffCommand", () => {
  const limited = projection([run("run-1", 1, codex, "failed")], [limitError("run-1", null)]);

  it("moves a thread stopped at its limit to the first fallback, once per stopped run", () => {
    const command = autoHandoffCommand({ projection: limited, settings: settings("auto"), nowMs });
    expect(command).toMatchObject({
      type: "message.dispatch",
      commandId: "handoff-auto:run-1",
      modelSelection: claude,
      handoffReason: "automatic",
    });
  });

  it("leaves the thread alone in ask mode or after another kind of failure", () => {
    expect(
      autoHandoffCommand({ projection: limited, settings: settings("ask"), nowMs }),
    ).toBeNull();
    const failedOtherwise = projection([run("run-1", 1, codex, "failed")], []);
    expect(
      autoHandoffCommand({ projection: failedOtherwise, settings: settings("auto"), nowMs }),
    ).toBeNull();
  });

  it("never sends the thread back to a provider still at its limit", () => {
    const both = projection(
      [run("run-1", 1, codex, "failed"), run("run-2", 2, claude, "failed")],
      [limitError("run-1", "2026-10-20T12:00:00.000Z"), limitError("run-2", null)],
    );
    expect(autoHandoffCommand({ projection: both, settings: settings("auto"), nowMs })).toBeNull();
    expect([...limitedInstances(both, nowMs)].toSorted()).toEqual(["claudeAgent", "codex"]);
    // Once Codex's window resets, Claude's limited thread can go back to it.
    const later = Date.parse("2026-10-20T12:30:00.000Z");
    expect([...limitedInstances(both, later)]).toEqual(["claudeAgent"]);
    expect(
      autoHandoffCommand({ projection: both, settings: settings("auto"), nowMs: later })
        ?.modelSelection,
    ).toEqual(codex);
  });

  it("skips providers the project does not allow", () => {
    const allowOnlyCodex = {
      ...settings("auto"),
      providerHandoff: {
        ...settings("auto").providerHandoff,
        allowedProviders: [codex.instanceId],
      },
    };
    expect(autoHandoffCommand({ projection: limited, settings: allowOnlyCodex, nowMs })).toBeNull();
  });
});
