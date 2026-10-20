import { useAtomValue } from "@effect/atom-react";
import { MonitorIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import {
  type ComputerUseLogEntry,
  type EnvironmentId,
  resolveEnvironmentMachineKind,
} from "@moonfold/contracts";
import {
  type AtomCommandResult,
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@moonfold/client-runtime/state/runtime";

import { requestConfirmDialog } from "../../confirmDialog";
import { formatRelativeTimeLabel } from "../../timestampFormat";
import type { EnvironmentPresentation } from "../../state/environments";
import { useEnvironmentQuery } from "../../state/query";
import { serverEnvironment } from "../../state/server";
import { useAtomCommand } from "../../state/use-atom-command";
import { EnvironmentMachineIcon } from "../EnvironmentMachineIcon";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../ui/empty";
import { Switch } from "../ui/switch";
import { stackedThreadToast, toastManager } from "../ui/toast";
import { SettingsPageContainer, SettingsRow, SettingsSection } from "./settingsLayout";
import { useSettingsScope } from "./SettingsScopeContext";

const ACTION_LABELS: Record<ComputerUseLogEntry["action"], string> = {
  list_apps: "Listed apps",
  screenshot: "Screenshot",
  read: "Read window",
  click: "Click",
  type: "Typed",
  key: "Keys",
  scroll: "Scroll",
};

function reportFailure(title: string, result: AtomCommandResult<unknown, unknown>) {
  if (result._tag !== "Failure" || isAtomCommandInterrupted(result)) return;
  toastManager.add(
    stackedThreadToast({
      type: "error",
      title,
      description: String(squashAtomCommandFailure(result)),
    }),
  );
}

/** Settings → Computer use: turn it on, review allowed apps, and see what agents did. */
export function ComputerUseSettings() {
  const { scope, environments } = useSettingsScope();
  return (
    <SettingsPageContainer>
      <SettingsSection title="Computer use" variant="plain">
        <p className="text-sm text-muted-foreground">
          Lets agents see and operate apps on the environment's computer: read windows, click, type
          and press keys. Each app needs your approval, and every action is logged. Actions in other
          apps can't be undone, so approve only apps you are ready for an agent to change.
        </p>
        {scope.kind === "unavailable" ? (
          <SettingsSection title="Unavailable selection">
            <SettingsRow title={scope.message} />
          </SettingsSection>
        ) : environments.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MonitorIcon />
              </EmptyMedia>
              <EmptyTitle>No environments available</EmptyTitle>
              <EmptyDescription>Connect an environment to manage computer use.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-8">
            {environments.map((entry) => (
              <EnvironmentComputerUse
                key={entry.environmentId}
                environment={entry}
                showEnvironmentHeading={environments.length > 1}
              />
            ))}
          </div>
        )}
      </SettingsSection>
    </SettingsPageContainer>
  );
}

function EnvironmentComputerUse(props: {
  readonly environment: EnvironmentPresentation;
  readonly showEnvironmentHeading: boolean;
}) {
  const { environmentId } = props.environment;
  const connected =
    props.environment.connection.phase === "connected" && props.environment.serverConfig !== null;
  const canWrite = useAtomValue(
    serverEnvironment.setComputerUseEnabled.permissionAtom(environmentId),
  );
  const stateQuery = useEnvironmentQuery(
    connected ? serverEnvironment.computerUseState({ environmentId, input: {} }) : null,
  );
  const setEnabled = useAtomCommand(serverEnvironment.setComputerUseEnabled, {
    label: "computer use enabled",
  });
  const removeApp = useAtomCommand(serverEnvironment.removeComputerUseApp, {
    label: "computer use app removal",
  });
  const clearLog = useAtomCommand(serverEnvironment.clearComputerUseLog, {
    label: "computer use log clear",
  });
  const [busy, setBusy] = useState(false);
  const state = stateQuery.data;

  const toggle = async () => {
    if (!state || busy) return;
    if (!state.enabled) {
      const message =
        "Turn on computer use?\nAgents can then ask to read and operate apps on this computer. You approve each app, and Stop ends it at any time.";
      const confirmed = (await requestConfirmDialog(message)) ?? window.confirm(message);
      if (!confirmed) return;
    }
    setBusy(true);
    reportFailure(
      "Could not change computer use",
      await setEnabled({ environmentId, input: { enabled: !state.enabled } }),
    );
    setBusy(false);
    stateQuery.refresh();
  };

  return (
    <SettingsSection
      title={props.environment.label}
      hideTitle={!props.showEnvironmentHeading}
      icon={
        <EnvironmentMachineIcon
          kind={resolveEnvironmentMachineKind(props.environment.serverConfig)}
          className="size-3.5"
        />
      }
    >
      {!connected ? (
        <SettingsRow
          title="Environment disconnected"
          description={`Reconnect ${props.environment.label} to manage computer use.`}
        />
      ) : stateQuery.error ? (
        <SettingsRow title="Could not load computer use" description={stateQuery.error} />
      ) : !state ? (
        <SettingsRow title="Loading computer use…" role="status" />
      ) : !state.supported ? (
        <SettingsRow
          title="Not available on this system"
          description="Computer use works on Windows environments for now."
        />
      ) : (
        <>
          <SettingsRow
            title="Use computer"
            description="Off by default. Turning it off stops every agent action at once."
            control={
              <Switch
                checked={state.enabled}
                disabled={busy || !canWrite}
                aria-label="Use computer"
                onCheckedChange={() => void toggle()}
              />
            }
          />
          {state.allowedApps.length === 0 ? (
            <SettingsRow
              title="Always-allowed apps"
              description="None. Agents ask before using each app."
            />
          ) : (
            state.allowedApps.map((app) => (
              <SettingsRow
                key={app.app}
                title={app.app}
                description="Always allowed"
                control={
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Stop always allowing ${app.app}`}
                    disabled={!canWrite}
                    onClick={async () => {
                      reportFailure(
                        "Could not remove the app",
                        await removeApp({ environmentId, input: { app: app.app } }),
                      );
                      stateQuery.refresh();
                    }}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                }
              />
            ))
          )}
          <ActionLog
            environmentId={environmentId}
            entries={state.log}
            canClear={canWrite}
            onClear={async () => {
              reportFailure(
                "Could not clear the log",
                await clearLog({ environmentId, input: {} }),
              );
              stateQuery.refresh();
            }}
            onRefresh={stateQuery.refresh}
          />
        </>
      )}
    </SettingsSection>
  );
}

function ActionLog(props: {
  readonly environmentId: EnvironmentId;
  readonly entries: ReadonlyArray<ComputerUseLogEntry>;
  readonly canClear: boolean;
  readonly onClear: () => void;
  readonly onRefresh: () => void;
}) {
  return (
    <SettingsRow
      title="Activity log"
      description="Newest first. Typed text is never stored, only how much was typed."
      control={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={props.onRefresh}>
            Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!props.canClear || props.entries.length === 0}
            onClick={props.onClear}
          >
            Clear
          </Button>
        </div>
      }
    >
      {props.entries.length === 0 ? (
        <p className="px-4 pb-3 text-xs text-muted-foreground">No activity yet.</p>
      ) : (
        <ul className="max-h-80 divide-y divide-border overflow-auto px-4 pb-3">
          {props.entries.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center gap-2 py-1.5 text-xs">
              <Badge
                size="sm"
                variant={
                  entry.outcome === "done"
                    ? "outline"
                    : entry.outcome === "refused"
                      ? "warning"
                      : "error"
                }
              >
                {ACTION_LABELS[entry.action]}
              </Badge>
              {entry.app ? <span className="font-medium">{entry.app}</span> : null}
              <span className="text-muted-foreground">{entry.detail}</span>
              {entry.error ? <span className="text-destructive">{entry.error}</span> : null}
              <span className="ml-auto text-muted-foreground">
                {formatRelativeTimeLabel(entry.at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SettingsRow>
  );
}
