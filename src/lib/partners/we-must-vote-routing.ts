export function shouldUseStaticWeMustVoteLanding(pathname: string, hostHeader: string | null) {
  if (pathname !== "/p/we-must-vote") return false;

  const host = (hostHeader ?? "").split(":")[0]?.toLowerCase() ?? "";
  return host === "legaleasepartner.com" || host === "www.legaleasepartner.com";
}
