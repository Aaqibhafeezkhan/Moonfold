import {
  MOONFOLD_PROJECT_FILE_NAME,
  type EnvironmentId,
  type MoonfoldProjectFile,
} from "@moonfold/contracts";
import { parseMoonfoldProjectFile } from "@moonfold/shared/moonfoldProjectFile";
import { executeAtomQuery } from "@moonfold/client-runtime/state/runtime";

import {
  getProjectFileQueryAtom,
  resolveProjectFileQueryData,
} from "~/components/files/projectFilesQueryState";
import { appAtomRegistry } from "~/rpc/atomRegistry";

/**
 * Read and decode the project's checked-in `moonfold.json`.
 *
 * Imperative counterpart to `useMoonfoldProjectFileState` for the new-thread path,
 * which resolves defaults at call time rather than render time. The file
 * query atom caches per (environment, cwd), so repeat calls don't re-fetch.
 * Optimistic in-app writes overlay the query result, matching what
 * `useProjectFileQuery` renders. Missing, truncated, or invalid files
 * resolve to null.
 */
export async function readMoonfoldProjectFile(
  environmentId: EnvironmentId,
  workspaceRoot: string,
): Promise<MoonfoldProjectFile | null> {
  const result = await executeAtomQuery(
    appAtomRegistry,
    getProjectFileQueryAtom(environmentId, workspaceRoot, MOONFOLD_PROJECT_FILE_NAME),
    { reportDefect: false, reportFailure: false },
  );
  const data = resolveProjectFileQueryData(
    environmentId,
    workspaceRoot,
    MOONFOLD_PROJECT_FILE_NAME,
    result._tag === "Success" ? result.value : null,
  );
  if (data === null || data.truncated) return null;
  return parseMoonfoldProjectFile(data.contents);
}
