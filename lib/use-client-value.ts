"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Read a browser-only value safely (SSR-empty, hydration-clean) without
 * triggering the `react-hooks/set-state-in-effect` rule. The `serverValue`
 * is used during SSR, then replaced with `clientValue()` after hydration.
 */
export function useClientValue<T>(clientValue: () => T, serverValue: T): T {
  return useSyncExternalStore(noopSubscribe, clientValue, () => serverValue);
}

/** True after the component has mounted on the client. */
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
