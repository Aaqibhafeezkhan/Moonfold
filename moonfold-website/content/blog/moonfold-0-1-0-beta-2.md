---
title: Moonfold 0.1.0-beta.2 release notes
description: A new mark, OpenCode handoffs and Edit this page links from our first outside contributors, and the known limits of this beta.
category: Releases
date: 2026-10-26
---

The second Moonfold beta is out. It has a new look, OpenCode handoffs and docs edit links from our first outside contributors, and fixes from the first week.

## What is new

- **A new mark.** The app icon, favicons, installer artwork and docs site use the ringed-moon logo, and the command-line installers draw it in your terminal while they work.
- **OpenCode hands off at its usage limit.** Its limit errors now start a handoff like Codex and Claude Code do, instead of showing as an ordinary error. Thanks to @Aaqibhafeezkhan.
- **Edit this page links** on every page of the docs. Thanks to @sadhana-s-codez.
- After a handoff, the composer stays on the thread's new agent instead of switching back.
- Releases are marked as the latest release on GitHub, and every update check, installer and model or schema download points only at this repository.

## Install

Download the `.dmg`, `.exe`, or `.AppImage` / `.deb` for your machine from the [releases page](https://github.com/Mr-Dark-debug/Moonfold/releases). Beta 1 installs update to this release on their own. From a terminal, use the installer script for macOS and Linux, or the PowerShell one on Windows; both are in the [install guide](/docs/install/), and you can read the script before running it. `SHA256SUMS` lists a checksum for every file, and the SBOM lists every dependency.

## Known limits

We would rather list these than have you find them:

- The installers are **not signed**, so macOS and Windows warn before the first launch.
- The desktop app takes about four seconds to become usable on a mid-range Windows laptop. A splash shows within a second. Getting under three seconds is on the list.
- Verified on real installs: Codex CLI and Claude Code on Windows 11. Gemini CLI connects over ACP. Cursor, Grok Build and Antigravity are carried over from T3 Code and were not checked on a real install for this beta.
- Cursor and other ACP agents report limits as ordinary errors, so hand off from them by hand.
- Computer use is Windows only.

This is a beta: back up anything important before letting an agent change it. Problems and ideas go to the [issue tracker](https://github.com/Mr-Dark-debug/Moonfold/issues), and issues labelled `good first issue` are a good place to start contributing.
