import type {
  HandoffRedaction,
  ServerProviderUsageLimits,
  ServerProviderUsageWindow,
} from "@moonfold/contracts";

const KIND_LABELS: Record<string, string> = {
  private_key: "private key",
  anthropic_key: "Anthropic key",
  openai_key: "OpenAI key",
  github_token: "GitHub token",
  aws_access_key: "AWS access key",
  google_api_key: "Google API key",
  slack_token: "Slack token",
  stripe_key: "Stripe key",
  jwt: "JSON web token",
  url_credentials: "password in a URL",
  auth_header: "authorization header",
  secret_assignment: "secret value",
};

/** One sentence naming what the brief's secret scan replaced, or null when it found nothing. */
export function handoffRedactionSummary(
  redactions: ReadonlyArray<HandoffRedaction>,
): string | null {
  const found = redactions.filter((entry) => entry.count > 0);
  if (found.length === 0) return null;
  const parts = found.map((entry) => {
    const label = KIND_LABELS[entry.kind] ?? entry.kind.replaceAll("_", " ");
    return `${entry.count} ${label}${entry.count === 1 ? "" : "s"}`;
  });
  const listed =
    parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
  return `Redacted ${listed}.`;
}

/**
 * The fullest usage window at or past `percent` that has not reset yet, or null. Drives the
 * offer to hand off before a provider stops.
 */
export function handoffUsageWarning(
  usage: ServerProviderUsageLimits | undefined,
  percent: number | null,
  nowMs: number,
): ServerProviderUsageWindow | null {
  if (percent === null || usage === undefined || usage.unavailable !== undefined) return null;
  const crossed = usage.windows.filter(
    (window) =>
      window.usedPercent >= percent &&
      (window.resetsAt === undefined || Date.parse(window.resetsAt) > nowMs),
  );
  return crossed.toSorted((a, b) => b.usedPercent - a.usedPercent)[0] ?? null;
}
