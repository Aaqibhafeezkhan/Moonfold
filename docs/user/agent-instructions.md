# Agent instructions

Agents read standing instructions from Markdown files: `AGENTS.md` (Codex and most agents) and
`CLAUDE.md` (Claude Code), both in your home folder and in each project. Edit them in
**Settings → Personalization**.

- Pick **Your instructions only** to edit the files that apply in every project, or pick a project
  to also edit that project's own files.
- A file that does not exist yet is created when you save it.
- The files live on the computer running the environment, so a remote session edits that
  computer's files.
- If the file changed elsewhere since you opened it (in your editor, or by an agent), saving is
  refused. Select **Reload** to load the current version, then make your edit again.
