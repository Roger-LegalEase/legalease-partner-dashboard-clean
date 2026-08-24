import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";

/**
 * UX-GLOBAL-005 — contact information is three facts, not one string.
 *
 * `contact_information` was a single `text` question whose helper read "Include
 * the mailing address, phone number, or email the court form requests." One
 * unvalidated string carried all three, printed under one review row, and bound
 * into a packet as one value, so nothing could place the address in the address
 * field of a court form and nothing checked that a phone number was a phone
 * number.
 *
 * The packet plans compiled for all 51 jurisdictions name `contact_information`
 * as a required input, and those plans, their form mappings and their required
 * input contracts are not this correction's to change. So the id survives as
 * the composed value the packet binds, and the participant is asked the three
 * real facts, each with its own prompt, its own validation and its own review
 * row.
 *
 * Only the mailing address is required, which keeps the blocking surface the
 * same size as the single field it replaces: a phone and an email are validated
 * when given and never hold up a packet when they are not.
 */

export const CONTACT_INFORMATION_ID = "contact_information";

export type ContactPartId =
  | "participant_mailing_address"
  | "participant_phone"
  | "participant_email";

export type ContactPart = {
  id: ContactPartId;
  reviewLabel: string;
  prompt: string;
  helperText: string;
  required: boolean;
  /** A participant-facing reason, or null when the value is acceptable. */
  validate: (raw: string) => string | null;
};

export const CONTACT_PARTS: ContactPart[] = [
  {
    id: "participant_mailing_address",
    reviewLabel: "Mailing address",
    prompt: "What mailing address should appear on this packet?",
    helperText: "Street or PO box, city, state and ZIP. This is where the court or agency sends anything about your case.",
    required: true,
    validate: (raw) => {
      const text = raw.trim();
      if (text.length === 0) return "Enter the mailing address that should appear on this packet.";
      if (text.length < 6 || !/[A-Za-z]/.test(text)) {
        return "Enter the full mailing address, including the city and state.";
      }
      return null;
    }
  },
  {
    id: "participant_phone",
    reviewLabel: "Phone number",
    prompt: "What phone number should appear on this packet?",
    helperText: "Optional. A court or clerk may use it to reach you about a hearing date.",
    required: false,
    validate: (raw) => {
      const text = raw.trim();
      if (text.length === 0) return null;
      const digits = text.replace(/\D/g, "");
      if (digits.length === 10) return null;
      if (digits.length === 11 && digits.startsWith("1")) return null;
      return "Enter a 10-digit phone number, or leave this blank.";
    }
  },
  {
    id: "participant_email",
    reviewLabel: "Email address",
    prompt: "What email address should appear on this packet?",
    helperText: "Optional. Some courts accept an email address for notices.",
    required: false,
    validate: (raw) => {
      const text = raw.trim();
      if (text.length === 0) return null;
      if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text)) return null;
      return "Enter an email address in the form name@example.com, or leave this blank.";
    }
  }
];

export const CONTACT_PART_IDS: string[] = CONTACT_PARTS.map((part) => part.id);

export function contactPartFor(id: string) {
  return CONTACT_PARTS.find((part) => part.id === id) ?? null;
}

export function isContactPartId(id: string): id is ContactPartId {
  return CONTACT_PART_IDS.includes(id);
}

function answerToText(value: AnswerValue | undefined) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(" ").trim();
  if (typeof value === "object") return String((value as { value?: unknown }).value ?? "").trim();
  return String(value).trim();
}

/** A participant-facing reason, or null. Used by the builder and by the server. */
export function contactPartError(id: string, value: AnswerValue | undefined): string | null {
  const part = contactPartFor(id);
  if (!part) return null;
  return part.validate(answerToText(value));
}

/**
 * The value the packet binds, built from the parts in a fixed order so the same
 * answers always produce the same string.
 */
export function composeContactInformation(answers: Record<string, AnswerValue>): string | null {
  const lines = CONTACT_PARTS
    .map((part) => answerToText(answers[part.id]))
    .filter((line) => line.length > 0);
  return lines.length > 0 ? lines.join("\n") : null;
}

/**
 * Best-effort split of a matter saved before the fields were separated, so no
 * participant is asked again for something they already typed. An email-shaped
 * line becomes the email, a line with at least ten digits becomes the phone, and
 * whatever is left is the address. Nothing is discarded: if no line looks like
 * an address the whole original string is kept as one.
 */
export function decomposeContactInformation(raw: string): Partial<Record<ContactPartId, string>> {
  const lines = raw.split(/[\n;]+/).map((line) => line.trim()).filter((line) => line.length > 0);
  if (lines.length === 0) return {};
  const parts: Partial<Record<ContactPartId, string>> = {};
  const remaining: string[] = [];
  for (const line of lines) {
    if (!parts.participant_email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(line)) {
      parts.participant_email = line;
      continue;
    }
    if (!parts.participant_phone && line.replace(/\D/g, "").length >= 10 && /^[\d\s()+.-]+$/.test(line)) {
      parts.participant_phone = line;
      continue;
    }
    remaining.push(line);
  }
  const address = remaining.join(", ").trim();
  if (address.length > 0) parts.participant_mailing_address = address;
  else if (!parts.participant_mailing_address && !parts.participant_email && !parts.participant_phone) {
    parts.participant_mailing_address = raw.trim();
  }
  return parts;
}

/**
 * Fills the parts from a legacy single string when they are absent, then
 * recomposes `contact_information` from whatever the parts now hold. Both
 * directions run over the same answer map, so the composed value and the fields
 * the participant sees can never disagree.
 */
export function withComposedContactInformation(
  answers: Record<string, AnswerValue>
): Record<string, AnswerValue> {
  const next = { ...answers };
  const hasPart = CONTACT_PARTS.some((part) => answerToText(next[part.id]).length > 0);
  const legacy = answerToText(next[CONTACT_INFORMATION_ID]);
  if (!hasPart && legacy.length > 0) {
    for (const [id, value] of Object.entries(decomposeContactInformation(legacy))) next[id] = value;
  }
  const composed = composeContactInformation(next);
  if (composed === null) delete next[CONTACT_INFORMATION_ID];
  else next[CONTACT_INFORMATION_ID] = composed;
  return next;
}
