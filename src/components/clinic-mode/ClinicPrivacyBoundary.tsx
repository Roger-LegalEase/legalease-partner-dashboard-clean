"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";
import { flushSync } from "react-dom";
import { resetClinicDeviceState } from "@/lib/clinic-mode/device-reset.mjs";

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000;
const hasPendingReset = () => document.cookie.split(";").some((part) => part.trim() === "clinic_reset_pending=1");

export function ClinicPrivacyBoundary({ children, cleanEntryPath, recovery = false }: { children?: ReactNode; cleanEntryPath: string; recovery?: boolean }) {
  const { text } = useLocalization();
  // No participant content is rendered before the browser has checked its lock.
  const [resetLocked, setLocked] = useState(false);
  const deviceLocked = useSyncExternalStore(subscribeToDeviceLock, hasPendingReset, serverLocked);
  const locked = resetLocked || deviceLocked || recovery;
  const [resetting, setResetting] = useState(false);
  const [warning, setWarning] = useState(recovery ? "Device recovery is required. Assistance may have expired or a previous reset may be incomplete. Keep this device locked until reset is confirmed." : "");
  const running = useRef(false);
  const resetChannel = useRef<BroadcastChannel | null>(null);
  const timerRef = useRef<number | null>(null);

  const reset = useCallback(async (reason: "staff_reset" | "inactivity" | "security_reset" = "staff_reset") => {
    if (running.current) return;
    running.current = true;
    // Commit the mask before the first network call or destructive operation.
    flushSync(() => { setLocked(true); setResetting(true); });
    setWarning("Ending the participant session and clearing this device…");
    try { resetChannel.current?.postMessage("reset-started"); } catch { /* The local mask and server lock still apply. */ }
    let preparedConfirmed = false;
    let recoveryState = "";
    let serverConfirmed = false;
    let localConfirmed = false;
    const request = async (action: string) => {
      const response = await fetch("/api/clinic/session/reset", {
        method: "POST", cache: "no-store", headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason, action })
      });
      const result = await response.json();
      return { response, result };
    };
    try {
      if (!hasPendingReset()) document.cookie = "clinic_reset_pending=1; Path=/; Max-Age=34560000; SameSite=Strict";
      // This is an explicitly locked recovery screen, never a clean entry.
      window.history.replaceState(null, "", "/clinic/reset");
      if (!hasPendingReset()) throw new Error("Device lock could not be saved");
      const prepared = await request("prepare");
      recoveryState = prepared.result.state;
      if (prepared.response.ok && prepared.result.prepared === true) {
        preparedConfirmed = true;
        const closed = await request("close");
        serverConfirmed = closed.response.ok && closed.result.revocationConfirmed === true && closed.result.signOutConfirmed === true;
      }
    } catch { /* The lock remains; cleanup still runs independently below. */ }
    try {
      if (preparedConfirmed) localConfirmed = (await resetClinicDeviceState(window, cleanEntryPath, { navigate: false })).ok;
    } catch { localConfirmed = false; }
    if (serverConfirmed && localConfirmed) {
      try {
        const completed = await request("complete");
        if (completed.response.ok && completed.result.revocationConfirmed === true && completed.result.signOutConfirmed === true && completed.result.success === true) {
          // Recheck after the final server response, before history/navigation.
          const entry = completed.result.cleanEntryPath;
          if (typeof entry !== "string" || !/^\/clinic(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/.test(entry)) throw new Error("Validated Clinic entry missing");
          const finalCleanup = await resetClinicDeviceState(window, entry);
          if (finalCleanup.ok) return;
        }
      } catch { /* Remain masked for recovery. */ }
    }
    try { if (!hasPendingReset()) document.cookie = "clinic_reset_pending=1; Path=/; Max-Age=34560000; SameSite=Strict"; } catch { /* Keep the recovery screen locked. */ }
    setWarning(recoveryState === "authentication_required" ? "Reset needs the original participant or approved event staff to sign in. This device remains locked." : recoveryState === "handoff_identity_required" ? "The original Clinic handoff is missing. Keep this device locked and ask approved event staff to recover that exact handoff. If it cannot be verified, reset will remain blocked." : "Reset is incomplete. This device is locked. Retry before handing it to another participant.");
    setResetting(false);
    running.current = false;
  }, [cleanEntryPath]);

  useEffect(() => {
    const channel = typeof BroadcastChannel === "function" ? new BroadcastChannel("clinic-device-reset") : null;
    resetChannel.current = channel;
    if (channel) channel.onmessage = (event) => {
      if (event.data !== "reset-started") return;
      flushSync(() => setLocked(true));
      setWarning("This device is locked until the interrupted reset is completed. Retry reset.");
    };
    const schedule = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => { if (!hasPendingReset()) void reset("inactivity"); }, INACTIVITY_LIMIT_MS);
    };
    const activityEvents = ["pointerdown", "keydown", "touchstart"] as const;
    for (const name of activityEvents) window.addEventListener(name, schedule, { passive: true });
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted || hasPendingReset()) setLocked(true);
    };
    const onFocus = () => { if (hasPendingReset()) setLocked(true); };
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);
    schedule();
    return () => {
      resetChannel.current = null;
      channel?.close();
      if (timerRef.current) window.clearTimeout(timerRef.current);
      for (const name of activityEvents) window.removeEventListener(name, schedule);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
    };
  }, [reset, recovery]);

  return (
    <div role={locked ? "main" : undefined} className="min-h-screen" data-clinic-locked={locked ? "true" : "false"}>
      <div className="sticky top-0 z-50 border-b border-[#F2C8B7] bg-[#FFF7ED]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <div><p className="text-sm font-black text-[#0F1E3D]">{text("Shared-device privacy is active")}</p><p role="status" aria-live="polite" className="text-xs text-[#7A4A35]">{text(warning || "Reset after every participant. Inactivity automatically ends the session after 15 minutes.")}</p></div>
          <button type="button" disabled={resetting} onClick={() => void reset("staff_reset")} className="min-h-11 rounded-md bg-[#B04A26] px-5 py-2 text-sm font-black text-white hover:bg-[#8F3A1C] disabled:opacity-60">{text(locked && warning && !resetting ? "Retry device reset" : "End clinic session / Reset device")}</button>
        </div>
      </div>
      {locked && !resetting && <p className="p-4"><a href="/expungement-ai/sign-in?next=%2Fclinic%2Freset">{text("Original participant: sign in to finish reset")}</a><br /><a href="/expungement-ai/sign-in?mode=signin&next=%2Fclinic%2Freset">{text("Approved event staff: sign in with your own account to recover this device")}</a><br /><span>{text("Staff recovery only ends the verified handoff. It does not open participant documents or resume assistance.")}</span></p>}
      {!locked && children}
    </div>
  );
}

function serverLocked() { return true; }
function subscribeToDeviceLock(notify: () => void) {
  window.addEventListener("focus", notify);
  window.addEventListener("pageshow", notify);
  return () => {
    window.removeEventListener("focus", notify);
    window.removeEventListener("pageshow", notify);
  };
}
