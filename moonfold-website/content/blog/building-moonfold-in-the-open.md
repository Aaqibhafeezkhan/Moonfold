---
title: Building Moonfold in the open, on top of T3 Code
description: Why Moonfold is a fork of T3 Code, what stays open and local, and the rules we hold ourselves to about logins, telemetry and licences.
category: Open source
date: 2026-10-20
---

Moonfold is an open-source workspace for coding agents. It is a fork of [T3 Code](https://github.com/pingdotgg/t3code), which is MIT licensed, and it keeps that licence and its copyright notice. We credit the upstream project in the README and on the About screen, and we add our own work on top.

The headline addition is provider handoff: when one agent hits a usage limit, the same task continues in another agent with its context preserved. The rest of the work is making the workspace feel complete: threads, plan mode, review, skills, plugins, MCP, scheduled tasks, memories and themes.

## Your logins stay yours

Each provider runs as your own local CLI with your own account. Moonfold never proxies, pools, resells or shares anyone's login or tokens, and it never becomes a hosted token service. The app is local first. If you reach it from another device, you do that over a network you control.

## No hosted services of ours

We removed or replaced the upstream project's hosted services: the relay, the update feed, telemetry and domains. Updates and downloads come from this repository's releases. Product usage data is off by default and opt in only.

## Honest about what works

Features that are not finished are not shown as if they worked. The beta notes list what has been checked on a real machine and what has not, and the installers say plainly that they are unsigned. Test fixtures never ship in the app.

## Not affiliated

Moonfold names Codex, Claude Code, Gemini CLI, Cursor, OpenCode and others only to say it works with them. It is not affiliated with or endorsed by their makers.

## How to help

- Try a [release](https://github.com/Mr-Dark-debug/Moonfold/releases) and report what breaks.
- Pick an issue labelled `good first issue`. Two of the changes in beta 2, an OpenCode handoff mapping and per-page edit links in the docs, came from first-time contributors.
- Fix or extend a page in the [docs](/docs/). Every page has an **Edit this page** link.

The roadmap, the reasoning and the code are public in the [repository](https://github.com/Mr-Dark-debug/Moonfold).
