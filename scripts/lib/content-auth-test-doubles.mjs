const defaultState = {
  auth: { isAuthenticated: false },
  internalAdmin: false,
  contentRows: [],
  contentError: null,
  storageConfigured: true
};

let state = { ...defaultState };

export function setContentAuthTestState(nextState) {
  state = { ...defaultState, ...nextState };
}

export async function getServerAuthState() {
  return state.auth;
}

// The proxy verifier exercises session-refresh control flow, not Supabase's realtime transport.
// Keeping createServerClient inside this no-network boundary also lets the CI's supported Node 20
// runtime run the verifier without requiring native WebSocket support from Node 22+.
export function createServerClient() {
  return {
    auth: {
      async getUser() {
        return { data: { user: null }, error: null };
      }
    }
  };
}

export async function requireInternalAdminSession() {
  if (!state.internalAdmin) throw new Error("Not an internal admin.");
  return { kind: "internal_admin", authUserId: state.auth.userId, role: "internal_admin" };
}

export function getSupabaseAdminClient() {
  if (!state.storageConfigured) return null;

  const query = {
    select() {
      return query;
    },
    eq() {
      return query;
    },
    limit() {
      return Promise.resolve({ data: state.contentRows, error: state.contentError });
    }
  };

  return {
    from() {
      return query;
    }
  };
}

export function redirect(location) {
  const error = new Error(`Redirect to ${location}`);
  error.name = "ContentAuthTestRedirect";
  error.location = location;
  throw error;
}
