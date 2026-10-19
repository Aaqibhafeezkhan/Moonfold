/**
 * Computer use: agents reading and operating desktop apps on the environment's machine. Off by
 * default; every app needs the user's approval; every action is logged. Windows only for now.
 */
import * as Schema from "effect/Schema";

import { ThreadId, TrimmedNonEmptyString } from "./baseSchemas.ts";

/** An app is its executable's file name, lower case, such as `notepad.exe`. */
export const ComputerUseAppName = TrimmedNonEmptyString.check(
  Schema.isPattern(/^[a-z0-9 ._()-]+\.exe$/),
  Schema.isMaxLength(260),
);
export type ComputerUseAppName = typeof ComputerUseAppName.Type;

export const ComputerUseAllowedApp = Schema.Struct({
  app: ComputerUseAppName,
  addedAt: Schema.String,
});
export type ComputerUseAllowedApp = typeof ComputerUseAllowedApp.Type;

export const ComputerUseActionKind = Schema.Literals([
  "list_apps",
  "screenshot",
  "read",
  "click",
  "type",
  "key",
  "scroll",
]);
export type ComputerUseActionKind = typeof ComputerUseActionKind.Type;

export const ComputerUseLogEntry = Schema.Struct({
  id: Schema.Number,
  threadId: ThreadId,
  /** Null for listing apps, which touches none. */
  app: Schema.NullOr(Schema.String),
  action: ComputerUseActionKind,
  /** What was done, without typed text: coordinates, keys, or how many characters. */
  detail: Schema.String,
  outcome: Schema.Literals(["done", "refused", "failed"]),
  error: Schema.NullOr(Schema.String),
  at: Schema.String,
});
export type ComputerUseLogEntry = typeof ComputerUseLogEntry.Type;

export const ComputerUseState = Schema.Struct({
  /** This environment's OS has a computer-use helper. */
  supported: Schema.Boolean,
  enabled: Schema.Boolean,
  allowedApps: Schema.Array(ComputerUseAllowedApp),
  /** Newest first. */
  log: Schema.Array(ComputerUseLogEntry),
});
export type ComputerUseState = typeof ComputerUseState.Type;

export const ComputerUseSetEnabledInput = Schema.Struct({ enabled: Schema.Boolean });
export type ComputerUseSetEnabledInput = typeof ComputerUseSetEnabledInput.Type;

export const ComputerUseAppInput = Schema.Struct({ app: ComputerUseAppName });
export type ComputerUseAppInput = typeof ComputerUseAppInput.Type;

/** An agent waiting for the user to let it use an app. */
export const ComputerUsePermissionRequest = Schema.Struct({
  id: TrimmedNonEmptyString,
  threadId: ThreadId,
  app: ComputerUseAppName,
  /** The window the agent wants, as its title showed when it asked. */
  windowTitle: Schema.String,
  createdAt: Schema.String,
});
export type ComputerUsePermissionRequest = typeof ComputerUsePermissionRequest.Type;

export const ComputerUsePendingRequests = Schema.Struct({
  requests: Schema.Array(ComputerUsePermissionRequest),
});
export type ComputerUsePendingRequests = typeof ComputerUsePendingRequests.Type;

export const ComputerUseAnswer = Schema.Literals(["allow_thread", "always_allow", "deny"]);
export type ComputerUseAnswer = typeof ComputerUseAnswer.Type;

export const ComputerUseAnswerInput = Schema.Struct({
  id: TrimmedNonEmptyString,
  answer: ComputerUseAnswer,
});
export type ComputerUseAnswerInput = typeof ComputerUseAnswerInput.Type;

/** Threads that used an app in the last half minute, for the "in use" indicator. */
export const ComputerUseActivity = Schema.Struct({
  active: Schema.Array(
    Schema.Struct({ threadId: ThreadId, app: ComputerUseAppName, at: Schema.String }),
  ),
});
export type ComputerUseActivity = typeof ComputerUseActivity.Type;

export class ComputerUseError extends Schema.TaggedError<ComputerUseError>()("ComputerUseError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Defect()),
}) {}
