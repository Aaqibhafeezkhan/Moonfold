# Phase 3 gate: Codex-parity layer B

Date: 2026-10-19. Machine: Windows 11 x64, Codex CLI 0.161.0 (schema pinned to 0.163.0), Claude
Code CLI 2.1.293. Plan: docs/plans/phase-3.md. Live runs used the web client served by
`vp run dev --home-dir D:/projects/Moonfold/.moonfold` and a scratch project (`smoke-project`, a
throwaway git repository, never this repo). The Claude account was at its usage limit until
1 November, so live agent turns used Codex (GPT-5.6-Luna); Claude paths are covered by unit tests
and marked below.

## Features

| Item                                               | How it was exercised                                                                         | Result                                                                                                                                                                          |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One-off and cron schedules, time zones             | Created a one-off task in Europe/Berlin from Settings                                        | Fired on time; run recorded in Run history                                                                                                                                      |
| Run history follows the agent's outcome            | Claude run (usage limit) and Codex Run now                                                   | "Failed · On schedule" and "Succeeded · Run now"; Codex answered correctly                                                                                                      |
| Bind a task to a thread, skill picker, PR template | Thread menu → Schedule a follow-up…; editor                                                  | Task opened bound to the thread; template and skill mention inserted (unit tests for logic)                                                                                     |
| Keep running in the background (desktop)           | Real Electron: turned the setting on, closed the window                                      | App stayed alive with no window, log "running in the background"                                                                                                                |
| Plugins: install, review, enable                   | Installed a Codex-format plugin from a folder; enabled it after the MCP command confirmation | Codex used the plugin's skill ("LANTERN-42") and MCP tool ("Next high tide: 04:17 (TIDE-7)")                                                                                    |
| Plugins on Claude                                  | Unit only (Claude account at its limit)                                                      | SDK plugin folders and MCP servers built from the bundle in tests                                                                                                               |
| Memories                                           | Added a memory in Settings; asked Codex for a status check                                   | Reply ended with the remembered word; agent-saved memory listed with its thread link                                                                                            |
| `remember` tool                                    | Asked Codex to remember with the tool                                                        | Saved as "Saved by an agent"; deleted from Settings                                                                                                                             |
| Per-thread memories choice                         | Thread menu → Memories → Don't use / Use memories                                            | The checked option followed each choice                                                                                                                                         |
| Word and Excel previews                            | Opened a .docx and an .xlsx in the Files panel                                               | Headings, table and link rendered; sheet tabs and typed cells (dates as dates) shown                                                                                            |
| Thread Artifacts                                   | Thread details panel on a thread whose agent wrote files                                     | Both files listed, newest first                                                                                                                                                 |
| Agent browsing rules                               | Set opening sites to Ask; Codex opened example.com; then www.iana.org with Always block      | Question named thread and page; Allow let the tool through; Always block refused the agent and saved a rule; rule removed and default restored                                  |
| Computer use (Windows)                             | Integration test on a window the test owns; live Codex turn on an owned test window          | Approval question, then read/click/type/click; agent reported "Result: Moonfold live test"; in-use bar with Stop shown; log listed each action with typing as a character count |
| Computer use blocks Moonfold windows               | Live: test window titled "Moonfold live test"                                                | Refused: "Agents cannot use this window"                                                                                                                                        |

## Defects found by the gate and fixed

- Plugin RPCs typed as `any`: plugin schemas were imported from the wrong module; fixed the import.
- Plugin install dialog footer detached from its form.
- Add memory was hidden when only one environment exists.
- The asset route refused .docx and .xlsx.
- Browser permission dialog focused "Always block" first; now "Allow once".
- `computer_list_apps` declared an empty struct as its parameters, which made the MCP server refuse
  to start; the registration test now lists the memory and computer tools.
- Computer-use Stop captured the waiting list when the service was built, so it refused nothing;
  caught by a unit test.
- The helper returned a WinForms password box's text through its accessible name; password edits
  are now detected by their window style and return neither name nor value.

## Incident

An early computer-use helper test started Notepad, which reopened the owner's unsaved session tabs;
the test typed into, cleared and closed one of them. The first 500 characters were recovered to a
file for the owner. Since then every computer-use test acts only on a window the test creates,
identified by a unique title and its own process id, and closed by that process.

## Not verified on this machine

- Claude delivery of plugins and memories (usage limit; unit tests only).
- Computer use on macOS and Linux (not built; see docs/COMPUTER-USE.md).
- Browser annotations on streamed tabs (deferred; see DECISIONS).
- Provider-native computer use (some Codex installs carry their own) runs outside Moonfold's
  controls by design; documented for users.

## Checks

Recorded in PROGRESS.md with the merge: targeted unit and integration tests for every new module,
`vp run knip:check`, `vp check`, server/web/contracts typechecks, and main's CI.
