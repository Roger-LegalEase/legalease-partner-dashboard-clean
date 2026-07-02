import "server-only";

import { redirect } from "next/navigation";
import { getRcapBriefcaseAuthState, type RcapBriefcaseAuthState } from "@/lib/rcap/briefcase/auth";

export type ConsumerBriefcaseSession = RcapBriefcaseAuthState & {
  isAuthenticated: true;
  userId: string;
};

export async function requireConsumerBriefcaseSession(nextPath?: string): Promise<ConsumerBriefcaseSession> {
  const auth = await getRcapBriefcaseAuthState();

  if (!auth.isAuthenticated) {
    const next = nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/briefcase";
    redirect(`/expungement-ai/sign-in?mode=create&next=${encodeURIComponent(next)}`);
  }

  return auth as ConsumerBriefcaseSession;
}
