# DeepSeek Harness

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`) is DeepSeek's
open-source, plugin-based agent harness. Moonfold runs it through its ACP profile
(`dsh --profile acp`), with the model providers you configured in your own DeepSeek Harness setup.

## Add it

1. Open **Settings → Providers → Add provider**.
2. Under **Or choose from ACP Registry**, search for **DeepSeek Harness** and select **Add**.
   Moonfold installs the pinned `@deepseek-ai/dsh` package with `npx` on the machine that runs the
   Moonfold server. Node.js must be installed there.
3. Skip the sign-in step: DeepSeek Harness has no in-app sign-in. It uses the providers and keys
   in its own configuration.

## Give it a model

DeepSeek Harness keeps its configuration in `~/.dsh` (or `$DSH_HOME`). The easiest way to add a
model is its own web UI: run `npx @deepseek-ai/dsh web` once, open **Settings → Models**, and add
your DeepSeek API key or another provider. You can also export `DEEPSEEK_API_KEY` in the instance's
**Environment** in Moonfold's provider settings.

To use a local model, add a custom provider in DeepSeek Harness that points at Ollama
(`http://127.0.0.1:11434/v1`) or LM Studio (`http://127.0.0.1:1234/v1`) with the OpenAI Chat
Completions protocol. Its models then appear in Moonfold's model picker under DeepSeek Harness.

The ACP profile has its own default model. Pick the model you want in the composer: Moonfold sends
your choice, and the reasoning effort, to DeepSeek Harness at the start of each turn.

## What works

- Threads, steering by sending another message, stopping a turn, model and reasoning-effort
  pickers, Moonfold's MCP tools and your MCP servers.
- Handoff: when DeepSeek's API reports an exhausted balance or quota, or a rate limit, the turn
  ends as a usage limit and Moonfold offers to continue in another agent.
- Not available through ACP: DeepSeek Harness's own plans, todos, terminal views and
  questions; it shows its work as messages and tool calls instead.

Moonfold is not affiliated with or endorsed by DeepSeek.
