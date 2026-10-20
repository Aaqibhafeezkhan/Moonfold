# Phase 4 plan: provider handoff

Goal: when an agent hits a usage limit, or the user asks, the same task continues in another
provider with its context, and the user sees and controls what is sent.

## What already exists (upstream T3 Code and earlier phases)

- The thread is ours: runs, items, plans, diffs, approvals and errors live in the event-sourced
  SQLite log; provider sessions are disposable. A thread can change provider instance at any time
  (`thread.model-selection.set` / `provider.switch`); `ProviderSwitchService` plans a
  `create_with_handoff` transition and the next turn starts a new native session.
- `ContextHandoffService` selects history (recent turns verbatim, budgeted to the target model) and
  `ContextHandoffDelivery` sends it: Codex receives it as model-visible history through
  `thread/inject_items`; other providers receive it inline, attributed, ahead of the user message.
  Provider session files are never copied between providers.
- A `handoff` turn item and its timeline divider (from → to, by model).
- Usage-limit detection: the Codex, Claude, Grok and ACP adapters classify limit failures as
  `usage_limit`, with a reset time when the provider gives one. `UsageLimitRecoveryWorker` and the
  composer banner offer "Resume at reset" on the same provider.
- Codex account rate limits and per-provider usage meters in the composer and the Usage page.

## Work items

1. **Settings** (environment, overridable per project): `providerHandoff`
   - `mode`: `ask` (default) or `auto`.
   - `fallbackOrder`: ordered model selections to continue in.
   - `allowedProviders`: provider instances that may receive a thread's context; `null` means every
     enabled provider (today's behavior, kept so ordinary switching is unchanged).
   - `warnAtUsagePercent`: offer a handoff when a provider's reported usage window passes this
     percentage; off by default.
   - Settings → Handoff edits the environment values and the fallback order; the project settings
     panel overrides them.
2. **Brief**: built deterministically from the log, no model call.
   - Objective (the active goal, else the first user message of the thread).
   - Plan and step status (latest plan item).
   - Decisions and constraints stated by the user (user messages, newest first, bounded).
   - Files changed (aggregated from file changes and checkpoints), current `git status --short`
     and `git diff --stat` of the thread's workspace.
   - Recent turns: the existing budgeted history selection, unchanged.
   - Open problems: the last failed command and its tail of output, pending approvals and
     questions, the failure that ended the last run.
   - Project instructions: AGENTS.md or CLAUDE.md at the workspace root, bounded.
   - Delivered as the first part of the first turn in the new provider; the exact text sent is
     stored on the handoff record so the divider can show it afterwards.
3. **Redaction**: one secret scanner (`packages/shared`) for keys and tokens of common providers,
   private key blocks, JWTs, bearer and basic credentials, URL credentials and secret-named
   assignments. It runs on the brief and on every history message sent to a different provider;
   the preview lists what kinds were redacted and how many.
4. **Preview**: an RPC that builds the brief and history selection for a target without sending
   anything. The "Hand off to…" dialog shows the target, whether it is allowed, the brief exactly
   as it will be sent (redactions marked), and how many earlier messages follow; Send switches
   the thread and starts the continuation turn.
5. **Triggers**
   - Usage limit (Codex `usageLimitExceeded`, Claude blocking limits and 429s, Grok and ACP
     limits): the limit banner offers "Continue in <first fallback>" and "Hand off to…" next to
     the existing resume-at-reset actions. In `auto` mode a worker continues in the first
     allowed, enabled fallback that is not itself limited, once per failed run, and records why.
   - Usage threshold: when a provider's reported usage crosses `warnAtUsagePercent`, the composer
     offers a handoff (ask only, never automatic).
   - Manual: "Hand off to…" in the thread menu, the command palette and the composer banner.
   - Switching back is the same dialog; the previous provider is listed first.
6. **UI**: the handoff divider shows the reason (usage limit, automatic fallback, by the user) and
   time, with "View brief"; assistant messages keep their model label so each segment shows its
   provider.
7. **Docs**: docs/HANDOFF-SIGNALS.md (limit signals per provider, researched from the adapters
   and the open-source CLIs), docs/SMOKE-HANDOFF.md (a script the owner runs with real logins),
   docs/user/provider-handoff.md, DECISIONS entries.
8. **Tests**: golden brief tests from recorded projections; redaction tests; a failure-injection
   test per trigger (usage-limit failure in ask and auto mode, threshold, manual); an end-to-end
   test with fake adapters where one provider hits its limit and the next receives the brief.

## Surfaces

- Entry points: limit banner, thread menu, command palette, Settings → Handoff, project settings.
- Clients: web and desktop share the dialog; nothing desktop-only.
- Providers: every adapter can be a target (inline delivery); Codex also gets native history.
  Limit signals per adapter are listed in docs/HANDOFF-SIGNALS.md; an adapter without one still
  supports manual handoff.
- Agents: no MCP tool. Moving a task to another provider sends the user's context to another
  company, so only the user (or their `auto` setting) decides.
- Remote: the preview and switch are RPCs, so they work from any connected client.

## Gate

- Live: start a task in one provider, reach the limit path (a real limit, or the manual button),
  preview the redacted brief, continue in a second provider and finish the task.
- Unit, integration and fake-adapter end-to-end tests green; typecheck, lint, knip.

## Out of scope

- A model-written summary of old turns (the brief is deterministic; the budgeted history stays).
- New providers (Phase 5).
