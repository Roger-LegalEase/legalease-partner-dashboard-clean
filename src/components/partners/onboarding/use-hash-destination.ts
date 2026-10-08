"use client";
import { useSyncExternalStore } from "react";
const subscribe = (changed: () => void) => {
  window.addEventListener("hashchange", changed);
  return () => window.removeEventListener("hashchange", changed);
};
/** Browser deep links share the same receiving state as manual navigation. */
export function useHashDestination() {
  return useSyncExternalStore(subscribe, () => window.location.hash, () => "");
}
