---
title: What goes into a handoff brief, and what is left out
description: The brief the next agent receives is built from the thread's history without a model. Here is exactly what it holds and how secrets are redacted.
category: Handoff
date: 2026-10-23
---

A handoff is only as good as the brief that carries it. If the brief is vague the next agent starts from scratch, and if it is too eager it leaks things it should not. This is what Moonfold puts in it, and how.

## The contents

The brief is a plain summary of where the task stands:

- the **objective**: the thread's goal, or your first message;
- the **plan** and how far along it is;
- what **you said since**;
- the **files changed**;
- the current `git status` and `git diff --stat`;
- the **last failing command**;
- any **open approvals**;
- the project's `AGENTS.md` or `CLAUDE.md`.

The earlier conversation follows the brief, so nothing has to be reconstructed from memory.

## Built without asking a model

The brief is assembled from the thread's recorded history. No model is asked to summarise it. That has two practical effects: the same thread always produces the same brief, and a provider that is already at its limit is not needed to write the summary of its own work.

## Redaction happens before sending

Before the preview is shown, Moonfold scans the brief for secrets: keys, tokens, passwords and private keys. Matches are replaced, and the preview lists what was redacted, by kind, so you can see that a token was removed without seeing the token again. The brief you preview is the brief that is sent.

Redaction is a safeguard, not a guarantee. If a project must never reach a particular company, do not rely on scanning alone. Use the **Allowed providers** setting to decide which providers may receive that project's context in the first place.

## What the next agent does not get

The previous agent's hidden reasoning and its tool state stay behind. The new agent has the files on disk and the brief, and it will read what it needs. That is intentional: it keeps the handoff small and keeps one provider's internal traces out of another's context.

For the full list of settings see the [provider handoff guide](/docs/provider-handoff/), and for how Moonfold decides a run ended in a usage limit see [how Moonfold detects usage limits](/blog/how-moonfold-detects-usage-limits/).
