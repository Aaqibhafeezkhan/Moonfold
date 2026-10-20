/**
 * Finds credentials in text that is about to leave this machine for another provider, such as a
 * handoff brief, and replaces each with a marker naming its kind. It errs toward redacting:
 * a lost token in a brief costs nothing, a leaked one cannot be taken back.
 *
 * @module secretRedaction
 */

export type SecretKind =
  | "private_key"
  | "anthropic_key"
  | "openai_key"
  | "github_token"
  | "aws_access_key"
  | "google_api_key"
  | "slack_token"
  | "stripe_key"
  | "jwt"
  | "url_credentials"
  | "auth_header"
  | "secret_assignment";

export interface SecretFinding {
  readonly kind: SecretKind;
  readonly count: number;
}

export interface SecretRedaction {
  readonly text: string;
  readonly findings: ReadonlyArray<SecretFinding>;
}

const marker = (kind: SecretKind) => `[REDACTED:${kind}]`;

// Specific forms first, so a key inside an assignment is named by what it is.
const TOKEN_PATTERNS: ReadonlyArray<readonly [SecretKind, RegExp]> = [
  [
    "private_key",
    /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z0-9 ]*PRIVATE KEY-----|$)/g,
  ],
  ["anthropic_key", /\bsk-ant-[A-Za-z0-9_-]{20,}/g],
  ["openai_key", /\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{20,}/g],
  ["github_token", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{22,})/g],
  ["aws_access_key", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g],
  ["google_api_key", /\bAIza[0-9A-Za-z_-]{35}/g],
  ["slack_token", /\bxox[abeprs]-[A-Za-z0-9-]{10,}/g],
  ["stripe_key", /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{16,}/g],
  ["jwt", /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g],
];

const URL_CREDENTIALS = /\b([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]+@/gi;
const AUTH_HEADER = /\b(Bearer|Basic|Token)\s+(?!\[REDACTED)[A-Za-z0-9._~+/=-]{8,}/g;
const SECRET_ASSIGNMENT =
  /(\b[A-Za-z0-9_.-]*(?:api[_-]?key|access[_-]?key|secret|token|passw(?:or)?d|pwd|credentials?|auth)[A-Za-z0-9_]*["']?\s*(?:=|:)\s*)(["']?)([^\s"',;`]{6,})\2/gi;

/**
 * Whether an assigned value is a reference to something else (a variable, a call, an
 * environment lookup) rather than a literal secret.
 */
function isReference(value: string): boolean {
  if (value.startsWith("[REDACTED")) return true;
  if (/^\$\{?[A-Za-z_]/.test(value) || /^%[A-Za-z_]+%$/.test(value)) return true;
  return /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*(?:\(|$)/.test(value) && !/\d/.test(value);
}

/** Replaces the credentials in `text` and counts what it replaced, by kind. */
export function redactSecrets(text: string): SecretRedaction {
  const counts = new Map<SecretKind, number>();
  const count = (kind: SecretKind) => counts.set(kind, (counts.get(kind) ?? 0) + 1);
  let result = text;
  for (const [kind, pattern] of TOKEN_PATTERNS) {
    result = result.replace(pattern, () => {
      count(kind);
      return marker(kind);
    });
  }
  result = result.replace(URL_CREDENTIALS, (_match, scheme: string) => {
    count("url_credentials");
    return `${scheme}${marker("url_credentials")}@`;
  });
  result = result.replace(AUTH_HEADER, (_match, scheme: string) => {
    count("auth_header");
    return `${scheme} ${marker("auth_header")}`;
  });
  result = result.replace(
    SECRET_ASSIGNMENT,
    (match, name: string, quote: string, value: string) => {
      // Sentence punctuation after an unquoted value is not part of it.
      const trailing = quote === "" ? (/[.!?)\]]+$/.exec(value)?.[0] ?? "") : "";
      const secret = value.slice(0, value.length - trailing.length);
      if (secret.length < 6 || isReference(secret)) return match;
      count("secret_assignment");
      return `${name}${quote}${marker("secret_assignment")}${quote}${trailing}`;
    },
  );
  return {
    text: result,
    findings: [...counts].map(([kind, found]) => ({ kind, count: found })),
  };
}

/** Adds up the findings of several redactions, keeping the first-seen order of kinds. */
export function mergeSecretFindings(
  groups: ReadonlyArray<ReadonlyArray<SecretFinding>>,
): ReadonlyArray<SecretFinding> {
  const counts = new Map<SecretKind, number>();
  for (const findings of groups) {
    for (const finding of findings) {
      counts.set(finding.kind, (counts.get(finding.kind) ?? 0) + finding.count);
    }
  }
  return [...counts].map(([kind, found]) => ({ kind, count: found }));
}
