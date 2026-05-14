"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  addSupportNote,
  closeCase,
  escalateCase
} from "@/lib/admin-case-actions";
import {
  flagManualReview,
  refreshCaseDisplayState,
  resolveManualReview,
  retryCaseSummary,
  triggerCaseAnonymization,
  type AdminOpsDatabase
} from "@/lib/admin-ops";

export async function addSupportNoteAction(formData: FormData) {
  const actor = await requireAdmin();
  const caseId = String(formData.get("caseId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!caseId || !body) return;
  await addSupportNote({ actor, caseId, body, db: prisma });
  revalidatePath(`/admin/cases/${caseId}`);
}

export async function escalateCaseAction(formData: FormData) {
  const actor = await requireAdmin();
  const caseId = String(formData.get("caseId") ?? "");
  await escalateCase({ actor, caseId, db: prisma });
  revalidatePath(`/admin/cases/${caseId}`);
  revalidatePath("/admin/cases");
}

export async function closeCaseAction(formData: FormData) {
  const actor = await requireAdmin();
  const caseId = String(formData.get("caseId") ?? "");
  await closeCase({ actor, caseId, db: prisma });
  revalidatePath(`/admin/cases/${caseId}`);
  revalidatePath("/admin/cases");
}

export async function regenerateSummaryAction(formData: FormData) {
  const actor = await requireAdmin();
  const caseId = String(formData.get("caseId") ?? "");
  await retryCaseSummary({ actor, caseId, db: prisma as unknown as AdminOpsDatabase });
  revalidatePath(`/admin/cases/${caseId}`);
}

export async function markManualReviewAction(formData: FormData) {
  const actor = await requireAdmin();
  const caseId = String(formData.get("caseId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!caseId || !reason) return;
  await flagManualReview({ actor, caseId, reason, db: prisma as unknown as AdminOpsDatabase });
  revalidatePath(`/admin/cases/${caseId}`);
  revalidatePath("/admin/cases");
}

export async function resolveManualReviewAction(formData: FormData) {
  const actor = await requireAdmin();
  const caseId = String(formData.get("caseId") ?? "");
  const resolutionNote = String(formData.get("resolutionNote") ?? "").trim();
  if (!caseId || !resolutionNote) return;
  await resolveManualReview({ actor, caseId, resolutionNote, db: prisma as unknown as AdminOpsDatabase });
  revalidatePath(`/admin/cases/${caseId}`);
  revalidatePath("/admin/cases");
}

export async function anonymizeCaseAction(formData: FormData) {
  const actor = await requireAdmin();
  const caseId = String(formData.get("caseId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  if (!caseId || !reason || confirmation !== "ANONYMIZE") return;
  await triggerCaseAnonymization({ actor, caseId, reason, db: prisma as unknown as AdminOpsDatabase });
  revalidatePath(`/admin/cases/${caseId}`);
  revalidatePath("/admin/cases");
}

export async function refreshCaseStatusAction(formData: FormData) {
  const actor = await requireAdmin();
  const caseId = String(formData.get("caseId") ?? "");
  if (!caseId) return;
  await refreshCaseDisplayState({ actor, caseId, db: prisma as unknown as AdminOpsDatabase });
  revalidatePath(`/admin/cases/${caseId}`);
  revalidatePath("/admin/cases");
}
