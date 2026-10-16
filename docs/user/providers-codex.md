# Codex

Use your ChatGPT plan or an existing Codex CLI login to code in Moonfold.

## Connect with ChatGPT

Connect during onboarding or in **Settings → Providers**. For a remote machine,
select that environment first. Moonfold handles Codex installation; sign in on
OpenAI and allow sharing of your ChatGPT plan.

Manage shared usage and credits in ChatGPT through **Manage usage** in Moonfold.
If a request uses a feature that ChatGPT sharing does not support, use another
provider for that request.

When reconnecting, choose the same account in Moonfold and on OpenAI's sign-in
page. Disconnecting stops running threads but keeps their history and lets you
reconnect later.

If remote sign-in cannot return automatically, paste the full URL from the final
localhost page into the sign-in panel, even if that page could not load.

## Use an existing Codex login

Moonfold can use your installed Codex and its existing login. Run `codex login`
on the environment's machine to sign in. [Provider setup](./install.md#providers)
covers installation and custom configuration.

## Use multiple accounts

Add another ChatGPT account in **Settings → Providers**, then select the account
from the thread's model picker. Compatible accounts can continue the same thread.
Connecting accounts through Moonfold leaves your CLI login unchanged.

### Multiple CLI logins

A shared Codex home with a shadow home lets work and personal accounts continue
the same threads. The accounts share Codex sessions and configuration while keeping
their own login and available models.

Keep your first account in `~/.codex`. On the environment's machine, sign the
second account into a fresh directory:

```bash
mkdir -p ~/.codex_personal
CODEX_HOME=~/.codex_personal codex login
```

Then add a second Codex instance in **Settings > Providers**:

| Instance       | CODEX_HOME path | Shadow home path    |
| -------------- | --------------- | ------------------- |
| Codex Work     | `~/.codex`      | Leave empty         |
| Codex Personal | `~/.codex`      | `~/.codex_personal` |

Both instances must use the same **CODEX_HOME path**. Moonfold prepares the shared
state in the shadow directory; do not populate it by copying your whole Codex
home.

The shadow account needs its own `auth.json` file. If Codex uses an OS credential
store, configure file storage for this setup. See
[OpenAI's credential storage guide](https://learn.chatgpt.com/docs/auth#credential-storage).

Use a completely separate **CODEX_HOME path**, with no shadow home, when you want
separate Codex sessions and configuration. That instance cannot continue threads
from the other home.

## Switch accounts in an existing thread

Choose the other account from the thread's model picker. Moonfold offers compatible
Codex instances that share the thread's **CODEX_HOME path**. Changing accounts does
not move the conversation into a separate Codex home.

If the account is missing from the picker, compare the home paths in provider
settings. If two instances show the same unexpected account or models, check their
reported accounts, refresh provider status, and confirm the second instance has
its own shadow path and login. A shadow-home conflict usually means the directory
contains a copied Codex setup. Use a fresh shadow directory and sign in again.

## Answer questions while Codex works

Codex can ask a question and keep working. Answer it in the thread's question
panel. The answer becomes a new message: it reaches the active turn, or starts
another turn if Codex has finished. Unanswered questions survive reconnects.
If you do not want to answer, dismiss the question from its panel. Dismissing
closes it without sending anything to Codex. This requires a Codex version that
supports async questions.

## Approve app access

Codex tools can request access to another app. Respond to the named app's request
in the thread on web or desktop. Some tools offer access for one request,
the current session, or permanently. See [Permission modes](./permission-modes.md)
for command and file approvals.

## Review changes

Send `/review` to have Codex review your uncommitted changes. The review runs in the thread, and
the findings arrive as Codex's reply.

- `/review branch main` reviews everything on your branch against `main`.
- `/review commit <sha>` reviews one commit.
- `/review` followed by any other text reviews with those instructions, for example
  `/review focus on error handling`.

The diff panel has a review button on Codex threads. It puts the matching command for the
changes on screen into the composer, so you can add a focus before you send.

## Manage Codex's MCP servers, skills and hooks

Open **Settings → Providers**, select a Codex provider, and open the section you need. Each one
reads Codex's own configuration on the computer running that environment, so it matches what Codex
threads use.

- **MCP servers** lists every server with its tools and any startup error. Select **Sign in** for a
  server that needs it; a remote session finishes the sign-in in a browser on the computer running
  the environment. Select **Reload config** after editing Codex's `config.toml`.
- **Skills** lists the skills Codex can use. Turn one off to stop Codex offering it, or select
  **View** to read its `SKILL.md`. Pick a project to include that project's skills.
- **Hooks** shows the commands Codex runs on its own events. Edit them in Codex's configuration.
- **Import from other agents** finds skills, MCP servers and recent sessions from other coding
  agents on the computer and copies the ones you pick into Codex.
- **Account usage** shows the tokens the signed-in account has used, as OpenAI reports them.

## Codex says I hit a usage limit

When Codex stops on a usage limit, the thread names the window that ran out and
when it resets, when Codex reports them. Send the message again after the reset. On a workspace plan the
message also says whether your workspace owner needs to add credits or raise the
spend limit to continue sooner.

## Send feedback to OpenAI

In an existing Codex thread, send `/feedback` with an optional description, for
example `/feedback The agent stopped before finishing the tests`. This uploads
the conversation and Codex logs to OpenAI. The returned thread ID can be shared
with OpenAI support.
