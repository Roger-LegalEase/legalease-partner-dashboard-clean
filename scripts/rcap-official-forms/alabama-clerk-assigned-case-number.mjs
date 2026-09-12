/*
 * Alabama CR-65 and C-10-CRIMINAL repeat the new expungement matter's
 * clerk-assigned case-number box in each page caption.  That number is not the
 * underlying criminal docket number collected for the petition.  Keep this
 * allowlist tied to the pinned forms' document id, exported widget name, and
 * page so an unrelated field containing the words "case number" is never
 * swept into the exclusion.
 */
const CLERK_ASSIGNED_WIDGETS = new Set([
  "CR-65:1:Text1",
  "CR-65:2:Text4",
  "CR-65:3:Text7",
  "CR-65:4:Text5",
  "CR-65:5:Court Case Number",
  "CR-65:6:Court Case Number_2",
  "CR-65:7:Court Case Number_3",
  "CR-65:8:Court Case Number_4",
  "C-10-CRIMINAL:1:Court Case Number",
  "C-10-CRIMINAL:2:Court Case Number_2",
  "C-10-CRIMINAL:3:Court Case Number_3"
]);

export const ALABAMA_CLERK_ASSIGNED_CASE_NUMBER_LABEL = "Court Case Number (Assigned by Clerk)";

export function isAlabamaClerkAssignedCaseNumber({ documentId, fieldName, page }) {
  return CLERK_ASSIGNED_WIDGETS.has(`${documentId}:${page}:${fieldName}`);
}

export function classifyAlabamaClerkAssignedCaseNumber({ documentId, fieldName, page }) {
  if (!isAlabamaClerkAssignedCaseNumber({ documentId, fieldName, page })) return null;
  return {
    effectiveLabel: ALABAMA_CLERK_ASSIGNED_CASE_NUMBER_LABEL,
    reason: "The expungement case number is assigned by the clerk after filing; never copy the underlying criminal docket number here",
    refusalClass: "court_prosecutor_clerk_or_agency_owned",
    role: "clerk"
  };
}

export const ALABAMA_CLERK_ASSIGNED_CASE_NUMBER_WIDGETS = Object.freeze(
  [...CLERK_ASSIGNED_WIDGETS].sort()
);
