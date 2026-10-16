import {
  AntigravitySettings,
  ClaudeSettings,
  CodexSettings,
  ProviderDriverKind,
} from "@moonfold/contracts";
import { acpRegistryClient } from "@moonfold/provider-acp-registry/client";
import { makeProviderClientRegistry } from "@moonfold/provider-core/client";
import { cursorClient } from "@moonfold/provider-cursor/client";
import { grokClient } from "@moonfold/provider-grok/client";
import { museClient } from "@moonfold/provider-muse/client";
import { openCodeClient } from "@moonfold/provider-opencode/client";
import { piClient } from "@moonfold/provider-pi/client";

/** The provider client definitions this web build ships, in presentation order. */
export const providerClients = makeProviderClientRegistry([
  {
    driverKind: ProviderDriverKind.make("codex"),
    label: "Codex",
    settingsSchema: CodexSettings,
  },
  {
    driverKind: ProviderDriverKind.make("claudeAgent"),
    label: "Claude",
    settingsSchema: ClaudeSettings,
  },
  cursorClient,
  grokClient,
  openCodeClient,
  {
    driverKind: ProviderDriverKind.make("antigravity"),
    label: "Antigravity",
    settingsSchema: AntigravitySettings,
  },
  museClient,
  piClient,
  acpRegistryClient,
]);
