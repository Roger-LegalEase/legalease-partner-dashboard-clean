export type ConfirmedSectionSaveDecision = {
  applyServerVersion: boolean;
  replaceLocalData: boolean;
};

export function decideConfirmedSectionSave(input: {
  operationSequence: number;
  latestAppliedSequence: number;
  sentSerialized: string;
  currentSerialized: string;
}): ConfirmedSectionSaveDecision {
  if (input.operationSequence < input.latestAppliedSequence) {
    return {
      applyServerVersion: false,
      replaceLocalData: false
    };
  }
  return {
    applyServerVersion: true,
    replaceLocalData: input.currentSerialized === input.sentSerialized
  };
}
