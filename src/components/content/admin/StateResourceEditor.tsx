"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Lock, Pencil } from "lucide-react";

import type { LockedStateLayer } from "@/lib/content/state-resources";
import { contentApi } from "./api-client";

/**
 * The state resource editor — two panels, and it must be impossible to confuse them.
 *
 * LOCKED (left): the legal layer, derived from the record-clearing engine. The state's own
 * vocabulary, the terms we are allowed to use, the pathway labels. It is rendered read-only, greyed,
 * lock-iconed, and it is not part of the form at all — there is no input to type into. There is
 * exactly one legal-rules source of truth in this system, and an editor cannot contradict it from
 * here, by accident or otherwise.
 *
 * EDITABLE (right): the editorial layer — voice, framing, FAQs, partner quote, SEO, CTA. Never legal
 * rules. It is stored in content_state_editorial and cannot go live without legal approval (both the
 * workflow and a DB CHECK enforce that).
 */

export type StateEditorialForm = {
  intro: string;
  overview: string;
  featuredMediaId: string;
  faqs: { question: string; answer: string }[];
  relatedSlugs: string;
  partnerQuote: string;
  partnerSlug: string;
  announcement: string;
  seoTitle: string;
  seoDescription: string;
  ctaLabel: string;
  ctaHref: string;
};

export type StateResourceEditorProps = {
  code: string;
  locked: LockedStateLayer;
  initial: StateEditorialForm;
  status: string;
  publishable: boolean;
  legalApprovedAt: string | null;
  canEdit: boolean;
};

export default function StateResourceEditor(props: StateResourceEditorProps) {
  const router = useRouter();
  const [form, setForm] = useState<StateEditorialForm>(props.initial);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: "ok" | "error"; text: string; problems: string[] } | null>(
    null
  );

  const update = (patch: Partial<StateEditorialForm>) => setForm((current) => ({ ...current, ...patch }));

  const save = async () => {
    setBusy(true);
    setResult(null);

    const response = await contentApi.saveStateEditorial(props.code, {
      intro: form.intro || null,
      overview: form.overview || null,
      featuredMediaId: form.featuredMediaId || null,
      faqs: form.faqs.filter((faq) => faq.question.trim() && faq.answer.trim()),
      relatedSlugs: form.relatedSlugs
        .split(",")
        .map((slug) => slug.trim())
        .filter(Boolean),
      partnerQuote: form.partnerQuote || null,
      partnerSlug: form.partnerSlug || null,
      announcement: form.announcement || null,
      seoTitle: form.seoTitle || null,
      seoDescription: form.seoDescription || null,
      ctaLabel: form.ctaLabel || null,
      ctaHref: form.ctaHref || null
    });

    setBusy(false);

    if (!response.ok) {
      setResult({ tone: "error", text: response.message, problems: response.problems });
      return;
    }
    setResult({ tone: "ok", text: "Editorial layer saved.", problems: [] });
    router.refresh();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ---------------- LOCKED ---------------- */}
      <section className="rounded-md border-2 border-slate-400 bg-slate-100 shadow-sm">
        <header className="flex items-center gap-2 border-b-2 border-slate-400 bg-slate-200 px-5 py-3">
          <Lock className="h-4 w-4 text-slate-700" aria-hidden="true" />
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">
            Locked — from the record-clearing engine
          </h2>
        </header>

        <div className="space-y-5 px-5 py-4">
          <p className="rounded-md border border-slate-400 bg-white px-3 py-2 text-xs leading-5 text-slate-600">
            These fields are derived from the compiled record-clearing engine and <strong>cannot be
            edited here</strong>. They are the single legal source of truth for {props.locked.name}. If
            something below is wrong, it is a state-pack issue and must be fixed in the engine — not
            papered over in the CMS.
          </p>

          <LockedField label="Jurisdiction">
            {props.locked.name} ({props.locked.code})
          </LockedField>

          <LockedField label="Display term (this state's own vocabulary)">
            <span className="text-base font-black text-navy">{props.locked.displayTerm}</span>
            <p className="mt-1 text-xs leading-5 text-slate-600">{props.locked.termBlurb}</p>
          </LockedField>

          <LockedField label="Allowed state terms">
            <div className="flex flex-wrap gap-1">
              {props.locked.allowedStateTerms.length === 0 && (
                <span className="text-xs text-slate-500">None recorded.</span>
              )}
              {props.locked.allowedStateTerms.map((term) => (
                <span
                  key={term}
                  className="rounded-full border border-slate-400 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700"
                >
                  {term}
                </span>
              ))}
            </div>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              Editorial copy must use these words. Do not call it “expungement” in a state that calls
              it something else.
            </p>
          </LockedField>

          <LockedField label="Pathway highlights">
            {props.locked.pathwayHighlights.length === 0 ? (
              <span className="text-xs text-slate-500">None recorded.</span>
            ) : (
              <ul className="list-disc space-y-1 pl-4">
                {props.locked.pathwayHighlights.map((pathway) => (
                  <li key={pathway} className="text-xs leading-5 text-slate-700">
                    {pathway}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              Pathway labels only. Eligibility rules, waiting periods, and exclusions never leave the
              engine.
            </p>
          </LockedField>

          <LockedField label="Screening entry point">
            <code className="text-xs text-slate-700">{props.locked.screeningHref}</code>
          </LockedField>

          {!props.publishable && (
            <div className="rounded-md border border-amber-400 bg-amber-50 px-3 py-2">
              <p className="flex items-center gap-1 text-xs font-bold text-amber-800">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                Not approved for a public page
              </p>
              <p className="mt-1 text-[11px] leading-4 text-amber-800">
                {props.locked.name} is not marked live and approved for the Expungement.ai channel in
                the state-promotion manifest. You can draft the editorial layer now, but the public
                page will 404 until the state is promoted.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ---------------- EDITABLE ---------------- */}
      <section className="rounded-md border-2 border-teal bg-white shadow-sm">
        <header className="flex flex-wrap items-center gap-2 border-b-2 border-teal bg-teal/10 px-5 py-3">
          <Pencil className="h-4 w-4 text-[#00776F]" aria-hidden="true" />
          <h2 className="text-sm font-black uppercase tracking-wide text-[#00776F]">
            Editable — editorial layer
          </h2>
          <span className="ml-auto rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-bold uppercase text-slate-600">
            {props.status.replace(/_/g, " ")}
          </span>
        </header>

        <div className="space-y-4 px-5 py-4">
          <p className="rounded-md border border-teal bg-teal/5 px-3 py-2 text-xs leading-5 text-slate-700">
            Voice, framing, and helpfulness live here — never legal rules. This layer is legally
            substantive content: it cannot be published without a recorded legal approval.
            {props.legalApprovedAt
              ? ` Legal approved ${new Date(props.legalApprovedAt).toLocaleDateString()}.`
              : " No legal approval recorded yet."}
          </p>

          <TextArea
            label="Intro"
            value={form.intro}
            rows={3}
            disabled={!props.canEdit}
            onChange={(value) => update({ intro: value })}
            hint={`Use the state's own term: “${props.locked.displayTerm}”.`}
          />
          <TextArea
            label="Overview"
            value={form.overview}
            rows={5}
            disabled={!props.canEdit}
            onChange={(value) => update({ overview: value })}
          />
          <TextInput
            label="Featured image (media id)"
            value={form.featuredMediaId}
            disabled={!props.canEdit}
            onChange={(value) => update({ featuredMediaId: value })}
            hint="Copy a media id from the media library. It must have alt text and a known permission status."
          />

          <FaqEditor
            faqs={form.faqs}
            disabled={!props.canEdit}
            onChange={(faqs) => update({ faqs })}
          />

          <TextInput
            label="Related articles (comma-separated slugs)"
            value={form.relatedSlugs}
            disabled={!props.canEdit}
            onChange={(value) => update({ relatedSlugs: value })}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <TextArea
              label="Approved partner quote"
              value={form.partnerQuote}
              rows={3}
              disabled={!props.canEdit}
              onChange={(value) => update({ partnerQuote: value })}
              hint="Only a quote the partner has approved in writing."
            />
            <TextInput
              label="Partner slug"
              value={form.partnerSlug}
              disabled={!props.canEdit}
              onChange={(value) => update({ partnerSlug: value })}
            />
          </div>

          <TextArea
            label="Announcement"
            value={form.announcement}
            rows={2}
            disabled={!props.canEdit}
            onChange={(value) => update({ announcement: value })}
            hint="Time-sensitive banner, e.g. a new clinic or a law change taking effect."
          />

          <div className="grid gap-3 md:grid-cols-2">
            <TextInput
              label="SEO / social title"
              value={form.seoTitle}
              disabled={!props.canEdit}
              onChange={(value) => update({ seoTitle: value })}
            />
            <TextInput
              label="SEO / social description"
              value={form.seoDescription}
              disabled={!props.canEdit}
              onChange={(value) => update({ seoDescription: value })}
            />
            <TextInput
              label="CTA label"
              value={form.ctaLabel}
              disabled={!props.canEdit}
              onChange={(value) => update({ ctaLabel: value })}
            />
            <TextInput
              label="CTA link"
              value={form.ctaHref}
              disabled={!props.canEdit}
              onChange={(value) => update({ ctaHref: value })}
              hint={`Defaults to the screening entry point (${props.locked.screeningHref}) when empty.`}
            />
          </div>

          <div className="flex items-center gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              disabled={!props.canEdit || busy}
              onClick={() => void save()}
              className="inline-flex items-center gap-1 rounded-md bg-navy px-4 py-2 text-xs font-bold text-white transition hover:bg-navy-mid disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-3 w-3" aria-hidden="true" />
              {busy ? "Saving…" : "Save editorial layer"}
            </button>
            {!props.canEdit && (
              <span className="text-xs text-slate-500">
                Your content role cannot edit state resources.
              </span>
            )}
          </div>

          {result && (
            <div
              className={`rounded-md border px-4 py-3 ${
                result.tone === "ok" ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"
              }`}
            >
              <p
                className={`text-sm font-bold ${
                  result.tone === "ok" ? "text-emerald-800" : "text-red-700"
                }`}
              >
                {result.text}
              </p>
              {result.problems.length > 0 && (
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {result.problems.map((problem, index) => (
                    <li key={index} className="text-xs leading-5 text-red-700">
                      {problem}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function LockedField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-slate-500">
        <Lock className="h-3 w-3" aria-hidden="true" />
        {label}
      </p>
      <div className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800">
        {children}
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  disabled,
  hint,
  onChange
}: {
  label: string;
  value: string;
  disabled: boolean;
  hint?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
      />
      {hint && <span className="mt-1 block text-[11px] leading-4 text-slate-500">{hint}</span>}
    </label>
  );
}

function TextArea({
  label,
  value,
  rows,
  disabled,
  hint,
  onChange
}: {
  label: string;
  value: string;
  rows: number;
  disabled: boolean;
  hint?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <textarea
        value={value}
        rows={rows}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
      />
      {hint && <span className="mt-1 block text-[11px] leading-4 text-slate-500">{hint}</span>}
    </label>
  );
}

function FaqEditor({
  faqs,
  disabled,
  onChange
}: {
  faqs: { question: string; answer: string }[];
  disabled: boolean;
  onChange: (faqs: { question: string; answer: string }[]) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">FAQs</span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([...faqs, { question: "", answer: "" }])}
          className="rounded border border-navy bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-navy disabled:opacity-50"
        >
          Add FAQ
        </button>
      </div>

      {faqs.length === 0 && <p className="mt-1 text-xs text-slate-500">No FAQs yet.</p>}

      <div className="mt-2 space-y-3">
        {faqs.map((faq, index) => (
          <div key={index} className="rounded-md border border-slate-300 p-3">
            <input
              value={faq.question}
              disabled={disabled}
              placeholder="Question"
              onChange={(event) =>
                onChange(faqs.map((item, i) => (i === index ? { ...item, question: event.target.value } : item)))
              }
              className="w-full rounded border border-slate-300 px-2 py-1 text-sm font-semibold"
            />
            <textarea
              value={faq.answer}
              rows={2}
              disabled={disabled}
              placeholder="Answer — plain language, no legal advice, no eligibility promises."
              onChange={(event) =>
                onChange(faqs.map((item, i) => (i === index ? { ...item, answer: event.target.value } : item)))
              }
              className="mt-2 w-full rounded border border-slate-300 px-2 py-1 text-sm"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(faqs.filter((_, i) => i !== index))}
              className="mt-2 rounded border border-red-300 bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-red-700 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
