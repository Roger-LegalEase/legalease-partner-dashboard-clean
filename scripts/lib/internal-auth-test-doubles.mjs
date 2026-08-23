const defaultState = {
  user: null,
  userError: null,
  rows: [],
  queryError: null,
  signOutError: null,
  lastSignOutScope: null,
  signOutCalls: 0
};

let state = { ...defaultState };

export function setInternalAuthTestState(nextState) {
  state = { ...defaultState, ...nextState };
}

export function getInternalAuthTestState() {
  return state;
}

export async function createServerSupabaseAuthClient() {
  return {
    auth: {
      async getUser() {
        return { data: { user: state.user }, error: state.userError };
      },
      async signOut(options = {}) {
        state.signOutCalls += 1;
        state.lastSignOutScope = options.scope ?? "global";
        if (!state.signOutError) state.user = null;
        return { error: state.signOutError };
      }
    },
    from(table) {
      if (table !== "partner_users") throw new Error(`Unexpected table: ${table}`);
      const filters = [];
      const query = {
        select() {
          return query;
        },
        eq(column, value) {
          filters.push([column, value]);
          return query;
        },
        async limit(count) {
          const rows = state.rows
            .filter((row) => filters.every(([column, value]) => row[column] === value))
            .slice(0, count);
          return { data: rows, error: state.queryError };
        }
      };
      return query;
    }
  };
}

export async function getServerAuthState() {
  if (state.userError || !state.user) return { isAuthenticated: false };
  return { isAuthenticated: true, userId: state.user.id, email: state.user.email };
}

export function redirect(location) {
  const error = new Error(`Redirect to ${location}`);
  error.name = "InternalAuthTestRedirect";
  error.location = location;
  throw error;
}

export function logSecurityInfo() {}
export function logSecurityWarn() {}
export function logSecurityError() {}
export function getSafeRequestId() {
  return "internal-auth-test-request";
}
