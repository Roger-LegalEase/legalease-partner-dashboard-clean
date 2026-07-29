"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Archive, Check, Copy, Loader2, Search, Upload } from "lucide-react";

import {
  MEDIA_PERMISSION_STATES,
  type MediaPermission
} from "@/lib/content/types";
import { hasBlockingIssue, validateMediaForPublication, type MediaRecord } from "@/lib/content/media";
import { contentApi } from "./api-client";
import { EmptyState, MediaIssueList, Pill } from "./primitives";

/**
 * The media library.
 *
 * The metadata here is not paperwork — it is the publication gate. An image with no alt text or an
 * unknown permission status BLOCKS publication (validateMediaForPublication), and this UI says so at
 * the top of the asset, in red, the moment you open it. The alternative — discovering it at publish
 * time, or worse, publishing an image we cannot prove we may use — is the expensive version.
 */

export type MediaLibraryAsset = MediaRecord & {
  publicUrl: string | null;
  createdAt: string | null;
  usageCount: number;
};

export type MediaLibraryProps = {
  assets: MediaLibraryAsset[];
  canUpload: boolean;
  canManage: boolean;
  storageConfigured: boolean;
};

const PERMISSION_LABELS: Record<MediaPermission, string> = {
  owned: "Owned by LegalEase",
  licensed: "Licensed",
  partner_approved: "Partner approved",
  user_consented: "User consented",
  editorial_use: "Editorial use",
  unknown: "Unknown — blocks publication"
};

export default function MediaLibrary(props: MediaLibraryProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploads, setUploads] = useState<{ name: string; state: "uploading" | "failed"; error?: string }[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return props.assets
      .filter((asset) => (showArchived ? true : !asset.archived))
      .filter((asset) => {
        if (!needle) return true;
        return [asset.altText, asset.caption, asset.credit, asset.sourceInfo, asset.mediaId]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(needle));
      });
  }, [props.assets, query, showArchived]);

  const selected = useMemo(
    () => props.assets.find((asset) => asset.mediaId === selectedId) ?? null,
    [props.assets, selectedId]
  );

  const upload = useCallback(
    async (files: File[]) => {
      if (!props.canUpload || !files.length) return;

      for (const file of files) {
        setUploads((current) => [...current, { name: file.name, state: "uploading" }]);
        const form = new FormData();
        form.append("file", file);
        const result = await contentApi.uploadMedia(form);

        setUploads((current) =>
          result.ok
            ? current.filter((entry) => entry.name !== file.name)
            : current.map((entry) =>
                entry.name === file.name
                  ? {
                      name: file.name,
                      state: "failed",
                      error: [result.message, ...result.problems].filter(Boolean).join(" — ")
                    }
                  : entry
              )
        );
      }

      router.refresh();
    },
    [props.canUpload, router]
  );

  // Clipboard paste, anywhere on the page.
  useEffect(() => {
    const handler = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
        file.type.startsWith("image/")
      );
      if (!files.length) return;
      event.preventDefault();
      void upload(files);
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [upload]);

  const blockedCount = props.assets.filter(
    (asset) => !asset.archived && hasBlockingIssue(validateMediaForPublication(asset, "body"))
  ).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        {!props.storageConfigured && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Media storage is not configured in this environment, so the library is empty and uploads
            will fail. This is a configuration state, not an empty library.
          </div>
        )}

        {blockedCount > 0 && (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-bold text-red-700">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {blockedCount} asset{blockedCount === 1 ? "" : "s"} cannot be published
            </p>
            <p className="mt-1 text-xs leading-5 text-red-700">
              Missing alt text or an unknown permission status. Open each asset and record what is
              missing.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <label className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search alt text, caption, credit, source…"
              className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
            />
            Show archived
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (files.length) void upload(files);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={!props.canUpload}
            onClick={() => fileRef.current?.click()}
            title={props.canUpload ? "Upload images" : "Your content role cannot upload media."}
            className="inline-flex items-center gap-1 rounded-md bg-navy px-3 py-2 text-xs font-bold text-white transition hover:bg-navy-mid disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="h-3 w-3" aria-hidden="true" /> Upload
          </button>
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const files = Array.from(event.dataTransfer.files).filter((file) =>
              file.type.startsWith("image/")
            );
            if (files.length) void upload(files);
          }}
          className={`rounded-md border-2 border-dashed px-4 py-3 text-center text-xs font-semibold transition ${
            dragging ? "border-navy bg-cream text-navy" : "border-slate-300 text-slate-500"
          }`}
        >
          Drag images here, or paste from the clipboard. JPEG, PNG, WebP, GIF — 12 MB max (GIFs 3 MB).
        </div>

        {uploads.length > 0 && (
          <div className="space-y-1">
            {uploads.map((entry) => (
              <div
                key={entry.name}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${
                  entry.state === "failed"
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "border-slate-300 bg-white text-slate-600"
                }`}
              >
                {entry.state === "uploading" ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                )}
                <span className="font-semibold">{entry.name}</span>
                <span>{entry.state === "uploading" ? "Uploading…" : entry.error}</span>
                {entry.state === "failed" && (
                  <button
                    type="button"
                    onClick={() => setUploads((current) => current.filter((item) => item.name !== entry.name))}
                    className="ml-auto font-bold uppercase"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {visible.length === 0 ? (
          <EmptyState
            message="No media assets"
            hint="Upload an image, or clear the search filter."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {visible.map((asset) => {
              const issues = validateMediaForPublication(asset, "body");
              const blocked = hasBlockingIssue(issues);
              return (
                <button
                  key={asset.mediaId}
                  type="button"
                  onClick={() => setSelectedId(asset.mediaId)}
                  className={`overflow-hidden rounded-md border bg-white text-left shadow-sm transition hover:border-navy ${
                    selectedId === asset.mediaId ? "border-navy ring-2 ring-navy" : "border-slate-200"
                  }`}
                >
                  <div className="relative aspect-[4/3] bg-slate-100">
                    {asset.publicUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={asset.publicUrl}
                        alt={asset.altText ?? ""}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[11px] text-slate-400">
                        No preview
                      </span>
                    )}
                    {blocked && (
                      <span className="absolute left-1 top-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-black uppercase text-white">
                        Blocked
                      </span>
                    )}
                    {asset.archived && (
                      <span className="absolute right-1 top-1 rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-black uppercase text-white">
                        Archived
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="truncate text-xs font-semibold text-navy">
                      {asset.altText || "No alt text"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {asset.width ?? "?"}×{asset.height ?? "?"} · used {asset.usageCount}×
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <MetadataEditor
        key={selected?.mediaId ?? "none"}
        asset={selected}
        canManage={props.canManage}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

// --- Metadata editor ------------------------------------------------------------------------------

function MetadataEditor({
  asset,
  canManage,
  onSaved
}: {
  asset: MediaLibraryAsset | null;
  canManage: boolean;
  onSaved: () => void;
}) {
  const [altText, setAltText] = useState(asset?.altText ?? "");
  const [caption, setCaption] = useState(asset?.caption ?? "");
  const [credit, setCredit] = useState(asset?.credit ?? "");
  const [sourceInfo, setSourceInfo] = useState(asset?.sourceInfo ?? "");
  const [permission, setPermission] = useState<MediaPermission>(asset?.permissionStatus ?? "unknown");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: "ok" | "error"; text: string; problems: string[] } | null>(
    null
  );

  if (!asset) {
    return (
      <aside className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-wide text-navy">Asset details</h2>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Select an asset to edit its alt text, caption, credit, source, and permission status.
        </p>
      </aside>
    );
  }

  // Live: revalidate against what is being typed, not against what is stored.
  const draft: MediaRecord = {
    ...asset,
    altText,
    caption,
    credit,
    sourceInfo,
    permissionStatus: permission
  };
  const issues = validateMediaForPublication(draft, "featured");

  const save = async () => {
    setBusy(true);
    setResult(null);
    const response = await contentApi.updateMedia(asset.mediaId, {
      altText: altText || null,
      caption: caption || null,
      credit: credit || null,
      sourceInfo: sourceInfo || null,
      permissionStatus: permission
    });
    setBusy(false);

    if (!response.ok) {
      setResult({ tone: "error", text: response.message, problems: response.problems });
      return;
    }
    setResult({ tone: "ok", text: "Saved.", problems: [] });
    onSaved();
  };

  const setArchived = async (archived: boolean) => {
    setBusy(true);
    setResult(null);
    const response = await contentApi.updateMedia(asset.mediaId, { archived });
    setBusy(false);
    if (!response.ok) {
      setResult({ tone: "error", text: response.message, problems: response.problems });
      return;
    }
    onSaved();
  };

  return (
    <aside className="space-y-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-black uppercase tracking-wide text-navy">Asset details</h2>

      {asset.publicUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset.publicUrl} alt={altText} className="w-full rounded-md border border-slate-200" />
      )}

      <MediaIssueList issues={issues} />

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Alt text <span className="text-red-700">(required to publish)</span>
        </span>
        <textarea
          value={altText}
          rows={2}
          disabled={!canManage}
          onChange={(event) => setAltText(event.target.value)}
          className={`mt-1 w-full rounded-md border px-3 py-2 text-sm ${
            altText.trim() ? "border-slate-300" : "border-red-400 bg-red-50"
          }`}
          placeholder="What is in the image, for a screen reader?"
        />
      </label>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Caption</span>
        <input
          value={caption}
          disabled={!canManage}
          onChange={(event) => setCaption(event.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Credit</span>
        <input
          value={credit}
          disabled={!canManage}
          onChange={(event) => setCredit(event.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Photographer, agency, or partner"
        />
      </label>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Source info</span>
        <textarea
          value={sourceInfo}
          rows={2}
          disabled={!canManage}
          onChange={(event) => setSourceInfo(event.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Where did this come from? License reference, consent form, partner email…"
        />
      </label>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Permission status <span className="text-red-700">(required to publish)</span>
        </span>
        <select
          value={permission}
          disabled={!canManage}
          onChange={(event) => setPermission(event.target.value as MediaPermission)}
          className={`mt-1 w-full rounded-md border px-3 py-2 text-sm ${
            permission === "unknown" ? "border-red-400 bg-red-50" : "border-slate-300"
          }`}
        >
          {MEDIA_PERMISSION_STATES.map((state) => (
            <option key={state} value={state}>
              {PERMISSION_LABELS[state]}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-[11px] leading-4 text-slate-500">
          An image whose rights we cannot account for is the single most expensive mistake a
          publishing platform can make, so “unknown” blocks publication rather than warning.
        </span>
      </label>

      <dl className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 text-[11px] text-slate-500">
        <div>
          <dt className="font-bold uppercase">Dimensions</dt>
          <dd>
            {asset.width ?? "?"}×{asset.height ?? "?"}
          </dd>
        </div>
        <div>
          <dt className="font-bold uppercase">Type</dt>
          <dd>{asset.mimeType}</dd>
        </div>
        <div>
          <dt className="font-bold uppercase">Size</dt>
          <dd>{(asset.byteSize / 1024).toFixed(0)} KB</dd>
        </div>
        <div>
          <dt className="font-bold uppercase">In use</dt>
          <dd>{asset.usageCount} article(s)</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={asset.archived ? "block" : "ok"}>{asset.archived ? "Archived" : "Active"}</Pill>
        <button
          type="button"
          onClick={() => {
            if (asset.publicUrl) void navigator.clipboard.writeText(asset.publicUrl);
          }}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-navy"
        >
          <Copy className="h-3 w-3" aria-hidden="true" /> Copy URL
        </button>
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(asset.mediaId)}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-navy"
        >
          <Copy className="h-3 w-3" aria-hidden="true" /> Copy media id
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
        <button
          type="button"
          disabled={!canManage || busy}
          onClick={() => void save()}
          className="inline-flex items-center gap-1 rounded-md bg-navy px-3 py-1.5 text-xs font-bold text-white transition hover:bg-navy-mid disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Check className="h-3 w-3" aria-hidden="true" />}
          Save metadata
        </button>
        <button
          type="button"
          disabled={!canManage || busy || asset.usageCount > 0}
          title={
            asset.usageCount > 0
              ? `In use by ${asset.usageCount} article(s). Remove it from them before archiving.`
              : asset.archived
                ? "Restore this asset"
                : "Archive this asset"
          }
          onClick={() => void setArchived(!asset.archived)}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-navy transition hover:border-navy disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Archive className="h-3 w-3" aria-hidden="true" />
          {asset.archived ? "Restore" : "Archive"}
        </button>
      </div>

      {result && (
        <div
          className={`rounded-md border px-3 py-2 ${
            result.tone === "ok" ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"
          }`}
        >
          <p
            className={`text-xs font-bold ${
              result.tone === "ok" ? "text-emerald-800" : "text-red-700"
            }`}
          >
            {result.text}
          </p>
          {result.problems.length > 0 && (
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {result.problems.map((problem, index) => (
                <li key={index} className="text-[11px] leading-4 text-red-700">
                  {problem}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  );
}
