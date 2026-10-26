import { assert, describe, it } from "@effect/vitest";

import { openCodeFailureClass } from "./usageLimit.ts";

describe("openCodeFailureClass", () => {
  it("classifies OpenCode's plain-text rate-limit message", () => {
    assert.strictEqual(
      openCodeFailureClass(new Error("Rate limit exceeded. Please try again later.")),
      "usage_limit",
    );
  });

  it("classifies a wrapped provider 429 and FreeUsageLimitError body", () => {
    assert.strictEqual(
      openCodeFailureClass({
        status: 429,
        message:
          'Error: 429: {"type":"FreeUsageLimitError","message":"Rate limit exceeded. Please try again later."}',
      }),
      "usage_limit",
    );
  });

  it("classifies OpenCode's provider.rate-limit error type", () => {
    assert.strictEqual(
      openCodeFailureClass({
        type: "provider.rate-limit",
        message: "Rate limit exceeded",
        status: 429,
      }),
      "usage_limit",
    );
  });

  it("does not misclassify authentication or unrelated provider failures", () => {
    assert.strictEqual(
      openCodeFailureClass({ status: 401, message: "Invalid API key" }),
      "provider_error",
    );
    assert.strictEqual(openCodeFailureClass(new Error("Model not found")), "provider_error");
  });
});
