# Provider handoff smoke test

A manual check the owner runs with their own provider logins. It needs two providers signed in on
the machine (for example Codex CLI and Claude Code) and takes about ten minutes. Use a throwaway
repository, never a real project.

## Setup

1. Create a scratch repository:

   ```bash
   mkdir handoff-smoke && cd handoff-smoke && git init && npm init -y
   ```

2. Add an `AGENTS.md` with one line, `Run npm test before you finish.`
3. Open the folder as a project in Moonfold. In Settings → Handoff, put the second provider first in
   the fallback order and leave the mode on **Ask**.

## Manual handoff

1. Start a thread with the first provider: "Write `sum.js` exporting `sum(a, b)` and a test with
   node:test. Make `npm test` run it. Then add `subtract`."
2. While it works or after its first turn, open the thread menu → **Hand off to…** and pick the
   second provider.
3. Check the preview: the objective is your first message, the plan and changed files match the
   thread, `git status` shows the new files, and AGENTS.md is included.
4. Paste a fake key into a new message first (`OPENAI_API_KEY=sk-test-0000000000000000000000`),
   then open the preview again: the key shows as `[REDACTED:openai_key]` and the redaction count
   is listed.
5. Send. The divider reads "Handed off … by you" with the time; **View brief** shows the text sent.
6. The second provider continues from the unfinished step without redoing finished work, and
   `npm test` passes.

## Limit handoff

1. When a provider reaches its usage limit during a turn (a real limit), the limit banner offers
   **Continue in <provider>** and **Hand off to…** next to Resume at reset.
2. Choose Continue: the preview opens with the reason "usage limit"; send it and confirm the task
   finishes in the second provider.
3. With the mode set to **Automatic**, the same limit continues in the first fallback without a
   question, and the divider reads "automatic fallback".

## Switch back

Open **Hand off to…** again and choose the first provider; its earlier work and the second
provider's turns both reach it.

Record the date, provider versions and the outcome of each step in PROGRESS.md.
