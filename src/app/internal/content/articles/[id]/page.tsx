import Link from "next/link";

import ArticleEditor from "@/components/content/admin/ArticleEditor";
import SocialComposer from "@/components/content/admin/SocialComposer";
import WorkflowBar from "@/components/content/admin/WorkflowBar";
import { ContentDenied } from "@/components/content/admin/ContentDenied";
import { EmptyState, Panel, StatusPill, humanize } from "@/components/content/admin/primitives";
import { resolveContentPageAccess } from "@/lib/content/auth";
import {
  getCmsPost,
  isContentStorageConfigured,
  listPostVersions,
  listSocialAssets,
  listSocialDrafts
} from "@/lib/content/cms-queries";
import { getCommandCenterConfig } from "@/lib/content/command-center";
import { promotionAiConfig } from "@/lib/content/promotion-generation";
import { canonicalUrlForPost } from "@/lib/content/promotion-package";
import { roleHasCapability } from "@/lib/content/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

const UNCONFIGURED_REASONS: Record<string, string> = {
  disabled: "COMMAND_CENTER_CONTENT_EVENTS_ENABLED is not set to true in this environment.",
  missing_endpoint: "COMMAND_CENTER_CONTENT_EVENTS_ENDPOINT is not set.",
  missing_secret: "COMMAND_CENTER_CONTENT_SIGNING_SECRET is not set."
};

export default async function ArticleEditorPage({ params }: { params: Params }) {
  // GATE FIRST. The post id is not even resolved until the caller is authorized.
  const access = await resolveContentPageAccess("/internal/content/articles");

  if (access.kind === "denied") {
    return <ContentDenied title={access.title} body={access.body} />;
  }

  const { id } = await params;
  const post = await getCmsPost(id);

  if (!post || (access.session.partnerSlug && access.session.partnerSlug !== post.partnerSlug)) {
    return (
      <div className="space-y-4">
        <Link href="/internal/content/articles" className="text-xs font-bold text-navy underline">
          ← Articles
        </Link>
        <Panel title="Article not found">
          <EmptyState
            message={
              isContentStorageConfigured()
                ? "No article with that id."
                : "Content storage is not configured in this environment, so no article can be loaded."
            }
          />
        </Panel>
      </div>
    );
  }

  const [versions, drafts, assets] = await Promise.all([
    listPostVersions(post.postId),
    listSocialDrafts(post.postId),
    listSocialAssets(post.postId)
  ]);

  const role = access.session.role;
  const canEdit =
    roleHasCapability(role, "content.edit_any") || roleHasCapability(role, "content.edit_own");
  const commandCenter = getCommandCenterConfig();
  const promotionAi = promotionAiConfig();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/internal/content/articles" className="text-xs font-bold text-navy underline">
            ← Articles
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="truncate text-2xl font-black text-navy">{post.title || "Untitled"}</h1>
            <StatusPill status={post.status} />
          </div>
          <p className="mt-1 font-mono text-xs text-slate-400">
            /{post.slug} · {humanize(post.contentType)} ·{" "}
            {post.destination === "expungement_ai" ? "Expungement.ai" : "Partner site"} · v{post.version}
          </p>
        </div>
      </header>

      <WorkflowBar
        postId={post.postId}
        status={post.status}
        contentType={post.contentType}
        legalSensitive={post.legalSensitive}
        legalApprovedAt={post.legalApprovedAt}
        scheduledFor={post.scheduledFor}
        role={role}
      />

      <ArticleEditor
        postId={post.postId}
        initialDoc={post.doc}
        initialTitle={post.title}
        initialSubtitle={post.subtitle}
        initialExcerpt={post.excerpt}
        initialSeoTitle={post.seoTitle}
        initialSeoDescription={post.seoDescription}
        initialVersion={post.version}
        initialVersions={versions.map((version) => ({
          version: version.version,
          title: version.title,
          status: version.status,
          note: version.note,
          createdAt: version.createdAt
        }))}
        canEdit={canEdit}
        canRestore={roleHasCapability(role, "content.restore_version")}
      />

      <SocialComposer
        post={{
          postId: post.postId,
          title: post.title,
          subtitle: post.subtitle,
          excerpt: post.excerpt,
          slug: post.slug,
          destination: post.destination,
          contentType: post.contentType,
          status: post.status,
          legalSensitive: post.legalSensitive,
          legalApprovedAt: post.legalApprovedAt,
          jurisdictionCode: post.jurisdictionCode,
          partnerSlug: post.partnerSlug,
          authorName: post.authorName,
          canonicalUrl: canonicalUrlForPost({
            slug: post.slug,
            destination: post.destination,
            content_type: post.contentType,
            canonical_url: post.canonicalUrl
          }),
          updatedAt: post.updatedAt,
          version: post.version
        }}
        drafts={drafts.map((draft) => ({
          channel: draft.channel,
          primaryCaption: draft.primaryCaption,
          alternateCaption: draft.alternateCaption,
          founderVoiceCaption: draft.founderVoiceCaption,
          partnerCaption: draft.partnerCaption,
          hashtags: draft.hashtags,
          mentionTags: draft.mentionTags,
          utmSource: draft.utmSource,
          utmMedium: draft.utmMedium,
          utmCampaign: draft.utmCampaign,
          socialAssetId: draft.socialAssetId,
          approvalState: draft.approvalState,
          approvedAt: draft.approvedAt,
          updatedAt: draft.updatedAt
        }))}
        assets={assets.map((asset) => ({
          socialAssetId: asset.socialAssetId,
          template: asset.template,
          sizeKey: asset.sizeKey,
          width: asset.width,
          height: asset.height,
          imageUrl: asset.imageUrl,
          previewUrl: `/api/internal/content/promotion/${post.postId}/assets/render?${new URLSearchParams({
            template: asset.template,
            size: asset.sizeKey
          }).toString()}`,
          headline: asset.headline
        }))}
        commandCenter={{
          connected: commandCenter.configured,
          reason: commandCenter.configured ? null : UNCONFIGURED_REASONS[commandCenter.reason] ?? null
        }}
        ai={{
          configured: promotionAi.configured,
          reason: promotionAi.configured ? null : promotionAi.reason
        }}
        canDraft={roleHasCapability(role, "social.draft")}
        canApprove={roleHasCapability(role, "social.approve")}
        canSend={roleHasCapability(role, "social.send")}
      />
    </div>
  );
}
