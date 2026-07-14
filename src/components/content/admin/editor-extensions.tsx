"use client";

import { useRef, useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps
} from "@tiptap/react";
import { AlertTriangle, ImageIcon, Scale, Trash2 } from "lucide-react";

import { CALLOUT_TONES, IMAGE_LAYOUTS, type CalloutTone, type ImageLayout } from "@/lib/content/types";
import { contentApi, readUploadedMedia } from "./api-client";

/**
 * The block vocabulary of the editor.
 *
 * Every node here has a counterpart in ContentDoc (src/lib/content/types.ts) and in the server-side
 * allowlisting renderer. Nothing else is installable: StarterKit's codeBlock/hardBreak/underline are
 * switched off in ArticleEditor, and anything that slips through anyway is dropped by toContentDoc().
 *
 * The node names below are load-bearing — they ARE the storage format.
 */

// --- Image ---------------------------------------------------------------------------------------

/**
 * The CMS image node. Carries the media library identity (mediaId), the layout (inline | wide |
 * full), and the caption/credit that the public renderer prints under the figure.
 *
 * Alt text is surfaced in the node itself, in red, when it is missing: an image with no alt text
 * blocks publication (validateMediaForPublication), so the editor tells you at the moment you can
 * still cheaply fix it rather than at the moment you try to publish.
 */
export const CmsImage = Image.extend({
  name: "image",
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      mediaId: {
        default: "",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-media-id") ?? "",
        renderHTML: (attributes: Record<string, unknown>) => ({ "data-media-id": String(attributes.mediaId ?? "") })
      },
      alt: {
        default: "",
        parseHTML: (element: HTMLElement) => element.getAttribute("alt") ?? "",
        renderHTML: (attributes: Record<string, unknown>) => ({ alt: String(attributes.alt ?? "") })
      },
      layout: {
        default: "inline" as ImageLayout,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-layout") ?? "inline",
        renderHTML: (attributes: Record<string, unknown>) => ({ "data-layout": String(attributes.layout ?? "inline") })
      },
      caption: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-caption"),
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.caption ? { "data-caption": String(attributes.caption) } : {}
      },
      credit: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-credit"),
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.credit ? { "data-credit": String(attributes.credit) } : {}
      },
      width: { default: null },
      height: { default: null }
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  }
});

const LAYOUT_LABELS: Record<ImageLayout, string> = {
  inline: "Inline",
  wide: "Wide",
  full: "Full width"
};

const LAYOUT_FRAME: Record<ImageLayout, string> = {
  inline: "max-w-md",
  wide: "max-w-3xl",
  full: "w-full"
};

function ImageView(props: NodeViewProps) {
  const { node, updateAttributes, deleteNode, selected } = props;
  const attrs = node.attrs as {
    src: string;
    alt: string;
    layout: ImageLayout;
    caption: string | null;
    credit: string | null;
  };
  const missingAlt = !attrs.alt?.trim();

  return (
    <NodeViewWrapper
      className={`my-4 ${selected ? "ring-2 ring-navy" : ""} rounded-md border border-slate-200 bg-slate-50 p-3`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2" contentEditable={false}>
        <ImageIcon className="h-4 w-4 text-navy" aria-hidden="true" />
        {IMAGE_LAYOUTS.map((layout) => (
          <button
            key={layout}
            type="button"
            onClick={() => updateAttributes({ layout })}
            className={`rounded border px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${
              attrs.layout === layout
                ? "border-navy bg-navy text-white"
                : "border-slate-300 bg-white text-slate-600 hover:border-navy"
            }`}
          >
            {LAYOUT_LABELS[layout]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => deleteNode()}
          className="ml-auto inline-flex items-center gap-1 rounded border border-red-300 bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-3 w-3" aria-hidden="true" /> Remove
        </button>
      </div>

      <div contentEditable={false} className={`${LAYOUT_FRAME[attrs.layout] ?? LAYOUT_FRAME.inline}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={attrs.src} alt={attrs.alt || ""} className="w-full rounded-md" />
      </div>

      <div className="mt-2 grid gap-2 md:grid-cols-3" contentEditable={false}>
        <label className="block">
          <span
            className={`text-[10px] font-black uppercase tracking-wide ${missingAlt ? "text-red-700" : "text-slate-500"}`}
          >
            Alt text {missingAlt ? "— required to publish" : ""}
          </span>
          <input
            value={attrs.alt ?? ""}
            onChange={(event) => updateAttributes({ alt: event.target.value })}
            placeholder="Describe the image for screen readers"
            className={`mt-1 w-full rounded border px-2 py-1 text-xs ${
              missingAlt ? "border-red-400 bg-red-50" : "border-slate-300 bg-white"
            }`}
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Caption</span>
          <input
            value={attrs.caption ?? ""}
            onChange={(event) => updateAttributes({ caption: event.target.value || null })}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Credit</span>
          <input
            value={attrs.credit ?? ""}
            onChange={(event) => updateAttributes({ credit: event.target.value || null })}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
          />
        </label>
      </div>

      {missingAlt && (
        <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-red-700" contentEditable={false}>
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
          This image has no alt text. Publication will be blocked until it does.
        </p>
      )}
    </NodeViewWrapper>
  );
}

// --- Pull quote ----------------------------------------------------------------------------------

export const PullQuote = Node.create({
  name: "pullQuote",
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      attribution: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-attribution"),
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.attribution ? { "data-attribution": String(attributes.attribution) } : {}
      }
    };
  },

  parseHTML() {
    return [{ tag: 'aside[data-type="pull-quote"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["aside", mergeAttributes(HTMLAttributes, { "data-type": "pull-quote" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PullQuoteView);
  }
});

function PullQuoteView({ node, updateAttributes }: NodeViewProps) {
  const attribution = (node.attrs.attribution as string | null) ?? "";
  return (
    <NodeViewWrapper className="my-4 border-l-4 border-orange bg-cream px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-orange" contentEditable={false}>
        Pull quote
      </p>
      <NodeViewContent className="mt-1 text-lg font-bold leading-7 text-navy" />
      <input
        contentEditable={false}
        value={attribution}
        onChange={(event) => updateAttributes({ attribution: event.target.value || null })}
        placeholder="Attribution (optional)"
        className="mt-2 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
      />
    </NodeViewWrapper>
  );
}

// --- Callout -------------------------------------------------------------------------------------

// `teal` is a single color in the Tailwind config, so teal-400/teal-50 do not exist. Arbitrary
// values keep the brand tint real instead of silently rendering unstyled.
const TONE_STYLES: Record<CalloutTone, string> = {
  info: "border-sky-300 bg-sky-50",
  tip: "border-[#00A99D] bg-[#E6F6F5]",
  warning: "border-amber-400 bg-amber-50",
  legal: "border-navy bg-slate-50"
};

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      tone: {
        default: "info" as CalloutTone,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-tone") ?? "info",
        renderHTML: (attributes: Record<string, unknown>) => ({ "data-tone": String(attributes.tone ?? "info") })
      },
      title: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-title"),
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.title ? { "data-title": String(attributes.title) } : {}
      }
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "callout" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  }
});

function CalloutView({ node, updateAttributes }: NodeViewProps) {
  const tone = (node.attrs.tone as CalloutTone) ?? "info";
  const title = (node.attrs.title as string | null) ?? "";

  return (
    <NodeViewWrapper className={`my-4 rounded-md border-l-4 px-4 py-3 ${TONE_STYLES[tone] ?? TONE_STYLES.info}`}>
      <div className="flex flex-wrap items-center gap-2" contentEditable={false}>
        {CALLOUT_TONES.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => updateAttributes({ tone: option })}
            className={`rounded border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
              tone === option ? "border-navy bg-navy text-white" : "border-slate-300 bg-white text-slate-600"
            }`}
          >
            {option}
          </button>
        ))}
        <input
          value={title}
          onChange={(event) => updateAttributes({ title: event.target.value || null })}
          placeholder="Callout title (optional)"
          className="ml-auto w-48 rounded border border-slate-300 bg-white px-2 py-1 text-xs"
        />
      </div>
      <NodeViewContent className="mt-2 text-sm leading-6 text-navy" />
    </NodeViewWrapper>
  );
}

// --- CTA -----------------------------------------------------------------------------------------

export const CtaBlock = Node.create({
  name: "cta",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      label: { default: "" },
      href: { default: "" },
      ctaId: { default: "" },
      variant: { default: "primary" }
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="cta"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "cta" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CtaView);
  }
});

function CtaView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const attrs = node.attrs as { label: string; href: string; ctaId: string; variant: string };
  return (
    <NodeViewWrapper className="my-4 rounded-md border border-orange bg-cream p-3" contentEditable={false}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-wide text-orange">Call to action</p>
        <button
          type="button"
          onClick={() => deleteNode()}
          className="rounded border border-red-300 bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-red-700"
        >
          Remove
        </button>
      </div>
      <div className="mt-2 grid gap-2 md:grid-cols-4">
        <input
          value={attrs.label}
          onChange={(event) => updateAttributes({ label: event.target.value })}
          placeholder="Button label"
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
        />
        <input
          value={attrs.href}
          onChange={(event) => updateAttributes({ href: event.target.value })}
          placeholder="/expungement-ai/screening"
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs md:col-span-2"
        />
        <select
          value={attrs.variant}
          onChange={(event) => updateAttributes({ variant: event.target.value })}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
        >
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
        </select>
      </div>
      <input
        value={attrs.ctaId}
        onChange={(event) => updateAttributes({ ctaId: event.target.value })}
        placeholder="Analytics CTA id (e.g. blog_start_check)"
        className="mt-2 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
      />
      {(!attrs.label.trim() || !attrs.href.trim()) && (
        <p className="mt-2 text-[11px] font-semibold text-red-700">
          A CTA needs both a label and a link, or it will be dropped when the article is saved.
        </p>
      )}
    </NodeViewWrapper>
  );
}

// --- Source list ---------------------------------------------------------------------------------

type SourceEntry = { label: string; href: string | null };

export const SourceList = Node.create({
  name: "sourceList",
  group: "block",
  atom: true,

  addAttributes() {
    return { sources: { default: [] as SourceEntry[] } };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="source-list"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    // The array attribute is never round-tripped through HTML — storage is JSON — so the DOM form
    // only needs to be identifiable, not lossless.
    return ["div", mergeAttributes({ "data-type": "source-list" }, stripArrayAttrs(HTMLAttributes))];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SourceListView);
  }
});

function SourceListView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const sources = (node.attrs.sources as SourceEntry[]) ?? [];

  const update = (index: number, patch: Partial<SourceEntry>) => {
    const next = sources.map((entry, i) => (i === index ? { ...entry, ...patch } : entry));
    updateAttributes({ sources: next });
  };

  return (
    <NodeViewWrapper className="my-4 rounded-md border border-slate-300 bg-white p-3" contentEditable={false}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-wide text-navy">Sources</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => updateAttributes({ sources: [...sources, { label: "", href: null }] })}
            className="rounded border border-navy bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-navy"
          >
            Add source
          </button>
          <button
            type="button"
            onClick={() => deleteNode()}
            className="rounded border border-red-300 bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-red-700"
          >
            Remove
          </button>
        </div>
      </div>
      {sources.length === 0 && <p className="mt-2 text-xs text-slate-500">No sources yet.</p>}
      <div className="mt-2 space-y-2">
        {sources.map((source, index) => (
          <div key={index} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <input
              value={source.label}
              onChange={(event) => update(index, { label: event.target.value })}
              placeholder="Source name (e.g. Miss. Code Ann. § 99-19-71)"
              className="rounded border border-slate-300 px-2 py-1 text-xs"
            />
            <input
              value={source.href ?? ""}
              onChange={(event) => update(index, { href: event.target.value || null })}
              placeholder="https://… (optional)"
              className="rounded border border-slate-300 px-2 py-1 text-xs"
            />
            <button
              type="button"
              onClick={() => updateAttributes({ sources: sources.filter((_, i) => i !== index) })}
              className="rounded border border-slate-300 px-2 py-1 text-[10px] font-bold uppercase text-slate-600"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  );
}

// --- Related content -----------------------------------------------------------------------------

export const RelatedContent = Node.create({
  name: "relatedContent",
  group: "block",
  atom: true,

  addAttributes() {
    return { slugs: { default: [] as string[] } };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="related-content"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-type": "related-content" }, stripArrayAttrs(HTMLAttributes))];
  },

  addNodeView() {
    return ReactNodeViewRenderer(RelatedContentView);
  }
});

function RelatedContentView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const slugs = (node.attrs.slugs as string[]) ?? [];
  const [draft, setDraft] = useState(slugs.join(", "));

  return (
    <NodeViewWrapper className="my-4 rounded-md border border-slate-300 bg-slate-50 p-3" contentEditable={false}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-wide text-navy">Related content</p>
        <button
          type="button"
          onClick={() => deleteNode()}
          className="rounded border border-red-300 bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-red-700"
        >
          Remove
        </button>
      </div>
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() =>
          updateAttributes({
            slugs: draft
              .split(",")
              .map((slug) => slug.trim())
              .filter(Boolean)
          })
        }
        placeholder="Comma-separated article slugs"
        className="mt-2 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
      />
      {slugs.length > 0 && (
        <p className="mt-1 text-[11px] text-slate-500">Linking to: {slugs.join(" · ")}</p>
      )}
    </NodeViewWrapper>
  );
}

// --- Legal disclaimer ----------------------------------------------------------------------------

const DISCLAIMER_LABELS: Record<string, string> = {
  self_help: "Self-help only (LegalEase is not a law firm)",
  not_legal_advice: "This is not legal advice",
  state_specific: "State-specific rules vary"
};

export const LegalDisclaimer = Node.create({
  name: "legalDisclaimer",
  group: "block",
  atom: true,

  addAttributes() {
    return { variant: { default: "self_help" } };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="legal-disclaimer"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "legal-disclaimer" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LegalDisclaimerView);
  }
});

function LegalDisclaimerView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const variant = (node.attrs.variant as string) ?? "self_help";
  return (
    <NodeViewWrapper className="my-4 rounded-md border border-navy bg-slate-50 p-3" contentEditable={false}>
      <div className="flex items-center gap-2">
        <Scale className="h-4 w-4 text-navy" aria-hidden="true" />
        <p className="text-[10px] font-black uppercase tracking-wide text-navy">Legal disclaimer</p>
        <button
          type="button"
          onClick={() => deleteNode()}
          className="ml-auto rounded border border-red-300 bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-red-700"
        >
          Remove
        </button>
      </div>
      <select
        value={variant}
        onChange={(event) => updateAttributes({ variant: event.target.value })}
        className="mt-2 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
      >
        {Object.entries(DISCLAIMER_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <p className="mt-2 text-[11px] leading-5 text-slate-600">
        The exact wording is fixed by the public renderer, not typed here — an editor cannot weaken or
        remove a disclaimer by rewording it.
      </p>
    </NodeViewWrapper>
  );
}

// --- Gallery -------------------------------------------------------------------------------------

type GalleryItem = { mediaId: string; src: string; alt: string; caption: string | null; credit: string | null };

export const Gallery = Node.create({
  name: "gallery",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return { items: { default: [] as GalleryItem[] } };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="gallery"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-type": "gallery" }, stripArrayAttrs(HTMLAttributes))];
  },

  addNodeView() {
    return ReactNodeViewRenderer(GalleryView);
  }
});

function GalleryView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const items = (node.attrs.items as GalleryItem[]) ?? [];
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const addImages = async (files: File[]) => {
    setError(null);
    const added: GalleryItem[] = [];

    for (const file of files) {
      setUploading((count) => count + 1);
      const form = new FormData();
      form.append("file", file);
      const result = await contentApi.uploadMedia(form);
      setUploading((count) => Math.max(0, count - 1));

      if (!result.ok) {
        setError([result.message, ...result.problems].filter(Boolean).join(" — "));
        continue;
      }

      const media = readUploadedMedia(result.data);
      if (!media) {
        setError("The upload succeeded but returned no media id and URL, so it was not added.");
        continue;
      }

      added.push({ mediaId: media.mediaId, src: media.src, alt: "", caption: null, credit: null });
    }

    if (added.length) updateAttributes({ items: [...items, ...added] });
  };

  return (
    <NodeViewWrapper className="my-4 rounded-md border border-slate-300 bg-white p-3" contentEditable={false}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-wide text-navy">Gallery ({items.length})</p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length) void addImages(files);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded border border-navy bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-navy"
          >
            {uploading > 0 ? `Uploading ${uploading}…` : "Add images"}
          </button>
          <button
            type="button"
            onClick={() => deleteNode()}
            className="rounded border border-red-300 bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-red-700"
          >
            Remove
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-[11px] font-semibold text-red-700">{error}</p>}

      {items.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">
          Empty gallery. Use “Add images”, or delete this block.
        </p>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
          {items.map((item, index) => (
            <figure key={`${item.mediaId}-${index}`} className="rounded border border-slate-200 p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.src} alt={item.alt} className="h-24 w-full rounded object-cover" />
              <input
                value={item.alt}
                onChange={(event) => {
                  const next = items.map((entry, i) =>
                    i === index ? { ...entry, alt: event.target.value } : entry
                  );
                  updateAttributes({ items: next });
                }}
                placeholder="Alt text (required)"
                className={`mt-1 w-full rounded border px-1 py-0.5 text-[11px] ${
                  item.alt.trim() ? "border-slate-300" : "border-red-400 bg-red-50"
                }`}
              />
              <button
                type="button"
                onClick={() => updateAttributes({ items: items.filter((_, i) => i !== index) })}
                className="mt-1 w-full rounded border border-slate-300 px-1 py-0.5 text-[10px] font-bold uppercase text-slate-600"
              >
                Remove
              </button>
            </figure>
          ))}
        </div>
      )}
    </NodeViewWrapper>
  );
}

/** Array attributes cannot be serialized into DOM attributes; drop them from the HTML render. */
function stripArrayAttrs(attributes: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (Array.isArray(value)) continue;
    out[key] = value;
  }
  return out;
}
