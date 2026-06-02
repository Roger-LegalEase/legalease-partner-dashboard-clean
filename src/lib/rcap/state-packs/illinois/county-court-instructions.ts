import type { IllinoisRemedyType } from "./pathways";

export function getIllinoisCountyCourtInstructions({
  county,
  cookCountyDistrict,
  remedyType,
  hasFeeBarrier
}: {
  county?: string;
  cookCountyDistrict?: string;
  remedyType: IllinoisRemedyType;
  hasFeeBarrier?: boolean;
}) {
  const instructions = [
    county ? `Start with the Circuit Court in ${county} County.` : "Confirm the Illinois county where the arrest or charge happened.",
    "Confirm the clerk's filing method, required copies, and whether local cover sheets are needed.",
    remedyType === "sealing"
      ? "For sealing, remember that the record may be hidden from most public searches but not erased for every government or law-enforcement purpose."
      : "For expungement, confirm that the case path is one Illinois treats as an expungement request.",
    "Do not rely on this tool for clerk addresses, e-filing steps, or county-specific fees unless those details are separately verified."
  ];

  if (county?.toLowerCase() === "cook") {
    instructions.push(cookCountyDistrict ? `Cook County district noted: ${cookCountyDistrict}. Confirm whether the district affects where or how the filing is handled.` : "Cook County can have district and local fee/practice quirks. Confirm the district with the clerk if you know it.");
  }

  if (hasFeeBarrier) {
    instructions.push("Ask the clerk about the fee waiver application if filing costs may be hard to pay.");
  }

  instructions.push("Verify current law, Clean Slate timing, and local procedure before filing.");
  return instructions;
}
