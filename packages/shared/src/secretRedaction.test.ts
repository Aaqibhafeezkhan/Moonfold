import { describe, expect, it } from "@effect/vitest";

import { mergeSecretFindings, redactSecrets } from "./secretRedaction.ts";

describe("redactSecrets", () => {
  it("replaces provider keys and tokens with markers naming their kind", () => {
    const { text, findings } = redactSecrets(
      [
        "anthropic sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123",
        "openai sk-proj-ABCDEFGHIJKLMNOPQRSTUVWX1234",
        "github ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij",
        "aws AKIAABCDEFGHIJKLMNOP",
        "jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
      ].join("\n"),
    );
    expect(text).toBe(
      [
        "anthropic [REDACTED:anthropic_key]",
        "openai [REDACTED:openai_key]",
        "github [REDACTED:github_token]",
        "aws [REDACTED:aws_access_key]",
        "jwt [REDACTED:jwt]",
      ].join("\n"),
    );
    expect(findings).toEqual([
      { kind: "anthropic_key", count: 1 },
      { kind: "openai_key", count: 1 },
      { kind: "github_token", count: 1 },
      { kind: "aws_access_key", count: 1 },
      { kind: "jwt", count: 1 },
    ]);
  });

  it("removes private key blocks, URL credentials and authorization headers", () => {
    const { text } = redactSecrets(
      [
        "-----BEGIN OPENSSH PRIVATE KEY-----",
        "b3BlbnNzaC1rZXktdjEAAAAA",
        "-----END OPENSSH PRIVATE KEY-----",
        "git clone https://bot:hunter2token@example.test/repo.git",
        "curl -H 'Authorization: Bearer abcdefgh12345678'",
      ].join("\n"),
    );
    expect(text).toBe(
      [
        "[REDACTED:private_key]",
        "git clone https://[REDACTED:url_credentials]@example.test/repo.git",
        "curl -H 'Authorization: Bearer [REDACTED:auth_header]'",
      ].join("\n"),
    );
  });

  it("redacts literal secrets in assignments and keeps references to them", () => {
    const { text, findings } = redactSecrets(
      [
        "DATABASE_PASSWORD=s3cr3t-value",
        'api_key: "zx81-abcdef"',
        "const token = getToken();",
        "token = process.env.API_TOKEN",
        "SECRET=${VAULT_SECRET}",
        '"inputTokens": 1234567',
      ].join("\n"),
    );
    expect(text).toBe(
      [
        "DATABASE_PASSWORD=[REDACTED:secret_assignment]",
        'api_key: "[REDACTED:secret_assignment]"',
        "const token = getToken();",
        "token = process.env.API_TOKEN",
        "SECRET=${VAULT_SECRET}",
        '"inputTokens": 1234567',
      ].join("\n"),
    );
    expect(findings).toEqual([{ kind: "secret_assignment", count: 2 }]);
  });

  it("names a known key inside an assignment by its kind, once", () => {
    expect(redactSecrets("OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwx")).toEqual({
      text: "OPENAI_API_KEY=[REDACTED:openai_key]",
      findings: [{ kind: "openai_key", count: 1 }],
    });
  });

  it("keeps sentence punctuation after a redacted value", () => {
    expect(redactSecrets("The token is TOKEN=9f8e7d6c5b4a.").text).toBe(
      "The token is TOKEN=[REDACTED:secret_assignment].",
    );
  });

  it("leaves ordinary text alone", () => {
    const prose = "Fix the token bucket in src/rate.ts; the password form needs a label.";
    expect(redactSecrets(prose)).toEqual({ text: prose, findings: [] });
  });

  it("adds findings across texts", () => {
    expect(
      mergeSecretFindings([
        [{ kind: "jwt", count: 1 }],
        [
          { kind: "openai_key", count: 2 },
          { kind: "jwt", count: 2 },
        ],
      ]),
    ).toEqual([
      { kind: "jwt", count: 3 },
      { kind: "openai_key", count: 2 },
    ]);
  });
});
