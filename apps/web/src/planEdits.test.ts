import { EnvironmentId, ThreadId } from "@moonfold/contracts";
import { scopeThreadRef } from "@moonfold/client-runtime/environment";
import * as Schema from "effect/Schema";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { removeLocalStorageItem, setLocalStorageItem } from "./hooks/useLocalStorage";
import { planEditStorageKey, readPlanMarkdownForImplementation } from "./planEdits";

const threadRef = scopeThreadRef(EnvironmentId.make("env-1"), ThreadId.make("thread-1"));
const plan = { id: "plan-1", planMarkdown: "# Plan\n- step one\n" };

describe("readPlanMarkdownForImplementation", () => {
  afterEach(() => removeLocalStorageItem(planEditStorageKey(threadRef, plan.id)));

  it("implements the agent's plan until the user edits it", () => {
    expect(readPlanMarkdownForImplementation(threadRef, plan)).toBe(plan.planMarkdown);
  });

  it("implements the user's edit of that plan, and only that plan", () => {
    setLocalStorageItem(
      planEditStorageKey(threadRef, plan.id),
      "# Plan\n- step one\n- step two\n",
      Schema.NullOr(Schema.String),
    );
    expect(readPlanMarkdownForImplementation(threadRef, plan)).toBe(
      "# Plan\n- step one\n- step two\n",
    );
    expect(readPlanMarkdownForImplementation(threadRef, { ...plan, id: "plan-2" })).toBe(
      plan.planMarkdown,
    );
  });
});
