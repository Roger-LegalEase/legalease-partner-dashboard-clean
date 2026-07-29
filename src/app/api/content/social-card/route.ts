import { ImageResponse } from "next/og";

import { denyUnlessContentCapability } from "@/lib/content/auth";
import { jsonError } from "@/lib/content/route-support";
import { buildSocialCardElement } from "@/lib/content/social-card";
import {
  CONTENT_DESTINATIONS,
  SOCIAL_ASSET_SIZES,
  type ContentDestination,
  type SocialAssetSizeKey,
  type SocialTemplate,
  isSocialTemplate
} from "@/lib/content/types";
import { getSafeRequestId } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/content/social-card";

function sizeFor(key: string | null): { width: number; height: number } | null {
  const size = SOCIAL_ASSET_SIZES.find((candidate) => candidate.key === (key ?? "og"));
  return size ? { width: size.width, height: size.height } : null;
}

/**
 * The CMS preview renderer for branded social graphics.
 *
 * AUTHENTICATED ON PURPOSE: this renders whatever title it is handed, including an unpublished
 * draft's. An open version of this endpoint would leak draft headlines to anyone who could guess a
 * query string, so it requires a content session and answers 401/403 otherwise.
 */
export async function GET(request: Request) {
  const requestId = getSafeRequestId(request);

  const gate = await denyUnlessContentCapability("content.read", ROUTE, requestId);
  if (gate.denied) return gate.denied;

  const params = new URL(request.url).searchParams;

  const template = params.get("template") ?? "editorial_cover";
  if (!isSocialTemplate(template)) {
    return jsonError(400, "Unknown social template.");
  }

  const destination = params.get("destination") ?? "expungement_ai";
  if (!(CONTENT_DESTINATIONS as readonly string[]).includes(destination)) {
    return jsonError(400, "Unknown destination.");
  }

  const sizeKey = (params.get("size") ?? "og") as SocialAssetSizeKey;
  const size = sizeFor(sizeKey);
  if (!size) {
    return jsonError(400, "Unknown size. Use og, square, or portrait.");
  }

  const title = params.get("title")?.trim();
  if (!title) {
    return jsonError(400, "A title is required.");
  }

  const element = buildSocialCardElement({
    template: template as SocialTemplate,
    destination: destination as ContentDestination,
    width: size.width,
    height: size.height,
    title,
    subtitle: params.get("subtitle"),
    eyebrow: params.get("eyebrow"),
    attribution: params.get("attribution"),
    stateCode: params.get("stateCode")
  });

  return new ImageResponse(element, {
    width: size.width,
    height: size.height,
    headers: {
      // A draft headline must never be cached by a shared cache.
      "cache-control": "private, no-store"
    }
  });
}
