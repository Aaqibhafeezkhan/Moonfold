# Product usage data

Moonfold collects no product usage data by default and ships no analytics key.

You can opt in to sending anonymous product events to a PostHog project you control. Set all three
variables in the server's environment before starting it:

```bash
MOONFOLD_TELEMETRY_ENABLED=true
MOONFOLD_POSTHOG_KEY=<your project key>
MOONFOLD_POSTHOG_HOST=https://<your posthog host>
```

Events are tied to a hashed installation identifier and include the provider, model, reasoning
effort, permission mode, turn result, duration, and main-agent token totals when available. They
never include prompts, responses, file contents, authentication tokens, conversation IDs, raw
provider events, or child-agent output.

The desktop app reads these variables from your shell profile (for example `~/.zshrc`) on macOS and
Linux, so export them there and restart the app. On Windows, set them as user environment variables.

## Export diagnostics to your own receiver

To send traces, metrics, or logs to an OpenTelemetry receiver, open
**Settings > General > Diagnostics**, select an environment, and enter each signal's OTLP HTTP
endpoint under **OpenTelemetry export** (for example `http://localhost:4318/v1/traces`). Save, then
restart that environment's server. The receiver must be reachable from the server's machine.
**Test** sends an empty export from the server to check an endpoint before or after you save it;
saved endpoints are checked when the section opens. Checks send authentication headers only to
the signal's currently running endpoint and do not follow redirects. To check a new endpoint
that requires authentication, save it and restart the server first.

`MOONFOLD_OTLP_*_URL` and standard `OTEL_EXPORTER_OTLP_*` environment variables override the saved
settings. For endpoints saved here or set with `MOONFOLD_OTLP_*_URL`, set `MOONFOLD_OTLP_HEADERS` for
receivers that need authentication and `MOONFOLD_OTLP_PROTOCOL=http/protobuf` for receivers that do
not accept JSON. An endpoint set with `OTEL_EXPORTER_OTLP_*` takes its headers and protocol from
`OTEL_EXPORTER_OTLP_HEADERS` and `OTEL_EXPORTER_OTLP_PROTOCOL` instead.
