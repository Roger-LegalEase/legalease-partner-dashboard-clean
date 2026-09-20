/**
 * Mutable request context for the Clinic denial harness.
 *
 * The stub modules below resolve authentication, cookies, the Supabase admin
 * client and the partner session from here, so a single scenario can pose as an
 * anonymous visitor, the wrong participant, the wrong tenant or the wrong role
 * while the module under test stays the real `src/lib/clinic-mode` source.
 */
const state = {
  auth: { isAuthenticated: false, userId: null },
  cookies: new Map(),
  database: null,
  sessionPartner: null
};

export function configure(next) {
  state.auth = next.auth ?? { isAuthenticated: false, userId: null };
  state.cookies = new Map(Object.entries(next.cookies ?? {}));
  state.database = next.database ?? null;
  state.sessionPartner = next.sessionPartner ?? null;
}

export function currentAuth() {
  return state.auth;
}

export function currentCookies() {
  return state.cookies;
}

export function currentDatabase() {
  return state.database;
}

export function currentSessionPartner() {
  return state.sessionPartner;
}
