export type ConfirmedGuidedSaveInput = {
  responseAccepted: boolean;
  authoritativePersistenceSucceeded: boolean;
  serverVersionApplied: boolean;
  currentSnapshotConfirmed: boolean;
};

/** Saved is an authoritative state, not an optimistic animation. */
export function canAnnounceGuidedSaveSuccess(
  input: ConfirmedGuidedSaveInput
): boolean {
  return (
    input.responseAccepted &&
    input.authoritativePersistenceSucceeded &&
    input.serverVersionApplied &&
    input.currentSnapshotConfirmed
  );
}
