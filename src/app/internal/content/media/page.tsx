import MediaLibrary from "@/components/content/admin/MediaLibrary";
import { ContentDenied } from "@/components/content/admin/ContentDenied";
import { resolveContentPageAccess } from "@/lib/content/auth";
import { isContentStorageConfigured, listCmsMedia } from "@/lib/content/cms-queries";
import { roleHasCapability } from "@/lib/content/types";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  // GATE FIRST.
  const access = await resolveContentPageAccess("/internal/content/media");

  if (access.kind === "denied") {
    return <ContentDenied title={access.title} body={access.body} />;
  }

  const assets = await listCmsMedia();
  const configured = isContentStorageConfigured();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black text-navy">Media library</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          Alt text and permission status are not paperwork — they are the publication gate. An image
          with no alt text, or one whose rights we cannot account for, is blocked from publication
          rather than warned about.
        </p>
      </header>

      <MediaLibrary
        storageConfigured={configured}
        canUpload={roleHasCapability(access.session.role, "media.upload")}
        canManage={roleHasCapability(access.session.role, "media.manage")}
        assets={assets.map((asset) => ({
          mediaId: asset.mediaId,
          publicUrl: asset.publicUrl,
          mimeType: asset.mimeType,
          byteSize: asset.byteSize,
          width: asset.width,
          height: asset.height,
          altText: asset.altText,
          caption: asset.caption,
          credit: asset.credit,
          sourceInfo: asset.sourceInfo,
          permissionStatus: asset.permissionStatus,
          archived: asset.archived,
          createdAt: asset.createdAt,
          usageCount: asset.usageCount
        }))}
      />
    </div>
  );
}
