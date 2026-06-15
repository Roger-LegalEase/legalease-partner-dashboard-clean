// Maryland filing workflow. Sourced from the Maryland Wilma Agent Training
// Reference (Nationwide Record Clearing), sections 12 (filing workflow) and 14
// (record request). Maryland uses mandatory official Judiciary forms; this pack
// does not wire a renderer and is shadow-only research.
export const mdFilingInstructions = [
  "Classify the route before building a packet: adult non-conviction (§ 10-105), automatic / early-favorable (§ 10-105.1, Form 072C), police-record (§ 10-103, Form DC-CR-071), eligible conviction (§ 10-110), cannabis (Form 072D), Second Chance Act shielding (Form CC-DC-CR-148), or juvenile (separate process). Screen the unit rule on every route.",
  "Get the full case record and every charge disposition. The Maryland Judiciary Case Search gives case numbers and basic dispositions but is only a summary and should not be used as a background check; the full case file is at the clerk's office, and fingerprint-supported criminal history comes from Maryland DPSCS/CJIS.",
  "Identify the court where the proceeding began, was transferred, or was appealed. Petitions are generally filed in the court that heard or finally resolved the case, and separate courts require separate petitions; file via MDEC where applicable.",
  "Pick the correct official form: CC-DC-CR-072A (non-conviction), CC-DC-CR-072B (eligible guilty disposition, non-cannabis), CC-DC-CR-072C (early all-favorable filing), or CC-DC-CR-072D (cannabis). Add CC-DC-CR-078 General Waiver and Release if filing early for an acquittal, dismissal, or nolle prosequi within 3 years.",
  "Use broad language requesting expungement of all police records, court records, and other Maryland State or local records related to the charge.",
  "After filing: the court serves the State's Attorney; for conviction expungement the court also notifies listed victims; wait for the 30-day objection period; if no objection the court may enter the order; if there is an objection, attend the hearing. Keep the order and the compliance certificates because case records may be unavailable after expungement.",
  "Police-record expungement: start with the law-enforcement agency. If the agency denies the request or does not act after more than 60 days, file Form DC-CR-071 in court to ask the court to expunge the police record.",
  "Juvenile expungement is a separate process filed in the court where the juvenile petition or citation was filed (or the court to which the case was transferred), governed by Cts. & Jud. Proc. § 3-8A-27.1 and Md. Rule 11-506, with no filing fee."
];
