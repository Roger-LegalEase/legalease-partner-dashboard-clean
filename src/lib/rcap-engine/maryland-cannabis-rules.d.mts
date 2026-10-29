export const MD_CANNABIS_REVIEWED_THROUGH: string;
export function validateMdCannabis(input: unknown): {
  facts: Record<string, unknown>;
  missing: Array<{factId: string; label: string; why: string; requiredBeforeFiling: boolean}>;
  earliest: string | null;
  mayMarkBasis: boolean;
  requested: unknown[];
  others: unknown[];
};
export const ROUTE: string;
export const BASIS: Record<string,unknown>;
export function validateMdCostRequest(facts: unknown, need: (key: string, expected: unknown, label?: string)=>void): void;
