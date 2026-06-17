import "server-only";

import { redirect } from "next/navigation";
import { getRcapBriefcaseAuthState, type RcapBriefcaseAuthState } from "@/lib/rcap/briefcase/auth";

export type ConsumerBriefcaseSession = RcapBriefcaseAuthState & {
  isAuthenticated: true;
  userId: string;
};

export async function requireConsumerBriefcaseSession(): Promise<ConsumerBriefcaseSession> {
  const auth = await getRcapBriefcaseAuthState();

  if (!auth.isAuthenticated) {
    redirect("/expungement-ai/sign-in");
  }

  return auth as ConsumerBriefcaseSession;
}
