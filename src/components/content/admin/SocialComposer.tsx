"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Download, PlugZap, Send } from "lucide-react";

import {
  SOCIAL_CHANNELS,
  SOCIAL_CHANNEL_LIMITS,
  type SocialApprovalState,
  type SocialChannel
} from "@/lib/content/types";
import { contentApi } from "./api-client";
import { Pill } from "./primitives";

/**
 * The promotion composer.
 *
 * DIVISION OF OWNERSHIP: LegalEase owns the copy, the assets, and the approval. The Command Center
 * owns connected accounts and the actual posting. So this component drafts and approves — it never
 * claims to have posted anything.
 *
 * THE HONEST DISABLED STATE: when the Command Center integration is unconfigured, "Send" is disabled
 * and says exactly why, and "Export promotion JSON" still works so the work is never trapped. A fake
 * success toast here would be worse than useless — someone would believe a post went out.
 */

export type SocialComposerDraft = {
  channel: SocialChannel;
  primaryCaption: string | null;
  alternateCaption: string | null;
  founderVoiceCaption: string | null;
  partnerCaption: string | null;
  hashtags: string[];
  mentionTags: string[];
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  socialAssetId: string | null;
  approvalState: SocialApprovalState;
};

export type SocialComposerAsset = {
  socialAssetId: string;
  template: string;
  sizeKey: string;
  width: number;
  height: number;
};

export type SocialComposerProps = {
  postId: string;
  postTitle: string;
  drafts: SocialComposerDraft[];
  assets: SocialComposerAsset[];
  commandCenter: { connected: boolean; reason: string | null };
  canDraft: boolean;
  canApprove: boolean;
  canSend: boolean;
};

const CHANNEL_LABELS: Record<SocialChannel, string> = {
  linkedin: "LinkedIn",
  x: "X",
  facebook: "Facebook",
  instagram: "Instagram",
  threads: "Threads",
  email: "Email",
  partner_kit: "Partner kit"
};

type ChannelForm = {
  primaryCaption: string;
  alternateCaption: string;
  founderVoiceCaption: string;
  partnerCaption: string;
  hashtags: string;
  mentionTags: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  socialAssetId: string;
  approvalState: SocialApprovalState;
};

function emptyForm(): ChannelForm {
  return {
    primaryCaption: "",
    alternateCaption: "",
    founderVoiceCaption: "",
    partnerCaption: "",
    hashtags: "",
    mentionTags: "",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    socialAssetId: "",
    approvalState: "draft"
  };
}

function formsFrom(drafts: SocialComposerDraft[]): Record<SocialChannel, ChannelForm> {
  const forms = Object.fromEntries(SOCIAL_CHANNELS.map((channel) => [channel, emptyForm()])) as Record<
    SocialChannel,
    ChannelForm
  >;

  for (const draft of drafts) {
    if (!SOCIAL_CHANNELS.includes(draft.channel)) continue;
    forms[draft.channel] = {
      primaryCaption: draft.primaryCaption ?? "",
      alternateCaption: draft.alternateCaption ?? "",
      founderVoiceCaption: draft.founderVoiceCaption ?? "",
      partnerCaption: draft.partnerCaption ?? "",
      hashtags: draft.hashtags.join(" "),
      mentionTags: draft.mentionTags.join(" "),
      utmSource: draft.utmSource ?? "",
      utmMedium: draft.utmMedium ?? "",
      utmCampaign: draft.utmCampaign ?? "",
      socialAssetId: draft.socialAssetId ?? "",
      approvalState: draft.approvalState
    };
  }

  return forms;
}

export default function SocialComposer(props: SocialComposerProps) {
  const [active, setActive] = useState<SocialChannel>("linkedin");
  const [forms, setForms] = useState(() => formsFrom(props.drafts));
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string; problems: string[] } | null>(
    null
  );

  const form = forms[active];
  const limit = SOCIAL_CHANNEL_LIMITS[active];
  const primaryLength = form.primaryCaption.length;
  const alternateLength = form.alternateCaption.length;
  const overLimit = primaryLength > limit || alternateLength > limit;

  const update = (patch: Partial<ChannelForm>) => {
    setForms((current) => ({ ...current, [active]: { ...current[active], ...patch } }));
  };

  const payloadFor = (channel: SocialChannel) => {
    const entry = forms[channel];
    return {
      channel,
      primaryCaption: entry.primaryCaption || null,
      alternateCaption: entry.alternateCaption || null,
      founderVoiceCaption: entry.founderVoiceCaption || null,
      partnerCaption: entry.partnerCaption || null,
      hashtags: tokenize(entry.hashtags),
      mentionTags: tokenize(entry.mentionTags),
      utmSource: entry.utmSource || null,
      utmMedium: entry.utmMedium || null,
      utmCampaign: entry.utmCampaign || null,
      socialAssetId: entry.socialAssetId || null,
      approvalState: entry.approvalState
    };
  };

  const saveChannel = async (approvalState?: SocialApprovalState) => {
    setMessage(null);
    setBusy("save");
    const payload = { ...payloadFor(active), ...(approvalState ? { approvalState } : {}) };
    const result = await contentApi.saveSocial(props.postId, payload);
    setBusy(null);

    if (!result.ok) {
      setMessage({ tone: "error", text: result.message, problems: result.problems });
      return;
    }
    if (approvalState) update({ approvalState });
    setMessage({
      tone: "ok",
      text: approvalState === "approved" ? `${CHANNEL_LABELS[active]} copy approved.` : "Draft saved.",
      problems: []
    });
  };

  const exportJson = async () => {
    setMessage(null);
    setBusy("export");
    const result = await contentApi.exportPromotion(props.postId);
    setBusy(null);

    // The server export is canonical (it includes assets and tracked links). If it is unavailable we
    // still export — but we say plainly that it is a local export of what is on screen, not the
    // server's package.
    const payload = result.ok
      ? result.data
      : {
          _note:
            "LOCAL EXPORT. The server-side promotion export was unavailable, so this is the copy currently in the composer — it does not include server-generated assets or tracked links.",
          _serverError: result.message,
          postId: props.postId,
          title: props.postTitle,
          channels: SOCIAL_CHANNELS.map((channel) => payloadFor(channel))
        };

    downloadJson(`promotion-${props.postId}.json`, payload);
    setMessage(
      result.ok
        ? { tone: "ok", text: "Promotion package exported.", problems: [] }
        : {
            tone: "error",
            text: `Exported the on-screen copy locally. The server package was not available: ${result.message}`,
            problems: result.problems
          }
    );
  };

  const send = async () => {
    setMessage(null);
    setBusy("send");
    const result = await contentApi.sendPromotion(props.postId);
    setBusy(null);

    if (!result.ok) {
      setMessage({ tone: "error", text: result.message, problems: result.problems });
      return;
    }
    setMessage({
      tone: "ok",
      text: "Handed off to the Command Center. It owns scheduling and posting from here — check the Command Center for delivery status.",
      problems: []
    });
  };

  const assetsForChannel = useMemo(() => props.assets, [props.assets]);

  return (
    <section className="rounded-md border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-5 py-3">
        <h2 className="text-sm font-black uppercase tracking-wide text-navy">Promotion</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          LegalEase owns the copy and the approval. The Command Center owns connected accounts and
          posting.
        </p>
      </header>

      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
        {SOCIAL_CHANNELS.map((channel) => {
          const state = forms[channel].approvalState;
          return (
            <button
              key={channel}
              type="button"
              onClick={() => setActive(channel)}
              className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-bold transition ${
                active === channel
                  ? "border-navy bg-navy text-white"
                  : "border-slate-300 bg-white text-navy hover:border-navy"
              }`}
            >
              {CHANNEL_LABELS[channel]}
              {state === "approved" && <Check className="h-3 w-3" aria-hidden="true" />}
              {state === "sent" && <Send className="h-3 w-3" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={form.approvalState === "approved" ? "ok" : form.approvalState === "failed" ? "block" : "neutral"}>
            {form.approvalState}
          </Pill>
          <span className={`text-xs font-bold ${overLimit ? "text-red-700" : "text-slate-500"}`}>
            {CHANNEL_LABELS[active]} limit: {limit.toLocaleString()} characters
          </span>
        </div>

        <CaptionField
          label="Primary caption"
          value={form.primaryCaption}
          limit={limit}
          disabled={!props.canDraft}
          onChange={(value) => update({ primaryCaption: value })}
        />
        <CaptionField
          label="Alternate caption (A/B)"
          value={form.alternateCaption}
          limit={limit}
          disabled={!props.canDraft}
          onChange={(value) => update({ alternateCaption: value })}
        />
        <CaptionField
          label="Founder voice"
          value={form.founderVoiceCaption}
          limit={limit}
          disabled={!props.canDraft}
          onChange={(value) => update({ founderVoiceCaption: value })}
        />
        <CaptionField
          label="Partner-facing copy"
          value={form.partnerCaption}
          limit={limit}
          disabled={!props.canDraft}
          onChange={(value) => update({ partnerCaption: value })}
        />

        <div className="grid gap-3 md:grid-cols-2">
          <Field
            label="Hashtags"
            value={form.hashtags}
            disabled={!props.canDraft}
            placeholder="#recordclearing #secondchances"
            onChange={(value) => update({ hashtags: value })}
          />
          <Field
            label="Mention tags"
            value={form.mentionTags}
            disabled={!props.canDraft}
            placeholder="@partner @coalition"
            onChange={(value) => update({ mentionTags: value })}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Field
            label="utm_source"
            value={form.utmSource}
            disabled={!props.canDraft}
            placeholder={active === "email" ? "newsletter" : active}
            onChange={(value) => update({ utmSource: value })}
          />
          <Field
            label="utm_medium"
            value={form.utmMedium}
            disabled={!props.canDraft}
            placeholder={active === "email" ? "email" : "social"}
            onChange={(value) => update({ utmMedium: value })}
          />
          <Field
            label="utm_campaign"
            value={form.utmCampaign}
            disabled={!props.canDraft}
            onChange={(value) => update({ utmCampaign: value })}
          />
        </div>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Social asset</span>
          <select
            value={form.socialAssetId}
            disabled={!props.canDraft}
            onChange={(event) => update({ socialAssetId: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">No asset selected</option>
            {assetsForChannel.map((asset) => (
              <option key={asset.socialAssetId} value={asset.socialAssetId}>
                {asset.template} · {asset.sizeKey} ({asset.width}×{asset.height})
              </option>
            ))}
          </select>
          {assetsForChannel.length === 0 && (
            <span className="mt-1 block text-[11px] text-slate-500">
              No branded assets have been generated for this post yet.
            </span>
          )}
        </label>

        {overLimit && (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            One or more captions exceed the {CHANNEL_LABELS[active]} limit of {limit} characters. The
            server rejects an over-limit promotion package — trim it before approving.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
          <button
            type="button"
            disabled={!props.canDraft || busy !== null}
            onClick={() => void saveChannel()}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-navy transition hover:border-navy disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "save" ? "Saving…" : "Save draft"}
          </button>

          <button
            type="button"
            disabled={!props.canApprove || overLimit || busy !== null}
            title={
              !props.canApprove
                ? "Your content role cannot approve promotion copy."
                : overLimit
                  ? "Trim the captions to the channel limit first."
                  : "Approve this channel"
            }
            onClick={() => void saveChannel("approved")}
            className="rounded-md border border-navy bg-navy px-3 py-1.5 text-xs font-bold text-white transition hover:bg-navy-mid disabled:cursor-not-allowed disabled:opacity-50"
          >
            Approve {CHANNEL_LABELS[active]}
          </button>

          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void exportJson()}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-navy transition hover:border-navy disabled:opacity-50"
          >
            <Download className="h-3 w-3" aria-hidden="true" />
            {busy === "export" ? "Exporting…" : "Export promotion JSON"}
          </button>

          <div className="flex flex-col">
            <button
              type="button"
              disabled={!props.commandCenter.connected || !props.canSend || busy !== null}
              title={
                !props.commandCenter.connected
                  ? "Not connected to the Command Center."
                  : !props.canSend
                    ? "Your content role cannot send promotions."
                    : "Hand off to the Command Center"
              }
              onClick={() => void send()}
              className="inline-flex items-center gap-1 rounded-md border border-teal bg-teal px-3 py-1.5 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
            >
              <Send className="h-3 w-3" aria-hidden="true" />
              {busy === "send" ? "Sending…" : "Send to Command Center"}
            </button>
          </div>
        </div>

        {!props.commandCenter.connected && (
          <div className="flex items-start gap-2 rounded-md border border-slate-300 bg-slate-50 px-4 py-3">
            <PlugZap className="mt-0.5 h-4 w-4 text-slate-500" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-slate-700">Not connected to the Command Center</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {props.commandCenter.reason ??
                  "The Command Center content-events integration is not configured in this environment."}{" "}
                Sending is disabled. Export the promotion JSON and hand it over manually — nothing here
                will pretend a post went out.
              </p>
            </div>
          </div>
        )}

        {message && (
          <div
            className={`rounded-md border px-4 py-3 ${
              message.tone === "ok"
                ? "border-emerald-300 bg-emerald-50"
                : "border-red-300 bg-red-50"
            }`}
          >
            <p
              className={`flex items-center gap-2 text-sm font-bold ${
                message.tone === "ok" ? "text-emerald-800" : "text-red-700"
              }`}
            >
              {message.tone === "ok" ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              )}
              {message.text}
            </p>
            {message.problems.length > 0 && (
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {message.problems.map((problem, index) => (
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
  );
}

function CaptionField({
  label,
  value,
  limit,
  disabled,
  onChange
}: {
  label: string;
  value: string;
  limit: number;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const over = value.length > limit;
  const remaining = limit - value.length;

  return (
    <label className="block">
      <span className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
        <span className={`text-xs font-bold tabular-nums ${over ? "text-red-700" : "text-slate-500"}`}>
          {value.length} / {limit}
          {over ? ` (${Math.abs(remaining)} over)` : ""}
        </span>
      </span>
      <textarea
        value={value}
        rows={3}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-1 w-full rounded-md border px-3 py-2 text-sm ${
          over ? "border-red-400 bg-red-50" : "border-slate-300"
        }`}
      />
    </label>
  );
}

function Field({
  label,
  value,
  placeholder,
  disabled,
  onChange
}: {
  label: string;
  value: string;
  placeholder?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
    </label>
  );
}

function tokenize(value: string): string[] {
  return value
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
