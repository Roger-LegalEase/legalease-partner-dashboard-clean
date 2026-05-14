import { NextResponse } from "next/server";
import type { AppUser } from "@/lib/auth";
import { createEnvWilmaLaunchBackend, type WilmaLaunchBackend } from "@/wilma/adapters/launchBackend";
import { evaluateWilmaLaunchAccess, toPublicWilmaLaunchConfig } from "@/wilma/launch/evaluateLaunchAccess";

type WilmaConfigRouteDependencies = {
  launchBackend?: WilmaLaunchBackend;
  currentUser?: () => Promise<AppUser | null>;
};

export function createWilmaConfigRouteHandler(dependencies: WilmaConfigRouteDependencies = {}) {
  return async function GET(request: Request) {
    const launchBackend = dependencies.launchBackend ?? createEnvWilmaLaunchBackend();
    const currentUserResolver = dependencies.currentUser ?? (await import("@/lib/auth")).currentUser;
    const user = await currentUserResolver();
    const url = new URL(request.url);
    const config = await launchBackend.getLaunchConfig();
    const decision = evaluateWilmaLaunchAccess(config, {
      state: normalizeState(url.searchParams.get("state")),
      email: url.searchParams.get("email"),
      betaToken: url.searchParams.get("betaToken") ?? request.headers.get("x-wilma-beta-token"),
      anonymousId: url.searchParams.get("anonymousId"),
      deviceId: request.headers.get("x-legalease-device-id"),
      remoteIp: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip"),
      user
    });

    return NextResponse.json(toPublicWilmaLaunchConfig(decision), { status: 200 });
  };
}

export const GET = createWilmaConfigRouteHandler();

function normalizeState(value: string | null): string | undefined {
  return value?.trim().toUpperCase() || undefined;
}
