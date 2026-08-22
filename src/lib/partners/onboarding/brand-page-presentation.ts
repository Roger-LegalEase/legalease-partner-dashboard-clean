import type { CoBrandedPagePreview } from "./artifact-generator";
import {
  expiredSessionState,
  wrongAccountInvitationState
} from "./partner-copy";
import type { OrganizationalAssetCategory } from "./types";

// Two recovery states the copy contract also declares. Reading them from there keeps one
// authored wording per state instead of two that can drift apart.
const WRONG_ACCOUNT = wrongAccountInvitationState("/sign-in?next=/partner/dashboard");
const EXPIRED_SESSION = expiredSessionState(
  "/sign-in?next=/partner/onboarding/brand_public_page"
);

export type BrandPreviewAsset = {
  id: string;
  category: OrganizationalAssetCategory;
  lifecycleStatus?: string;
};

export type BrandApprovalPresentation = {
  partnerApproval: "Not reviewed" | "Changes requested" | "Approved";
  legalEaseApproval: "Not reviewed" | "Changes requested" | "Approved";
  publication: "Private";
  activation: "Inactive" | "Scheduled" | "Live" | "Paused" | "Closed";
  approvalNote: string;
};

export type PartnerRecoveryCode =
  | "invitation_unavailable"
  | "invitation_expired"
  | "invitation_revoked"
  | "invitation_already_used"
  | "wrong_signed_in_email"
  | "account_already_connected"
  | "session_expired"
  | "private_preview_unavailable"
  | "asset_upload_failed"
  | "asset_preview_failed"
  | "private_asset_unavailable"
  | "brand_save_failed"
  | "approval_invalidated";

export type PartnerRecoveryPresentation = {
  heading: string;
  happened: string;
  safe: string;
  next: string;
  returnLabel: string;
  returnHref: string;
};

/**
 * Applies the currently edited brand values to the authoritative preview
 * projection. The preview remains a presentation of the canonical section and
 * private assets. It cannot change publication or activation state.
 */
export function applyBrandEditorPreview(
  source: CoBrandedPagePreview,
  data: Readonly<Record<string, unknown>>,
  assets: readonly BrandPreviewAsset[]
): CoBrandedPagePreview {
  const logo = assets.find(
    (asset) =>
      asset.category === "transparent_logo" &&
      asset.lifecycleStatus !== "deleted"
  );
  const heroImage = assets.find(
    (asset) =>
      asset.category === "hero_or_community_image" &&
      asset.lifecycleStatus !== "deleted"
  );

  return {
    ...source,
    organizationDescription: editedField(
      source.organizationDescription,
      data.approved_organization_description
    ),
    headline: editedField(source.headline, data.program_headline),
    subheadline: editedField(source.subheadline, data.program_subheadline),
    participantSupportCopy: editedField(
      source.participantSupportCopy,
      data.participant_support_copy
    ),
    primaryActionLabel: editedField(
      source.primaryActionLabel,
      data.primary_cta_label
    ),
    partnerPrivacyUrl: editedField(
      source.partnerPrivacyUrl,
      data.partner_privacy_url
    ),
    accessibilityUrl: editedField(
      source.accessibilityUrl,
      data.accessibility_url
    ),
    logo: {
      ...source.logo,
      assetId: logo?.id ?? null
    },
    heroImage: {
      ...source.heroImage,
      assetId: heroImage?.id ?? null
    },
    missing: previewMissing(source, data, logo?.id ?? null)
  };
}

export function buildBrandApprovalPresentation(input: {
  partnerReviewStatus: string | null;
  legalEaseApprovalStatus: string | null;
  sourceFreshness: "no_version" | "current" | "stale" | "unavailable";
  invalidatedApprovals?: { partner: boolean; legalease: boolean };
  workspaceStatus: string;
  targetLaunchDate: string | null;
  launchedAt: string | null;
  pausedAt: string | null;
  closedAt: string | null;
}): BrandApprovalPresentation {
  const partnerInvalidated =
    input.sourceFreshness === "stale" &&
    input.invalidatedApprovals?.partner === true;
  const legalEaseInvalidated =
    input.sourceFreshness === "stale" &&
    input.invalidatedApprovals?.legalease === true;
  const partnerApproval = partnerInvalidated
    ? "Changes requested"
    : approvalLabel(input.partnerReviewStatus);
  const legalEaseApproval = legalEaseInvalidated
    ? "Changes requested"
    : approvalLabel(input.legalEaseApprovalStatus);

  return {
    partnerApproval,
    legalEaseApproval,
    publication: "Private",
    activation: activationLabel(input),
    approvalNote:
      partnerInvalidated
        ? "A later partner edit changed factual or brand content. The prior partner and LegalEase approvals no longer apply to the current values."
        : legalEaseInvalidated
          ? "LegalEase-controlled content changed. LegalEase must review the current version again; the partner decision still stands."
          : "Partner approval covers factual and brand content only. It does not publish the page or activate participant intake."
  };
}

export function partnerRecoveryPresentation(
  code: PartnerRecoveryCode
): PartnerRecoveryPresentation {
  return RECOVERY_PRESENTATIONS[code];
}

function editedField(
  field: CoBrandedPagePreview["headline"],
  value: unknown
) {
  if (field.ownership === "legalease_controlled") return field;
  return {
    ...field,
    value: normalizedText(value)
  };
}

function normalizedText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function previewMissing(
  source: CoBrandedPagePreview,
  data: Readonly<Record<string, unknown>>,
  logoAssetId: string | null
) {
  const fieldValues: Array<[CoBrandedPagePreview["headline"], unknown]> = [
    [source.headline, data.program_headline],
    [source.subheadline, data.program_subheadline],
    [source.organizationDescription, data.approved_organization_description],
    [source.participantSupportCopy, data.participant_support_copy],
    [source.primaryActionLabel, data.primary_cta_label]
  ];
  const locallyOwnedLabels = new Set(
    fieldValues.map(([field]) => field.label)
  );
  const missing = source.missing.filter(
    (item) =>
      !locallyOwnedLabels.has(item.label) && item.label !== source.logo.label
  );
  for (const [field, value] of fieldValues) {
    if (!normalizedText(value)) {
      missing.push({ label: field.label, whereToSet: field.whereToSet });
    }
  }
  if (source.showPartnerLogo && logoAssetId === null) {
    missing.push({ label: source.logo.label, whereToSet: source.logo.whereToSet });
  }
  return missing;
}

function approvalLabel(
  status: string | null
): "Not reviewed" | "Changes requested" | "Approved" {
  if (status === "approved") return "Approved";
  if (status === "changes_requested" || status === "rejected") {
    return "Changes requested";
  }
  return "Not reviewed";
}

function activationLabel(input: {
  workspaceStatus: string;
  targetLaunchDate: string | null;
  launchedAt: string | null;
  pausedAt: string | null;
  closedAt: string | null;
}): BrandApprovalPresentation["activation"] {
  if (input.closedAt || input.workspaceStatus === "closed") return "Closed";
  if (input.pausedAt || input.workspaceStatus === "paused") return "Paused";
  if (input.launchedAt || input.workspaceStatus === "launched") return "Live";
  if (
    input.targetLaunchDate &&
    ["ready_to_launch", "launch_scheduled"].includes(input.workspaceStatus)
  ) {
    return "Scheduled";
  }
  return "Inactive";
}

const RECOVERY_PRESENTATIONS: Readonly<
  Record<PartnerRecoveryCode, PartnerRecoveryPresentation>
> = {
  invitation_unavailable: {
    heading: "This account setup link cannot be used",
    happened: "The setup link is expired, replaced, withdrawn, or already completed.",
    safe: "The link cannot create new access, and no program information was changed.",
    next: "Use the newest invitation or ask LegalEase to confirm the administrator email and next setup step.",
    returnLabel: "Return to sign in",
    returnHref: "/sign-in?next=/partner/dashboard"
  },
  invitation_expired: {
    heading: "This account setup link has expired",
    happened: "The setup window ended before account access was confirmed.",
    safe: "No account access or partner membership was created by this attempt.",
    next: "Ask LegalEase to confirm the administrator email and send a new setup invitation.",
    returnLabel: "Return to sign in",
    returnHref: "/sign-in?next=/partner/dashboard"
  },
  invitation_revoked: {
    heading: "This account setup link is no longer active",
    happened: "LegalEase withdrew or replaced this setup invitation.",
    safe: "The link cannot create access, and no program information was changed.",
    next: "Use the newest invitation or ask LegalEase which invitation is current.",
    returnLabel: "Return to sign in",
    returnHref: "/sign-in?next=/partner/dashboard"
  },
  invitation_already_used: {
    heading: "This account setup link was already used",
    happened: "Administrator access was previously connected through this invitation.",
    safe: "Reusing the link cannot create a second membership.",
    next: "Sign in with the administrator account that completed setup.",
    returnLabel: "Sign in",
    returnHref: "/sign-in?next=/partner/dashboard"
  },
  wrong_signed_in_email: {
    // Heading, next step and action label come from the copy contract, which declares this
    // state for every surface that has to explain it. What stays here is what only the
    // recovery panel says: what happened, and what is safe.
    heading: WRONG_ACCOUNT.heading,
    happened: "The signed-in account does not match the administrator email on the setup invitation.",
    safe: "No membership was created and no existing access was changed.",
    next: WRONG_ACCOUNT.explanation,
    returnLabel: WRONG_ACCOUNT.primaryAction?.label ?? "Sign in with another account",
    returnHref: "/sign-in?next=/partner/dashboard"
  },
  account_already_connected: {
    heading: "This account is already connected",
    happened: "The signed-in account already belongs to a partner workspace.",
    safe: "Your existing access is unchanged, and no second connection was created.",
    next: "Return to the dashboard for the connected workspace or contact LegalEase if that access is incorrect.",
    returnLabel: "Return to your dashboard",
    returnHref: "/partner/dashboard"
  },
  session_expired: {
    heading: EXPIRED_SESSION.heading,
    happened: "The sign-in session ended before this action could be confirmed.",
    safe: "Your last confirmed save remains available and the unfinished action was not applied.",
    next: "Sign in again, then return to the current brand task.",
    returnLabel: EXPIRED_SESSION.primaryAction?.label ?? "Sign in again",
    returnHref: "/sign-in?next=/partner/onboarding/brand_public_page"
  },
  private_preview_unavailable: {
    heading: "The private preview is unavailable",
    happened: "The current private page configuration could not be prepared for display.",
    safe: "The page remains private, participant intake remains inactive, and saved configuration was not changed.",
    next: "Return to the brand task and retry. Contact LegalEase if the preview remains unavailable.",
    returnLabel: "Return to brand editor",
    returnHref: "/partner/onboarding/brand_public_page"
  },
  asset_upload_failed: {
    heading: "The upload could not be completed",
    happened: "The private file was not confirmed by the authoritative asset service.",
    safe: "No success was recorded. Existing private assets and page status were not changed.",
    next: "Check the supported type and size, then choose the file again.",
    returnLabel: "Return to asset task",
    returnHref: "/partner/onboarding/brand_public_page?step=private-assets"
  },
  asset_preview_failed: {
    heading: "The file could not be previewed",
    happened: "The browser could not display this private image.",
    safe: "The file remains private and the failed preview did not publish or alter it.",
    next: "Download the private file to review it, or replace it with a supported image.",
    returnLabel: "Return to asset task",
    returnHref: "/partner/onboarding/brand_public_page?step=private-assets"
  },
  private_asset_unavailable: {
    heading: "The private download is no longer available",
    happened: "The current private download could not be opened.",
    safe: "No public URL or another organization’s asset was exposed.",
    next: "Return to the asset task and request a new private download.",
    returnLabel: "Return to asset task",
    returnHref: "/partner/onboarding/brand_public_page?step=private-assets"
  },
  brand_save_failed: {
    heading: "Brand changes were not saved",
    happened: "Authoritative persistence did not confirm the latest edit.",
    safe: "The editor kept the entered values on this page. No approval, publication, or activation state changed.",
    next: "Retry the save after checking the connection, or review the newer version if one exists.",
    returnLabel: "Return to brand editor",
    returnHref: "/partner/onboarding/brand_public_page"
  },
  approval_invalidated: {
    heading: "The prior approval needs review",
    happened: "A later authoritative partner edit changed factual or brand content after approval.",
    safe: "The prior decision remains in history, and the page remains private and inactive.",
    next: "Review the changed values in desktop and mobile preview, then make a new partner decision when available.",
    returnLabel: "Review current preview",
    returnHref:
      "/partner/onboarding/brand_public_page?step=private-preview-approval"
  }
};
