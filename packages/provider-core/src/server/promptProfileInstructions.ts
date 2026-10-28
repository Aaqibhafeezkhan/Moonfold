/**
 * The thread's prompt profile as adapters hand it to a provider (D-54). The text is the user's own
 * standing instruction, so it is followed like one; a closing tag inside it cannot end the block.
 *
 * @module provider-core/server/promptProfileInstructions
 */

export interface TurnPromptProfile {
  readonly id: string;
  readonly name: string;
  readonly instructions: string;
}

/** The profile block, or undefined when the profile adds nothing (Moonfold default, or empty). */
export function promptProfileText(profile: TurnPromptProfile | undefined): string | undefined {
  const instructions = profile?.instructions.trim() ?? "";
  if (profile === undefined || instructions === "") return undefined;
  const name = profile.name.replaceAll(/\s+/g, " ").replaceAll('"', "'").trim();
  return [
    `<prompt_profile name="${name}">`,
    "The user chose this prompt profile for the thread. Follow these standing instructions unless the user says otherwise in this conversation.",
    instructions.replaceAll("</", "< /"),
    "</prompt_profile>",
  ].join("\n");
}

/** A stable key for "which profile text was last delivered", so adapters resend only on change. */
export function promptProfileKey(profile: TurnPromptProfile | undefined): string {
  const text = promptProfileText(profile);
  return text === undefined ? "" : `${profile?.id}:${text.length}:${text}`;
}
