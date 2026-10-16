import * as Option from "effect/Option";

export type JoinPath = (first: string, ...segments: string[]) => string;

function normalizeConfiguredBaseDir(moonfoldHome: Option.Option<string>): Option.Option<string> {
  if (Option.isNone(moonfoldHome)) {
    return Option.none();
  }
  const trimmed = moonfoldHome.value.trim();
  return trimmed.length > 0 ? Option.some(trimmed) : Option.none();
}

export function resolveDesktopBaseDir(input: {
  readonly homeDirectory: string;
  readonly joinPath: JoinPath;
  readonly moonfoldHome: Option.Option<string>;
}): string {
  return Option.getOrElse(normalizeConfiguredBaseDir(input.moonfoldHome), () =>
    input.joinPath(input.homeDirectory, ".moonfold"),
  );
}

export function resolveDesktopStateDir(input: {
  readonly baseDir: string;
  readonly isDevelopment: boolean;
  readonly joinPath: JoinPath;
  readonly moonfoldHome: Option.Option<string>;
}): string {
  const useDevSubdir =
    input.isDevelopment && Option.isNone(normalizeConfiguredBaseDir(input.moonfoldHome));
  return input.joinPath(input.baseDir, useDevSubdir ? "dev" : "userdata");
}
