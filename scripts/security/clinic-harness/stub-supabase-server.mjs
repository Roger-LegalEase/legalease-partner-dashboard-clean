import { currentDatabase } from "./control.mjs";

export function getSupabaseAdminClient() {
  return currentDatabase();
}
