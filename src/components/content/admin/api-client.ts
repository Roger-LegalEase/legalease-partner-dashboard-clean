/**
 * The CMS's one door to the content API.
 *
 * Every write in the admin UI goes through here so that failure handling is uniform and honest:
 *   401 -> your session expired, sign in again (no silent retry)
 *   403 -> your role cannot do this (says which action)
 *   409 -> someone else changed this (conflict, do not clobber)
 *   422 -> a problem list, surfaced verbatim rather than collapsed into "invalid"
 *
 * A network failure is reported as a network failure. Nothing in this file ever fabricates success.
 */

import type {
  PromotionGenerationInput,
  PromotionGenerationOutput,
  PromotionGroundingIssue
} from "@/lib/content/promotion-generation-contract";
import type { CreateContentPostPayload } from "@/lib/content/types";

export type ApiFailure = {
  ok: false;
  status: number;
  message: string;
  problems: string[];
};

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

function messageForStatus(status: number, serverMessage: string | null): string {
  if (serverMessage) return serverMessage;
  switch (status) {
    case 401:
      return "Your session has expired. Sign in again to continue — your unsaved work is still in the editor.";
    case 403:
      return "Your content role is not permitted to perform this action.";
    case 404:
      return "That record no longer exists.";
    case 409:
      return "This record changed somewhere else. Reload before saving so you do not overwrite someone else's work.";
    case 422:
      return "The server rejected this content. Fix the problems listed below and try again.";
    case 0:
      return "Could not reach the server. Check your connection — nothing was saved.";
    default:
      return `The server returned an unexpected error (${status}).`;
  }
}

function extractProblems(body: unknown): string[] {
  if (!body || typeof body !== "object") return [];
  const record = body as Record<string, unknown>;
  const candidates = [record.problems, record.issues, record.errors, record.details];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            const entry = item as Record<string, unknown>;
            const message = entry.message ?? entry.error ?? entry.detail;
            const field = typeof entry.field === "string" ? `${entry.field}: ` : "";
            if (typeof message === "string") return `${field}${message}`;
          }
          return null;
        })
        .filter((item): item is string => Boolean(item));
    }
  }
  return [];
}

function extractMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  for (const key of ["error", "message", "reason"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

export async function apiRequest<T = Record<string, unknown>>(
  path: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      ...init,
      headers: {
        accept: "application/json",
        ...(init?.body instanceof FormData ? {} : { "content-type": "application/json" }),
        ...(init?.headers ?? {})
      }
    });
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message: messageForStatus(0, null),
      problems: [error instanceof Error ? error.message : String(error)]
    };
  }

  let body: unknown = null;
  const text = await response.text().catch(() => "");
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  // The API contract is {success:boolean,...}. A 200 whose body says success:false is a failure —
  // trusting the HTTP status alone is how a UI ends up showing a green check on a rejected write.
  const succeeded =
    response.ok && (body === null || typeof body !== "object" || (body as Record<string, unknown>).success !== false);

  if (!succeeded) {
    return {
      ok: false,
      status: response.status,
      message: messageForStatus(response.status, extractMessage(body)),
      problems: extractProblems(body)
    };
  }

  return { ok: true, data: (body ?? {}) as T };
}

// --- Endpoint helpers ---------------------------------------------------------------------------

export const contentApi = {
  createPost: (payload: CreateContentPostPayload) =>
    apiRequest<{ post?: { postId?: string; post_id?: string; id?: string } }>("/api/internal/content/posts", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  savePost: (postId: string, payload: Record<string, unknown>) =>
    apiRequest<{ version?: number }>(`/api/internal/content/posts/${postId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),

  deletePost: (postId: string) =>
    apiRequest(`/api/internal/content/posts/${postId}`, { method: "DELETE" }),

  transition: (postId: string, payload: { to: string; scheduledFor?: string | null; note?: string | null }) =>
    apiRequest(`/api/internal/content/posts/${postId}/transition`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  listVersions: (postId: string) =>
    apiRequest<{ versions?: unknown[] }>(`/api/internal/content/posts/${postId}/versions`),

  restoreVersion: (postId: string, version: number) =>
    apiRequest(`/api/internal/content/posts/${postId}/versions/restore`, {
      method: "POST",
      body: JSON.stringify({ version })
    }),

  uploadMedia: (form: FormData) =>
    apiRequest<{ media?: unknown }>("/api/internal/content/media", { method: "POST", body: form }),

  updateMedia: (mediaId: string, payload: Record<string, unknown>) =>
    apiRequest(`/api/internal/content/media/${mediaId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),

  saveSocial: (postId: string, payload: Record<string, unknown>) =>
    apiRequest<{ drafts?: Record<string, unknown>[]; approvalReset?: string[] }>(`/api/internal/content/social/${postId}`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  generatePromotion: (postId: string, payload: PromotionGenerationInput) =>
    apiRequest<{
      generatedAt: string;
      sourceVersion: number;
      suggestions: PromotionGenerationOutput;
      issues: PromotionGroundingIssue[];
    }>(`/api/internal/content/promotion/${postId}/generate`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  generateSocialAssets: (
    postId: string,
    payload: { template?: string; headline?: string }
  ) =>
    apiRequest<{ assets?: Record<string, unknown>[]; template?: string; headline?: string; mediaNotice?: string | null }>(
      `/api/internal/content/promotion/${postId}/assets`,
      { method: "POST", body: JSON.stringify(payload) }
    ),

  exportPromotion: (postId: string) =>
    apiRequest<Record<string, unknown>>(`/api/internal/content/promotion/${postId}/export`, {
      method: "POST",
      body: JSON.stringify({})
    }),

  sendPromotion: (postId: string) =>
    apiRequest(`/api/internal/content/promotion/${postId}/send`, {
      method: "POST",
      body: JSON.stringify({})
    }),

  saveStateEditorial: (code: string, payload: Record<string, unknown>) =>
    apiRequest(`/api/internal/content/state-editorial/${code}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),

  createAuthor: (payload: Record<string, unknown>) =>
    apiRequest("/api/internal/content/authors", { method: "POST", body: JSON.stringify(payload) })
};

/**
 * The upload route's exact response shape is owned by another agent. Rather than guess one and break
 * on a near-miss, read the fields we need tolerantly and fail loudly if the essentials are absent.
 */
export type UploadedMedia = { mediaId: string; src: string; width: number | null; height: number | null };

export function readUploadedMedia(body: unknown): UploadedMedia | null {
  const root = (body ?? {}) as Record<string, unknown>;
  const candidate =
    (root.media as Record<string, unknown> | undefined) ??
    (root.asset as Record<string, unknown> | undefined) ??
    (root.data as Record<string, unknown> | undefined) ??
    root;

  const mediaId =
    pickString(candidate, ["mediaId", "media_id", "id"]) ?? pickString(root, ["mediaId", "media_id", "id"]);
  const src =
    pickString(candidate, ["publicUrl", "public_url", "src", "url"]) ??
    pickString(root, ["publicUrl", "public_url", "src", "url"]);

  if (!mediaId || !src) return null;

  return {
    mediaId,
    src,
    width: pickNumber(candidate, ["width"]),
    height: pickNumber(candidate, ["height"])
  };
}

function pickString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function pickNumber(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}
