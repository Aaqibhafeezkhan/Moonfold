# Computer use: research and design

Computer use lets an agent see and operate desktop apps on the environment's machine: read what
a window shows, click, type and press keys. It is the riskiest thing Moonfold can hand an agent,
so it ships off by default, asks before touching each app, shows when it is active, stops on one
click, and logs every action. This page records what each OS offers, what can go wrong, and what
Moonfold builds. It is written from OS documentation and our own testing on Windows 11.

## What each OS offers

### Windows

- **Reading the screen.** UI Automation (UIA) exposes every window as a tree of elements with a
  control type, name, automation id, bounding rectangle, enabled state and, for editable
  controls, a value. It is built into Windows and reachable from .NET (`UIAutomationClient`).
  Password fields report themselves (`IsPassword`) and do not expose their value.
- **Pixels.** GDI (`CopyFromScreen`, `PrintWindow`) captures a window or screen region without
  extra components. The Desktop Duplication API is faster but needs DirectX plumbing that the
  agent does not need for a few screenshots per turn.
- **Acting.** `SendInput` synthesizes mouse and keyboard input, including Unicode text. Windows
  applies User Interface Privilege Isolation: input from a normal process cannot reach a window
  of an elevated process, and nothing reaches the secure desktop (UAC prompts, the lock screen,
  Ctrl+Alt+Del). These limits are a safety floor we rely on rather than work around.
- **Windows and apps.** `EnumWindows` with `GetWindowThreadProcessId` maps top-level windows to
  their process, which is how an app is identified for approvals.

### macOS

- The Accessibility API (`AXUIElement`) gives the element tree; `CGEvent` posts input. Both need
  the user to grant Accessibility access to the process in System Settings, and screenshots need
  Screen Recording access. A per-process grant means the Moonfold helper, not the agent CLI, must
  hold it. Not built yet: this machine runs Windows, and shipping without verifying the permission
  flow on a real Mac would break the rule that features work before they are called done.

### Linux

- On X11, AT-SPI over D-Bus gives the element tree and XTest synthesizes input. On Wayland,
  synthetic input and screen capture go through the RemoteDesktop and ScreenCast portals, which
  prompt the user per session. The two paths differ enough to need their own testing. Not built
  yet, for the same reason as macOS.

## Risks and how Moonfold answers them

| Risk                                                              | Answer                                                                                                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| An agent acts on an app the user did not expect                   | Off by default; every app needs approval (once, this chat, or always) before the agent reads or acts on it.                                       |
| Text on screen tells the agent to do something (prompt injection) | Window text reaches the agent as tool output, never as instructions; actions still need the app's approval; the user can stop everything at once. |
| Reading secrets                                                   | Password fields are skipped when reading; their values are never returned. Screenshots are taken only of approved apps' windows.                  |
| Acting with more rights than the user expects                     | Moonfold runs unelevated, so Windows itself blocks input to elevated windows and to the secure desktop.                                           |
| The user cannot tell it is happening                              | While an agent uses an app, every client shows which thread and app, with a Stop button.                                                          |
| Something goes wrong mid-way                                      | Stop turns computer use off, ends the automation helper, and fails the waiting calls.                                                             |
| Not knowing what happened afterwards                              | Every read and action is logged with its thread, app, time and outcome; the log is in settings.                                                   |

## Design

- **Helper.** One long-lived PowerShell process per server, started on first use while computer
  use is on. It loads small .NET helpers for UIA, `SendInput`, window enumeration and capture,
  and answers one JSON request per line on stdin. No extra binaries ship; nothing runs while
  computer use is off.
- **Tools.** The `moonfold` MCP server offers `computer_list_apps`, `computer_screenshot`,
  `computer_read`, `computer_click`, `computer_type`, `computer_key` and `computer_scroll`. Each
  names a window from `computer_list_apps`. Coordinates are relative to that window, so an agent
  cannot click outside an approved app by accident. Only agents Moonfold launched in a thread get
  them.
- **Approvals.** An app is its process name (for example `notepad.exe`). The first time a thread
  touches an app, every connected client asks: allow once, allow in this chat, always allow, or
  deny. Always-allowed apps are listed in settings and can be removed.
- **Indicator and stop.** An activity stream tells clients which threads used which apps in the
  last 30 seconds; clients show it with a Stop button that turns computer use off.
- **Log.** A table keeps each action (thread, app, action, short detail, result, time); settings
  shows the newest entries and can clear them.

## Not in this phase

- macOS and Linux helpers (see above).
- Screen activity history (recording what the user does) stays out of scope.
- Driving the secure desktop, elevated apps, or other users' sessions: not possible by design.
