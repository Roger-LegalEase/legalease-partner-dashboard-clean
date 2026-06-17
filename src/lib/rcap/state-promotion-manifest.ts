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

export const legacyLivePreservedStates = ["MS", "IL", "DC", "PA", "TX"] as const;

export const statePromotionManifest: StatePromotionRecord[] = /* PROMOTION_MANIFEST_START */ [
  {
    "jurisdiction": "Alabama",
    "abbreviation": "AL",
    "slug": "alabama",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Alaska",
    "abbreviation": "AK",
    "slug": "alaska",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Arizona",
    "abbreviation": "AZ",
    "slug": "arizona",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Arkansas",
    "abbreviation": "AR",
    "slug": "arkansas",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "California",
    "abbreviation": "CA",
    "slug": "california",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Colorado",
    "abbreviation": "CO",
    "slug": "colorado",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Connecticut",
    "abbreviation": "CT",
    "slug": "connecticut",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Delaware",
    "abbreviation": "DE",
    "slug": "delaware",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "District of Columbia",
    "abbreviation": "DC",
    "slug": "district-of-columbia",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": false
    },
    "blockers": [
      "legacy_live_preserved"
    ],
    "reviewerNotes": [
      "Legacy live generator preserved; all-50 promotion must not replace current live fallback until separately approved."
    ],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Florida",
    "abbreviation": "FL",
    "slug": "florida",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Georgia",
    "abbreviation": "GA",
    "slug": "georgia",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Hawaii",
    "abbreviation": "HI",
    "slug": "hawaii",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Idaho",
    "abbreviation": "ID",
    "slug": "idaho",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Illinois",
    "abbreviation": "IL",
    "slug": "illinois",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": false
    },
    "blockers": [
      "legacy_live_preserved"
    ],
    "reviewerNotes": [
      "Legacy live generator preserved; all-50 promotion must not replace current live fallback until separately approved."
    ],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Indiana",
    "abbreviation": "IN",
    "slug": "indiana",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Iowa",
    "abbreviation": "IA",
    "slug": "iowa",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Kansas",
    "abbreviation": "KS",
    "slug": "kansas",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Kentucky",
    "abbreviation": "KY",
    "slug": "kentucky",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Louisiana",
    "abbreviation": "LA",
    "slug": "louisiana",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Maine",
    "abbreviation": "ME",
    "slug": "maine",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Maryland",
    "abbreviation": "MD",
    "slug": "maryland",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Massachusetts",
    "abbreviation": "MA",
    "slug": "massachusetts",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Michigan",
    "abbreviation": "MI",
    "slug": "michigan",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Minnesota",
    "abbreviation": "MN",
    "slug": "minnesota",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Mississippi",
    "abbreviation": "MS",
    "slug": "mississippi",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": false
    },
    "blockers": [
      "legacy_live_preserved"
    ],
    "reviewerNotes": [
      "Legacy live generator preserved; all-50 promotion must not replace current live fallback until separately approved."
    ],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Missouri",
    "abbreviation": "MO",
    "slug": "missouri",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Montana",
    "abbreviation": "MT",
    "slug": "montana",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Nebraska",
    "abbreviation": "NE",
    "slug": "nebraska",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Nevada",
    "abbreviation": "NV",
    "slug": "nevada",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "New Hampshire",
    "abbreviation": "NH",
    "slug": "new-hampshire",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "New Jersey",
    "abbreviation": "NJ",
    "slug": "new-jersey",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "New Mexico",
    "abbreviation": "NM",
    "slug": "new-mexico",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "New York",
    "abbreviation": "NY",
    "slug": "new-york",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "North Carolina",
    "abbreviation": "NC",
    "slug": "north-carolina",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "North Dakota",
    "abbreviation": "ND",
    "slug": "north-dakota",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Ohio",
    "abbreviation": "OH",
    "slug": "ohio",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Oklahoma",
    "abbreviation": "OK",
    "slug": "oklahoma",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Oregon",
    "abbreviation": "OR",
    "slug": "oregon",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Pennsylvania",
    "abbreviation": "PA",
    "slug": "pennsylvania",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": false
    },
    "blockers": [
      "legacy_live_preserved"
    ],
    "reviewerNotes": [
      "Legacy live generator preserved; all-50 promotion must not replace current live fallback until separately approved."
    ],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Rhode Island",
    "abbreviation": "RI",
    "slug": "rhode-island",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "South Carolina",
    "abbreviation": "SC",
    "slug": "south-carolina",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "South Dakota",
    "abbreviation": "SD",
    "slug": "south-dakota",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Tennessee",
    "abbreviation": "TN",
    "slug": "tennessee",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Texas",
    "abbreviation": "TX",
    "slug": "texas",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": true,
      "expungementAi": false
    },
    "blockers": [
      "legacy_live_preserved"
    ],
    "reviewerNotes": [
      "Legacy live generator preserved; all-50 promotion must not replace current live fallback until separately approved."
    ],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Utah",
    "abbreviation": "UT",
    "slug": "utah",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Vermont",
    "abbreviation": "VT",
    "slug": "vermont",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Virginia",
    "abbreviation": "VA",
    "slug": "virginia",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Washington",
    "abbreviation": "WA",
    "slug": "washington",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "West Virginia",
    "abbreviation": "WV",
    "slug": "west-virginia",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Wisconsin",
    "abbreviation": "WI",
    "slug": "wisconsin",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
  },
  {
    "jurisdiction": "Wyoming",
    "abbreviation": "WY",
    "slug": "wyoming",
    "buildStatus": "state_built",
    "qaReview": "pending",
    "attorneyReview": "pending",
    "sourceFreshnessReview": "pending",
    "visualReview": "pending",
    "promotionStatus": "state_built",
    "approvedForLive": false,
    "liveEnabled": false,
    "approvedChannels": {
      "internalPreview": true,
      "partnerRcap": false,
      "expungementAi": false
    },
    "blockers": [],
    "reviewerNotes": [],
    "approvedAt": null,
    "approvedBy": null
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
