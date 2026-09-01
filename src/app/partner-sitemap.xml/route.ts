import { productionPartnerAppUrl } from "@/lib/app-url";
import { listAuthoritativelyPublicPartnerSlugs } from "@/lib/partners/public-partner-page";

export const dynamic = "force-dynamic";

export async function GET() {
  const slugs = await listAuthoritativelyPublicPartnerSlugs();
  const urls = slugs
    .map((slug) => `  <url><loc>${escapeXml(`${productionPartnerAppUrl}/p/${slug}`)}</loc></url>`)
    .join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=300",
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;"
  })[character] ?? character);
}
