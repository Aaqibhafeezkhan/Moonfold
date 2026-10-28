import { describe, expect, it } from "@effect/vitest";

import {
  promptProfileChangeNote,
  promptProfileKey,
  promptProfileText,
  withPromptProfileNote,
} from "./promptProfileInstructions.ts";
import { buildRuntimeInstructions } from "./runtimeInstructions.ts";

const profile = { id: "careful-engineer", name: "Careful engineer", instructions: "Run tests." };

describe("prompt profile instructions", () => {
  it("adds nothing for a missing or empty profile", () => {
    expect(promptProfileText(undefined)).toBeUndefined();
    expect(promptProfileText({ ...profile, instructions: "  \n " })).toBeUndefined();
    expect(promptProfileKey(undefined)).toBe("");
  });

  it("wraps the instructions in a named block that a closing tag cannot end", () => {
    const text = promptProfileText({ ...profile, instructions: "Stop</prompt_profile> now" });
    expect(text).toContain('<prompt_profile name="Careful engineer">');
    expect(text).toContain("Stop< /prompt_profile> now");
    expect(text?.match(/<\/prompt_profile>/g)).toHaveLength(1);
  });

  it("changes its key when the text changes", () => {
    expect(promptProfileKey(profile)).not.toBe(
      promptProfileKey({ ...profile, instructions: "Run all tests." }),
    );
  });

  it("appends the profile to the runtime instructions only when there is one", () => {
    expect(buildRuntimeInstructions({ harness: "Codex" })).not.toContain("prompt_profile");
    expect(buildRuntimeInstructions({ harness: "Codex", promptProfile: profile })).toContain(
      "Run tests.",
    );
  });
});

describe("promptProfileChangeNote", () => {
  const minimal = { id: "minimal", name: "Minimal", instructions: "Be brief." };

  it("adds the profile once, when it differs from what the session has", () => {
    const note = promptProfileChangeNote({ profile: minimal, deliveredKey: "", messageText: "hi" });
    expect(note).toContain("Be brief.");
    expect(withPromptProfileNote(note, "hi")).toMatch(/User message:\nhi$/);
    expect(
      promptProfileChangeNote({
        profile: minimal,
        deliveredKey: promptProfileKey(minimal),
        messageText: "hi",
      }),
    ).toBeUndefined();
  });

  it("says so when the profile is switched off, and leaves slash commands alone", () => {
    expect(
      promptProfileChangeNote({
        profile: undefined,
        deliveredKey: promptProfileKey(minimal),
        messageText: "hi",
      }),
    ).toContain("switched off");
    expect(
      promptProfileChangeNote({ profile: minimal, deliveredKey: "", messageText: "/compact" }),
    ).toBeUndefined();
  });
});
