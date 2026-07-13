import {
  CALLOUT_TONES,
  EMPTY_DOC,
  IMAGE_LAYOUTS,
  type CalloutTone,
  type ContentDoc,
  type ContentMark,
  type ContentNode,
  type ContentTextNode,
  type ImageLayout
} from "@/lib/content/types";

/**
 * ProseMirror JSON -> ContentDoc.
 *
 * The editor is not trusted to produce the storage shape. Tiptap emits incidental attributes
 * (colspan/rowspan/colwidth on cells, textAlign, marks we do not allow) and, if an extension is
 * ever added carelessly, node types the renderer does not know. This function is the choke point:
 * it walks the tree and rebuilds it field by field against the allowlist in types.ts. An unknown
 * node is dropped, not passed through.
 *
 * This is why the CMS can honestly promise "the editor never sends HTML to the server" — it sends
 * this, and only this.
 */

const IMAGE_LAYOUT_SET = new Set<string>(IMAGE_LAYOUTS);
const CALLOUT_TONE_SET = new Set<string>(CALLOUT_TONES);

type Raw = Record<string, unknown>;

export function toContentDoc(json: unknown): ContentDoc {
  if (!json || typeof json !== "object") return EMPTY_DOC;
  const root = json as Raw;
  if (root.type !== "doc") return EMPTY_DOC;
  return { type: "doc", content: mapNodes(root.content) };
}

function mapNodes(value: unknown): ContentNode[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((node) => mapNode(node))
    .filter((node): node is ContentNode => Boolean(node));
}

function mapNode(value: unknown): ContentNode | null {
  if (!value || typeof value !== "object") return null;
  const node = value as Raw;
  const attrs = (node.attrs && typeof node.attrs === "object" ? node.attrs : {}) as Raw;

  switch (node.type) {
    case "text":
      return mapText(node);

    case "paragraph":
      return { type: "paragraph", content: mapTextNodes(node.content) };

    case "heading": {
      const level = Number(attrs.level);
      const safeLevel: 2 | 3 | 4 = level === 3 ? 3 : level === 4 ? 4 : 2;
      return { type: "heading", attrs: { level: safeLevel }, content: mapTextNodes(node.content) };
    }

    case "bulletList":
      return { type: "bulletList", content: mapListItems(node.content) };

    case "orderedList":
      return { type: "orderedList", content: mapListItems(node.content) };

    case "listItem":
      return { type: "listItem", content: mapNodes(node.content) };

    case "blockquote":
      return { type: "blockquote", content: mapNodes(node.content) };

    case "pullQuote":
      return {
        type: "pullQuote",
        attrs: { attribution: optionalString(attrs.attribution) },
        content: mapTextNodes(node.content)
      };

    case "horizontalRule":
      return { type: "horizontalRule" };

    case "table":
      return { type: "table", content: mapTableRows(node.content) };

    case "tableRow":
      return { type: "tableRow", content: mapTableCells(node.content) };

    case "tableCell":
      return { type: "tableCell", content: mapNodes(node.content) };

    case "tableHeader":
      return { type: "tableHeader", content: mapNodes(node.content) };

    case "image": {
      const src = requiredString(attrs.src);
      if (!src) return null;
      const layout = String(attrs.layout ?? "inline");
      return {
        type: "image",
        attrs: {
          mediaId: requiredString(attrs.mediaId) ?? "",
          src,
          alt: requiredString(attrs.alt) ?? "",
          layout: (IMAGE_LAYOUT_SET.has(layout) ? layout : "inline") as ImageLayout,
          caption: optionalString(attrs.caption),
          credit: optionalString(attrs.credit),
          width: optionalNumber(attrs.width),
          height: optionalNumber(attrs.height)
        }
      };
    }

    case "gallery": {
      const raw = Array.isArray(attrs.items) ? attrs.items : [];
      const items = raw
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const entry = item as Raw;
          const src = requiredString(entry.src);
          if (!src) return null;
          return {
            mediaId: requiredString(entry.mediaId) ?? "",
            src,
            alt: requiredString(entry.alt) ?? "",
            caption: optionalString(entry.caption),
            credit: optionalString(entry.credit)
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));
      return { type: "gallery", attrs: { items } };
    }

    case "callout": {
      const tone = String(attrs.tone ?? "info");
      return {
        type: "callout",
        attrs: {
          tone: (CALLOUT_TONE_SET.has(tone) ? tone : "info") as CalloutTone,
          title: optionalString(attrs.title)
        },
        content: mapNodes(node.content)
      };
    }

    case "cta": {
      const label = requiredString(attrs.label);
      const href = requiredString(attrs.href);
      if (!label || !href) return null;
      const variant = attrs.variant === "secondary" ? "secondary" : "primary";
      return {
        type: "cta",
        attrs: { label, href, ctaId: requiredString(attrs.ctaId) ?? "", variant }
      };
    }

    case "sourceList": {
      const raw = Array.isArray(attrs.sources) ? attrs.sources : [];
      const sources = raw
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const entry = item as Raw;
          const label = requiredString(entry.label);
          if (!label) return null;
          return { label, href: optionalString(entry.href) };
        })
        .filter((item): item is { label: string; href: string | null } => Boolean(item));
      return { type: "sourceList", attrs: { sources } };
    }

    case "relatedContent": {
      const raw = Array.isArray(attrs.slugs) ? attrs.slugs : [];
      const slugs = raw.filter((slug): slug is string => typeof slug === "string" && slug.trim().length > 0);
      return { type: "relatedContent", attrs: { slugs } };
    }

    case "legalDisclaimer": {
      const variant = attrs.variant;
      const safeVariant =
        variant === "not_legal_advice" || variant === "state_specific" ? variant : "self_help";
      return { type: "legalDisclaimer", attrs: { variant: safeVariant } };
    }

    default:
      // Unknown node (hardBreak, codeBlock, anything a future extension adds). Drop it rather than
      // shipping a shape the renderer will refuse.
      return null;
  }
}

function mapText(node: Raw): ContentTextNode | null {
  const text = node.text;
  if (typeof text !== "string" || !text.length) return null;
  const marks = mapMarks(node.marks);
  return marks.length ? { type: "text", text, marks } : { type: "text", text };
}

function mapMarks(value: unknown): ContentMark[] {
  if (!Array.isArray(value)) return [];
  const marks: ContentMark[] = [];

  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const mark = raw as Raw;
    const type = mark.type;

    if (type === "bold" || type === "italic" || type === "code" || type === "strike") {
      marks.push({ type });
      continue;
    }

    if (type === "link") {
      const attrs = (mark.attrs && typeof mark.attrs === "object" ? mark.attrs : {}) as Raw;
      const href = requiredString(attrs.href);
      if (!href) continue;
      marks.push({ type: "link", attrs: { href, title: optionalString(attrs.title) } });
    }
    // Any other mark (underline, highlight, ...) is dropped: it is not in CONTENT_MARKS.
  }

  return marks;
}

function mapTextNodes(value: unknown): ContentTextNode[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((node) => (node && typeof node === "object" ? mapText(node as Raw) : null))
    .filter((node): node is ContentTextNode => Boolean(node));
}

function mapListItems(value: unknown): Extract<ContentNode, { type: "listItem" }>[] {
  return mapNodes(value).filter(
    (node): node is Extract<ContentNode, { type: "listItem" }> => node.type === "listItem"
  );
}

function mapTableRows(value: unknown): Extract<ContentNode, { type: "tableRow" }>[] {
  return mapNodes(value).filter(
    (node): node is Extract<ContentNode, { type: "tableRow" }> => node.type === "tableRow"
  );
}

function mapTableCells(value: unknown): Extract<ContentNode, { type: "tableCell" | "tableHeader" }>[] {
  return mapNodes(value).filter(
    (node): node is Extract<ContentNode, { type: "tableCell" | "tableHeader" }> =>
      node.type === "tableCell" || node.type === "tableHeader"
  );
}

function requiredString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length ? value : null;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length ? value : null;
}

function optionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Cheap structural equality for the autosave dirty-check. */
export function docsEqual(a: ContentDoc, b: ContentDoc): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
