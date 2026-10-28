# QA: beta 3 (2026-10-28)

Live checks on Windows 11 against a dev server (`vp run dev --home-dir .moonfold`) in a scratch git
repository. Providers: Claude Code 2.1.308 (Claude Haiku 5.5), Codex CLI 0.163.0 (account at its
usage limit until 19 November), Pi 1.4.0 and DeepSeek Harness 0.2.1-rc.2 installed temporarily,
Ollama 0.30.11 with `qwen2.5:1.5b`. The temporary installs, the scratch repository and the
configuration they created were removed afterwards.

## Prompt profiles

| Check                                                                            | Result                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Settings → Prompt Profiles lists the five built-ins; "View" shows their text     | Pass                                                                                                                                                                                                                                                             |
| New profile saved to the environment's `settings.json`                           | Pass                                                                                                                                                                                                                                                             |
| Thread menu → Prompt profile lists Default, the built-ins and the custom profile | Pass                                                                                                                                                                                                                                                             |
| Picking one stores `promptProfileId` on the thread                               | Pass                                                                                                                                                                                                                                                             |
| Claude, profile picked mid-thread ("end every reply with MOONFOLD-PROFILE-OK")   | **Failed first**: the reply had no marker. Claude records the system prompt on a session's first request. Fixed (the next message carries a note); retest: reply ended with `MOONFOLD-PROFILE-OK`, and the transcript shows the user's message without the note. |

## Scheduled send

| Check                                                                                       | Result                                                                                          |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Codex stopped at its real usage limit; the notice offers **Schedule a message for reset**   | Pass                                                                                            |
| That button opens the dialog with the reset time (19 Nov, 17:31), "Continue." and the agent | Pass                                                                                            |
| Scheduled for 13:48 with Claude Haiku: task saved as a one-off bound to the thread          | Pass                                                                                            |
| Fired at 13:48:02; Moonfold handed the thread from Codex to Claude; Claude answered         | Pass                                                                                            |
| After firing the task has no next run (it does not repeat)                                  | Pass                                                                                            |
| The "Message scheduled" banner is in the composer's notice stack while it waits             | Pass (behind the usage-limit notice, under "Show other notices")                                |
| `/timed tomorrow 9am run the tests` opens the dialog with 29 Oct 09:00 and "run the tests"  | Pass, nothing sent                                                                              |
| Right-click on Send opens the dialog                                                        | Pass                                                                                            |
| Long-press on touch                                                                         | Not run (no touch device); unit-tested only                                                     |
| Server restart between scheduling and firing                                                | Covered by the scheduler's existing durability; the dev server did restart twice during the run |

## Local models (Pi + Ollama)

| Check                                                                       | Result                                                                     |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Pi instance with Local models on: status Authenticated with no Pi login     | Pass                                                                       |
| `qwen2.5:1.5b` appears in the composer's model picker                       | Pass                                                                       |
| A turn on the local model completes through Pi                              | Pass (the 1.5B model's answer was poor: it tried a tool with a wrong path) |
| User's `~/.pi` untouched when `PI_CODING_AGENT_DIR` is set for the instance | Pass                                                                       |

## DeepSeek Harness

| Check                                                                                 | Result                                                                                                         |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Agent search for "deepseek" lists DeepSeek Harness                                    | Pass                                                                                                           |
| Add installs `@deepseek-ai/dsh@0.2.1-rc.2` with npx; card shows v0.2.1-rc.2 Available | Pass                                                                                                           |
| Live model list from dsh (deepseek-v4-flash, qwen2.5:1.5b, Default) and effort picker | Pass                                                                                                           |
| A turn on dsh routed to local Ollama                                                  | Pass ("Reply with just the word: hello" → "hello"); the first prompt's answer was nonsense from the 1.5B model |
| Without a configured provider, dsh's error names the missing `DEEPSEEK_API_KEY`       | Seen through a direct ACP probe; documented                                                                    |
| Limit wording ("Insufficient Balance", quota, 429) ends the run as a usage limit      | Unit tests only (no DeepSeek account)                                                                          |

## Problems found and fixed during QA

- Claude ignored a mid-thread profile change (above).
- Settings copy said profiles are picked "from the composer"; it is the thread menu.
- The schedule dialog's calendar icon sat on its own line.
- Before the instance had its own `DSH_HOME`, Moonfold's first probe of DeepSeek Harness wrote an
  `acp` profile, a session and an id file into the owner's existing `~/.dsh`. Those items were
  removed. This is how dsh behaves with its default home; the user doc explains where dsh keeps
  its state.

## Not verified

- Prompt profiles on Codex live (account limited): unit tests check the `additionalContext` entry.
- Prompt profiles on Cursor, OpenCode, Muse, Grok and Antigravity: unit-level only.
- LM Studio (not installed); the same code path as Ollama with a different port.
- macOS and Linux.
