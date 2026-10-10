import "server-only";
import { Phase1OnboardingError } from "./errors";

export const INTERNAL_WORKSPACE_ROUTE = "/internal/partners/onboarding/[partnerSlug]";
export type WorkspaceIssue = { loader: string; message: string };
export type WorkspaceLoad<T> = { value: T; issue: null } | { value: null; issue: WorkspaceIssue };

export function workspaceReadError(operation: string, error: { code?: string } | null | Array<{ code?: string } | null>, message: string) {
  const errors = Array.isArray(error) ? error : [error];
  const code = (errors.find(value => value?.code === "42501" || value?.code === "PGRST301") ?? errors.find(Boolean))?.code;
  return new Phase1OnboardingError(
    code === "42501" || code === "PGRST301" ? "forbidden" : code === "P0002" ? "workspace_not_found" : "persistence_failed",
    message, { operation, databaseCode: code }
  );
}

function protectedFailure(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? error.code : null;
  return ["unauthenticated", "forbidden", "workspace_not_found", "partner_not_found", "42501", "PGRST301"].includes(String(code));
}

/** Log identifiers of code paths only: never exception messages, SQL, rows or actors. */
export function diagnoseWorkspaceLoad(loader: string, operation: string, error: unknown) {
  const known = error instanceof Phase1OnboardingError ? error : null;
  const databaseCode = known?.details?.databaseCode;
  const safeCode = typeof databaseCode === "string" && /^(?:[A-Z0-9]{5}|PGRST\d{3})$/.test(databaseCode) ? databaseCode : undefined;
  const safeOperation = known?.details?.operation;
  console.warn(JSON.stringify({ event: "rcap_workspace_load_failed", route: INTERNAL_WORKSPACE_ROUTE,
    loader, operation: typeof safeOperation === "string" && /^[a-zA-Z0-9_.:-]+$/.test(safeOperation) ? safeOperation : operation,
    classification: protectedFailure(error) ? "access_or_identity_denied" : safeCode === "42703" || safeCode === "42883" ? "schema_unavailable" : known?.code ?? "unexpected_dependency_failure",
    databaseCode: safeCode }));
}

/** Only independently recoverable readers use this boundary. Security refusals propagate. */
export async function recoverWorkspaceLoad<T>(loader: string, operation: string, message: string, read: () => Promise<T>): Promise<WorkspaceLoad<T>> {
  try { return { value: await read(), issue: null }; }
  catch (error) {
    diagnoseWorkspaceLoad(loader, operation, error);
    if (protectedFailure(error)) throw error;
    return { value: null, issue: { loader, message } };
  }
}

export async function requireWorkspaceLoad<T>(loader: string, operation: string, read: () => Promise<T>): Promise<T> {
  try { return await read(); }
  catch (error) { diagnoseWorkspaceLoad(loader, operation, error); throw error; }
}
