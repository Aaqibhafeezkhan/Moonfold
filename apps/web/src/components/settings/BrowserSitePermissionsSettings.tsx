import { useAtomValue } from "@effect/atom-react";
import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import {
  type BrowserSiteDecision,
  type BrowserSiteDecisions,
  type BrowserSiteRule,
  type EnvironmentId,
  resolveEnvironmentMachineKind,
} from "@moonfold/contracts";
import {
  type AtomCommandResult,
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@moonfold/client-runtime/state/runtime";

import type { EnvironmentPresentation } from "../../state/environments";
import { useEnvironmentQuery } from "../../state/query";
import { serverEnvironment } from "../../state/server";
import { useAtomCommand } from "../../state/use-atom-command";
import { EnvironmentMachineIcon } from "../EnvironmentMachineIcon";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { stackedThreadToast, toastManager } from "../ui/toast";
import { normalizeSiteInput, SITE_DECISION_LABELS } from "./browserSitePermissions.logic";
import { SettingsRow, SettingsSection } from "./settingsLayout";
import { useSettingsScope } from "./SettingsScopeContext";

const DECISIONS: ReadonlyArray<BrowserSiteDecision> = ["allow", "ask", "block"];

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

function DecisionSelect(props: {
  readonly value: BrowserSiteDecision;
  readonly label: string;
  readonly disabled: boolean;
  readonly onChange: (decision: BrowserSiteDecision) => void;
}) {
  return (
    <Select
      value={props.value}
      onValueChange={(value) => {
        if (value === "allow" || value === "ask" || value === "block") props.onChange(value);
      }}
      disabled={props.disabled}
    >
      <SelectTrigger size="sm" aria-label={props.label}>
        <SelectValue>{SITE_DECISION_LABELS[props.value]}</SelectValue>
      </SelectTrigger>
      <SelectPopup>
        {DECISIONS.map((decision) => (
          <SelectItem key={decision} value={decision}>
            {SITE_DECISION_LABELS[decision]}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}

/** Settings → Integrations → Agent browsing: what agents may do on each website. */
export function BrowserSitePermissionsSettings() {
  const { environments } = useSettingsScope();
  const connected = environments.filter(
    (entry) => entry.connection.phase === "connected" && entry.serverConfig !== null,
  );
  if (connected.length === 0) return null;
  return (
    <>
      {connected.map((entry) => (
        <EnvironmentSiteRules
          key={entry.environmentId}
          environment={entry}
          showEnvironmentName={connected.length > 1}
        />
      ))}
    </>
  );
}

function EnvironmentSiteRules(props: {
  readonly environment: EnvironmentPresentation;
  readonly showEnvironmentName: boolean;
}) {
  const { environmentId } = props.environment;
  const canWrite = useAtomValue(serverEnvironment.setBrowserSiteRule.permissionAtom(environmentId));
  const policyQuery = useEnvironmentQuery(
    serverEnvironment.browserSitePolicy({ environmentId, input: {} }),
  );
  const setDefaults = useAtomCommand(serverEnvironment.setBrowserSiteDefaults, {
    label: "browser site defaults",
  });
  const [newSite, setNewSite] = useState("");
  const [newDecision, setNewDecision] = useState<BrowserSiteDecision>("block");
  const setRule = useAtomCommand(serverEnvironment.setBrowserSiteRule, {
    label: "browser site rule",
  });
  const policy = policyQuery.data;
  const normalizedSite = normalizeSiteInput(newSite);

  const changeDefaults = async (next: BrowserSiteDecisions) => {
    reportFailure(
      "Could not change the defaults",
      await setDefaults({ environmentId, input: next }),
    );
    policyQuery.refresh();
  };
  const addRule = async () => {
    if (normalizedSite === null) return;
    const result = await setRule({
      environmentId,
      input: { site: normalizedSite, browse: newDecision, upload: newDecision },
    });
    reportFailure("Could not add the site", result);
    if (result._tag === "Success") setNewSite("");
    policyQuery.refresh();
  };

  return (
    <SettingsSection
      id={`agent-browsing-${environmentId}`}
      title={
        props.showEnvironmentName ? `Agent browsing · ${props.environment.label}` : "Agent browsing"
      }
      icon={
        props.showEnvironmentName ? (
          <EnvironmentMachineIcon
            kind={resolveEnvironmentMachineKind(props.environment.serverConfig)}
            className="size-3.5"
          />
        ) : undefined
      }
    >
      {policyQuery.error ? (
        <SettingsRow title="Could not load site permissions" description={policyQuery.error} />
      ) : !policy ? (
        <SettingsRow title="Loading site permissions…" role="status" />
      ) : (
        <>
          <SettingsRow
            title="Opening sites"
            description="When an agent opens or navigates to a site without a rule of its own. Local dev servers are always allowed."
            control={
              <DecisionSelect
                label="Default for opening sites"
                value={policy.defaults.browse}
                disabled={!canWrite}
                onChange={(browse) => void changeDefaults({ ...policy.defaults, browse })}
              />
            }
          />
          <SettingsRow
            title="Uploading files"
            description="When an agent hands a page files from this machine."
            control={
              <DecisionSelect
                label="Default for uploading files"
                value={policy.defaults.upload}
                disabled={!canWrite}
                onChange={(upload) => void changeDefaults({ ...policy.defaults, upload })}
              />
            }
          />
          {policy.rules.map((rule) => (
            <SiteRuleRow
              key={rule.site}
              environmentId={environmentId}
              rule={rule}
              canWrite={canWrite}
              onChanged={policyQuery.refresh}
            />
          ))}
          <SettingsRow
            title="Add a site"
            description="A rule for a site also covers its subdomains."
            control={
              <form
                className="flex items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void addRule();
                }}
              >
                <Input
                  size="sm"
                  value={newSite}
                  placeholder="example.com"
                  aria-label="Site"
                  disabled={!canWrite}
                  onChange={(event) => setNewSite(event.target.value)}
                />
                <DecisionSelect
                  label="Rule for the new site"
                  value={newDecision}
                  disabled={!canWrite}
                  onChange={setNewDecision}
                />
                <Button type="submit" size="sm" disabled={!canWrite || normalizedSite === null}>
                  Add
                </Button>
              </form>
            }
          />
        </>
      )}
    </SettingsSection>
  );
}

function SiteRuleRow(props: {
  readonly environmentId: EnvironmentId;
  readonly rule: BrowserSiteRule;
  readonly canWrite: boolean;
  readonly onChanged: () => void;
}) {
  const { environmentId, rule } = props;
  const setRule = useAtomCommand(serverEnvironment.setBrowserSiteRule, {
    label: "browser site rule",
  });
  const removeRule = useAtomCommand(serverEnvironment.removeBrowserSiteRule, {
    label: "browser site rule removal",
  });
  const change = async (next: Pick<BrowserSiteRule, "browse" | "upload">) => {
    reportFailure(
      "Could not change the site rule",
      await setRule({ environmentId, input: { site: rule.site, ...next } }),
    );
    props.onChanged();
  };
  return (
    <SettingsRow
      title={rule.site}
      control={
        <div className="flex items-center gap-2">
          <DecisionSelect
            label={`Opening ${rule.site}`}
            value={rule.browse}
            disabled={!props.canWrite}
            onChange={(browse) => void change({ browse, upload: rule.upload })}
          />
          <DecisionSelect
            label={`Uploading files to ${rule.site}`}
            value={rule.upload}
            disabled={!props.canWrite}
            onChange={(upload) => void change({ browse: rule.browse, upload })}
          />
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Remove the rule for ${rule.site}`}
            disabled={!props.canWrite}
            onClick={async () => {
              reportFailure(
                "Could not remove the site rule",
                await removeRule({ environmentId, input: { site: rule.site } }),
              );
              props.onChanged();
            }}
          >
            <Trash2Icon className="size-4" />
          </Button>
        </div>
      }
      status={<span>Opening · Uploading files</span>}
    />
  );
}
