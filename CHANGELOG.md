# Changelog

Notable changes to Moonfold. Versions follow [Semantic Versioning](https://semver.org); betas
carry a `-beta.N` suffix. Each release's notes are in `docs/releases/`.

## 0.1.0-beta.1

The first Moonfold beta, forked from T3 Code (MIT). Notes:
[docs/releases/v0.1.0-beta.1.md](docs/releases/v0.1.0-beta.1.md).

### Added

- Provider handoff: continue a thread in another agent when one hits its usage limit, with a
  brief you preview before it is sent, secret redaction, a fallback order, allowed agents, and an
  automatic mode.
- Gemini CLI and other ACP agents, with usage-limit detection from their error wording.
- Scheduled tasks, plugins (Codex, Claude Code and SKILL.md), editable memories, a browser pane
  with per-site rules, Word and Excel previews, thread artifacts, and computer use on Windows.
- A provider matrix in the README generated from checks run on real installs.
- Release pipeline for macOS, Windows and Linux with checksums, an SBOM and an update feed on
  this repository's GitHub Releases; install scripts for macOS, Linux and Windows.

### Changed

- Rebranded from T3 Code; T3's hosted services, telemetry key and release accounts removed.
  Telemetry is off unless you configure your own receiver.
- Local desktop starts show a splash at once and read the Windows environment only once.

### Security

- Desktop IPC answers only the app's own frame; the app's CSP allows inline scripts by hash only;
  session cookies are `Secure` over HTTPS; the app session grants only listed permissions.
- Usage hubs, which pooled provider logins, are removed. Reading Claude's stored login for
  banked resets is opt-in.
- Patched transitive dependencies; QA report in docs/QA-REPORT.md.
