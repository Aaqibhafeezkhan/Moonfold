# Privacy

Moonfold is free, open-source software that runs on your own computer. There is no Moonfold
account and no Moonfold server that receives your data.

## What Moonfold stores

Moonfold keeps its state on your machine, under the Moonfold home directory (`~/.moonfold` by
default): projects, threads, settings, attachments and logs. Delete that directory to remove it.

## What Moonfold sends

- **Your agents.** Moonfold starts the provider CLIs you installed (Codex, Claude Code, Cursor and
  others) with your own logins. Prompts and code you send to an agent go to that provider under
  the provider's own terms.
- **Integrations you enable.** Source-control features call the hosting service you configured
  (GitHub, GitLab and others) with your own credentials.
- **Update and model checks.** Moonfold can check GitHub Releases for app updates, npm for
  provider CLI updates, and this repository for the model manifest.
- **Usage data: none by default.** Anonymous product events are sent only if you opt in with your
  own analytics project. See [Product usage data](../user/telemetry.md).
- **Remote access** connects your own devices directly, over your network, Tailscale or SSH.

## Questions

Open a discussion or an issue at https://github.com/Mr-Dark-debug/Moonfold.
