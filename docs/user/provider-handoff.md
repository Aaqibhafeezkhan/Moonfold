# Provider handoff

When an agent reaches its usage limit, or you want another agent to take over, Moonfold can move
the thread to a different provider and the task carries on there. The new agent receives a brief
of where the task stands, then the earlier conversation.

## Hand off a thread

Open the thread menu and choose **Hand off to…**, or use the command palette. Pick the provider and
model to continue with. Before anything is sent you see the preview:

- the brief, exactly as the next provider will receive it;
- what was redacted from it (keys, tokens, passwords, private keys), by kind;
- how many earlier messages follow the brief.

Choose **Send** to continue. The thread shows a divider with the reason and time; **View brief**
on it shows what was sent. To go back, hand off again and pick the earlier provider.

## When a provider hits its limit

The limit notice above the composer offers **Continue in …** with the first provider in your
fallback order, next to resuming at the reset time. In **Automatic** mode Moonfold continues in the
first available fallback on its own and the divider says so. It skips providers that are off, not
allowed for the project, or at their own limit, and it never moves a thread more than once for the
same stopped turn.

If you set a usage warning, Moonfold also offers a handoff once a provider reports that share of a
usage window used, before it stops.

## Settings

Settings → Handoff:

- **Mode**: Ask (default) or Automatic.
- **Fallback order**: where limited threads continue, in order.
- **Allowed providers**: which providers may receive a thread's context. By default every enabled
  provider may; limit it for projects whose code should stay with one company.
- **Usage warning**: off by default.

Each project can override these in its project settings.

## What the brief contains

The objective (the thread's goal or your first message), the plan and its progress, what you said
since, the files changed, the current `git status` and `git diff --stat`, the last failing command,
open approvals, and the project's AGENTS.md or CLAUDE.md. It is built from the thread's history
without asking a model, so the same thread always gives the same brief. The new agent does not get
the previous agent's hidden reasoning or its tool state.
