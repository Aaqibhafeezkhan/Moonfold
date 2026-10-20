# Phase 4 gate: provider handoff

Date: 2026-10-20. Machine: Windows 11 x64, Codex CLI 0.163.0, Claude Code CLI 2.1.303. Plan:
docs/plans/phase-4.md. Live runs used the web client served by
`vp run dev --home-dir D:/projects/Moonfold/.moonfold` and the scratch `smoke-project` (a throwaway
git repository). Both provider accounts on this machine were at their usage limits (Claude until
1 November, Codex until 17 November), which made the limit path real but meant no provider could
finish a task live.

## Live

| Step                                                | Result                                                                                                                                                                                                            |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Settings → Handoff: add Codex to the fallback order | Saved to settings.json and listed as "1. Codex · gpt-5.6-terra"                                                                                                                                                   |
| Thread stopped at Claude's real usage limit         | Limit notice offered **Continue in Codex…** next to Resume at reset                                                                                                                                               |
| Preview                                             | Brief showed the reason, the objective, the workspace's real `git status --short` and `git diff --stat`, and the stop as an open problem; "No keys, tokens or passwords were found"; 4 earlier messages to follow |
| Send                                                | Divider "Handed off after a usage limit · Claude Fable 5.1 → GPT-5.6-Terra · 7:25 AM"; Codex started the turn                                                                                                     |
| Codex received the brief                            | Its session log on this machine starts the prompt with "# Handoff brief"                                                                                                                                          |
| Codex at its own limit                              | Codex stopped with a real usage limit; the notice then offered only **Hand off to…**, since no fallback was left                                                                                                  |
| View brief                                          | Showed the exact text that was sent                                                                                                                                                                               |

## Automated

- Golden brief test (recorded task that hit its limit), determinism, goal objective, fixed failures
  dropped, non-git workspace.
- Brief service against a real temporary git repository (status, diff stat, AGENTS.md).
- Secret scanner: provider keys, tokens, JWTs, private keys, URL credentials, headers, assignments,
  references kept, punctuation kept.
- End-to-end with fake adapters (`ProviderSwitch.integration.test.ts`, automatic and manual): a
  Codex run stops at its limit, the thread continues on Claude, Claude's prompt opens with the brief
  ahead of the history, the secret is redacted in both, and the handoff item and record carry the
  reason and the sent brief.
- Failure injection per trigger: automatic fallback (worker decision: once per stopped run, never
  back to a provider still limited, allow list respected, ask mode untouched), manual (dispatch
  with reason), usage warning (threshold logic), allow list at the dispatch chokepoint (refused and
  allowed).
- Settings: handoff settings save and read back (the strip-defaults writer stores them whole).

## Defects found by the gate and fixed

- Handoff settings failed to save: the settings file keeps only non-default values, which dropped
  required fields; the handoff object is now stored whole.
- The preview said a project-folder thread was not a git repository: the preview used the
  worktree-only runtime policy; it now resolves the project folder as turns do.
- The sent brief listed the handoff's own "Continue" message as something the user said.
- "Add" in the fallback order and the dialog's target did nothing until a model was picked
  explicitly; both now use the model the picker shows.
- A Codex stop with no rate-limit snapshot had no reset time; it is read from Codex's message.
- The golden brief was reformatted by the Markdown formatter; it is stored as plain text.

## Not verified on this machine

- A task finished by the second provider: both accounts were at their limits. Covered by the
  fake-adapter end-to-end test; docs/SMOKE-HANDOFF.md is the script to rerun with working logins.
- Automatic mode live (needs a second provider that is not limited).
- The usage-warning offer live (needs a provider reporting a window between the threshold and 100%).
- Gemini CLI as a target (Phase 5).
