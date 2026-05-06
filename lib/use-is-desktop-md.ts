"use client";

import * as React from "react";

/** `true` when viewport is at least `minWidth` (default Tailwind `md` = 640px). */
export function useIsDesktopMd(minWidth = 640): boolean {
  const query = `(min-width: ${minWidth}px)`;
  return React.useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
