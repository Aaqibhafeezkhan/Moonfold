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

/**
 * For harnesses whose system prompt cannot change after a session starts (Claude records it,
 * Pi has no RPC for it): the note to put before the user's next message when the thread's
 * profile differs from the one the session last received, or undefined when nothing changed.
 * Slash commands get no note, since a prefix would stop the harness expanding them.
 */
export function promptProfileChangeNote(input: {
  readonly profile: TurnPromptProfile | undefined;
  /** Key of the profile the session last received ("" for none). */
  readonly deliveredKey: string;
  readonly messageText: string;
}): string | undefined {
  if (promptProfileKey(input.profile) === input.deliveredKey) return undefined;
  if (input.messageText.trimStart().startsWith("/")) return undefined;
  return (
    promptProfileText(input.profile) ??
    "<prompt_profile>The user switched off the prompt profile for this thread. Earlier prompt_profile instructions no longer apply.</prompt_profile>"
  );
}

/** The user's message with a profile note in front of it. */
export function withPromptProfileNote(note: string | undefined, messageText: string): string {
  return note === undefined ? messageText : `${note}\n\nUser message:\n${messageText}`;
}
