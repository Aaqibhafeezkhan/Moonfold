import { ChatFileAttachment, type OrchestrationV2ProjectedTurnItem } from "@moonfold/contracts";
import * as Schema from "effect/Schema";

export type ThreadArtifact =
  | {
      readonly kind: "file";
      /** The path as the agent reported it: relative to the workspace, or absolute. */
      readonly path: string;
      /** The file was deleted by its last change. */
      readonly deleted: boolean;
    }
  | {
      readonly kind: "attachment";
      readonly attachment: ChatFileAttachment;
      /** Who added it to the conversation. */
      readonly from: "user" | "agent";
    };

const isFileAttachment = Schema.is(ChatFileAttachment);

const isDeleteOperation = (operation: string) =>
  /^(delete|remove|deleted|removed)$/i.test(operation);

/**
 * What a thread produced or was given, newest first: each file its agent changed (once, as its
 * latest change left it) and each file attached to its messages. Images stay in the timeline.
 */
export function threadArtifacts(
  items: ReadonlyArray<OrchestrationV2ProjectedTurnItem>,
): ReadonlyArray<ThreadArtifact> {
  const files = new Map<string, ThreadArtifact & { readonly kind: "file" }>();
  const attachments = new Map<string, ThreadArtifact & { readonly kind: "attachment" }>();
  for (const { item } of items) {
    if (item.type === "file_change") {
      if (item.status !== "completed") continue;
      const changes = item.changes ?? [{ operation: "update", path: item.fileName }];
      for (const change of changes) {
        // Re-inserting moves the file to the end, so the map keeps change order.
        files.delete(change.path);
        files.set(change.path, {
          kind: "file",
          path: change.path,
          deleted: isDeleteOperation(change.operation),
        });
        if (change.oldPath !== undefined) files.delete(change.oldPath);
      }
    } else if (item.type === "user_message" || item.type === "assistant_message") {
      for (const attachment of item.attachments ?? []) {
        // Folded clipboard text is part of the prompt, not a file.
        if (!isFileAttachment(attachment) || attachment.source !== undefined) continue;
        attachments.set(attachment.id, {
          kind: "attachment",
          attachment,
          from: item.type === "user_message" ? "user" : "agent",
        });
      }
    }
  }
  return [...files.values(), ...attachments.values()].toReversed();
}

/** The file name a list shows; the full path goes in its tooltip. */
export function artifactLabel(artifact: ThreadArtifact): string {
  if (artifact.kind === "attachment") return artifact.attachment.name;
  const parts = artifact.path.split(/[\\/]/);
  return parts.at(-1) || artifact.path;
}
