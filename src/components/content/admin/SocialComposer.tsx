"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Clipboard,
  Download,
  ImageIcon,
  Lock,
  MoreHorizontal,
  PlugZap,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  Unlock,
  WandSparkles
} from "lucide-react";

import type {
  PromotionGenerationOutput,
  PromotionGroundingIssue
} from "@/lib/content/promotion-generation-contract";
import {
  PROMOTION_CHANNEL_REGISTRY,
  PROMOTION_CLASSIFICATIONS,
  PROMOTION_OBJECTIVES,
  PROMOTION_TONES,
  PROMOTION_VARIANTS,
  buildPromotionTrackedUrl,
  classificationForContentType,
  defaultPromotionTracking,
  normalizeHashtags,
  objectiveForClassification,
  recommendedPromotionTemplate,
  type PromotionClassification,
  type PromotionGeneratedField,
  type PromotionObjective,
  type PromotionTone,
  type PromotionVariant
} from "@/lib/content/promotion-studio";
import {
  SOCIAL_ASSET_SIZES,
  SOCIAL_CHANNELS,
  SOCIAL_TEMPLATES,
  type ContentDestination,
  type ContentStatus,
  type ContentType,
  type SocialApprovalState,
  type SocialChannel,
  type SocialTemplate,
  requiresLegalReview
} from "@/lib/content/types";
import { contentApi } from "./api-client";
import { Pill, formatDateTime, humanize } from "./primitives";

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
  approvedAt: string | null;
  updatedAt: string | null;
};

export type SocialComposerAsset = {
  socialAssetId: string;
  template: string;
  sizeKey: string;
  width: number;
  height: number;
  imageUrl: string | null;
  previewUrl: string | null;
  headline: string | null;
};

export type SocialComposerProps = {
  post: {
    postId: string;
    title: string;
    subtitle: string | null;
    excerpt: string | null;
    slug: string;
    destination: ContentDestination;
    contentType: ContentType;
    status: ContentStatus;
    legalSensitive: boolean;
    legalApprovedAt: string | null;
    jurisdictionCode: string | null;
    partnerSlug: string | null;
    authorName: string | null;
    canonicalUrl: string;
    updatedAt: string | null;
    version: number;
  };
  drafts: SocialComposerDraft[];
  assets: SocialComposerAsset[];
  commandCenter: { connected: boolean; reason: string | null };
  ai: { configured: boolean; reason: string | null };
  canDraft: boolean;
  canApprove: boolean;
  canSend: boolean;
};

type EditOrigin = "saved" | "generated" | "manual";
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
  approvedAt: string | null;
  updatedAt: string | null;
  origin: Record<PromotionGeneratedField, EditOrigin>;
};

type CampaignBrief = {
  classification: PromotionClassification;
  objective: PromotionObjective;
  primaryAudience: string;
  secondaryAudience: string;
  keyMessage: string;
  supportingPoints: string[];
  tone: PromotionTone;
  cta: string;
};

type StudioMessage = { tone: "ok" | "error" | "info"; text: string; problems: string[] };

const EMPTY_ORIGIN: Record<PromotionGeneratedField, EditOrigin> = {
  primaryCaption: "saved",
  alternateCaption: "saved",
  founderVoiceCaption: "saved",
  partnerCaption: "saved",
  hashtags: "saved"
};

function emptyForm(channel: SocialChannel, slug: string): ChannelForm {
  const tracking = defaultPromotionTracking(channel, slug);
  return {
    primaryCaption: "",
    alternateCaption: "",
    founderVoiceCaption: "",
    partnerCaption: "",
    hashtags: "",
    mentionTags: "",
    ...tracking,
    socialAssetId: "",
    approvalState: "draft",
    approvedAt: null,
    updatedAt: null,
    origin: { ...EMPTY_ORIGIN }
  };
}

function formsFrom(drafts: SocialComposerDraft[], slug: string): Record<SocialChannel, ChannelForm> {
  const forms = Object.fromEntries(
    SOCIAL_CHANNELS.map((channel) => [channel, emptyForm(channel, slug)])
  ) as Record<SocialChannel, ChannelForm>;

  for (const draft of drafts) {
    const defaults = defaultPromotionTracking(draft.channel, slug);
    forms[draft.channel] = {
      primaryCaption: draft.primaryCaption ?? "",
      alternateCaption: draft.alternateCaption ?? "",
      founderVoiceCaption: draft.founderVoiceCaption ?? "",
      partnerCaption: draft.partnerCaption ?? "",
      hashtags: draft.hashtags.join(" "),
      mentionTags: draft.mentionTags.join(" "),
      utmSource: draft.utmSource ?? defaults.utmSource,
      utmMedium: draft.utmMedium ?? defaults.utmMedium,
      utmCampaign: draft.utmCampaign ?? defaults.utmCampaign,
      socialAssetId: draft.socialAssetId ?? "",
      approvalState: draft.approvalState,
      approvedAt: draft.approvedAt,
      updatedAt: draft.updatedAt,
      origin: { ...EMPTY_ORIGIN }
    };
  }
  return forms;
}

function initialBrief(props: SocialComposerProps): CampaignBrief {
  const classification = classificationForContentType(props.post.contentType);
  const audience =
    props.post.destination === "expungement_ai"
      ? "People exploring record-clearing information and supportive community organizations"
      : "LegalEase partners, program leaders, and institutional stakeholders";
  const supporting = [props.post.subtitle, props.post.excerpt, props.post.jurisdictionCode]
    .filter((value): value is string => Boolean(value?.trim()))
    .slice(0, 3);
  while (supporting.length < 3) supporting.push(props.post.title);
  return {
    classification,
    objective: objectiveForClassification(classification),
    primaryAudience: audience,
    secondaryAudience: props.post.partnerSlug ? `People reached through ${props.post.partnerSlug}` : "",
    keyMessage: props.post.excerpt?.trim() || props.post.subtitle?.trim() || props.post.title,
    supportingPoints: supporting,
    tone: "Educational",
    cta: props.post.destination === "expungement_ai" ? "Learn about the process" : "Read the full article"
  };
}

export default function SocialComposer(props: SocialComposerProps) {
  const [active, setActive] = useState<SocialChannel>("linkedin");
  const [variant, setVariant] = useState<PromotionVariant>("primaryCaption");
  const [forms, setForms] = useState(() => formsFrom(props.drafts, props.post.slug));
  const [assets, setAssets] = useState(props.assets);
  const [brief, setBrief] = useState(() => initialBrief(props));
  const [suggestions, setSuggestions] = useState<PromotionGenerationOutput | null>(null);
  const [issues, setIssues] = useState<PromotionGroundingIssue[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [generationMode, setGenerationMode] = useState<"fill_empty" | "regenerate_selected" | "regenerate_all">(
    "regenerate_all"
  );
  const [rejected, setRejected] = useState<Set<string>>(() => new Set());
  const [locked, setLocked] = useState<Set<string>>(() => new Set());
  const [dirty, setDirty] = useState<Set<SocialChannel>>(() => new Set());
  const [undo, setUndo] = useState<Record<string, string>>({});
  const [articleDirty, setArticleDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<StudioMessage | null>(null);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [assetTemplate, setAssetTemplate] = useState<SocialTemplate>(() =>
    recommendedPromotionTemplate(props.post.contentType)
  );
  const [assetHeadline, setAssetHeadline] = useState(props.post.title);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ postId?: string; dirty?: boolean }>).detail;
      if (detail?.postId === props.post.postId) setArticleDirty(detail.dirty === true);
    };
    window.addEventListener("content-editor-save-state", handler);
    return () => window.removeEventListener("content-editor-save-state", handler);
  }, [props.post.postId]);

  const form = forms[active];
  const rule = PROMOTION_CHANNEL_REGISTRY[active];
  const asset = assets.find((candidate) => candidate.socialAssetId === form.socialAssetId) ?? null;
  const trackedUrl = buildPromotionTrackedUrl(props.post.canonicalUrl, active, form);
  const channelIssues = issues.filter((issue) => issue.channel === active || issue.channel === null);
  const blockingIssues = channelIssues.filter((issue) => issue.severity === "blocker");
  const staleChannels = useMemo(
    () => new Set(SOCIAL_CHANNELS.filter((channel) => isStale(props.post.updatedAt, forms[channel].updatedAt))),
    [forms, props.post.updatedAt]
  );
  const anyStale = staleChannels.size > 0;

  const updateForm = useCallback(
    (channel: SocialChannel, patch: Partial<ChannelForm>, originField?: PromotionGeneratedField) => {
      setForms((current) => {
        const previous = current[channel];
        const nextOrigin = originField
          ? { ...previous.origin, [originField]: "manual" as const }
          : previous.origin;
        return {
          ...current,
          [channel]: {
            ...previous,
            ...patch,
            approvalState:
              previous.approvalState === "approved" || previous.approvalState === "sent"
                ? "draft"
                : patch.approvalState ?? previous.approvalState,
            approvedAt:
              previous.approvalState === "approved" || previous.approvalState === "sent"
                ? null
                : patch.approvedAt ?? previous.approvedAt,
            origin: nextOrigin
          }
        };
      });
      setDirty((current) => new Set(current).add(channel));
    },
    []
  );

  const payloadFor = useCallback(
    (channel: SocialChannel, approvalState?: "draft" | "approved") => {
      const entry = forms[channel];
      return {
        channel,
        primaryCaption: entry.primaryCaption || null,
        alternateCaption: entry.alternateCaption || null,
        founderVoiceCaption: entry.founderVoiceCaption || null,
        partnerCaption: entry.partnerCaption || null,
        hashtags: normalizeHashtags(tokenize(entry.hashtags), channel),
        mentionTags: tokenize(entry.mentionTags),
        utmSource: entry.utmSource || null,
        utmMedium: entry.utmMedium || null,
        utmCampaign: entry.utmCampaign || null,
        socialAssetId: entry.socialAssetId || null,
        approvalState: approvalState ?? entry.approvalState
      };
    },
    [forms]
  );

  const saveChannels = useCallback(
    async (channels: SocialChannel[], approvalState?: "draft" | "approved"): Promise<boolean> => {
      setBusy(approvalState === "approved" ? "approve" : "save");
      setMessage(null);
      const result = await contentApi.saveSocial(props.post.postId, {
        channels: channels.map((channel) => payloadFor(channel, approvalState))
      });
      setBusy(null);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.message, problems: result.problems });
        return false;
      }

      const reset = new Set(result.data.approvalReset ?? []);
      const now = new Date().toISOString();
      setForms((current) => {
        const next = { ...current };
        for (const channel of channels) {
          next[channel] = {
            ...next[channel],
            approvalState: reset.has(channel) ? "draft" : approvalState ?? next[channel].approvalState,
            approvedAt: reset.has(channel) ? null : approvalState === "approved" ? now : next[channel].approvedAt,
            updatedAt: now
          };
        }
        return next;
      });
      setDirty((current) => {
        const next = new Set(current);
        for (const channel of channels) next.delete(channel);
        return next;
      });
      if (reset.size) {
        setMessage({
          tone: "info",
          text: "The edited channel was saved as a draft. Review it, then approve it again.",
          problems: []
        });
      } else {
        setMessage({
          tone: "ok",
          text: approvalState === "approved" ? "Promotion approval saved." : "Promotion draft saved.",
          problems: []
        });
      }
      return true;
    },
    [payloadFor, props.post.postId]
  );

  const runGeneration = async (options?: {
    mode?: "fill_empty" | "regenerate_selected" | "regenerate_all";
    channels?: SocialChannel[];
    field?: PromotionGeneratedField;
    shorten?: boolean;
  }) => {
    if (!props.canDraft) return;
    if (articleDirty) {
      setMessage({
        tone: "error",
        text: "Save the article before regenerating. Campaign drafting always uses the saved version.",
        problems: []
      });
      return;
    }
    if (!props.ai.configured) {
      setMessage({
        tone: "info",
        text: "AI campaign drafting is not configured. You can continue drafting manually, generate branded assets, and export the promotion package.",
        problems: []
      });
      return;
    }

    const mode = options?.mode ?? "regenerate_all";
    setBusy("generate");
    setMessage(null);
    const result = await contentApi.generatePromotion(props.post.postId, {
      channels: options?.channels,
      mode,
      classification: brief.classification,
      objective: brief.objective,
      audience: brief.primaryAudience,
      tone: brief.tone,
      cta: brief.cta,
      includeFounderVoice: true,
      includePartnerCopy: true,
      generateAssetPlan: true,
      field: options?.field,
      shortenToLimit: options?.shorten
    });
    setBusy(null);
    if (!result.ok) {
      setMessage({ tone: "error", text: result.message, problems: result.problems });
      return;
    }

    setSuggestions(result.data.suggestions);
    setIssues(result.data.issues ?? []);
    setGeneratedAt(result.data.generatedAt);
    setGenerationMode(mode);
    setRejected(new Set());
    setBrief({
      classification: result.data.suggestions.brief.classification,
      objective: result.data.suggestions.brief.objective,
      primaryAudience: result.data.suggestions.brief.primaryAudience,
      secondaryAudience: result.data.suggestions.brief.secondaryAudience ?? "",
      keyMessage: result.data.suggestions.brief.keyMessage,
      supportingPoints: result.data.suggestions.brief.supportingPoints,
      tone: result.data.suggestions.brief.tone,
      cta: result.data.suggestions.brief.cta
    });
    setMessage({
      tone: "info",
      text: "Campaign suggestions are ready for review. Nothing has been applied or saved yet.",
      problems: result.data.issues.filter((issue) => issue.severity === "blocker").map((issue) => issue.message)
    });
  };

  const suggestionFor = (channel: SocialChannel, field: PromotionGeneratedField): string | null => {
    if (!suggestions) return null;
    const key = suggestionKey(channel, field);
    if (rejected.has(key) || locked.has(key)) return null;
    if (forms[channel].approvalState === "approved" || forms[channel].approvalState === "sent") return null;
    if (generationMode === "fill_empty" && valueForField(forms[channel], field).trim()) return null;
    const generated = suggestions.channels[channel];
    return field === "hashtags" ? generated.hashtags.join(" ") : generated[field];
  };

  const applyField = (channel: SocialChannel, field: PromotionGeneratedField) => {
    const proposed = suggestionFor(channel, field);
    if (proposed === null) return;
    const key = suggestionKey(channel, field);
    const previous = valueForField(forms[channel], field);
    setUndo((current) => ({ ...current, [key]: previous }));
    setForms((current) => ({
      ...current,
      [channel]: {
        ...current[channel],
        [field]: proposed,
        approvalState: "draft",
        approvedAt: null,
        origin: { ...current[channel].origin, [field]: "generated" }
      }
    }));
    setDirty((current) => new Set(current).add(channel));
    setRejected((current) => new Set(current).add(key));
  };

  const applyAll = (onlyChannel?: SocialChannel) => {
    for (const channel of onlyChannel ? [onlyChannel] : SOCIAL_CHANNELS) {
      for (const field of [...PROMOTION_VARIANTS, "hashtags"] as PromotionGeneratedField[]) {
        applyField(channel, field);
      }
    }
  };

  const rejectField = (channel: SocialChannel, field: PromotionGeneratedField) => {
    setRejected((current) => new Set(current).add(suggestionKey(channel, field)));
  };

  const undoGenerated = (channel: SocialChannel, field: PromotionGeneratedField) => {
    const key = suggestionKey(channel, field);
    if (!(key in undo)) return;
    setForms((current) => ({
      ...current,
      [channel]: {
        ...current[channel],
        [field]: undo[key],
        approvalState: "draft",
        approvedAt: null,
        origin: { ...current[channel].origin, [field]: "manual" }
      }
    }));
    setDirty((current) => new Set(current).add(channel));
    setUndo((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const generateAssets = async () => {
    setBusy("assets");
    setMessage(null);
    const result = await contentApi.generateSocialAssets(props.post.postId, {
      template: assetTemplate,
      headline: assetHeadline
    });
    setBusy(null);
    if (!result.ok) {
      setMessage({ tone: "error", text: result.message, problems: result.problems });
      return;
    }
    const generated = (result.data.assets ?? [])
      .map((value) => readAsset(value, props.post.postId))
      .filter((entry): entry is SocialComposerAsset => Boolean(entry));
    setAssets((current) => {
      const keys = new Set(generated.map((entry) => `${entry.template}:${entry.sizeKey}`));
      return [...current.filter((entry) => !keys.has(`${entry.template}:${entry.sizeKey}`)), ...generated];
    });
    setForms((current) => {
      const next = { ...current };
      for (const channel of SOCIAL_CHANNELS) {
        if (next[channel].socialAssetId) continue;
        const preferred = generated.find(
          (entry) => entry.sizeKey === PROMOTION_CHANNEL_REGISTRY[channel].preferredAsset
        );
        if (preferred) next[channel] = { ...next[channel], socialAssetId: preferred.socialAssetId };
      }
      return next;
    });
    setDirty((current) => new Set([...current, ...SOCIAL_CHANNELS]));
    setMessage({ tone: "ok", text: "Branded landscape, square, and portrait assets are ready.", problems: [] });
  };

  const exportJson = async () => {
    setBusy("export");
    setMessage(null);
    const result = await contentApi.exportPromotion(props.post.postId);
    setBusy(null);
    const payload = result.ok
      ? result.data
      : {
          _note: "LOCAL EXPORT. Save drafts to include canonical server links and assets.",
          _serverError: result.message,
          postId: props.post.postId,
          title: props.post.title,
          channels: SOCIAL_CHANNELS.map((channel) => payloadFor(channel))
        };
    downloadJson(`promotion-${props.post.slug}.json`, payload);
    setMessage(
      result.ok
        ? { tone: "ok", text: "Promotion package exported.", problems: [] }
        : { tone: "error", text: "A local copy was exported because the server package was unavailable.", problems: result.problems }
    );
  };

  const send = async () => {
    if (!props.commandCenter.connected || !props.canSend) return;
    setBusy("send");
    const result = await contentApi.sendPromotion(props.post.postId);
    setBusy(null);
    if (!result.ok) {
      setMessage({ tone: "error", text: result.message, problems: result.problems });
      return;
    }
    setMessage({
      tone: "ok",
      text: "The Command Center accepted the handoff. It owns scheduling and external delivery from here.",
      problems: []
    });
  };

  const eligibility = (channel: SocialChannel): string[] => {
    const entry = forms[channel];
    const channelRule = PROMOTION_CHANNEL_REGISTRY[channel];
    const problems: string[] = [];
    if (!entry.primaryCaption.trim()) problems.push("Primary copy is required.");
    for (const field of PROMOTION_VARIANTS) {
      if (entry[field].length > channelRule.limit) problems.push(`${channelRule.variantLabels[field]} is over the limit.`);
    }
    if (channelRule.assetRequired && !entry.socialAssetId) problems.push("A branded asset is required.");
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(entry.utmCampaign)) problems.push("UTM campaign is invalid.");
    if (requiresLegalReview(props.post.contentType, props.post.legalSensitive) && !props.post.legalApprovedAt) {
      problems.push("Article legal approval is required.");
    }
    if (issues.some((issue) => issue.severity === "blocker" && (issue.channel === channel || issue.channel === null))) {
      problems.push("Resolve source-grounding blockers.");
    }
    if (tokenize(entry.mentionTags).some((tag) => tag.startsWith("@"))) {
      problems.push("No verified social handle is saved for the selected mention.");
    }
    return [...new Set(problems)];
  };

  const approveCurrent = async () => {
    const problems = eligibility(active);
    if (problems.length) {
      setMessage({ tone: "error", text: `${rule.label} is not eligible for approval.`, problems });
      return;
    }
    if (dirty.has(active) && !(await saveChannels([active], "draft"))) return;
    await saveChannels([active], "approved");
  };

  const approveAll = async () => {
    const eligible = SOCIAL_CHANNELS.filter((channel) => eligibility(channel).length === 0);
    if (!eligible.length) {
      setMessage({ tone: "error", text: "No channels are currently eligible for approval.", problems: [] });
      return;
    }
    const dirtyEligible = eligible.filter((channel) => dirty.has(channel));
    if (dirtyEligible.length && !(await saveChannels(dirtyEligible, "draft"))) return;
    await saveChannels(eligible, "approved");
  };

  const readyCount = SOCIAL_CHANNELS.filter((channel) => eligibility(channel).length === 0).length;
  const pendingActive = ([...PROMOTION_VARIANTS, "hashtags"] as PromotionGeneratedField[]).filter(
    (field) => suggestionFor(active, field) !== null
  );
  const allEmpty = SOCIAL_CHANNELS.every((channel) => !forms[channel].primaryCaption.trim());
  const currentValue = form[variant];
  const currentSuggestion = suggestionFor(active, variant);
  const currentKey = suggestionKey(active, variant);

  const primaryAction = () => {
    if (allEmpty && !suggestions) {
      return { label: "Generate campaign", onClick: () => void runGeneration(), disabled: !props.canDraft };
    }
    if (pendingActive.length) {
      return { label: "Apply selected", onClick: () => applyAll(active), disabled: !props.canDraft };
    }
    if (dirty.has(active)) {
      return { label: "Save draft", onClick: () => void saveChannels([active], "draft"), disabled: !props.canDraft };
    }
    if (form.approvalState !== "approved") {
      return { label: "Approve current", onClick: () => void approveCurrent(), disabled: !props.canApprove };
    }
    return {
      label: "Send to Command Center",
      onClick: () => void send(),
      disabled: !props.commandCenter.connected || !props.canSend || staleChannels.has(active)
    };
  };
  const action = primaryAction();

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-[#FBFAF7] shadow-[0_20px_55px_rgba(15,31,92,0.08)]">
      <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="text-sm font-bold text-teal">Promotion Studio</p>
            <h2 className="mt-1 truncate text-2xl font-black tracking-tight text-navy">{props.post.title}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Pill>{props.post.destination === "expungement_ai" ? "Expungement.ai" : "LegalEase Partner"}</Pill>
              <Pill>{humanize(props.post.contentType)}</Pill>
              <Pill tone={props.post.status === "published" || props.post.status === "updated" ? "ok" : "neutral"}>
                {humanize(props.post.status)}
              </Pill>
              <span className="text-xs font-bold text-slate-600">{readyCount} of 7 channels ready</span>
              {anyStale && <Pill tone="warn">Campaign may be stale</Pill>}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Last generated: {generatedAt ? formatDateTime(generatedAt) : "Not generated in this session"}
              {articleDirty ? " · Save article changes before regenerating" : ` · Saved article v${props.post.version}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void runGeneration()}
              disabled={!props.canDraft || busy !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-navy-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {busy === "generate" ? "Generating…" : "Generate campaign"}
            </button>
            <button
              type="button"
              onClick={() => void runGeneration({ mode: "fill_empty" })}
              disabled={!props.canDraft || busy !== null}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-navy transition hover:border-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-50"
            >
              Fill empty fields
            </button>
            <details className="relative">
              <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-300 bg-white text-navy hover:border-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal" aria-label="More promotion actions">
                <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
              </summary>
              <div className="absolute right-0 z-30 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl">
                <button type="button" onClick={() => void exportJson()} className="w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-navy hover:bg-slate-50">
                  Export promotion package
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForms(formsFrom(props.drafts, props.post.slug));
                    setSuggestions(null);
                    setIssues([]);
                    setDirty(new Set());
                    setMessage({ tone: "info", text: "On-screen changes were reset to the last saved drafts.", problems: [] });
                  }}
                  className="w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  Reset on-screen changes
                </button>
              </div>
            </details>
          </div>
        </div>
      </header>

      {anyStale && (
        <div className="border-b border-amber-300 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900 md:px-7">
          Article changed after this campaign was drafted. Review or regenerate before sending.
        </div>
      )}

      <div className="grid min-w-0 lg:grid-cols-[240px_minmax(420px,1fr)_350px]">
        <aside className="border-b border-slate-200 bg-white lg:border-b-0 lg:border-r">
          <div className="flex max-w-full gap-2 overflow-x-auto p-3 lg:block lg:space-y-1 lg:overflow-visible lg:p-4">
            <button
              type="button"
              onClick={() => setMessage({ tone: "info", text: `${readyCount} channels are ready for approval.`, problems: [] })}
              className="min-w-36 rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 py-3 text-left lg:mb-3 lg:w-full"
            >
              <span className="block text-sm font-black text-navy">All channels</span>
              <span className="mt-1 block text-xs text-slate-500">{readyCount} ready · {staleChannels.size} stale</span>
            </button>
            {SOCIAL_CHANNELS.map((channel) => (
              <ChannelButton
                key={channel}
                channel={channel}
                active={active === channel}
                form={forms[channel]}
                stale={staleChannels.has(channel)}
                problems={eligibility(channel)}
                hasAsset={Boolean(forms[channel].socialAssetId)}
                onClick={() => setActive(channel)}
              />
            ))}
          </div>
        </aside>

        <main className="min-w-0 space-y-5 p-4 md:p-6">
          {!props.ai.configured && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
              <p className="text-sm font-bold text-amber-900">AI drafting not configured</p>
              <p className="mt-1 text-sm leading-6 text-amber-900">
                AI campaign drafting is not configured. You can continue drafting manually, generate branded assets, and export the promotion package.
              </p>
            </div>
          )}

          <CampaignBriefPanel brief={brief} post={props.post} disabled={!props.canDraft} onChange={setBrief} />

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 md:px-5">
              <div>
                <p className="text-xs font-bold text-teal">Copy editor</p>
                <h3 className="mt-0.5 text-lg font-black text-navy">{rule.label}</h3>
                <p className="mt-1 text-xs text-slate-500">{rule.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone={displayStatus(form, staleChannels.has(active), Boolean(suggestions)) === "Approved" ? "ok" : staleChannels.has(active) ? "warn" : "neutral"}>
                  {displayStatus(form, staleChannels.has(active), Boolean(suggestions))}
                </Pill>
                <button
                  type="button"
                  onClick={() => {
                    if (form.primaryCaption && !window.confirm(`Replace existing ${rule.label} suggestions? Saved copy will remain unchanged until you apply.`)) return;
                    void runGeneration({ mode: "regenerate_selected", channels: [active] });
                  }}
                  disabled={!props.canDraft || busy !== null}
                  className="rounded-lg border border-slate-300 p-2 text-navy hover:border-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-50"
                  aria-label={`Regenerate ${rule.label}`}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 pt-3" role="tablist" aria-label={`${rule.label} copy variants`}>
              {PROMOTION_VARIANTS.map((field) => (
                <button
                  key={field}
                  type="button"
                  role="tab"
                  aria-selected={variant === field}
                  onClick={() => setVariant(field)}
                  className={`whitespace-nowrap rounded-t-lg px-3 py-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal ${
                    variant === field ? "bg-navy text-white" : "text-slate-600 hover:bg-slate-50 hover:text-navy"
                  }`}
                >
                  {rule.variantLabels[field]}
                </button>
              ))}
            </div>

            <div className="space-y-4 p-4 md:p-5">
              {currentSuggestion !== null && (
                <div className="rounded-xl border border-teal bg-[#EAF8F7] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="inline-flex items-center gap-1.5 text-xs font-black text-[#006B65]">
                      <WandSparkles className="h-3.5 w-3.5" aria-hidden="true" /> Proposed change
                    </p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => rejectField(active, variant)} className="rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-white">Reject</button>
                      <button type="button" onClick={() => applyField(active, variant)} className="rounded-md bg-navy px-2.5 py-1.5 text-xs font-bold text-white hover:bg-navy-mid">Apply</button>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800">{currentSuggestion}</p>
                </div>
              )}

              <label className="block">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-navy">{rule.variantLabels[variant]}</span>
                  <span className={`text-xs font-bold tabular-nums ${currentValue.length > rule.limit ? "text-red-700" : "text-slate-500"}`}>
                    {currentValue.length.toLocaleString()} / {rule.limit.toLocaleString()}
                  </span>
                </span>
                <textarea
                  value={currentValue}
                  rows={active === "email" || active === "partner_kit" ? 9 : 7}
                  disabled={!props.canDraft}
                  onChange={(event) => updateForm(active, { [variant]: event.target.value }, variant)}
                  className={`mt-2 w-full resize-y rounded-xl border px-4 py-3 text-[15px] leading-7 text-slate-800 shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal ${
                    currentValue.length > rule.limit ? "border-red-400 bg-red-50" : "border-slate-300 bg-white"
                  }`}
                />
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => void runGeneration({ mode: "regenerate_selected", channels: [active], field: variant })} disabled={!props.canDraft || busy !== null} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-navy hover:border-navy disabled:opacity-50">
                  Regenerate
                </button>
                <button type="button" onClick={() => void runGeneration({ mode: "regenerate_selected", channels: [active], field: variant, shorten: true })} disabled={!props.canDraft || busy !== null} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-navy hover:border-navy disabled:opacity-50">
                  Shorten to limit
                </button>
                <label className="sr-only" htmlFor="promotion-tone">Change tone</label>
                <select id="promotion-tone" value={brief.tone} onChange={(event) => setBrief((current) => ({ ...current, tone: event.target.value as PromotionTone }))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
                  {PROMOTION_TONES.map((tone) => <option key={tone}>{tone}</option>)}
                </select>
                <button type="button" onClick={() => void navigator.clipboard.writeText(currentValue)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-navy hover:border-navy">
                  <Clipboard className="h-3.5 w-3.5" aria-hidden="true" /> Copy
                </button>
                <button type="button" onClick={() => undoGenerated(active, variant)} disabled={!(currentKey in undo)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-navy hover:border-navy disabled:opacity-40">
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Undo suggestion
                </button>
                <button
                  type="button"
                  onClick={() => setLocked((current) => toggleSet(current, currentKey))}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  {locked.has(currentKey) ? <Lock className="h-3.5 w-3.5" aria-hidden="true" /> : <Unlock className="h-3.5 w-3.5" aria-hidden="true" />}
                  {locked.has(currentKey) ? "Locked" : "Lock field"}
                </button>
              </div>
              <p className="text-xs font-semibold text-slate-500">
                {form.origin[variant] === "generated" ? "Generated suggestion applied" : form.origin[variant] === "manual" ? "Manually edited" : "Saved copy"}
              </p>
            </div>
          </section>

          <DistributionPanel
            channel={active}
            form={form}
            canonicalUrl={props.post.canonicalUrl}
            suggestions={suggestions}
            locked={locked.has(suggestionKey(active, "hashtags"))}
            onApplyHashtags={() => applyField(active, "hashtags")}
            onRejectHashtags={() => rejectField(active, "hashtags")}
            proposedHashtags={suggestionFor(active, "hashtags")}
            onChange={(patch, field) => updateForm(active, patch, field)}
            onReset={() => updateForm(active, defaultPromotionTracking(active, props.post.slug))}
          />

          <AssetStudio
            assets={assets}
            selectedId={form.socialAssetId}
            template={assetTemplate}
            headline={assetHeadline}
            busy={busy === "assets"}
            canDraft={props.canDraft}
            onTemplate={setAssetTemplate}
            onHeadline={setAssetHeadline}
            onGenerate={() => void generateAssets()}
            onSelect={(socialAssetId) => updateForm(active, { socialAssetId })}
          />

          {channelIssues.length > 0 && <ValidationPanel issues={channelIssues} />}

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-slate-100 p-2 text-slate-600"><PlugZap className="h-5 w-5" aria-hidden="true" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black text-navy">Command Center</h3>
                  <Pill tone={props.commandCenter.connected ? "ok" : "neutral"}>{props.commandCenter.connected ? "Connected" : "Not connected"}</Pill>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {props.commandCenter.connected
                    ? "Approved, current channels can be handed off for connected-account scheduling and publishing."
                    : "Drafting, approval, assets, and export are available. Connected-account scheduling and publishing will be enabled when the rebuilt Command Center is connected."}
                </p>
                {props.commandCenter.reason && !props.commandCenter.connected && <p className="mt-1 text-xs text-slate-500">{props.commandCenter.reason}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void exportJson()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-navy hover:border-navy">
                    <Download className="h-3.5 w-3.5" aria-hidden="true" /> Export promotion package
                  </button>
                  <a href="/internal/content/settings" className="rounded-lg px-3 py-2 text-xs font-bold text-navy underline">View integration details</a>
                </div>
              </div>
            </div>
          </section>

          {message && <MessagePanel message={message} />}
        </main>

        <aside className="border-t border-slate-200 bg-[#F4F7FA] p-4 lg:border-l lg:border-t-0 lg:p-5">
          <button type="button" onClick={() => setPreviewOpen((open) => !open)} className="flex w-full items-center justify-between text-left lg:pointer-events-none" aria-expanded={previewOpen}>
            <span>
              <span className="block text-xs font-bold text-teal">Live preview</span>
              <span className="mt-0.5 block text-base font-black text-navy">{rule.label}</span>
            </span>
            <ChevronDown className={`h-5 w-5 text-slate-500 transition lg:hidden ${previewOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {previewOpen && (
            <div className="mt-4 lg:sticky lg:top-5">
              <PreviewCard
                channel={active}
                form={form}
                variant={variant}
                asset={asset}
                trackedUrl={trackedUrl}
                cta={brief.cta}
                excerpt={props.post.excerpt}
                destination={props.post.destination}
              />
              {blockingIssues.length > 0 && (
                <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                  {blockingIssues.length} blocking review issue{blockingIssues.length === 1 ? "" : "s"}
                </p>
              )}
            </div>
          )}
        </aside>
      </div>

      <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-12px_30px_rgba(15,31,92,0.08)] backdrop-blur md:px-7">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void saveChannels([active], "draft")} disabled={!props.canDraft || busy !== null} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-navy hover:border-navy disabled:opacity-50">Save draft</button>
          <button type="button" onClick={() => void approveCurrent()} disabled={!props.canApprove || busy !== null} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-navy hover:border-navy disabled:opacity-50">Approve current</button>
          <button type="button" onClick={() => void approveAll()} disabled={!props.canApprove || busy !== null} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-navy hover:border-navy disabled:opacity-50">Approve all</button>
          {form.approvalState === "approved" && (
            <button type="button" onClick={() => void saveChannels([active], "draft")} disabled={!props.canDraft || busy !== null} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Return to draft</button>
          )}
          <button type="button" onClick={() => void exportJson()} disabled={busy !== null} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-navy hover:border-navy disabled:opacity-50"><Download className="h-3.5 w-3.5" aria-hidden="true" /> Export package</button>
          <button type="button" onClick={() => void send()} disabled={!props.commandCenter.connected || !props.canSend || anyStale || busy !== null} title={!props.commandCenter.connected ? "Command Center is not connected." : anyStale ? "Review and reapprove stale channels first." : "Send approved channels"} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-navy disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"><Send className="h-3.5 w-3.5" aria-hidden="true" /> Send to Command Center</button>
          <button type="button" onClick={action.onClick} disabled={action.disabled || busy !== null} className="ml-auto rounded-lg bg-navy px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-navy-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            {action.label}
          </button>
        </div>
      </div>
    </section>
  );
}

function CampaignBriefPanel({
  brief,
  post,
  disabled,
  onChange
}: {
  brief: CampaignBrief;
  post: SocialComposerProps["post"];
  disabled: boolean;
  onChange: (brief: CampaignBrief) => void;
}) {
  return (
    <details open className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-4 md:px-5">
        <span><span className="block text-xs font-bold text-teal">Campaign brief</span><span className="mt-0.5 block text-lg font-black text-navy">Review the strategy before drafting</span></span>
        <ChevronDown className="h-5 w-5 text-slate-500" aria-hidden="true" />
      </summary>
      <div className="grid gap-4 border-t border-slate-200 p-4 md:grid-cols-2 md:p-5">
        <SelectField label="Subject classification" value={brief.classification} disabled={disabled} options={PROMOTION_CLASSIFICATIONS} onChange={(value) => onChange({ ...brief, classification: value as PromotionClassification })} />
        <SelectField label="Campaign objective" value={brief.objective} disabled={disabled} options={PROMOTION_OBJECTIVES} onChange={(value) => onChange({ ...brief, objective: value as PromotionObjective })} />
        <TextField label="Primary audience" value={brief.primaryAudience} disabled={disabled} onChange={(value) => onChange({ ...brief, primaryAudience: value })} />
        <TextField label="Secondary audience" value={brief.secondaryAudience} disabled={disabled} onChange={(value) => onChange({ ...brief, secondaryAudience: value })} />
        <TextField label="Key message" value={brief.keyMessage} disabled={disabled} onChange={(value) => onChange({ ...brief, keyMessage: value })} multiline />
        <TextField label="CTA" value={brief.cta} disabled={disabled} onChange={(value) => onChange({ ...brief, cta: value })} />
        <SelectField label="Tone" value={brief.tone} disabled={disabled} options={PROMOTION_TONES} onChange={(value) => onChange({ ...brief, tone: value as PromotionTone })} />
        <TextField label="Supporting points (one per line)" value={brief.supportingPoints.join("\n")} disabled={disabled} onChange={(value) => onChange({ ...brief, supportingPoints: value.split("\n").map((point) => point.trim()).filter(Boolean).slice(0, 5) })} multiline />
        <div className="rounded-lg bg-[#F7F3EA] p-3 text-xs leading-5 text-slate-600 md:col-span-2">
          <strong className="text-navy">Source controls:</strong> {post.legalSensitive ? "Legally sensitive" : "Standard editorial"} · {post.jurisdictionCode ?? "No jurisdiction"} · {post.partnerSlug ?? "No partner"} · {post.authorName ?? "No author"}<br />
          Canonical URL: <span className="break-all font-mono">{post.canonicalUrl}</span>
        </div>
      </div>
    </details>
  );
}

function DistributionPanel({
  channel,
  form,
  canonicalUrl,
  suggestions,
  locked,
  proposedHashtags,
  onApplyHashtags,
  onRejectHashtags,
  onChange,
  onReset
}: {
  channel: SocialChannel;
  form: ChannelForm;
  canonicalUrl: string;
  suggestions: PromotionGenerationOutput | null;
  locked: boolean;
  proposedHashtags: string | null;
  onApplyHashtags: () => void;
  onRejectHashtags: () => void;
  onChange: (patch: Partial<ChannelForm>, field?: PromotionGeneratedField) => void;
  onReset: () => void;
}) {
  const candidates = suggestions?.channels[channel].mentionCandidates ?? [];
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-4 md:px-5">
        <h3 className="font-black text-navy">Distribution settings</h3>
        <p className="mt-1 text-xs text-slate-500">Hashtags, verified mentions, and deterministic tracking.</p>
      </div>
      <div className="space-y-4 p-4 md:p-5">
        {proposedHashtags !== null && !locked && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-teal bg-[#EAF8F7] px-3 py-2">
            <span className="text-sm font-semibold text-[#006B65]">{proposedHashtags || "No hashtags recommended"}</span>
            <span className="flex gap-2"><button type="button" onClick={onRejectHashtags} className="text-xs font-bold text-slate-600">Reject</button><button type="button" onClick={onApplyHashtags} className="rounded bg-navy px-2 py-1 text-xs font-bold text-white">Apply</button></span>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Hashtags" value={form.hashtags} disabled={false} onChange={(value) => onChange({ hashtags: value }, "hashtags")} placeholder="#RecordClearing #SecondChances" />
          <TextField label="Verified mention handles" value={form.mentionTags} disabled={false} onChange={(value) => onChange({ mentionTags: value })} placeholder="No verified handles saved" />
        </div>
        {candidates.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
            <strong>Mention candidates:</strong> {candidates.join(", ")}. Mention suggested, but no verified handle is saved.
          </div>
        )}
        <details className="rounded-lg border border-slate-200 bg-slate-50">
          <summary className="cursor-pointer px-3 py-2.5 text-sm font-bold text-navy">Tracking and distribution</summary>
          <div className="grid gap-3 border-t border-slate-200 p-3 md:grid-cols-3">
            <TextField label="UTM source" value={form.utmSource} disabled={false} onChange={(value) => onChange({ utmSource: value })} />
            <TextField label="UTM medium" value={form.utmMedium} disabled={false} onChange={(value) => onChange({ utmMedium: value })} />
            <TextField label="UTM campaign" value={form.utmCampaign} disabled={false} onChange={(value) => onChange({ utmCampaign: value })} />
            <p className="break-all rounded-md bg-white p-2 font-mono text-[11px] text-slate-600 md:col-span-3">{buildPromotionTrackedUrl(canonicalUrl, channel, form)}</p>
            <button type="button" onClick={onReset} className="w-fit text-xs font-bold text-navy underline">Reset to defaults</button>
          </div>
        </details>
      </div>
    </section>
  );
}

function AssetStudio({
  assets,
  selectedId,
  template,
  headline,
  busy,
  canDraft,
  onTemplate,
  onHeadline,
  onGenerate,
  onSelect
}: {
  assets: SocialComposerAsset[];
  selectedId: string;
  template: SocialTemplate;
  headline: string;
  busy: boolean;
  canDraft: boolean;
  onTemplate: (template: SocialTemplate) => void;
  onHeadline: (headline: string) => void;
  onGenerate: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 md:px-5">
        <div><h3 className="font-black text-navy">Creative assets</h3><p className="mt-1 text-xs text-slate-500">Deterministic LegalEase layouts—not AI-generated imagery.</p></div>
        <button type="button" onClick={onGenerate} disabled={!canDraft || busy} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><ImageIcon className="h-4 w-4" aria-hidden="true" /> {busy ? "Generating…" : "Generate branded assets"}</button>
      </div>
      <div className="space-y-4 p-4 md:p-5">
        <div className="grid gap-3 md:grid-cols-[220px_1fr]">
          <SelectField label="Template" value={template} disabled={!canDraft} options={SOCIAL_TEMPLATES} onChange={(value) => onTemplate(value as SocialTemplate)} humanizeOptions />
          <TextField label="Displayed headline" value={headline} disabled={!canDraft} onChange={onHeadline} />
        </div>
        {assets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Generate landscape, square, and portrait previews for this saved article.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {SOCIAL_ASSET_SIZES.map((size) => {
              const candidate = assets.find((item) => item.template === template && item.sizeKey === size.key) ?? assets.find((item) => item.sizeKey === size.key);
              if (!candidate) return <div key={size.key} className="rounded-lg border border-dashed border-slate-300 p-4 text-xs text-slate-500">No {size.key} asset</div>;
              return (
                <button key={candidate.socialAssetId} type="button" onClick={() => onSelect(candidate.socialAssetId)} className={`overflow-hidden rounded-xl border-2 bg-slate-100 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal ${selectedId === candidate.socialAssetId ? "border-teal" : "border-transparent hover:border-slate-300"}`}>
                  {candidate.previewUrl || candidate.imageUrl ? <Image src={candidate.previewUrl ?? candidate.imageUrl ?? ""} alt={`${humanize(candidate.sizeKey)} branded preview`} width={candidate.width} height={candidate.height} unoptimized className="h-36 w-full object-cover" /> : <div className="flex h-36 items-center justify-center text-slate-400"><ImageIcon className="h-6 w-6" aria-hidden="true" /></div>}
                  <span className="block px-3 py-2 text-xs font-bold text-navy">{assetSizeLabel(candidate.sizeKey)} · {candidate.width}×{candidate.height}{selectedId === candidate.socialAssetId ? " · Selected" : ""}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function PreviewCard({ channel, form, variant, asset, trackedUrl, cta, excerpt, destination }: { channel: SocialChannel; form: ChannelForm; variant: PromotionVariant; asset: SocialComposerAsset | null; trackedUrl: string; cta: string; excerpt: string | null; destination: ContentDestination }) {
  const rule = PROMOTION_CHANNEL_REGISTRY[channel];
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,31,92,0.12)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <span className="text-xs font-black text-navy">{rule.label} preview</span>
        <span className={`text-[11px] font-bold ${form[variant].length > rule.limit ? "text-red-700" : "text-emerald-700"}`}>{form[variant].length} / {rule.limit}</span>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-xs font-black text-white">LE</div><div><p className="text-sm font-bold text-slate-900">{destination === "expungement_ai" ? "Expungement.ai" : "LegalEase"}</p><p className="text-[11px] text-slate-500">Brand account placeholder</p></div></div>
        {channel === "email" && <div className="mt-4 rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Subject</p><p className="mt-1 font-bold text-navy">{form.primaryCaption || "Add a subject line"}</p><p className="mt-2 text-xs text-slate-500">Preheader: {excerpt || "Article excerpt will appear here."}</p></div>}
        {(asset?.previewUrl || asset?.imageUrl) && <Image src={asset.previewUrl ?? asset.imageUrl ?? ""} alt="Selected promotion asset" width={asset.width} height={asset.height} unoptimized className="mt-4 max-h-64 w-full rounded-lg object-cover" />}
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-800">{form[variant] || "Draft copy will appear here."}</p>
        {form.hashtags && <p className="mt-3 text-sm font-semibold text-[#00776F]">{form.hashtags}</p>}
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Tracked destination</p><p className="mt-1 break-all text-xs text-slate-600">{trackedUrl}</p><p className="mt-2 text-xs font-bold text-navy">{cta}</p></div>
      </div>
    </div>
  );
}

function ChannelButton({ channel, active, form, stale, problems, hasAsset, onClick }: { channel: SocialChannel; active: boolean; form: ChannelForm; stale: boolean; problems: string[]; hasAsset: boolean; onClick: () => void }) {
  const rule = PROMOTION_CHANNEL_REGISTRY[channel];
  const status = displayStatus(form, stale, false);
  const over = PROMOTION_VARIANTS.some((field) => form[field].length > rule.limit);
  return (
    <button type="button" onClick={onClick} className={`min-w-44 rounded-xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal lg:w-full ${active ? "border-navy bg-navy text-white shadow-sm" : "border-transparent bg-white text-navy hover:border-slate-300"}`}>
      <span className="flex items-center justify-between gap-2"><span className="text-sm font-black">{rule.label}</span>{form.approvalState === "approved" && !stale && <Check className="h-4 w-4 text-teal" aria-hidden="true" />}</span>
      <span className={`mt-1 block text-[11px] font-semibold ${active ? "text-white/75" : stale || over ? "text-amber-700" : "text-slate-500"}`}>{status}{over ? " · Over limit" : ""}</span>
      <span className={`mt-2 flex items-center gap-2 text-[10px] ${active ? "text-white/70" : "text-slate-400"}`}><span>{hasAsset ? "Asset ready" : "No asset"}</span><span>·</span><span>{problems.length ? `${problems.length} check${problems.length === 1 ? "" : "s"}` : "Complete"}</span></span>
    </button>
  );
}

function ValidationPanel({ issues }: { issues: PromotionGroundingIssue[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-black text-navy">Validation messages</h3>
      <ul className="mt-3 space-y-2">{issues.map((issue, index) => <li key={`${issue.code}-${index}`} className={`flex gap-2 rounded-lg border px-3 py-2 text-xs leading-5 ${issue.severity === "blocker" ? "border-red-300 bg-red-50 text-red-800" : "border-amber-300 bg-amber-50 text-amber-900"}`}><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span><strong>{issue.severity === "blocker" ? "Blocks approval: " : "Review: "}</strong>{issue.message}</span></li>)}</ul>
    </section>
  );
}

function MessagePanel({ message }: { message: StudioMessage }) {
  const styles = message.tone === "ok" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : message.tone === "error" ? "border-red-300 bg-red-50 text-red-800" : "border-sky-300 bg-sky-50 text-sky-900";
  return <div className={`rounded-xl border px-4 py-3 ${styles}`} role="status"><p className="flex items-center gap-2 text-sm font-bold">{message.tone === "ok" ? <Check className="h-4 w-4" aria-hidden="true" /> : message.tone === "error" ? <AlertTriangle className="h-4 w-4" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}{message.text}</p>{message.problems.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5">{message.problems.map((problem, index) => <li key={index} className="text-xs leading-5">{problem}</li>)}</ul>}</div>;
}

function TextField({ label, value, placeholder, disabled, multiline, onChange }: { label: string; value: string; placeholder?: string; disabled: boolean; multiline?: boolean; onChange: (value: string) => void }) {
  const classes = "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:bg-slate-100";
  return <label className="block"><span className="text-xs font-bold text-slate-600">{label}</span>{multiline ? <textarea value={value} rows={3} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={classes} /> : <input value={value} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={classes} />}</label>;
}

function SelectField({ label, value, options, disabled, humanizeOptions, onChange }: { label: string; value: string; options: readonly string[]; disabled: boolean; humanizeOptions?: boolean; onChange: (value: string) => void }) {
  return <label className="block"><span className="text-xs font-bold text-slate-600">{label}</span><select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:bg-slate-100">{options.map((option) => <option key={option} value={option}>{humanizeOptions ? humanize(option) : option}</option>)}</select></label>;
}

function displayStatus(form: ChannelForm, stale: boolean, hasSuggestions: boolean): string {
  if (stale) return "Stale";
  if (form.approvalState === "approved") return "Approved";
  if (form.approvalState === "sent") return "Sent";
  if (form.approvalState === "failed") return "Failed";
  if (hasSuggestions) return "Needs review";
  if (form.primaryCaption.trim()) return "Draft";
  return "Not generated";
}

function isStale(postUpdatedAt: string | null, draftUpdatedAt: string | null): boolean {
  if (!postUpdatedAt || !draftUpdatedAt) return false;
  const postTime = Date.parse(postUpdatedAt);
  const draftTime = Date.parse(draftUpdatedAt);
  return Number.isFinite(postTime) && Number.isFinite(draftTime) && postTime > draftTime;
}

function valueForField(form: ChannelForm, field: PromotionGeneratedField): string {
  return form[field];
}

function suggestionKey(channel: SocialChannel, field: PromotionGeneratedField): string {
  return `${channel}:${field}`;
}

function toggleSet(current: Set<string>, key: string): Set<string> {
  const next = new Set(current);
  if (next.has(key)) next.delete(key); else next.add(key);
  return next;
}

function tokenize(value: string): string[] {
  return value.split(/[\s,]+/).map((token) => token.trim()).filter(Boolean);
}

function readAsset(value: Record<string, unknown>, postId: string): SocialComposerAsset | null {
  const id = value.socialAssetId ?? value.social_asset_id;
  const sizeKey = value.sizeKey ?? value.size_key;
  const imageUrl = value.imageUrl ?? value.image_url;
  if (typeof id !== "string" || typeof sizeKey !== "string") return null;
  return {
    socialAssetId: id,
    template: typeof value.template === "string" ? value.template : "editorial_cover",
    sizeKey,
    width: typeof value.width === "number" ? value.width : 0,
    height: typeof value.height === "number" ? value.height : 0,
    imageUrl: typeof imageUrl === "string" ? imageUrl : null,
    previewUrl: privateAssetPreviewUrl(postId, String(value.template ?? "editorial_cover"), sizeKey),
    headline: typeof value.headline === "string" ? value.headline : null
  };
}

function privateAssetPreviewUrl(postId: string, template: string, sizeKey: string): string {
  const params = new URLSearchParams({ template, size: sizeKey });
  return `/api/internal/content/promotion/${postId}/assets/render?${params.toString()}`;
}

function assetSizeLabel(sizeKey: string): string {
  if (sizeKey === "og") return "Landscape";
  if (sizeKey === "square") return "Square";
  if (sizeKey === "portrait") return "Portrait";
  return humanize(sizeKey);
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
