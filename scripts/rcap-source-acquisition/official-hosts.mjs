// The issuing bodies, per jurisdiction.
//
// One table, used by the generator that decides which recorded URL belongs to
// which asset AND by the acquisition script that decides which document linked
// from a page it is entitled to fetch. Two copies of this list would drift, and
// the failure that drift produces is silent: a form resolved from a host the
// generator would have refused still renders, still overlays, still packets.
//
// A host that is not here is not this jurisdiction's official source, however
// plausible it looks. Adding one is a reviewed commit, not a dispatch-time
// argument.
export const OFFICIAL_HOSTS_BY_JURISDICTION = {
  AK: ["public.courts.alaska.gov", "courts.alaska.gov", "www.courts.alaska.gov"],
  AL: ["judicial.alabama.gov", "www.alacourt.gov", "alacourt.gov", "paroles.alabama.gov"],
  AR: ["www.arcourts.gov", "arcourts.gov", "courts.arkansas.gov", "www.courts.arkansas.gov"],
  KY: ["www.kycourts.gov", "kycourts.gov"],
  NC: ["www.nccourts.gov", "nccourts.gov"],
  NE: ["nebraskajudicial.gov", "www.nebraskajudicial.gov", "supremecourt.nebraska.gov"],
  VA: ["www.vacourts.gov", "vacourts.gov"],
  VT: ["www.vtcourts.gov", "vtcourts.gov"],
  WI: ["www.wicourts.gov", "wicourts.gov", "www.wisdoj.gov", "wisdoj.gov"]
};
