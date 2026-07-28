import all51 from "../../rcap-engine/compiled/all51.json";

type CompiledJurisdictionEntry = {
  jurisdiction?: {
    code?: string;
    name?: string;
    slug?: string;
  };
};

export type OnboardingJurisdiction = {
  code: string;
  name: string;
  slug: string;
};

export const ONBOARDING_JURISDICTIONS: readonly OnboardingJurisdiction[] =
  Object.entries(all51 as Record<string, CompiledJurisdictionEntry>)
    .map(([fallbackCode, entry]) => ({
      code: (entry.jurisdiction?.code ?? fallbackCode).trim().toUpperCase(),
      name: (entry.jurisdiction?.name ?? fallbackCode).trim(),
      slug: (entry.jurisdiction?.slug ?? fallbackCode.toLowerCase()).trim()
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

const JURISDICTION_CODE_BY_INPUT = new Map(
  ONBOARDING_JURISDICTIONS.flatMap((jurisdiction) =>
    [jurisdiction.code, jurisdiction.name, jurisdiction.slug].map(
      (value) => [value.toLowerCase(), jurisdiction.code] as const
    )
  )
);

export function canonicalOnboardingJurisdiction(
  value: string
): string | null {
  return JURISDICTION_CODE_BY_INPUT.get(value.trim().toLowerCase()) ?? null;
}
