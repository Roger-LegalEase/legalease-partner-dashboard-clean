import type { MississippiPathway } from "./pathways";

export type MississippiCourtType = "Circuit Court" | "County Court" | "Justice Court" | "Municipal Court" | "Unknown";

export function getMississippiCountyCourtInstructions({
  county,
  courtType,
  pathway
}: {
  county?: string;
  courtType?: string;
  pathway: MississippiPathway;
}) {
  const normalizedCourtType = normalizeCourtType(courtType);
  const instructions = [
    county
      ? `Use ${county} County as the starting point for checking the court of origin.`
      : "Confirm the county where the charge started before filing.",
    `Confirm whether the case belongs in ${normalizedCourtType === "Unknown" ? "the correct court of origin" : normalizedCourtType}.`,
    courtTypeInstruction(normalizedCourtType),
    "Ask the clerk what copies, account sheets, certified dispositions, or local cover pages are required.",
    "Do not rely on this tool for clerk addresses or county-specific fees unless those details have been separately verified."
  ];

  if (pathway === "felony_conviction") {
    instructions.push("For a felony conviction petition, confirm district attorney notice before any hearing.");
  }

  if (pathway === "misdemeanor_conviction" || pathway === "felony_conviction") {
    instructions.push("For conviction petitions, check whether the court wants proof that fines, fees, court costs, and restitution are paid.");
  }

  instructions.push("After a judge signs an order, confirm who sends copies to agencies that maintain the record.");
  instructions.push("Verify current law and local procedure before filing.");

  return instructions;
}

function normalizeCourtType(courtType?: string): MississippiCourtType {
  const value = courtType?.toLowerCase() ?? "";
  if (value.includes("circuit")) return "Circuit Court";
  if (value.includes("county")) return "County Court";
  if (value.includes("justice")) return "Justice Court";
  if (value.includes("municipal")) return "Municipal Court";
  return "Unknown";
}

function courtTypeInstruction(courtType: MississippiCourtType) {
  if (courtType === "Circuit Court") {
    return "Circuit Court commonly handles felony matters and some expungement petitions tied to circuit cases.";
  }
  if (courtType === "County Court") {
    return "County Court practices can vary by county, so confirm the clerk's preferred filing steps.";
  }
  if (courtType === "Justice Court") {
    return "Justice Court matters may have local filing practices for misdemeanor or lower-level cases.";
  }
  if (courtType === "Municipal Court") {
    return "Municipal Court matters may have city-specific clerk practices that should be confirmed.";
  }
  return "Court type matters. If you are not sure, a record review or clerk check may help identify the right court.";
}
