import type {
  BrowserSiteAnswer,
  BrowserSitePermissionRequest,
  EnvironmentId,
} from "@moonfold/contracts";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@moonfold/client-runtime/state/runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useThreadShells } from "../state/entities";
import { useEnvironments } from "../state/environments";
import { useEnvironmentQuery } from "../state/query";
import { serverEnvironment } from "../state/server";
import { useAtomCommand } from "../state/use-atom-command";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "./ui/dialog";
import { stackedThreadToast, toastManager } from "./ui/toast";

interface PendingEntry {
  readonly environmentId: EnvironmentId;
  readonly request: BrowserSitePermissionRequest;
}

/**
 * Asks the user when an agent wants to open a site or upload files to one and the site rules say
 * to ask. One question at a time, oldest first, across every connected environment.
 */
export function BrowserSitePermissionPrompts() {
  const { environments } = useEnvironments();
  const connected = environments.filter((entry) => entry.connection.phase === "connected");
  const [pendingByEnvironment, setPendingByEnvironment] = useState<
    ReadonlyMap<EnvironmentId, ReadonlyArray<BrowserSitePermissionRequest>>
  >(new Map());
  const report = useCallback(
    (environmentId: EnvironmentId, requests: ReadonlyArray<BrowserSitePermissionRequest>) =>
      setPendingByEnvironment((current) => {
        if ((current.get(environmentId) ?? []).length === 0 && requests.length === 0)
          return current;
        const next = new Map(current);
        next.set(environmentId, requests);
        return next;
      }),
    [],
  );
  const first = useMemo(() => {
    const all: Array<PendingEntry> = [];
    for (const [environmentId, requests] of pendingByEnvironment) {
      for (const request of requests) all.push({ environmentId, request });
    }
    return all.toSorted((left, right) =>
      left.request.createdAt.localeCompare(right.request.createdAt),
    )[0];
  }, [pendingByEnvironment]);

  return (
    <>
      {connected.map((entry) => (
        <EnvironmentPendingRequests
          key={entry.environmentId}
          environmentId={entry.environmentId}
          onChange={report}
        />
      ))}
      {first ? <PermissionDialog key={first.request.id} entry={first} /> : null}
    </>
  );
}

function EnvironmentPendingRequests(props: {
  readonly environmentId: EnvironmentId;
  readonly onChange: (
    environmentId: EnvironmentId,
    requests: ReadonlyArray<BrowserSitePermissionRequest>,
  ) => void;
}) {
  const { environmentId, onChange } = props;
  const pending = useEnvironmentQuery(
    serverEnvironment.browserSitePending({ environmentId, input: {} }),
  );
  const requests = pending.data?.requests;
  useEffect(() => {
    onChange(environmentId, requests ?? []);
  }, [environmentId, onChange, requests]);
  useEffect(() => () => onChange(environmentId, []), [environmentId, onChange]);
  return null;
}

function PermissionDialog({ entry }: { readonly entry: PendingEntry }) {
  const { request, environmentId } = entry;
  const answer = useAtomCommand(serverEnvironment.answerBrowserSiteRequest, {
    label: "browser site answer",
  });
  const [busy, setBusy] = useState(false);
  // Enter or Space on open must never block a site for good.
  const allowOnceRef = useRef<HTMLButtonElement>(null);
  const threads = useThreadShells();
  const threadTitle = threads.find(
    (thread) => thread.environmentId === environmentId && thread.id === request.threadId,
  )?.title;
  const respond = async (value: BrowserSiteAnswer) => {
    setBusy(true);
    const result = await answer({ environmentId, input: { id: request.id, answer: value } });
    setBusy(false);
    if (result._tag === "Failure" && !isAtomCommandInterrupted(result)) {
      toastManager.add(
        stackedThreadToast({
          type: "error",
          title: "Could not answer the agent",
          description: String(squashAtomCommandFailure(result)),
        }),
      );
    }
  };
  const action = request.capability === "upload" ? "upload files to" : "open";
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        // Closing the dialog is a "no" for this one action.
        if (!open && !busy) void respond("deny");
      }}
    >
      <DialogPopup className="sm:max-w-md" initialFocus={allowOnceRef}>
        <DialogHeader>
          <DialogTitle>
            Let the agent {action} {request.site}?
          </DialogTitle>
          <DialogDescription>
            {threadTitle ? `In “${threadTitle}”. ` : ""}
            Your site rules ask before agents do this.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <code className="block break-all text-xs text-muted-foreground">{request.url}</code>
        </DialogPanel>
        <DialogFooter className="flex-wrap">
          <Button
            variant="ghost-destructive"
            size="sm"
            disabled={busy}
            onClick={() => void respond("always_block")}
          >
            Always block
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => void respond("deny")}>
            Deny
          </Button>
          <Button
            ref={allowOnceRef}

            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void respond("allow_once")}
          >
            Allow once
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void respond("allow_thread")}
          >
            Allow in this chat
          </Button>
          <Button size="sm" disabled={busy} onClick={() => void respond("always_allow")}>
            Always allow
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
