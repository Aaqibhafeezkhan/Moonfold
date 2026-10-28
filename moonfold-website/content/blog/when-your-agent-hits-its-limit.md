---
title: When your agent hits its limit, the task should keep going
description: How Moonfold moves a thread from one coding agent to another at a usage limit, what you see before anything is sent, and how to go back.
category: Handoff
date: 2026-10-27
featured: true
---

Every coding agent has a ceiling. Sooner or later the subscription runs out of tokens for the window, a rate limit lands mid-refactor, or the agent simply stops being the right one for the next step. Most tools treat that as the end of the session. You copy a summary into another tool, re-explain the plan, and hope nothing important got lost on the way.

Moonfold treats it as a handoff. The same thread continues in a different agent, with a brief of where the work stands.

## What starts a handoff

A handoff starts in one of two ways:

- **You ask for it.** Open the thread menu and choose **Hand off to…**, or use the command palette, then pick the provider and model.
- **The provider reports a usage limit.** The notice above the composer offers **Continue in…** with the first provider in your fallback order, next to resuming when the limit resets.

In **Ask** mode, which is the default, Moonfold only offers. In **Automatic** mode it continues in the first available fallback on its own and the divider in the thread says so. It skips providers that are turned off, not allowed for the project, or at their own limit, and it never moves a thread more than once for the same stopped turn.

## You see it before it is sent

Before anything leaves the current provider, the preview shows three things:

1. the brief, exactly as the next provider will receive it;
2. what was redacted from it (keys, tokens, passwords and private keys), by kind;
3. how many earlier messages follow the brief.

Choose **Send** to continue. The thread keeps a divider with the reason and time, and **View brief** on it shows what was sent. To go back, hand off again and pick the earlier provider.

## Control over where context goes

Under **Settings → Handoff** you choose the mode, the fallback order, and which providers may receive a thread's context at all. By default every enabled provider may. For a project whose code should stay with one company, narrow the list; each project can override the global setting in its own project settings.

## What this is not

Moonfold does not pool or share anyone's login. Each provider runs as your own local CLI with your own account, and a handoff only moves the thread between those CLIs on your machine. The next agent does not inherit the previous agent's hidden reasoning or tool state, and you should expect it to re-read files it needs. What it does get is enough to pick up the work without a re-explanation.

Read [what goes into the brief](/blog/what-a-handoff-brief-contains/) next, or the [provider handoff guide](/docs/provider-handoff/) for every setting.
