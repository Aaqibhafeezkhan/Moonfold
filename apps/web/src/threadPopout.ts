import type { ScopedThreadRef } from "@moonfold/contracts";

/**
 * True in a desktop window that shows one popped-out thread. The desktop app
 * opens such windows with `?window=popout`; they start with the sidebar closed
 * and leave app-wide work (notifications, deep links, launch notices) to the
 * main window.
 */
export const isThreadPopoutWindow =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("window") === "popout";

/** Whether this window can pop a thread out: desktop builds with the bridge, from the main window. */
export function canPopOutThreads(): boolean {
  return (
    !isThreadPopoutWindow &&
    typeof window !== "undefined" &&
    window.desktopBridge?.openThreadWindow !== undefined
  );
}

/** The renderer route the desktop app opens in the new window. */
export function threadPopoutPath(ref: ScopedThreadRef): string {
  return `/${encodeURIComponent(ref.environmentId)}/${encodeURIComponent(ref.threadId)}`;
}

export async function openThreadInNewWindow(ref: ScopedThreadRef): Promise<void> {
  const open = window.desktopBridge?.openThreadWindow;
  if (open === undefined) throw new Error("This build cannot open threads in new windows.");
  await open(threadPopoutPath(ref));
}
