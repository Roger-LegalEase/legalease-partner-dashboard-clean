declare module "@/lib/clinic-mode/device-reset.mjs" {
  export function resetClinicDeviceState(environment?: Window, cleanEntryPath?: string): Promise<{ ok: true }>;
}
