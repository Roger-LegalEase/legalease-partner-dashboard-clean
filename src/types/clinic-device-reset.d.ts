declare module "@/lib/clinic-mode/device-reset.mjs" {
  export type ClinicDeviceResetReport = {
    /** True only when every attempted clearing step succeeded. */
    ok: boolean;
    cleared: string[];
    failures: { step: string; reason: string }[];
  };
  export function resetClinicDeviceState(
    environment?: Window,
    cleanEntryPath?: string,
    options?: { historyDepth?: number }
  ): Promise<ClinicDeviceResetReport>;
}
