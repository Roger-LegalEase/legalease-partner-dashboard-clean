// Changes this lane needs that belong to records it does not own.
//
// The lane owns two paths: the Colorado overlay production tree and this state
// pack. Everything below sits outside them — a shared renderer, a generated
// registry, a fulfillment record — and is therefore stated as a request with
// the exact file, the exact change and the reason, rather than made.
//
// Each request is written so it can be checked before it is applied. Where a
// request would change a number that is currently right, it says what the
// number should become and what makes it so.

export type PatchRequestStatus = "requested";

export interface CaptainPatchRequest {
  readonly id: string;
  /** The record that has to change. */
  readonly path: string;
  /** Which authority owns that record. */
  readonly owner: "captain_registry" | "captain_fulfillment" | "shared_renderer" | "captain_manifest";
  readonly change: string;
  readonly why: string;
  /** What is true today, so the reviewer can confirm the request is still needed. */
  readonly currentState: string;
  /** Whether applying it could open a route. It must not. */
  readonly opensARoute: false;
  readonly status: PatchRequestStatus;
}

export const COLORADO_CAPTAIN_PATCH_REQUESTS: readonly CaptainPatchRequest[] = [
  {
    id: "CO-REG-1",
    path: "data/rcap-all50/candidate-evidence/colorado/lane-g-captain-requests.json",
    owner: "captain_manifest",
    change:
      "Close the renderer-reproducibility item. It is answered: the renderer named by the ported manifests is unrecoverable from accepted history, no renderer in accepted history claims Colorado, and the official corpus is not mounted, so the six receipts were rewritten to stop naming an executable that cannot run. The determination is recorded per family in reports/renderer-provenance.json.",
    why:
      "The item is tracked in a candidate-evidence record this lane does not own, and leaving it open would keep a resolved question on the board.",
    currentState:
      "The record still names scripts/rcap-official-forms/lanes/d3a-regenerate.mjs as an open reproducibility question.",
    opensARoute: false,
    status: "requested",
  },
  {
    id: "CO-REG-2",
    path: "data/record-clearing/legal-design-packet-set-manifests.json",
    owner: "captain_registry",
    change:
      "For the two Colorado petition sets, record that the participant-completed component now has a versioned binding specification, by its path and its SHA-256: JDF 417 at f753ed8260d8f672cb5c15bdc2ff28bb773866545f120afa57db5e70f45fabf8 and JDF 612 at bbaaaca47c287eb1fcf410ac5d8ce784fd7840f4c51a4fea135038afdce1ece7. Leave every component's officialFormId, every set's incomplete marker and both routes' unmet build inputs exactly as they are.",
    why:
      "The registry is generated from this manifest, and the manifest is the controlling record. Recording the specification lets a reader see that the component is engineered without implying the set is complete, which it is not.",
    currentState:
      "The manifest declares the two sets incomplete with four components each, two of which carry officialFormId: null. Both routes report exactPacketSet and sourceOrApprovedComposedDocument unmet.",
    opensARoute: false,
    status: "requested",
  },
  {
    id: "CO-FUL-1",
    path: "src/lib/rcap/fulfillment/",
    owner: "captain_fulfillment",
    change:
      "No change is requested to admission, eligibility or any commercial rule. Record only, wherever the fulfillment layer keeps Colorado's build state, that packet implementation for JDF 417 and JDF 612 advanced from a four- and six-field binding to a specified 59-of-62 and 58-of-63, and that this does not move the service disposition off SOURCE_OR_CONFIGURATION_GATE.",
    why:
      "A build-state advance that is not also a readiness advance has to be recorded as exactly that, or the next reader infers the second from the first — which is the failure the Colorado audit corrected.",
    currentState:
      "All three Colorado routes are denied at all ten commercial admission points, and commercially eligible is zero.",
    opensARoute: false,
    status: "requested",
  },
  {
    id: "CO-RND-1",
    path: "scripts/implement-rcap-official-forms-d1.mjs",
    owner: "shared_renderer",
    change:
      "When the official Colorado binaries are mounted, either add CO to JURISDICTION_SLUGS and drive it from the Colorado specification, or leave the shared renderer alone and give the Colorado binder its own render entry point. Whichever is chosen, the renderer that produces a Colorado artifact must be named in that artifact's receipt.",
    why:
      "The Colorado binder decides what to write and deliberately does not write it: rendering needs the official binary, which is not here. The two paths differ in blast radius — the first changes a renderer 89 manifests depend on — so the choice belongs to the captain, not to this lane.",
    currentState:
      "The d1 renderer names nine jurisdictions and does not name CO. The Colorado receipts now name no renderer at all.",
    opensARoute: false,
    status: "requested",
  },
  {
    id: "CO-SRC-1",
    path: "data/rcap-all50/candidate-evidence/colorado/",
    owner: "captain_manifest",
    change:
      "When Lane G-CO-SOURCE returns, hand this lane the verified source identities for JDF 419, JDF 435, JDF 205, JDF 206, JDF 302 and the two unresolved JDF 611 components through Captain A. The Colorado specification pipeline extends to them without changing shape: each new family needs an authored specification beside the two that exist.",
    why:
      "The lane may not read another lane's worktree, and the two JDF 611 form numbers are unresolved — guessing either would fabricate an official identity.",
    currentState:
      "Seven official artifacts are missing. Two of them have no established form number.",
    opensARoute: false,
    status: "requested",
  },
];

/** No request in this list may be applied as a commercial change. */
export const COLORADO_PATCH_REQUESTS_OPEN_NO_ROUTE = COLORADO_CAPTAIN_PATCH_REQUESTS.every(
  (request) => request.opensARoute === false,
);
