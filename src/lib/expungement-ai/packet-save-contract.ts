import { z } from "zod";
import { profileQuestionSchema } from "@/lib/expungement-ai/frontend/schemas";
import type { AnswerValue, ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import type { PacketInformationSection } from "@/lib/expungement-ai/packet-information";

/** The server receipt is the source of persisted answers and active questions. */
export type PacketSaveReceipt = {
  ok: true;
  revision: number;
  answers: Record<string, AnswerValue>;
  questions: ProfileQuestion[];
  reviewQuestions: ProfileQuestion[];
  sections: PacketInformationSection[];
  missingInputIds: string[];
  pendingDerivations: Array<{ factId: string; inputFactIds: string[] }>;
  resumeSectionId: string | null;
  reviewPath: string;
  readyToGenerate: boolean;
  reviewReason: string;
  nextAction: "continue_packet" | "review_packet" | "open_matter";
};

const answerSchema = z.union([
  z.string(), z.number().finite(), z.array(z.string()), z.null(),
  z.object({ value: z.union([z.string(), z.number().finite(), z.null()]).optional(), unknown: z.boolean().optional() }).strict()
]);
const receiptSchema = z.object({
  ok: z.literal(true), revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  answers: z.record(z.string(), answerSchema),
  questions: z.array(profileQuestionSchema), reviewQuestions: z.array(profileQuestionSchema),
  sections: z.array(z.object({
    id: z.string().min(1), heading: z.string(), description: z.string(), questionIds: z.array(z.string()),
    translations: z.object({ es: z.object({ heading: z.string(), description: z.string() }) })
  })),
  missingInputIds: z.array(z.string()),
  pendingDerivations: z.array(z.object({ factId: z.string(), inputFactIds: z.array(z.string()) })),
  resumeSectionId: z.string().nullable(), reviewPath: z.string().regex(/^\/briefcase\/[^/]+\/review$/),
  readyToGenerate: z.boolean(), reviewReason: z.string(),
  nextAction: z.enum(["continue_packet", "review_packet", "open_matter"])
});

export function isPacketSaveReceipt(value: unknown): value is PacketSaveReceipt {
  const parsed = receiptSchema.safeParse(value);
  if (!parsed.success) return false;
  const item = parsed.data;
  const unique = (ids: string[]) => new Set(ids).size === ids.length;
  const questionIds = new Set(item.questions.map((question) => question.id));
  const reviewIds = new Set(item.reviewQuestions.map((question) => question.id));
  return (!item.readyToGenerate || item.missingInputIds.length === 0 && item.pendingDerivations.length === 0 && item.nextAction === "review_packet")
    && unique(item.questions.map((question) => question.id))
    && unique(item.reviewQuestions.map((question) => question.id))
    && unique(item.sections.map((section) => section.id))
    && unique(item.sections.flatMap((section) => section.questionIds))
    && item.questions.every((question) => reviewIds.has(question.id))
    && item.sections.every((section) => section.questionIds.every((id) => questionIds.has(id)));
}

export function sameAnswer(left: unknown, right: unknown): boolean {
  const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical)
    : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, part]) => [key, canonical(part)])) : value;
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

/** Keep edits made while a request was in flight; use the server for everything else. */
export function reconcileSavedAnswers(
  submitted: Record<string, AnswerValue>, latest: Record<string, AnswerValue>, canonical: Record<string, AnswerValue>
): Record<string, AnswerValue> {
  return { ...canonical, ...Object.fromEntries(Object.entries(latest).filter(([id, answer]) => !sameAnswer(submitted[id], answer))) };
}

export function changedPacketAnswers(current: Record<string, AnswerValue>, saved: Record<string, AnswerValue>) {
  return Object.fromEntries(Object.entries(current).filter(([id, answer]) => !sameAnswer(answer, saved[id])));
}

export function packetSaveErrorCopy(status: number, code?: string) {
  if (status === 413) return { en: "This save exceeds the 60 KB limit. Your text remains on this page. Shorten the text you are saving, then try again.", es: "Este guardado supera el límite de 60 KB. Su texto permanece en esta página. Acorte el texto que intenta guardar y vuelva a intentarlo." };
  if (status === 429) return { en: "Too many save attempts. Your changes remain here. Wait a moment, then try again.", es: "Se hicieron demasiados intentos de guardar. Sus cambios permanecen aquí. Espere un momento y vuelva a intentarlo." };
  if (status === 401) return { en: "Your session expired. Sign in again to save. Keep this page open so your unsaved changes remain here.", es: "Su sesión venció. Vuelva a iniciar sesión para guardar. Mantenga esta página abierta para conservar aquí los cambios sin guardar." };
  if (status === 403 && code === "verified_account_required") return { en: "Verify your account email before saving. Your changes remain on this page.", es: "Verifique el correo electrónico de su cuenta antes de guardar. Sus cambios permanecen en esta página." };
  if (status === 403) return { en: "This account cannot save this matter. Check that you are signed in to the account that owns it. Your unsaved changes remain on this page.", es: "Esta cuenta no puede guardar este caso. Compruebe que inició sesión en la cuenta a la que pertenece. Los cambios sin guardar permanecen en esta página." };
  if (status === 404) return { en: "This saved matter could not be found. Your unsaved changes remain on this page.", es: "No se encontró este caso guardado. Los cambios sin guardar permanecen en esta página." };
  if (status === 409) return { en: "This matter changed in another session. Your changes have not been saved. Keep this page open and open the matter in another tab to compare the saved answers before retrying.", es: "Este caso cambió en otra sesión. Sus cambios no se guardaron. Mantenga esta página abierta y abra el caso en otra pestaña para comparar las respuestas guardadas antes de volver a intentarlo." };
  if (status === 428) return { en: "This page needs to be reopened before it can save. Your changes have not been saved; keep this page open while you reopen the matter in another tab.", es: "Debe volver a abrir esta página para poder guardar. Sus cambios no se guardaron; mantenga esta página abierta mientras vuelve a abrir el caso en otra pestaña." };
  if (status === 400) return { en: "This request could not be saved. Your draft remains here. Reopen this matter in another tab before retrying.", es: "No se pudo guardar esta solicitud. Su borrador permanece aquí. Vuelva a abrir este caso en otra pestaña antes de intentarlo de nuevo." };
  if (status === 422) return { en: code === "sensitive_identifier_prerequisite_required" ? "Confirm the court-approved identifier delivery method and its source before entering a Social Security number. Your changes have not been saved." : "Some answers could not be saved. Review the marked questions. Your changes remain on this page.", es: code === "sensitive_identifier_prerequisite_required" ? "Confirme el método de entrega de identificadores aprobado por el tribunal y la fuente de esa confirmación antes de ingresar un número de Seguro Social. Sus cambios no se guardaron." : "No se pudieron guardar algunas respuestas. Revise las preguntas señaladas. Sus cambios permanecen en esta página." };
  return { en: "We could not confirm that your changes were saved. Keep this page open and try again when your connection is available.", es: "No pudimos confirmar que se guardaron sus cambios. Mantenga esta página abierta y vuelva a intentarlo cuando tenga conexión." };
}
