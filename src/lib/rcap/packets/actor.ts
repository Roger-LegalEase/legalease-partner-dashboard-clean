import "server-only";

// Resolves who is asking. Production uses the real consumer session. A header
// identity exists only for the technical acceptance harness and is refused
// unless technical fixtures are explicitly enabled outside production, so it
// can never become a production authentication bypass.

import { technicalFixturesEnabled } from "@/lib/rcap/packets/resolve";

export const TEST_ACTOR_HEADER = "x-rcap-technical-actor";

export type PacketActor = { ownerId: string; source: "session" | "technical_fixture" };

export async function resolvePacketActor(request: Request): Promise<PacketActor | null> {
  if (technicalFixturesEnabled()) {
    const headerActor = request.headers.get(TEST_ACTOR_HEADER)?.trim();
    if (headerActor) return { ownerId: headerActor, source: "technical_fixture" };
  }

  try {
    const { getRcapBriefcaseAuthState } = await import("@/lib/rcap/briefcase/auth");
    const auth = await getRcapBriefcaseAuthState();
    if (auth.isAuthenticated && auth.userId) {
      return { ownerId: auth.userId, source: "session" };
    }
  } catch {
    // An unreadable session is not an identity.
  }

  return null;
}
