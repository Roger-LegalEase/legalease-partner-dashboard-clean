// The one bounded synthetic fixture the hosted Legal Aid Clinic Mode phase
// seeds, exercises and audits. Shared by the seed, the browser journey and
// the static verifier so the three cannot drift apart.
//
// Everything here is synthetic and nonproduction: reserved .test identities,
// a run-scoped event id, and the acceptance copy of the MVLP organization. The
// Production MVLP organization, its coordinator and any real applicant are
// never named here.

import { createHash } from "node:crypto";

const SHARED_FIXTURE = Object.freeze({
  partnerSlug: "mvlp",
  handoffPartnerSlug: "mvlp-training-handoff",
  handoffOrganizationName: "MVLP Training Handoff (synthetic)",
  // Two seats: applicants A and B are received, applicant C is waitlisted.
  capacity: 2,
  // Applicant A is the Clinic Preview participant whose sponsored Mississippi
  // packet the clinic journey generates on the same Preview; the attorney
  // attaches that packet as the unsigned execution copy.
  packetApplicantEmail: "mvl-demo-participant-a@rcap-acceptance.test",
  identities: Object.freeze([
    { key: "INTERNAL_ADMIN", role: "internal_admin", email: "mvlp-training-internal-admin@rcap-acceptance.test" },
    { key: "ADMIN_A", role: "partner_admin", email: "mvlp-training-admin-a@rcap-acceptance.test" },
    { key: "ADMIN_B", role: "partner_admin", email: "mvlp-training-admin-b@rcap-acceptance.test" },
    { key: "COORDINATOR", role: "partner_staff", email: "mvlp-training-coordinator@rcap-acceptance.test" },
    { key: "INTAKE_VOLUNTEER", role: "partner_staff", email: "mvlp-training-intake-volunteer@rcap-acceptance.test" },
    { key: "ATTORNEY", role: "partner_staff", email: "mvlp-training-attorney@rcap-acceptance.test" },
    { key: "NOTARY", role: "partner_staff", email: "mvlp-training-notary@rcap-acceptance.test" },
    { key: "APPLICANT_B", role: "participant", email: "mvlp-training-applicant-b@rcap-acceptance.test" },
    { key: "APPLICANT_C", role: "participant", email: "mvlp-training-applicant-c@rcap-acceptance.test" },
    // Account only, no membership: the administrator handoff maps it as the
    // replacement Partner Administrator of the synthetic handoff organization.
    { key: "REPLACEMENT_ADMIN", role: "auth_only", email: "mvlp-training-replacement-admin@rcap-acceptance.test" },
    // Account only: the first-administrator invitation of the synthetic
    // handoff organization is addressed to this existing confirmed account.
    { key: "FIRST_ADMIN", role: "auth_only", email: "mvlp-training-first-admin@rcap-acceptance.test" }
  ]),
  // Staff permissions the interim coordinator assigns on the training clinic.
  staffAssignments: Object.freeze({
    COORDINATOR: ["coordinator", "program_review", "follow_up", "export"],
    INTAKE_VOLUNTEER: ["intake_review"],
    ATTORNEY: ["attorney", "export"],
    NOTARY: ["notary"]
  })
});

// RFC 4122 UUID v5, with a fixed synthetic namespace. No participant input.
export function resolveLegalAidFixture(env = process.env) {
  const runId = env.GITHUB_RUN_ID || "0";
  const runAttempt = env.GITHUB_RUN_ATTEMPT || "1";
  if (!/^\d{1,20}$/.test(runId) || !/^[1-9]\d{0,9}$/.test(runAttempt)) throw new Error("Invalid synthetic run namespace");
  const bytes = createHash("sha1").update(Buffer.from("78000000000040008000000000000001", "hex")).update(`${runId}:${runAttempt}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 0x50;
  bytes[8] = (bytes[8] & 63) | 0x80;
  const hex = bytes.toString("hex");
  const eventId = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  return Object.freeze({ ...SHARED_FIXTURE, runId, runAttempt, eventId,
    eventSlug: `mvlp-training-clinic-${runId}-${runAttempt}`,
    eventName: `MVLP Training Clinic (synthetic ${hex.slice(0,12)})` });
}
export const LEGAL_AID_FIXTURE = resolveLegalAidFixture();
