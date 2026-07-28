import { getPartnerPackage } from "../packages";

export type RecordShieldScope = {
  inScope: boolean;
  source: "selected_partner_package" | "unavailable";
};

/**
 * partner_records.selected_package_id is populated by the existing checkout /
 * paid-provisioning flow. The existing package registry owns the components in
 * that selected package. Unknown or absent package IDs fail closed.
 */
export function deriveRecordShieldScope(
  selectedPackageId: string | null | undefined
): RecordShieldScope {
  const normalizedPackageId = selectedPackageId?.trim() ?? "";
  if (!normalizedPackageId) {
    return { inScope: false, source: "unavailable" };
  }

  const selectedPackage = getPartnerPackage(normalizedPackageId);
  const inScope =
    selectedPackage?.includedComponents.some(
      (component) =>
        component.trim().toLocaleLowerCase("en-US") === "recordshield"
    ) === true;

  return {
    inScope,
    source: inScope ? "selected_partner_package" : "unavailable"
  };
}
