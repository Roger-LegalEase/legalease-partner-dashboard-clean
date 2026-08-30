import "server-only";

import { redirect } from "next/navigation";
import { getRcapBriefcaseAuthState, type RcapBriefcaseAuthState } from "@/lib/rcap/briefcase/auth";
import { isParticipantAccountBlocked } from "@/lib/expungement-ai/privacy/account-status";

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

  // A frozen or erased account is not a signed-in account, whatever its token
  // still says. This is what makes "the deleted account cannot sign in" true
  // for a token minted before the revocation, and for a restored backup.
  if (await isParticipantAccountBlocked(auth.userId as string)) {
    redirect("/expungement-ai/sign-in?accountDeleted=1");
  }

  return auth as ConsumerBriefcaseSession;
}
