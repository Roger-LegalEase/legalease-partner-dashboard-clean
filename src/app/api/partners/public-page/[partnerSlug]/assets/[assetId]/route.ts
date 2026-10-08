import { getApprovedPublicPageConfiguration, visiblePublicPageAssetIds } from "@/lib/partners/onboarding/public-page-configuration";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ONBOARDING_STORAGE_BUCKET } from "@/lib/partners/onboarding/storage";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: {params: Promise<{partnerSlug:string;assetId:string}>}) {
  const { partnerSlug, assetId } = await params;
  const missing = () => new Response("Not found", {status:404,headers:{"cache-control":"no-store"}});
  if (!/^[0-9a-f-]{36}$/i.test(assetId)) return missing();
  const config = await getApprovedPublicPageConfiguration(partnerSlug);
  if (!config || !visiblePublicPageAssetIds(config.preview).includes(assetId)) return missing();
  const admin = getSupabaseAdminClient();
  if (!admin) return missing();
  const asset = await admin.from("partner_onboarding_assets").select("object_path, media_type")
    .eq("workspace_id", config.workspaceId).eq("id", assetId).eq("review_status", "approved")
    .eq("lifecycle_status", "active").is("deleted_at",null).maybeSingle();
  if (asset.error || !asset.data || !["image/png","image/jpeg","image/webp"].includes(asset.data.media_type)) return missing();
  const download = await admin.storage.from(ONBOARDING_STORAGE_BUCKET).download(asset.data.object_path);
  if(download.error || !download.data || download.data.size > 10*1024*1024) return missing();
  return new Response(await download.data.arrayBuffer(), {headers:{"content-type":asset.data.media_type,"cache-control":"no-store","x-content-type-options":"nosniff"}});
}
