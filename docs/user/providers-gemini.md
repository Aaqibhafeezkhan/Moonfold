# Gemini CLI

Gemini CLI speaks ACP, so Moonfold runs it through the generic ACP integration; there is no
separate Gemini provider.

## Add it

1. Install Gemini CLI on the machine that runs your Moonfold server and sign in there.
2. Open **Settings → Providers → Add provider**.
3. Either search the ACP Registry for **Gemini CLI** and select **Add**, or choose
   **Local ACP command** with the executable `gemini` and one argument, `--acp`.

## Signing in

Google no longer accepts Gemini CLI's **Log in with Google** for individual accounts; starting a
session with it fails with "This client is no longer supported for Gemini Code Assist for
individuals". Use one of the other methods Gemini CLI offers:

- **Gemini API key**: set `GEMINI_API_KEY` in the instance's environment settings.
- **Vertex AI**: set your Google Cloud project and location as Gemini CLI documents.

Google's suggested route for individual accounts is Antigravity; see
[Antigravity](./providers-antigravity.md).

## Usage limits and handoff

When Gemini reports an exhausted quota (`RESOURCE_EXHAUSTED`, HTTP 429), Moonfold stops the turn
as a usage limit, so the thread can continue in another agent. See
[Provider handoff](./provider-handoff.md).
