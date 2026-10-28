---
title: "Moonfold 0.1.0-beta.3: DeepSeek Harness, local models, prompt profiles, scheduled messages"
description: Beta 3 adds DeepSeek Harness, local Ollama and LM Studio models through Pi, prompt profiles for every agent, and messages you can schedule for later.
category: Releases
date: 2026-10-28
---

Beta 3 is about choice: more agents to hand a task to, models that run on your own machine, a say in how every agent works, and a way to send a message when the time is right instead of now.

## DeepSeek Harness

DeepSeek's open-source agent harness is now in the agent search under **Settings → Providers → Add provider**. Moonfold installs a pinned version and runs its ACP profile, with the models you configured in DeepSeek Harness itself. When DeepSeek's API reports an exhausted balance or quota, the turn ends as a usage limit and Moonfold offers to continue in another agent. The [DeepSeek Harness guide](/docs/providers-deepseek-harness/) covers setup.

## Local models

Turn on **Local models** for Pi, and the models Ollama or LM Studio serve on your machine appear in the model picker. They run through Pi's tools and approvals. Moonfold only looks for the servers on your own machine; it never downloads models, starts anything or edits your Pi configuration. A local model never runs out, which makes it a good last stop in the handoff fallback order. Small models struggle with tool calls, so pick a coding model of 7B parameters or more. See [Pi: local models](/docs/providers-pi/#local-models).

## Prompt profiles

A prompt profile is a set of standing instructions every agent receives with each turn. Pick a default in **Settings → Prompt Profiles**, or one for a single thread from its menu. Five come built in, from Careful engineer to Minimal, and you can write your own. Profiles add to each agent's own instructions and your AGENTS.md or CLAUDE.md; they never replace them. A handoff keeps the thread's profile. The [prompt profiles guide](/docs/prompt-profiles/) lists the built-ins.

## Schedule a message

Right-click **Send**, or type `/timed tomorrow 9am run the tests`, and the message goes into the thread at that time, with the agent and model you choose. It survives a restart and waits behind work that is still running. When an agent stops at its usage limit, the notice offers to schedule a message for the reset. Details are in [scheduled tasks](/docs/scheduled-tasks/#schedule-a-message).

## Known limits

The installers are still unsigned. DeepSeek Harness was checked with a local model, not a DeepSeek account; its limit signals are covered by tests. Prompt profiles were checked live on Claude Code and ride the same instruction channel on the other agents. Scheduled messages carry text only.

Download the beta from the [releases page](https://github.com/Mr-Dark-debug/Moonfold/releases). Problems and ideas go to the [issue tracker](https://github.com/Mr-Dark-debug/Moonfold/issues).
