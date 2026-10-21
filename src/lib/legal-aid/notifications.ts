import "server-only";

import { ClinicServiceError } from "@/lib/clinic-mode/errors";
import { getPartnerEmailDeliveryConfig, sendPartnerEmailMessage } from "@/lib/email/email-service";
import { intakePermissionsFor } from "./intake-service";
import { requireLegalAidDatabase } from "./registration-service";

// Participant messages reuse the existing partner email infrastructure and
// the existing clinic follow-up record. The follow-up's communication state
// reports what actually happened: sent (with the provider's message id),
// failed, or no_contact when delivery is not configured or the applicant
// gave no email. Nothing is reported as sent on hope.

export type ParticipantMessageResult = { followUpId: string; communicationState: "sent" | "failed" | "no_contact"; providerMessageId: string | null; detail: string };

export async function sendParticipantMessage(input: { intakeId: string; actorUserId: string; participantSafeMessage: string; internalNotes: string | null; dueAt: string | null; ownerEventStaffId: string | null }): Promise<ParticipantMessageResult> {
  const message = input.participantSafeMessage.trim();
  if (message.length < 3 || message.length > 1200) throw new ClinicServiceError("conflict", "Write a short, participant-safe message (3 to 1,200 characters).");
  const permissions = await intakePermissionsFor(input.intakeId, input.actorUserId);
  if (!permissions.includes("follow_up") && !permissions.includes("coordinator")) throw new ClinicServiceError("forbidden", "You are not assigned to contact participants.");
  const db = requireLegalAidDatabase();
  const intake = await db.from("legal_aid_intakes").select("event_id,clinic_case_id,registration_id").eq("id", input.intakeId).maybeSingle();
  if (intake.error || !intake.data) throw new ClinicServiceError("not_found", "Application was not found.");
  if (!intake.data.clinic_case_id) throw new ClinicServiceError("conflict", "Messages can be sent once the application has been submitted.");
  const registration = intake.data.registration_id ? await db.from("clinic_registrations").select("contact_email,contact_name,preferred_contact").eq("id", String(intake.data.registration_id)).maybeSingle() : null;
  const email = registration?.data?.contact_email ? String(registration.data.contact_email) : null;
  const config = getPartnerEmailDeliveryConfig();

  let communicationState: ParticipantMessageResult["communicationState"] = "no_contact";
  let providerMessageId: string | null = null;
  let detail = "";
  if (!email) {
    detail = "The applicant gave no email address; use the phone contact recorded on the registration.";
  } else if (!config.enabled) {
    detail = "Email delivery is not enabled in this environment; the message is saved but was not sent.";
  } else {
    const sent = await sendPartnerEmailMessage({
      recipientEmail: email,
      subject: "A message from your MVLP clinic",
      text: `${message}\n\nSign in to see your application: this message was sent by the Mississippi Volunteer Lawyers Project clinic team. Please do not reply with financial or other sensitive details by email.`
    });
    if (sent.status === "sent") { communicationState = "sent"; providerMessageId = sent.providerMessageId ?? null; detail = "Sent through the configured email provider."; }
    else if (sent.status === "failed") { communicationState = "failed"; detail = "The email provider refused the message; try again or use the phone contact."; }
    else { detail = "Email delivery is unavailable in this environment; the message is saved but was not sent."; }
  }

  const result = await db.rpc("clinic_upsert_event_follow_up", {
    p_event_id: String(intake.data.event_id), p_follow_up_id: null, p_case_id: String(intake.data.clinic_case_id), p_actor_user_id: input.actorUserId,
    p_owner_event_staff_id: input.ownerEventStaffId, p_due_at: input.dueAt, p_status: communicationState === "sent" ? "waiting_on_participant" : "open",
    p_communication_state: communicationState, p_participant_safe_message: message,
    p_internal_notes: [input.internalNotes?.trim() || null, providerMessageId ? `provider message ${providerMessageId}` : null, detail].filter(Boolean).join(" · ")
  });
  if (result.error) throw new ClinicServiceError("unavailable", "The follow-up could not be saved.");
  return { followUpId: String(result.data), communicationState, providerMessageId, detail };
}
