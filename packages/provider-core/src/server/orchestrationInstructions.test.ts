import { assert, describe, it } from "@effect/vitest";

import {
  MOONFOLD_ORCHESTRATION_INSTRUCTIONS,
  moonfoldAcpPromptWithInstructions,
  moonfoldOrchestrationPromptForFirstRun,
  moonfoldOrchestrationSystemPrompt,
} from "./orchestrationInstructions.ts";

describe("Moonfold orchestration provider instructions", () => {
  it("distinguishes delegated subagents from ordinary top-level threads", () => {
    assert.include(MOONFOLD_ORCHESTRATION_INSTRUCTIONS, "Use `delegate_task`");
    assert.include(
      MOONFOLD_ORCHESTRATION_INSTRUCTIONS,
      "ordinary top-level Moonfold conversations",
    );
    assert.include(MOONFOLD_ORCHESTRATION_INSTRUCTIONS, "Never use them merely");
    assert.include(MOONFOLD_ORCHESTRATION_INSTRUCTIONS, "cross-provider");
    assert.include(MOONFOLD_ORCHESTRATION_INSTRUCTIONS, "call `delegate_task` again");
    assert.include(
      MOONFOLD_ORCHESTRATION_INSTRUCTIONS,
      "Do not use `moonfold_thread_send` on `childThreadId`",
    );
  });

  it("documents structured schedules instead of JSON strings", () => {
    assert.include(MOONFOLD_ORCHESTRATION_INSTRUCTIONS, "structured object, never as JSON text");
    assert.include(MOONFOLD_ORCHESTRATION_INSTRUCTIONS, '"everyMs":3600000');
    assert.include(MOONFOLD_ORCHESTRATION_INSTRUCTIONS, "bindToCurrentThread=false");
  });

  it("injects prompt fallback only for an MCP-enabled first run", () => {
    const prompt = "Inspect the repository.";
    const injected = moonfoldOrchestrationPromptForFirstRun({
      prompt,
      runOrdinal: 1,
      hasMoonfoldMcp: true,
    });

    assert.include(injected, "<moonfold_orchestration_instructions>");
    assert.include(injected, `<user_request>\n${prompt}\n</user_request>`);
    assert.equal(
      moonfoldOrchestrationPromptForFirstRun({ prompt, runOrdinal: 2, hasMoonfoldMcp: true }),
      prompt,
    );
    assert.equal(
      moonfoldOrchestrationPromptForFirstRun({ prompt, runOrdinal: 1, hasMoonfoldMcp: false }),
      prompt,
    );
  });

  it("only exposes the system prompt when the Moonfold MCP server is attached", () => {
    assert.equal(moonfoldOrchestrationSystemPrompt(false), undefined);
    assert.equal(moonfoldOrchestrationSystemPrompt(true), MOONFOLD_ORCHESTRATION_INSTRUCTIONS);
  });

  it("gives ACP sessions provider-neutral mode, browser, and orchestration guidance", () => {
    const injected = moonfoldAcpPromptWithInstructions({
      prompt: "Inspect the repository.",
      state: { interactionMode: "default", hasMoonfoldMcp: true },
    });

    assert.include(injected, "Moonfold interaction mode: Default");
    assert.include(injected, "Moonfold collaborative browser");
    assert.include(injected, "Moonfold orchestration");
    assert.include(injected, "<user_request>\nInspect the repository.\n</user_request>");
  });

  it("reinjects ACP guidance only when mode or tool availability changes", () => {
    const prompt = "Continue.";
    const defaultState = { interactionMode: "default", hasMoonfoldMcp: true } as const;

    assert.equal(
      moonfoldAcpPromptWithInstructions({
        prompt,
        state: defaultState,
        previousState: defaultState,
      }),
      prompt,
    );
    assert.include(
      moonfoldAcpPromptWithInstructions({
        prompt,
        state: { ...defaultState, interactionMode: "plan" },
        previousState: defaultState,
      }),
      "Moonfold interaction mode: Plan",
    );
    const withoutMcp = moonfoldAcpPromptWithInstructions({
      prompt,
      state: { interactionMode: "default", hasMoonfoldMcp: false },
    });
    assert.include(withoutMcp, "Moonfold interaction mode: Default");
    assert.notInclude(withoutMcp, "Moonfold collaborative browser");
    assert.notInclude(withoutMcp, "Moonfold orchestration");
  });
});
