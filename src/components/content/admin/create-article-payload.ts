import type {
  ContentDestination,
  ContentType,
  CreateContentPostPayload
} from "@/lib/content/types";

export type CreateArticlePayloadInput = {
  title: string;
  slug: string;
  destination: ContentDestination;
  contentType: ContentType;
  legalSensitive: boolean;
  authorId: string;
  jurisdictionCode: string;
  partnerSlug: string;
};

/** Build the exact strict payload accepted by POST /api/internal/content/posts. */
export function buildCreateArticlePayload(input: CreateArticlePayloadInput): CreateContentPostPayload {
  return {
    title: input.title,
    slug: input.slug,
    destination: input.destination,
    contentType: input.contentType,
    legalSensitive: input.legalSensitive,
    ...(input.authorId ? { authorId: input.authorId } : {}),
    jurisdictionCode: input.jurisdictionCode || null,
    partnerSlug: input.partnerSlug || null
  };
}

export type CreatedPostReference = {
  postId?: string;
  post_id?: string;
  id?: string;
};

/** Route a successful create response to its editor, with the article list as a safe fallback. */
export function createdPostEditorPath(post: CreatedPostReference): string {
  const postId = post.postId ?? post.post_id ?? post.id;
  return typeof postId === "string" && postId
    ? `/internal/content/articles/${postId}`
    : "/internal/content/articles";
}
