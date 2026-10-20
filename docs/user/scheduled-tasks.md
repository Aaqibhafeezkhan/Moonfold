# Scheduled tasks

A scheduled task sends a prompt to an agent on a schedule. Create and edit tasks in
**Settings → Scheduled tasks**; agents can also create them for you through Moonfold's tools.
Each run starts a new thread in the task's project, or continues the thread the task is bound to.

## Keep a thread going

**Run in** chooses where each run happens: a new thread every time, or one of the project's
threads, which then receives the prompt on every run, queued behind any work already going on.
To set one up from a thread, choose **Schedule a follow-up…** from its menu.

**Use the pull request fix template** starts a task that checks a thread's pull request every
hour and fixes failing checks or open review comments in that thread's worktree; choose the pull
request's thread under **Run in**. It never touches the project's main checkout.

**Add a skill** under the prompt inserts a `$skill` mention for the chosen model's provider, so
each run uses that skill.

## Choose when a task runs

- **At a time** runs at a time of day on the weekdays you pick, in the server's time zone.
- **Once** runs a single time at a date and time. If Moonfold was not running then, the task is
  marked as missed instead of running late.
- **Repeat** follows a schedule you pick from presets (every hour, every day, weekdays, Mondays,
  the first of the month) or write as a cron expression: minute, hour, day of month, month and
  day of week, for example `30 8 * * 1-5` for 08:30 on weekdays. The form names the next few runs
  as you type. Add **Until** to stop after a last day.
- **Every interval** runs every so many minutes (at least one).
- **On webhook** runs when another service calls the task's URL; see
  [Webhook automations](project-settings.md#webhook-automations).

**Once** and **Repeat** read their times in the task's own time zone (your browser's when you
create the task), so a task keeps its local time even when the server runs elsewhere. Use an IANA
name such as `Europe/Berlin` or `Asia/Kolkata`.

A run that is more than ten minutes late, for example because the computer was asleep, is skipped
and the task waits for its next time. Interval tasks catch up with a single run instead.

## See what each run did

Choose **Run history** from a task's menu. Each run shows what started it (its schedule, **Run
now**, or a webhook), whether the agent's turn succeeded, failed or was cancelled, and a link to
its thread. A run whose prompt could not be sent shows why. The last 100 runs are kept.

## Choose when you hear about runs

**Notify me** in the task form decides which runs notify you when their agent finishes: after
every run, only when a run fails, or never. Requests for input or approval always notify, since
the agent waits for them. Notifications appear on devices where Moonfold is open, following your
notification settings.

## Keep tasks running with the window closed

Tasks run while the Moonfold server runs. On macOS the desktop app keeps running after you close
its windows. On Windows and Linux, turn on **Settings → General → Keep running in the
background**: closing the last window then leaves Moonfold in the system tray, and its menu opens
a window again or quits. You can also run the server as a
[background service](background-service.md) on Linux and macOS.
