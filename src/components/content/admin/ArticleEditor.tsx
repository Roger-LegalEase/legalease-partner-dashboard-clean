"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import {
  AlertTriangle,
  Bold,
  Check,
  Code,
  History,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Redo2,
  Save,
  Strikethrough,
  Table as TableIcon,
  Undo2,
  Unlink
} from "lucide-react";

import { EMPTY_DOC, type ContentDoc } from "@/lib/content/types";
import "./editor.css";
import { contentApi, readUploadedMedia, type ApiFailure } from "./api-client";
import {
  Callout,
  CmsImage,
  CtaBlock,
  Gallery,
  LegalDisclaimer,
  PullQuote,
  RelatedContent,
  SourceList
} from "./editor-extensions";
import { toContentDoc } from "./serialize";

/**
 * The article editor.
 *
 * THE ONE RULE: the editor never sends HTML anywhere. `editor.getJSON()` is normalized by
 * toContentDoc() into the ContentDoc allowlist and PATCHed as `doc`. The server re-renders the
 * public HTML with its own allowlisting renderer. That means a bug — or a compromise — in this
 * component cannot inject markup into a public page.
 *
 * Autosave is debounced (~2s of quiet). It is deliberately not "save on every keystroke": that
 * produces a version-history flood and hammers the API. A hard Cmd/Ctrl-S saves immediately, and
 * beforeunload refuses to let a dirty editor go quietly.
 */

export type ArticleEditorVersion = {
  version: number;
  title: string;
  status: string;
  note: string | null;
  createdAt: string | null;
};

export type ArticleEditorProps = {
  postId: string;
  initialDoc: ContentDoc;
  initialTitle: string;
  initialSubtitle: string | null;
  initialExcerpt: string | null;
  initialSeoTitle: string | null;
  initialSeoDescription: string | null;
  initialVersion: number;
  initialVersions: ArticleEditorVersion[];
  canEdit: boolean;
  canRestore: boolean;
};

type SaveState =
  | { kind: "idle" }
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "saved"; at: number; version: number | null }
  | { kind: "error"; message: string; problems: string[] };

const AUTOSAVE_DELAY_MS = 2000;

export default function ArticleEditor(props: ArticleEditorProps) {
  const router = useRouter();

  const [title, setTitle] = useState(props.initialTitle);
  const [subtitle, setSubtitle] = useState(props.initialSubtitle ?? "");
  const [excerpt, setExcerpt] = useState(props.initialExcerpt ?? "");
  const [seoTitle, setSeoTitle] = useState(props.initialSeoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(props.initialSeoDescription ?? "");

  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<ArticleEditorVersion[]>(props.initialVersions);
  const [restoring, setRestoring] = useState<number | null>(null);

  const editorRef = useRef<Editor | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const savedDocRef = useRef<ContentDoc>(props.initialDoc ?? EMPTY_DOC);
  // Mirrored into a ref so the debounced save — which is a stable callback, deliberately, so that
  // the editor is not torn down on every keystroke — always reads the CURRENT field values rather
  // than the ones captured when it was created.
  const metaRef = useRef({
    title: props.initialTitle,
    subtitle: props.initialSubtitle ?? "",
    excerpt: props.initialExcerpt ?? "",
    seoTitle: props.initialSeoTitle ?? "",
    seoDescription: props.initialSeoDescription ?? ""
  });

  useEffect(() => {
    metaRef.current = { title, subtitle, excerpt, seoTitle, seoDescription };
  }, [title, subtitle, excerpt, seoTitle, seoDescription]);

  const canEdit = props.canEdit;

  /** Upload files and insert them as image nodes. Used by the toolbar, drag-drop, and paste. */
  const uploadFiles = useCallback(async (files: File[]) => {
    const editor = editorRef.current;
    if (!editor || !files.length) return;

    setUploadError(null);
    for (const file of files) {
      setUploading((count) => count + 1);
      const form = new FormData();
      form.append("file", file);

      const result = await contentApi.uploadMedia(form);
      setUploading((count) => Math.max(0, count - 1));

      if (!result.ok) {
        setUploadError(formatFailure(result));
        continue;
      }

      const media = readUploadedMedia(result.data);
      if (!media) {
        setUploadError(
          "The upload succeeded but the server did not return a media id and URL, so the image was not inserted. Check the media library."
        );
        continue;
      }

      editor
        .chain()
        .focus()
        .insertContent({
          type: "image",
          attrs: {
            mediaId: media.mediaId,
            src: media.src,
            alt: "",
            layout: "inline",
            caption: null,
            credit: null,
            width: media.width,
            height: media.height
          }
        })
        .run();
    }
  }, []);

  const editor = useEditor(
    {
      immediatelyRender: false,
      editable: canEdit,
      extensions: [
        StarterKit.configure({
          // Only the blocks and marks that exist in ContentDoc. Everything else is switched off at
          // the source rather than filtered out later.
          heading: { levels: [2, 3, 4] },
          codeBlock: false,
          hardBreak: false,
          underline: false,
          link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"] }
        }),
        TableKit.configure({ table: { resizable: true } }),
        Placeholder.configure({ placeholder: "Write the article. Use the toolbar to add blocks." }),
        CmsImage,
        PullQuote,
        Callout,
        CtaBlock,
        SourceList,
        RelatedContent,
        LegalDisclaimer,
        Gallery
      ],
      content: props.initialDoc ?? EMPTY_DOC,
      editorProps: {
        attributes: {
          class: "prose-cms min-h-[420px] focus:outline-none"
        },
        handleDrop: (_view, event) => {
          const files = Array.from(event.dataTransfer?.files ?? []).filter((file) =>
            file.type.startsWith("image/")
          );
          if (!files.length) return false;
          event.preventDefault();
          void uploadFiles(files);
          return true;
        },
        handlePaste: (_view, event) => {
          const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
            file.type.startsWith("image/")
          );
          if (!files.length) return false;
          event.preventDefault();
          void uploadFiles(files);
          return true;
        }
      },
      onUpdate: () => {
        dirtyRef.current = true;
        setSaveState({ kind: "dirty" });
      }
    },
    []
  );

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const currentDoc = useCallback((): ContentDoc => {
    const editorInstance = editorRef.current;
    if (!editorInstance) return savedDocRef.current;
    return toContentDoc(editorInstance.getJSON());
  }, []);

  const save = useCallback(async (): Promise<void> => {
    if (!canEdit) return;
    const editorInstance = editorRef.current;
    if (!editorInstance) return;

    const doc = currentDoc();
    const meta = metaRef.current;

    setSaveState({ kind: "saving" });
    const result = await contentApi.savePost(props.postId, {
      doc,
      title: meta.title,
      subtitle: meta.subtitle || null,
      excerpt: meta.excerpt || null,
      seoTitle: meta.seoTitle || null,
      seoDescription: meta.seoDescription || null
    });

    if (!result.ok) {
      // Stay dirty. The user's work is still in the editor and the next save will retry it.
      setSaveState({ kind: "error", message: formatFailure(result), problems: result.problems });
      return;
    }

    dirtyRef.current = false;
    savedDocRef.current = doc;
    const version = typeof result.data.version === "number" ? result.data.version : null;
    setSaveState({ kind: "saved", at: Date.now(), version });
  }, [canEdit, currentDoc, props.postId]);

  // Debounced autosave: reset the clock on every change, save after 2s of quiet.
  const scheduleSave = useCallback(() => {
    if (!canEdit) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void save();
    }, AUTOSAVE_DELAY_MS);
  }, [canEdit, save]);

  useEffect(() => {
    if (saveState.kind !== "dirty") return;
    scheduleSave();
  }, [saveState, scheduleSave]);

  // Metadata edits are changes too.
  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setSaveState({ kind: "dirty" });
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Unsaved-change protection. The browser will not let a dirty editor be closed silently.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Cmd/Ctrl-S saves now instead of asking the browser to save the page.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (timerRef.current) clearTimeout(timerRef.current);
        void save();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save]);

  const refreshVersions = useCallback(async () => {
    const result = await contentApi.listVersions(props.postId);
    if (!result.ok) return;
    const raw = Array.isArray(result.data.versions) ? result.data.versions : [];
    const parsed = raw
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const row = entry as Record<string, unknown>;
        const version = typeof row.version === "number" ? row.version : null;
        if (version === null) return null;
        return {
          version,
          title: typeof row.title === "string" ? row.title : "Untitled",
          status: typeof row.status === "string" ? row.status : "draft",
          note: typeof row.note === "string" ? row.note : null,
          createdAt:
            typeof row.createdAt === "string"
              ? row.createdAt
              : typeof row.created_at === "string"
                ? row.created_at
                : null
        };
      })
      .filter((entry): entry is ArticleEditorVersion => Boolean(entry));
    if (parsed.length) setVersions(parsed);
  }, [props.postId]);

  const restore = useCallback(
    async (version: number) => {
      setRestoring(version);
      const result = await contentApi.restoreVersion(props.postId, version);
      setRestoring(null);
      if (!result.ok) {
        setSaveState({ kind: "error", message: formatFailure(result), problems: result.problems });
        return;
      }
      // The restore wrote a NEW version server-side. Reload so the editor shows exactly what is
      // stored rather than a client-side guess at what was restored.
      dirtyRef.current = false;
      router.refresh();
      window.location.reload();
    },
    [props.postId, router]
  );

  if (!editor) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading the editor…
      </div>
    );
  }

  const plainText = editor.getText().trim();
  const wordCount = plainText ? plainText.split(/\s+/).length : 0;

  return (
    <div className="space-y-4">
      {!canEdit && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Read-only. Your content role cannot edit this article, so autosave is off.
        </div>
      )}

      <div className="rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <input
            value={title}
            disabled={!canEdit}
            onChange={(event) => {
              setTitle(event.target.value);
              markDirty();
            }}
            placeholder="Article title"
            className="w-full border-0 p-0 text-3xl font-black text-navy placeholder:text-slate-300 focus:outline-none focus:ring-0"
          />
          <input
            value={subtitle}
            disabled={!canEdit}
            onChange={(event) => {
              setSubtitle(event.target.value);
              markDirty();
            }}
            placeholder="Subtitle (optional)"
            className="mt-2 w-full border-0 p-0 text-base text-slate-600 placeholder:text-slate-300 focus:outline-none focus:ring-0"
          />
        </div>

        <Toolbar editor={editor} canEdit={canEdit} onUpload={uploadFiles} />

        <div className="px-5 py-4">
          <EditorContent editor={editor} />
        </div>

        <footer className="flex flex-wrap items-center gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <SaveIndicator state={saveState} />
          <span className="text-xs text-slate-500">{wordCount} words</span>
          {uploading > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-navy">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              Uploading {uploading} image{uploading === 1 ? "" : "s"}…
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  if (timerRef.current) clearTimeout(timerRef.current);
                  void save();
                }}
                className="inline-flex items-center gap-1 rounded-md bg-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-mid"
              >
                <Save className="h-3 w-3" aria-hidden="true" /> Save now
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setHistoryOpen((open) => !open);
                if (!historyOpen) void refreshVersions();
              }}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-navy hover:border-navy"
            >
              <History className="h-3 w-3" aria-hidden="true" />
              Version history ({versions.length})
            </button>
          </div>
        </footer>
      </div>

      {uploadError && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-bold text-red-700">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Image upload failed
          </p>
          <p className="mt-1 text-xs leading-5 text-red-700">{uploadError}</p>
        </div>
      )}

      {saveState.kind === "error" && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3">
          <p className="text-sm font-bold text-red-700">{saveState.message}</p>
          {saveState.problems.length > 0 && (
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {saveState.problems.map((problem, index) => (
                <li key={index} className="text-xs leading-5 text-red-700">
                  {problem}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-red-700">
            Your changes are still in the editor and have not been lost. Fix the problem and save again.
          </p>
        </div>
      )}

      {historyOpen && (
        <VersionHistory
          versions={versions}
          canRestore={props.canRestore}
          restoring={restoring}
          currentVersion={props.initialVersion}
          onRestore={restore}
        />
      )}

      <MetadataPanel
        excerpt={excerpt}
        seoTitle={seoTitle}
        seoDescription={seoDescription}
        canEdit={canEdit}
        onChange={(patch) => {
          if (patch.excerpt !== undefined) setExcerpt(patch.excerpt);
          if (patch.seoTitle !== undefined) setSeoTitle(patch.seoTitle);
          if (patch.seoDescription !== undefined) setSeoDescription(patch.seoDescription);
          markDirty();
        }}
      />
    </div>
  );
}

// --- Toolbar --------------------------------------------------------------------------------------

function Toolbar({
  editor,
  canEdit,
  onUpload
}: {
  editor: Editor;
  canEdit: boolean;
  onUpload: (files: File[]) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("Link URL (https://… or /path)", previous ?? "https://");
    if (href === null) return;
    if (!href.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  };

  const insert = (node: Record<string, unknown>) => editor.chain().focus().insertContent(node).run();

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length) void onUpload(files);
          event.target.value = "";
        }}
      />

      <ToolButton
        label="Undo"
        disabled={!canEdit || !editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="h-4 w-4" aria-hidden="true" />
      </ToolButton>
      <ToolButton
        label="Redo"
        disabled={!canEdit || !editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="h-4 w-4" aria-hidden="true" />
      </ToolButton>

      <Divider />

      <ToolButton
        label="Bold (Cmd+B)"
        active={editor.isActive("bold")}
        disabled={!canEdit}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" aria-hidden="true" />
      </ToolButton>
      <ToolButton
        label="Italic (Cmd+I)"
        active={editor.isActive("italic")}
        disabled={!canEdit}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" aria-hidden="true" />
      </ToolButton>
      <ToolButton
        label="Strikethrough"
        active={editor.isActive("strike")}
        disabled={!canEdit}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" aria-hidden="true" />
      </ToolButton>
      <ToolButton
        label="Inline code"
        active={editor.isActive("code")}
        disabled={!canEdit}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code className="h-4 w-4" aria-hidden="true" />
      </ToolButton>
      <ToolButton label="Link" active={editor.isActive("link")} disabled={!canEdit} onClick={setLink}>
        <Link2 className="h-4 w-4" aria-hidden="true" />
      </ToolButton>
      <ToolButton
        label="Remove link"
        disabled={!canEdit || !editor.isActive("link")}
        onClick={() => editor.chain().focus().unsetLink().run()}
      >
        <Unlink className="h-4 w-4" aria-hidden="true" />
      </ToolButton>

      <Divider />

      {[2, 3, 4].map((level) => (
        <ToolButton
          key={level}
          label={`Heading ${level}`}
          active={editor.isActive("heading", { level })}
          disabled={!canEdit}
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleHeading({ level: level as 2 | 3 | 4 })
              .run()
          }
        >
          <span className="text-xs font-black">H{level}</span>
        </ToolButton>
      ))}
      <ToolButton
        label="Paragraph"
        active={editor.isActive("paragraph")}
        disabled={!canEdit}
        onClick={() => editor.chain().focus().setParagraph().run()}
      >
        <span className="text-xs font-black">¶</span>
      </ToolButton>

      <Divider />

      <ToolButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        disabled={!canEdit}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" aria-hidden="true" />
      </ToolButton>
      <ToolButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        disabled={!canEdit}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" aria-hidden="true" />
      </ToolButton>
      <ToolButton
        label="Blockquote"
        active={editor.isActive("blockquote")}
        disabled={!canEdit}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" aria-hidden="true" />
      </ToolButton>
      <ToolButton
        label="Divider"
        disabled={!canEdit}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </ToolButton>
      <ToolButton
        label="Table"
        disabled={!canEdit}
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
      >
        <TableIcon className="h-4 w-4" aria-hidden="true" />
      </ToolButton>

      <Divider />

      <TextButton label="Image" disabled={!canEdit} onClick={() => fileRef.current?.click()} />
      <TextButton
        label="Gallery"
        disabled={!canEdit}
        onClick={() => insert({ type: "gallery", attrs: { items: [] } })}
      />
      <TextButton
        label="Pull quote"
        disabled={!canEdit}
        onClick={() => insert({ type: "pullQuote", attrs: { attribution: null } })}
      />
      <TextButton
        label="Callout"
        disabled={!canEdit}
        onClick={() =>
          insert({
            type: "callout",
            attrs: { tone: "info", title: null },
            content: [{ type: "paragraph" }]
          })
        }
      />
      <TextButton
        label="CTA"
        disabled={!canEdit}
        onClick={() =>
          insert({ type: "cta", attrs: { label: "", href: "", ctaId: "", variant: "primary" } })
        }
      />
      <TextButton
        label="Sources"
        disabled={!canEdit}
        onClick={() => insert({ type: "sourceList", attrs: { sources: [] } })}
      />
      <TextButton
        label="Related"
        disabled={!canEdit}
        onClick={() => insert({ type: "relatedContent", attrs: { slugs: [] } })}
      />
      <TextButton
        label="Disclaimer"
        disabled={!canEdit}
        onClick={() => insert({ type: "legalDisclaimer", attrs: { variant: "self_help" } })}
      />
    </div>
  );
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active ? true : undefined}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded border text-navy transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "border-navy bg-navy text-white" : "border-slate-300 bg-white hover:border-navy"
      }`}
    >
      {children}
    </button>
  );
}

function TextButton({
  label,
  disabled,
  onClick
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 items-center rounded border border-slate-300 bg-white px-2 text-[11px] font-bold uppercase tracking-wide text-navy transition hover:border-navy disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-6 w-px bg-slate-300" aria-hidden="true" />;
}

// --- Save indicator -------------------------------------------------------------------------------

function SaveIndicator({ state }: { state: SaveState }) {
  switch (state.kind) {
    case "saving":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-navy">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Saving…
        </span>
      );
    case "saved":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
          <Check className="h-3 w-3" aria-hidden="true" />
          Saved{state.version ? ` (v${state.version})` : ""}
        </span>
      );
    case "dirty":
      return <span className="text-xs font-semibold text-amber-700">Unsaved changes — autosaving…</span>;
    case "error":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700">
          <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Not saved
        </span>
      );
    default:
      return <span className="text-xs text-slate-500">All changes saved</span>;
  }
}

// --- Version history ------------------------------------------------------------------------------

function VersionHistory({
  versions,
  canRestore,
  restoring,
  currentVersion,
  onRestore
}: {
  versions: ArticleEditorVersion[];
  canRestore: boolean;
  restoring: number | null;
  currentVersion: number;
  onRestore: (version: number) => void;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-5 py-3">
        <h2 className="text-sm font-black uppercase tracking-wide text-navy">Version history</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Currently editing version {currentVersion}. Restoring writes a new version rather than
          rewinding — nothing is ever destroyed.
        </p>
      </header>
      <div className="divide-y divide-slate-200">
        {versions.length === 0 && (
          <p className="px-5 py-6 text-center text-sm text-slate-500">
            No earlier versions yet. A snapshot is taken every time the article is saved.
          </p>
        )}
        {versions.map((version) => (
          <div key={version.version} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <span className="w-14 text-sm font-black text-navy">v{version.version}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-navy">{version.title}</p>
              <p className="text-xs text-slate-500">
                {version.createdAt ? new Date(version.createdAt).toLocaleString() : "—"}
                {version.note ? ` · ${version.note}` : ""}
              </p>
            </div>
            <button
              type="button"
              disabled={!canRestore || restoring !== null}
              title={canRestore ? "Restore this version" : "Your content role cannot restore versions"}
              onClick={() => onRestore(version.version)}
              className="rounded-md border border-navy bg-white px-3 py-1 text-xs font-bold text-navy transition hover:bg-navy hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {restoring === version.version ? "Restoring…" : "Restore"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

// --- Metadata -------------------------------------------------------------------------------------

function MetadataPanel({
  excerpt,
  seoTitle,
  seoDescription,
  canEdit,
  onChange
}: {
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  canEdit: boolean;
  onChange: (patch: { excerpt?: string; seoTitle?: string; seoDescription?: string }) => void;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-black uppercase tracking-wide text-navy">Excerpt and SEO</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Excerpt</span>
          <textarea
            value={excerpt}
            disabled={!canEdit}
            rows={2}
            onChange={(event) => onChange({ excerpt: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="One or two sentences used in listings and as the SEO fallback."
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">SEO title</span>
          <input
            value={seoTitle}
            disabled={!canEdit}
            onChange={(event) => onChange({ seoTitle: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-[11px] text-slate-500">{seoTitle.length}/60 recommended</span>
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">SEO description</span>
          <textarea
            value={seoDescription}
            disabled={!canEdit}
            rows={2}
            onChange={(event) => onChange({ seoDescription: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-[11px] text-slate-500">
            {seoDescription.length}/160 recommended
          </span>
        </label>
      </div>
    </section>
  );
}

function formatFailure(failure: ApiFailure): string {
  return failure.message;
}
