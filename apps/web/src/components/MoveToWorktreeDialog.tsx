import { useEffect, useId, useState } from "react";
import { create } from "zustand";

import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export interface WorktreeMoveChoice {
  readonly branch: string;
  readonly carryChanges: boolean;
}
type Request = {
  readonly suggestedBranch: string;
  readonly resolve: (choice: WorktreeMoveChoice | null) => void;
};
const useRequest = create<{ request: Request | null }>(() => ({ request: null }));

/** Asks for the new worktree's branch and whether the thread's uncommitted work goes along. */
export function requestWorktreeMove(suggestedBranch: string): Promise<WorktreeMoveChoice | null> {
  useRequest.getState().request?.resolve(null);
  return new Promise((resolve) => useRequest.setState({ request: { suggestedBranch, resolve } }));
}

function finish(choice: WorktreeMoveChoice | null) {
  const request = useRequest.getState().request;
  useRequest.setState({ request: null });
  request?.resolve(choice);
}

export function MoveToWorktreeDialogHost() {
  const request = useRequest((state) => state.request);
  useEffect(() => () => finish(null), []);
  return request ? <MoveToWorktreeDialog suggestedBranch={request.suggestedBranch} /> : null;
}

function MoveToWorktreeDialog(props: { readonly suggestedBranch: string }) {
  const id = useId();
  const [branch, setBranch] = useState(props.suggestedBranch);
  const [carryChanges, setCarryChanges] = useState(true);
  const trimmed = branch.trim();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) finish(null);
      }}
    >
      <DialogPopup className="sm:max-w-md">
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            if (trimmed.length > 0) finish({ branch: trimmed, carryChanges });
          }}
        >
          <DialogHeader>
            <DialogTitle>Move to a new worktree</DialogTitle>
            <DialogDescription>
              The thread continues in its own checkout on a new branch, so the project folder is
              free for other work.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-branch`}>Branch</Label>
                <Input
                  id={`${id}-branch`}
                  autoFocus
                  value={branch}
                  onChange={(event) => setBranch(event.target.value)}
                />
              </div>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <Checkbox
                  checked={carryChanges}
                  onCheckedChange={(checked) => setCarryChanges(checked === true)}
                />
                <span className="flex flex-col gap-0.5">
                  Take uncommitted changes along
                  <span className="text-xs text-muted-foreground">
                    Changes in the project folder move into the worktree and the folder is left
                    clean.
                  </span>
                </span>
              </label>
            </div>
          </DialogPanel>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => finish(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={trimmed.length === 0}>
              Move thread
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
