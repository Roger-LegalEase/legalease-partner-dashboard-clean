"use client";
import { useEffect, type ReactNode } from "react";
import { useHashDestination } from "./use-hash-destination";

/** One navigation state for the real screens, including refresh and deep links. */
export function StudioSection({ children, stage }: { children: ReactNode; stage: "configure" | "materials" }) {
  const hash = useHashDestination();
  const materials = hash.startsWith("#launch-prep-") || hash === "#launch-commercial-authority";
  const visible = stage === "materials" ? materials : !materials;
  useEffect(() => {
    if (!visible || !hash) return;
    // A native hash jump can precede revealing its section in Safari.
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(hash.slice(1));
      if (!target) return;
      for (let parent: HTMLElement | null = target; parent; parent = parent.parentElement) {
        if (parent instanceof HTMLDetailsElement) parent.open = true;
      }
      target.scrollIntoView({block: "start"});
    });
    return () => cancelAnimationFrame(frame);
  }, [hash, visible]);
  return <div hidden={stage === "materials" ? !materials : materials}>{children}</div>;
}
