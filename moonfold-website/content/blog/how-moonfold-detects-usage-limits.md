---
title: How Moonfold detects that an agent hit its usage limit
description: Each provider reports limits differently. This is what each adapter reads today, where reset times come from, and where handoff is still manual.
category: Handoff
date: 2026-10-24
---

Provider handoff only works if Moonfold knows a run ended because of a usage limit, not because of a bug or a network blip. There is no shared standard for that, so each provider adapter reads what its own agent reports.

## The rule

A handoff offer, or an automatic handoff, starts when a run ends with a failure of class `usage_limit`. Retries a provider performs on its own, such as a transient 429 it will try again, never start a handoff. Only the failure that ends the run does.

## What each provider tells us

- **Codex** reports limits through its app-server. A notification carrying a usage-limit or rate-limit error with no retry pending ends the run as a limit. The reset time comes from the account's rate-limit windows, and the percent used per window also drives the optional usage warning.
- **Claude Code** reports a blocking limit or a 429 in its result. When a gateway wraps the error and names a reset time, Moonfold reads it from the text.
- **OpenCode** surfaces a terminal 429, rate-limit identifiers, or quota text in the provider error. Beta 2 added this mapping, contributed by an outside developer.
- **Gemini CLI and other ACP agents** are matched on error text such as an exhausted quota or too many requests. Reset times are not reported.
- **Grok** uses a dedicated ACP error code, without a reset time.
- **Cursor** is not mapped yet. Its limit errors arrive as ordinary provider errors, so you hand off from it by hand with **Hand off to…**.

## Why reset times matter

When a provider names a reset time, the notice can offer to wait for it as an alternative to switching. When it does not, Moonfold shows the limit without a countdown instead of guessing one.

## Adding a provider

A maintainer adding a provider maps the agent's terminal limit error to the `usage_limit` class, includes the reset time when the provider names one, keeps self-retried limits as retries, and adds a test that feeds a recorded error through the adapter. The full table, with the source files for each adapter, lives in the repository at [`docs/HANDOFF-SIGNALS.md`](https://github.com/Mr-Dark-debug/Moonfold/blob/main/docs/HANDOFF-SIGNALS.md).

If your agent reports limits in a way we do not read yet, [open an issue](https://github.com/Mr-Dark-debug/Moonfold/issues) with the recorded error. It is one of the most useful contributions you can make.
