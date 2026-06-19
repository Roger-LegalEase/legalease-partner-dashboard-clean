import "server-only";

export type PromotionGateStatus = "pending" | "passed" | "failed";
export type VisualReviewStatus = PromotionGateStatus | "not_required";
export type PromotionStatus = "state_built" | "review_in_progress" | "approved_for_live" | "live" | "blocked";

export type ApprovedChannels = {
  internalPreview: boolean;
  partnerRcap: boolean;
  expungementAi: boolean;
};

export type StatePromotionRecord = {
  jurisdiction: string;
  abbreviation: string;
  slug: string;
  buildStatus: "state_built";
  qaReview: PromotionGateStatus;
  attorneyReview: PromotionGateStatus;
  sourceFreshnessReview: PromotionGateStatus;
  visualReview: VisualReviewStatus;
  promotionStatus: PromotionStatus;
  approvedForLive: boolean;
  liveEnabled: boolean;
  approvedChannels: ApprovedChannels;
  blockers: string[];
  reviewerNotes: string[];
  approvedAt: string | null;
  approvedBy: string | null;
};

export const statePromotionManifest: StatePromotionRecord[] = /* PROMOTION_MANIFEST_START */ [
  {
    "jurisdiction": "Alabama",
    "abbreviation": "AL",
    "slug": "alabama",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Alaska",
    "abbreviation": "AK",
    "slug": "alaska",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Arizona",
    "abbreviation": "AZ",
    "slug": "arizona",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Arkansas",
    "abbreviation": "AR",
    "slug": "arkansas",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "California",
    "abbreviation": "CA",
    "slug": "california",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Colorado",
    "abbreviation": "CO",
    "slug": "colorado",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Connecticut",
    "abbreviation": "CT",
    "slug": "connecticut",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Delaware",
    "abbreviation": "DE",
    "slug": "delaware",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "District of Columbia",
    "abbreviation": "DC",
    "slug": "district-of-columbia",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Legacy live generator preserved; all-50 promotion must not replace current live fallback until separately approved.",
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Florida",
    "abbreviation": "FL",
    "slug": "florida",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Georgia",
    "abbreviation": "GA",
    "slug": "georgia",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Hawaii",
    "abbreviation": "HI",
    "slug": "hawaii",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Idaho",
    "abbreviation": "ID",
    "slug": "idaho",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Illinois",
    "abbreviation": "IL",
    "slug": "illinois",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Legacy live generator preserved; all-50 promotion must not replace current live fallback until separately approved.",
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Indiana",
    "abbreviation": "IN",
    "slug": "indiana",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Iowa",
    "abbreviation": "IA",
    "slug": "iowa",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Kansas",
    "abbreviation": "KS",
    "slug": "kansas",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Kentucky",
    "abbreviation": "KY",
    "slug": "kentucky",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Louisiana",
    "abbreviation": "LA",
    "slug": "louisiana",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "not_required",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Maine",
    "abbreviation": "ME",
    "slug": "maine",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Maryland",
    "abbreviation": "MD",
    "slug": "maryland",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Massachusetts",
    "abbreviation": "MA",
    "slug": "massachusetts",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Michigan",
    "abbreviation": "MI",
    "slug": "michigan",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Minnesota",
    "abbreviation": "MN",
    "slug": "minnesota",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Mississippi",
    "abbreviation": "MS",
    "slug": "mississippi",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Legacy live generator preserved; all-50 promotion must not replace current live fallback until separately approved.",
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Missouri",
    "abbreviation": "MO",
    "slug": "missouri",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Montana",
    "abbreviation": "MT",
    "slug": "montana",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Nebraska",
    "abbreviation": "NE",
    "slug": "nebraska",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Nevada",
    "abbreviation": "NV",
    "slug": "nevada",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "New Hampshire",
    "abbreviation": "NH",
    "slug": "new-hampshire",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "New Jersey",
    "abbreviation": "NJ",
    "slug": "new-jersey",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "New Mexico",
    "abbreviation": "NM",
    "slug": "new-mexico",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "New York",
    "abbreviation": "NY",
    "slug": "new-york",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "North Carolina",
    "abbreviation": "NC",
    "slug": "north-carolina",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "North Dakota",
    "abbreviation": "ND",
    "slug": "north-dakota",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Ohio",
    "abbreviation": "OH",
    "slug": "ohio",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Oklahoma",
    "abbreviation": "OK",
    "slug": "oklahoma",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "not_required",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Oregon",
    "abbreviation": "OR",
    "slug": "oregon",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Pennsylvania",
    "abbreviation": "PA",
    "slug": "pennsylvania",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Legacy live generator preserved; all-50 promotion must not replace current live fallback until separately approved.",
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Rhode Island",
    "abbreviation": "RI",
    "slug": "rhode-island",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "South Carolina",
    "abbreviation": "SC",
    "slug": "south-carolina",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "South Dakota",
    "abbreviation": "SD",
    "slug": "south-dakota",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Tennessee",
    "abbreviation": "TN",
    "slug": "tennessee",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Texas",
    "abbreviation": "TX",
    "slug": "texas",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Legacy live generator preserved; all-50 promotion must not replace current live fallback until separately approved.",
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Utah",
    "abbreviation": "UT",
    "slug": "utah",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Vermont",
    "abbreviation": "VT",
    "slug": "vermont",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Virginia",
    "abbreviation": "VA",
    "slug": "virginia",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Washington",
    "abbreviation": "WA",
    "slug": "washington",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "West Virginia",
    "abbreviation": "WV",
    "slug": "west-virginia",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Wisconsin",
    "abbreviation": "WI",
    "slug": "wisconsin",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  },
  {
    "jurisdiction": "Wyoming",
    "abbreviation": "WY",
    "slug": "wyoming",
    "buildStatus": "state_built",
    "qaReview": "passed",
    "attorneyReview": "passed",
    "sourceFreshnessReview": "passed",
    "visualReview": "passed",
    "promotionStatus": "live",
    "approvedForLive": true,
    "liveEnabled": true,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": true
    },
    "blockers": [],
    "reviewerNotes": [
      "Final QA/attorney/source/visual signoff completed before all-51 launch.",
      "2026-06-17T17:09:06.076Z Roger: all-51 launch gate enabled; no partial state rollout."
    ],
    "approvedAt": "2026-06-17T17:08:55.459Z",
    "approvedBy": "Roger"
  }
] /* PROMOTION_MANIFEST_END */;

export function getStatePromotionRecords(): StatePromotionRecord[] {
  return statePromotionManifest;
}

export function getStatePromotionRecord(state: string): StatePromotionRecord | null {
  const normalized = state.toLowerCase();
  return statePromotionManifest.find((record) =>
    record.slug === normalized || record.abbreviation.toLowerCase() === normalized || record.jurisdiction.toLowerCase() === normalized
  ) ?? null;
}
