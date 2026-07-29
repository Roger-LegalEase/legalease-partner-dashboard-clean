"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import {
  CONTENT_DESTINATIONS,
  CONTENT_TYPES,
  type ContentDestination,
  type ContentType,
  requiresLegalReview
} from "@/lib/content/types";
import { contentApi } from "./api-client";
import { buildCreateArticlePayload, createdPostEditorPath } from "./create-article-payload";

/**
 * Create an article.
 *
 * The legal-sensitivity checkbox is the important control on this form. Ticking it — or choosing a
 * content type that is inherently legal — routes the post through legal review before it can ever be
 * published, and the CMS says so here, before anyone writes a word.
 */

export type CreateArticleFormProps = {
  authors: { authorId: string; name: string }[];
  jurisdictions: { code: string; name: string }[];
  canCreate: boolean;
};

const DESTINATION_LABELS: Record<ContentDestination, string> = {
  expungement_ai: "Expungement.ai (consumer)",
  legalease_partner: "LegalEase Partner (B2B)"
};

export default function CreateArticleForm(props: CreateArticleFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [destination, setDestination] = useState<ContentDestination>("expungement_ai");
  const [contentType, setContentType] = useState<ContentType>("blog_article");
  const [legalSensitive, setLegalSensitive] = useState(false);
  const [authorId, setAuthorId] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [partnerSlug, setPartnerSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; problems: string[] } | null>(null);

  const needsLegal = requiresLegalReview(contentType, legalSensitive);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError({ message: "A title is required.", problems: [] });
      return;
    }

    setBusy(true);
    const result = await contentApi.createPost(
      buildCreateArticlePayload({
        title: title.trim(),
        slug: (slug.trim() || slugify(title)).toLowerCase(),
        destination,
        contentType,
        legalSensitive,
        authorId,
        jurisdictionCode: jurisdiction,
        partnerSlug
      })
    );
    setBusy(false);

    if (!result.ok) {
      setError({ message: result.message, problems: result.problems });
      return;
    }

    router.push(createdPostEditorPath(result.data.post ?? {}));
  };

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Title</span>
        <input
          value={title}
          disabled={!props.canCreate}
          onChange={(event) => {
            setTitle(event.target.value);
            if (!slugTouched) setSlug(slugify(event.target.value));
          }}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="How record clearing actually works in Mississippi"
        />
      </label>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Slug</span>
        <input
          value={slug}
          disabled={!props.canCreate}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
        />
        <span className="mt-1 block text-[11px] text-slate-500">
          Unique per destination. Changing it after publication breaks inbound links.
        </span>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Destination</span>
          <select
            value={destination}
            disabled={!props.canCreate}
            onChange={(event) => setDestination(event.target.value as ContentDestination)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {CONTENT_DESTINATIONS.map((option) => (
              <option key={option} value={option}>
                {DESTINATION_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Content type</span>
          <select
            value={contentType}
            disabled={!props.canCreate}
            onChange={(event) => setContentType(event.target.value as ContentType)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {CONTENT_TYPES.map((option) => (
              <option key={option} value={option}>
                {option.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Author</span>
          <select
            value={authorId}
            disabled={!props.canCreate}
            onChange={(event) => setAuthorId(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">No byline yet</option>
            {props.authors.map((author) => (
              <option key={author.authorId} value={author.authorId}>
                {author.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Jurisdiction (optional)
          </span>
          <select
            value={jurisdiction}
            disabled={!props.canCreate}
            onChange={(event) => setJurisdiction(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Not state-specific</option>
            {props.jurisdictions.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block md:col-span-2">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Partner slug (optional)
          </span>
          <input
            value={partnerSlug}
            disabled={!props.canCreate}
            onChange={(event) => setPartnerSlug(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="flex items-start gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-3">
        <input
          type="checkbox"
          checked={legalSensitive}
          disabled={!props.canCreate}
          onChange={(event) => setLegalSensitive(event.target.checked)}
          className="mt-0.5"
        />
        <span>
          <span className="text-sm font-bold text-navy">This content is legally sensitive</span>
          <span className="mt-1 block text-xs leading-5 text-slate-600">
            Tick this for eligibility explanations, waiting periods, filing guidance, legal-effect
            claims, or immigration content — in any content type.
          </span>
        </span>
      </label>

      {needsLegal && (
        <div className="rounded-md border border-indigo-300 bg-indigo-50 px-4 py-3 text-xs leading-5 text-indigo-900">
          <strong>Legal review will be required.</strong> This article cannot be published or scheduled
          without a recorded legal approval — the workflow, and the database, both refuse.
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-bold text-red-700">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {error.message}
          </p>
          {error.problems.length > 0 && (
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {error.problems.map((problem, index) => (
                <li key={index} className="text-xs leading-5 text-red-700">
                  {problem}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={!props.canCreate || busy}
        className="inline-flex items-center rounded-md bg-navy px-5 py-2.5 text-sm font-bold text-white transition hover:bg-navy-mid disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Creating…" : "Create article"}
      </button>

      {!props.canCreate && (
        <p className="text-xs text-slate-500">Your content role cannot create articles.</p>
      )}
    </form>
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}
