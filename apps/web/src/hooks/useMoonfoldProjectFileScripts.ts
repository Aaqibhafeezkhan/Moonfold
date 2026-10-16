import {
  MOONFOLD_PROJECT_FILE_NAME,
  type EnvironmentId,
  type MoonfoldProjectFile,
  type MoonfoldProjectFileScript,
} from "@moonfold/contracts";
import { parseMoonfoldProjectFile } from "@moonfold/shared/moonfoldProjectFile";
import { useMemo } from "react";

import { useProjectFileQuery } from "~/components/files/projectFilesQueryState";

const NO_SCRIPTS: ReadonlyArray<MoonfoldProjectFileScript> = [];

export interface MoonfoldProjectFileState {
  /**
   * - `valid`: moonfold.json exists and decoded.
   * - `invalid`: moonfold.json exists but fails to decode (the server then ignores
   *   the whole file, including `iconPath` and every script).
   * - `missing`: no readable moonfold.json at the workspace root.
   * - `loading`: the file query has not settled yet.
   */
  status: "loading" | "missing" | "invalid" | "valid";
  /** The decoded file when status is `valid`, null otherwise. */
  file: MoonfoldProjectFile | null;
  scripts: ReadonlyArray<MoonfoldProjectFileScript>;
}

/**
 * Decoded state of the project's checked-in `moonfold.json`, including whether the
 * file exists but is broken — which the runtime otherwise swallows silently.
 */
export function useMoonfoldProjectFileState(
  environmentId: EnvironmentId,
  cwd: string | null,
): MoonfoldProjectFileState {
  const query = useProjectFileQuery(
    environmentId,
    cwd ?? "",
    MOONFOLD_PROJECT_FILE_NAME,
    cwd !== null,
  );
  const contents = query.data && !query.data.truncated ? query.data.contents : null;
  const isPending = query.isPending;
  return useMemo(() => {
    if (contents === null) {
      return {
        status: isPending ? "loading" : "missing",
        file: null,
        scripts: NO_SCRIPTS,
      } as const;
    }
    const file = parseMoonfoldProjectFile(contents);
    if (file === null) {
      return { status: "invalid", file: null, scripts: NO_SCRIPTS } as const;
    }
    return { status: "valid", file, scripts: file.scripts ?? NO_SCRIPTS } as const;
  }, [contents, isPending]);
}

/**
 * Scripts declared in the project's checked-in `moonfold.json`, offered in the
 * scripts menu for import. Missing, truncated, or invalid files resolve to
 * an empty list.
 */
export function useMoonfoldProjectFileScripts(
  environmentId: EnvironmentId,
  cwd: string | null,
): ReadonlyArray<MoonfoldProjectFileScript> {
  return useMoonfoldProjectFileState(environmentId, cwd).scripts;
}
