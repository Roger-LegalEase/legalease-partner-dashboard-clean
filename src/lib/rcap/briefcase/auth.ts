export type RcapBriefcaseAuthState = {
  isAuthenticated: boolean;
  userId?: string;
  mode: "placeholder";
};

export function getRcapBriefcaseAuthState(): RcapBriefcaseAuthState {
  return {
    isAuthenticated: false,
    mode: "placeholder"
  };
}
