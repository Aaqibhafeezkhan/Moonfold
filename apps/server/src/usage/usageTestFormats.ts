/**
 * The built-in transcript formats by provider, for engine and cache tests.
 *
 * @module usageTestFormats
 */
import type { UsageProviderKind } from "@moonfold/contracts";
import type { TranscriptUsageFormat } from "@moonfold/provider-core/server/usage";
import { piUsageFormat } from "@moonfold/provider-pi/server/usage";
import { grokUsageFormat } from "@moonfold/provider-grok/server/usage";

import { claudeUsageFormat } from "../provider/Drivers/claudeUsage.ts";
import { codexUsageFormat } from "../provider/Drivers/codexUsage.ts";

export const TEST_FORMATS: Record<
  "claude" | "codex" | "grok" | "pi",
  TranscriptUsageFormat<unknown>
> = {
  claude: claudeUsageFormat,
  codex: codexUsageFormat,
  grok: grokUsageFormat,
  pi: piUsageFormat,
};

export const TEST_FORMAT_MAP = new Map<UsageProviderKind, TranscriptUsageFormat<unknown>>(
  Object.entries(TEST_FORMATS) as Array<[UsageProviderKind, TranscriptUsageFormat<unknown>]>,
);
