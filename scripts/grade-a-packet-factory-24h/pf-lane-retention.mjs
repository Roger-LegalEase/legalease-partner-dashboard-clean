const PF_LANE = /^PF(0*[1-9]\d*)$/;

export function livePacketLaneByFamily(claims) {
  const lanes = new Map();
  for (const claim of claims ?? []) {
    const match = typeof claim.lane === "string" ? claim.lane.match(PF_LANE) : null;
    if (claim.subjectType !== "packet-family"
      || claim.operation !== "packet-build"
      || claim.released
      || typeof claim.subjectId !== "string"
      || claim.subjectId.length === 0
      || !match) continue;
    lanes.set(claim.subjectId, claim.lane);
  }
  return lanes;
}

export function effectivePacketLaneCount(baseLaneCount, liveLaneByFamily) {
  let highestLiveLane = 0;
  for (const lane of liveLaneByFamily.values()) {
    highestLiveLane = Math.max(highestLiveLane, Number(lane.slice(2)));
  }
  return Math.max(baseLaneCount, highestLiveLane);
}
