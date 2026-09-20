"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { resetClinicDeviceState } from "@/lib/clinic-mode/device-reset.mjs";

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000;

export function ClinicPrivacyBoundary({ children, cleanEntryPath }: { children: ReactNode; cleanEntryPath: string }) {
  const [resetting, setResetting] = useState(false);
  const [warning, setWarning] = useState("");
  const timerRef = useRef<number | null>(null);

  const reset = useCallback(async (reason: "staff_reset" | "inactivity" | "security_reset" = "staff_reset") => {
    if (resetting) return;
    setResetting(true);
    setWarning("Ending the participant session and clearing this device…");
    await fetch("/api/clinic/session/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason })
    }).catch(() => null);
    await resetClinicDeviceState(window, cleanEntryPath);
  }, [cleanEntryPath, resetting]);

  useEffect(() => {
    const schedule = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => void reset("inactivity"), INACTIVITY_LIMIT_MS);
    };
    const activityEvents = ["pointerdown", "keydown", "touchstart"] as const;
    for (const name of activityEvents) window.addEventListener(name, schedule, { passive: true });
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void reset("security_reset");
    };
    window.addEventListener("pageshow", onPageShow);
    schedule();
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      for (const name of activityEvents) window.removeEventListener(name, schedule);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [reset]);

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-50 border-b border-[#F2C8B7] bg-[#FFF7ED]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <div><p className="text-sm font-black text-[#0F1E3D]">Shared-device privacy is active</p><p aria-live="polite" className="text-xs text-[#7A4A35]">{warning || "Reset after every participant. Inactivity automatically ends the session after 15 minutes."}</p></div>
          <button type="button" disabled={resetting} onClick={() => void reset("staff_reset")} className="min-h-11 rounded-md bg-[#B04A26] px-5 py-2 text-sm font-black text-white hover:bg-[#8F3A1C] disabled:opacity-60">End clinic session / Reset device</button>
        </div>
      </div>
      {children}
    </div>
  );
}
