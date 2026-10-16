import * as Schema from "effect/Schema";

import { ThreadId, TrimmedNonEmptyString } from "./baseSchemas.ts";

/**
 * A quick question about a thread, answered beside it. The answer comes from the thread's
 * own model reading the recent conversation, never joins the thread, and does not interrupt
 * a running turn.
 */
export const ThreadSideQuestionInput = Schema.Struct({
  threadId: ThreadId,
  question: TrimmedNonEmptyString.check(Schema.isMaxLength(4_000)),
});
export type ThreadSideQuestionInput = typeof ThreadSideQuestionInput.Type;

export const ThreadSideQuestionResult = Schema.Struct({
  answer: Schema.String,
});
export type ThreadSideQuestionResult = typeof ThreadSideQuestionResult.Type;

export class ThreadSideQuestionError extends Schema.TaggedError<ThreadSideQuestionError>()(
  "ThreadSideQuestionError",
  {
    detail: Schema.String,
    cause: Schema.optional(Schema.Defect()),
  },
) {
  override get message(): string {
    return this.detail;
  }
}
