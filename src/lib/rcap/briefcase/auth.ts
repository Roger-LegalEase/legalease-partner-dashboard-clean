export type RcapBriefcaseAuthState = {
  isAuthenticated: boolean;
  userId?: string;
  userEmail?: string;
  mode: "supabase";
};

export async function getRcapBriefcaseAuthState(): Promise<RcapBriefcaseAuthState> {
  const { getServerAuthState } = await import("@/lib/supabase/auth-server");
  const auth = await getServerAuthState();

  if (!auth.isAuthenticated) {
    return {
      isAuthenticated: false,
      mode: "supabase"
    };
  }

  return {
    isAuthenticated: true,
    userId: auth.userId,
    userEmail: auth.email,
    mode: "supabase"
  };
}
