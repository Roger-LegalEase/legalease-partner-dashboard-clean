import assert from "node:assert/strict";
import { captainDealtLiveGrant } from "./captain-dealt-grants.mjs";

const claim = { subjectType: "packet-family", subjectId: "x-set", operation: "independent-verification", lane: "VF02", laneKind: "independent-verification", released: false };
const base = { claims: [claim], transfers: [], reissues: [], grants: [], releases: [] };

// 1. A generator-packed live grant has no deal record: not preserved.
assert.equal(captainDealtLiveGrant(base, claim), null);

// 2. A reissue with a reason, on this lane and subject, preserves it.
const reissued = { ...base, reissues: [{ lane: "VF02", subjectId: "x-set", laneKind: "independent-verification", reissuedAt: "2026-09-05T17:44:33.209Z", reason: "re-read on repaired bytes" }] };
assert.equal(captainDealtLiveGrant(reissued, claim)?.kind, "reissue");

// 3. A transfer TO this lane preserves it; a transfer FROM it does not.
const transferredTo = { ...base, transfers: [{ subjectId: "x-set", laneKind: "independent-verification", fromLane: "VF01", toLane: "VF02", transferredAt: "2026-09-05T17:00:00.000Z", reason: "dealt" }] };
assert.equal(captainDealtLiveGrant(transferredTo, claim)?.kind, "transfer");
const transferredFrom = { ...base, transfers: [{ subjectId: "x-set", laneKind: "independent-verification", fromLane: "VF02", toLane: "VF03", transferredAt: "2026-09-05T17:00:00.000Z", reason: "dealt" }] };
assert.equal(captainDealtLiveGrant(transferredFrom, claim), null);

// 4. A grant record with a reason preserves it.
const granted = { ...base, grants: [{ lane: "VF02", subjectId: "x-set", laneKind: "independent-verification", grantedAt: "2026-09-05T17:00:00.000Z", reason: "cohort read" }] };
assert.equal(captainDealtLiveGrant(granted, claim)?.kind, "grant");

// 5. A deal older than the claim's last release on this lane is history, not the current tenure.
const stale = { ...reissued, releases: [{ lane: "VF02", subjectId: "x-set", laneKind: "independent-verification", releasedAt: "2026-09-05T18:00:00.000Z" }] };
assert.equal(captainDealtLiveGrant(stale, claim), null);

// 6. An empty reason never preserves; a released claim is never considered.
const noReason = { ...base, reissues: [{ lane: "VF02", subjectId: "x-set", laneKind: "independent-verification", reissuedAt: "2026-09-05T17:44:33.209Z", reason: "  " }] };
assert.equal(captainDealtLiveGrant(noReason, claim), null);
assert.equal(captainDealtLiveGrant(reissued, { ...claim, released: true }), null);

// 7. A different laneKind on the record does not preserve a claim of another kind.
const wrongKind = { ...base, grants: [{ lane: "VF02", subjectId: "x-set", laneKind: "repair", grantedAt: "2026-09-05T17:00:00.000Z", reason: "x" }] };
assert.equal(captainDealtLiveGrant(wrongKind, claim), null);

console.log("captain-dealt-grants: 7/7 PASS");
