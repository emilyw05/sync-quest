"use client";

import * as React from "react";
import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Read a browser-only value safely (SSR-empty, hydration-clean) without
 * triggering the `react-hooks/set-state-in-effect` rule.
 *
 * `getSnapshot` must return the same reference when the underlying value is
 * unchanged. Functions like `JSON.parse` always yield new object identities,
 * which would make `useSyncExternalStore` think the store changed every time
 * and trigger "Maximum update depth exceeded" (React #185). We memoize plain
 * objects by `JSON.stringify`; primitives/null stay stable naturally.
 */
export function useClientValue<T>(clientValue: () => T, serverValue: T): T {
  const cacheRef = React.useRef<{ snapshot: T; tag: string | null }>({
    snapshot: serverValue,
    tag: null,
  });

  return useSyncExternalStore(
    noopSubscribe,
    () => {
      const next = clientValue();
      if (next === null || typeof next !== "object") {
        if (Object.is(cacheRef.current.snapshot, next)) {
          return cacheRef.current.snapshot;
        }
        cacheRef.current = { snapshot: next, tag: null };
        return next;
      }
      const tag = JSON.stringify(next);
      if (cacheRef.current.tag === tag) {
        return cacheRef.current.snapshot;
      }
      cacheRef.current = { snapshot: next, tag };
      return next;
    },
    () => serverValue,
  );
}

/** True after the component has mounted on the client. */
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
