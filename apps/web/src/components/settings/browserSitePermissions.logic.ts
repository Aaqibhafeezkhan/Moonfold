import type { BrowserSiteDecision } from "@moonfold/contracts";

export const SITE_DECISION_LABELS: Record<BrowserSiteDecision, string> = {
  allow: "Allow",
  ask: "Ask",
  block: "Block",
};

/**
 * The host a rule is for, from whatever the user typed: a host name, or a pasted URL. Null when
 * it names no web host.
 */
export function normalizeSiteInput(text: string): string | null {
  const trimmed = text.trim().toLowerCase();
  if (trimmed.length === 0) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  let host: string;
  try {
    host = new URL(withScheme).hostname.replace(/\.$/, "");
  } catch {
    return null;
  }
  if (host.startsWith("www.")) host = host.slice(4);
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(host)
    ? host
    : null;
}
