// The participant data-rights contract.
//
// Deliberately dependency-free and free of `server-only`, so the routes, the UI,
// the deletion pipeline and the verifiers all read the SAME list of steps and
// the SAME retention vocabulary rather than three drifting copies. The ordering
// in ACCOUNT_DELETION_STEPS is the ordering the pipeline executes and the
// ordering the database records; a step added in one place and not the other is
// a compile error, not a silent gap.

export const PRIVACY_REQUEST_TYPES = ["export", "matter_deletion", "account_deletion"] as const;
export type PrivacyRequestType = (typeof PRIVACY_REQUEST_TYPES)[number];

export const PRIVACY_REQUEST_STATUSES = [
  "pending",
  "in_progress",
  "partially_completed",
  "completed",
  "failed",
  "blocked_legal_hold",
  "cancelled"
] as const;
export type PrivacyRequestStatus = (typeof PRIVACY_REQUEST_STATUSES)[number];

export const PRIVACY_STEP_STATUSES = ["pending", "in_progress", "completed", "skipped", "failed"] as const;
export type PrivacyStepStatus = (typeof PRIVACY_STEP_STATUSES)[number];

/**
 * The account-deletion order, exactly as specified, and the order matters at
 * every position:
 *
 *   freeze first, because everything after it must run against an account that
 *   cannot accept new work; sessions and email next, because a live session or a
 *   queued reminder is a way for the account to keep acting; assistance and the
 *   follow-up queue next, because a human helper reading a queue entry is access;
 *   renders cancelled before downloads are invalidated, so nothing finishes
 *   after the download is gone; objects deleted before the rows that point at
 *   them, so an interrupted run never leaves an unreferenced object nobody can
 *   find; pseudonymization after deletion, because it applies to what is left;
 *   processors after the local truth is settled; the tombstone before the Auth
 *   user, because the Auth deletion is the one step that cannot be re-run; and
 *   the receipt last, because it is the claim that all of the above happened.
 */
export const ACCOUNT_DELETION_STEPS = [
  "freeze_account",
  "revoke_sessions",
  "stop_email_reminders",
  "revoke_partner_assistance",
  "remove_follow_up_queue_entries",
  "cancel_unstarted_renders",
  "invalidate_downloads",
  "delete_uploads",
  "delete_generated_packets",
  "delete_or_deidentify_matters",
  "pseudonymize_retained_records",
  "propagate_to_processors",
  "write_backup_tombstone",
  "delete_auth_user",
  "issue_receipt"
] as const;
export type AccountDeletionStep = (typeof ACCOUNT_DELETION_STEPS)[number];

/** Single-matter deletion. Same discipline, smaller blast radius. */
export const MATTER_DELETION_STEPS = [
  "verify_matter_ownership",
  "cancel_unstarted_renders",
  "invalidate_downloads",
  "delete_generated_packets",
  "delete_matter_records",
  "pseudonymize_retained_records",
  "issue_receipt"
] as const;
export type MatterDeletionStep = (typeof MATTER_DELETION_STEPS)[number];

export const EXPORT_STEPS = ["collect_export", "issue_receipt"] as const;
export type ExportStep = (typeof EXPORT_STEPS)[number];

export function stepsForRequestType(requestType: PrivacyRequestType): readonly string[] {
  if (requestType === "account_deletion") return ACCOUNT_DELETION_STEPS;
  if (requestType === "matter_deletion") return MATTER_DELETION_STEPS;
  return EXPORT_STEPS;
}

/**
 * Approved processors. A processor appears here or it is not told anything.
 * `personalDataHeld: false` is a real answer, recorded as `not_applicable`
 * rather than left out — "we never had to tell them" and "we forgot" must not
 * look the same on a receipt.
 */
export const APPROVED_PROCESSORS = [
  {
    key: "email_delivery",
    label: "Email delivery provider",
    personalDataHeld: true,
    treatment: "Suppression and deletion of the participant address from sending and reminder lists."
  },
  {
    key: "payment_processor",
    label: "Payment processor",
    personalDataHeld: true,
    treatment:
      "Deletion is not requested: the processor is the independent controller of its own transaction records and is required to retain them. The link from those records to this account is removed here."
  },
  {
    key: "product_analytics",
    label: "Product analytics",
    personalDataHeld: true,
    treatment: "Account identifiers removed from retained event rows; aggregate counts unchanged."
  },
  {
    key: "packet_render_worker",
    label: "Packet render worker",
    personalDataHeld: false,
    treatment: "Holds no participant personal data of its own; it reads a job and writes an artifact."
  }
] as const;
export type ApprovedProcessorKey = (typeof APPROVED_PROCESSORS)[number]["key"];

/** What a retained record class is, and why it survives an erasure. */
export const RETENTION_TREATMENTS = [
  "deleted",
  "de_identified",
  "pseudonymized_retained",
  "retained_under_legal_hold",
  "retained_for_financial_compliance"
] as const;
export type RetentionTreatment = (typeof RETENTION_TREATMENTS)[number];

export type RetentionExplanationEntry = {
  recordClass: string;
  treatment: RetentionTreatment;
  explanation: string;
};

/**
 * The participant-facing retention explanation. This ships in the export package
 * AND in the deletion receipt, from one source, because a participant who reads
 * two different answers to "what did you keep?" has been told nothing.
 */
export const RETENTION_EXPLANATION: readonly RetentionExplanationEntry[] = [
  {
    recordClass: "Profile, matters, screenings, answers and packets",
    treatment: "deleted",
    explanation: "Deleted outright. Nothing about your record-clearing situation is kept."
  },
  {
    recordClass: "Uploaded files and generated packet files",
    treatment: "deleted",
    explanation: "The stored files themselves are removed, not just the links to them."
  },
  {
    recordClass: "Payment and sponsorship records",
    treatment: "pseudonymized_retained",
    explanation:
      "The fact that a payment happened, its amount and its receipt reference are kept because accounting and tax records have to balance. Your account identifier is replaced with a code that cannot be turned back into you."
  },
  {
    recordClass: "Security and delivery audit records",
    treatment: "pseudonymized_retained",
    explanation:
      "Records of when a packet was authorized and downloaded are kept for security. Your account identifier is replaced with the same code."
  },
  {
    recordClass: "Analytics events",
    treatment: "de_identified",
    explanation: "The account identifier is removed. What is left counts a visit, not a person."
  },
  {
    recordClass: "This privacy request and its receipt",
    treatment: "pseudonymized_retained",
    explanation:
      "The request and its receipt outlive the account on purpose: they are the proof that the deletion happened, and are what a restored backup is checked against."
  }
] as const;

/** How long a recent-auth proof is good for. Ten minutes, one request. */
export const RECENT_AUTH_PROOF_TTL_SECONDS = 10 * 60;

/** Proof purposes. A proof minted for one is refused for the other. */
export const RECENT_AUTH_PURPOSES = ["matter_deletion", "account_deletion"] as const;
export type RecentAuthPurpose = (typeof RECENT_AUTH_PURPOSES)[number];

export function isRecentAuthPurpose(value: unknown): value is RecentAuthPurpose {
  return typeof value === "string" && (RECENT_AUTH_PURPOSES as readonly string[]).includes(value);
}

export const PRIVACY_RATE_LIMIT_POLICIES = {
  reauthUser: { scope: "participant_privacy_reauth_user", maxAttempts: 5, windowMs: 15 * 60 * 1000 },
  reauthIp: { scope: "participant_privacy_reauth_ip", maxAttempts: 20, windowMs: 15 * 60 * 1000 },
  exportUser: { scope: "participant_privacy_export_user", maxAttempts: 5, windowMs: 60 * 60 * 1000 },
  destructiveUser: { scope: "participant_privacy_destructive_user", maxAttempts: 10, windowMs: 60 * 60 * 1000 }
} as const;

/** Storage prefix a participant's own uploads live under, if any exist. */
export function participantUploadPrefix(userId: string): string {
  return `participant-uploads/${userId}`;
}

/**
 * Every approved location a participant's own bytes can be stored under.
 *
 * The sweep is driven from this list rather than from one prefix, because a
 * deletion that clears the location somebody remembered and leaves the one they
 * forgot is worse than useless: it reports success. Adding a storage location
 * to the product means adding it here, and the deletion test asserts the sweep
 * covers every entry.
 */
export function participantStoragePrefixes(userId: string): readonly string[] {
  return [
    participantUploadPrefix(userId),
    `participant-packets/${userId}`
  ];
}

/**
 * Storage `remove()` takes a batch. The cap is deliberate and low enough to
 * stay well inside the request limit, because a rejected oversized batch would
 * fail the whole sweep rather than the one object that made it too big.
 */
export const STORAGE_DELETE_CHUNK = 100;

/**
 * Storage `list()` caps at 1000 per page whatever you ask for. Paging at the
 * cap is what makes the difference between sweeping a bucket and sweeping its
 * first page.
 */
export const STORAGE_LIST_PAGE = 1000;
