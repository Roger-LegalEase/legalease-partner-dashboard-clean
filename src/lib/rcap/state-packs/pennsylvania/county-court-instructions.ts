export function getPennsylvaniaCountyCourtInstructions({ county }: { county?: string }) {
  const countyLabel = county?.trim() || "[county to confirm]";
  return [
    `Court: Court of Common Pleas in ${countyLabel} County, where the case was heard.`,
    "Use the docket, OTN, arresting agency, judge, charge rows, disposition, and payment/restitution information from the PATCH report and court records.",
    "Serve the attorney for the Commonwealth / District Attorney and keep proof of service with the packet.",
    "Ask the Clerk of Courts about current county filing fees and fee waiver / in forma pauperis options."
  ];
}
