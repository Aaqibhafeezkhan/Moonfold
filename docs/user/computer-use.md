# Computer use

Computer use lets agents see and operate desktop apps on the environment's computer: read a
window's controls, take screenshots, click, type, press keys and scroll. It works on Windows
environments and is off until you turn it on in **Settings → Computer use**.

## Before you turn it on

What an agent does in another app happens for real and can't be undone from Moonfold. An app may
also hold more than you expect: an editor can reopen documents from your last session, a mail app
shows your inbox. Approve only apps you are ready for an agent to change, and keep the Stop
button in view.

## Approving apps

The first time a thread wants an app, every connected Moonfold window asks you, naming the thread
and the window:

- **Allow in this chat** lets this thread use the app until Moonfold restarts.
- **Always allow** lets every thread use it; the app then appears under **Always-allowed apps**,
  where you can remove it.
- **Deny**, or closing the question, refuses. The agent is told and should ask you in chat.

Some windows are never available to agents, whatever you approve: Moonfold's own (including a
browser tab showing Moonfold), the Windows screens for passwords and permission prompts, File
Explorer, Settings, Task Manager and other system tools, Store apps (which share one Windows
process, so approving one would approve them all), and password managers. Windows itself keeps
apps running as administrator out of reach. Password fields are never read, and the Windows key
can't be pressed. Agents see the titles of only the windows they may use.

Typing stops the moment another window takes focus, so text never lands in a different app.

## While an agent works

A bar at the bottom of every Moonfold window shows which app an agent is using and in which
thread. **Stop** turns computer use off at once and refuses anything still waiting; turn it on
again in settings when you want.

## Activity log

Settings lists every read and action with its thread, app, time and result. Typed text is never
stored, only how many characters were typed. **Clear** empties the log.

## Providers with their own computer use

If a provider has its own computer-use feature turned on (some Codex installs do), an agent may
use it instead of Moonfold's, and then Moonfold's approvals, log and Stop don't apply. Turn the
provider's own feature off in its settings if you want Moonfold's controls on everything.
