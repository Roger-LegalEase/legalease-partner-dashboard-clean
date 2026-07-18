import { NextResponse } from "next/server";

const DEFAULT_SESSION = {
  userId: "11111111-1111-4111-8111-111111111111",
  role: "primary_admin",
  partnerSlug: null
};

let state;
resetContentCreateTestState();

export function resetContentCreateTestState(overrides = {}) {
  state = {
    session: { ...DEFAULT_SESSION, ...(overrides.session ?? {}) },
    gateDeniedStatus: overrides.gateDeniedStatus ?? null,
    authorIds: [...(overrides.authorIds ?? [])],
    authorError: overrides.authorError ?? null,
    insertError: overrides.insertError ?? null,
    postId: overrides.postId ?? "22222222-2222-4222-8222-222222222222",
    insertedPosts: [],
    audits: [],
    gateCalls: []
  };
}

export function getContentCreateTestState() {
  return {
    ...state,
    session: { ...state.session },
    authorIds: [...state.authorIds],
    insertedPosts: state.insertedPosts.map((post) => ({ ...post })),
    audits: state.audits.map((audit) => ({ ...audit })),
    gateCalls: state.gateCalls.map((call) => ({ ...call }))
  };
}

export async function denyUnlessContentCapability(capability, route, requestId) {
  state.gateCalls.push({ capability, route, requestId });
  if (state.gateDeniedStatus) {
    return {
      denied: NextResponse.json(
        { success: false, error: "Content access required." },
        { status: state.gateDeniedStatus }
      )
    };
  }
  return { denied: null, session: state.session };
}

export function getSupabaseAdminClient() {
  return {
    from(table) {
      if (table === "content_authors") return authorQuery();
      if (table === "content_posts") return postQuery();
      throw new Error(`Unexpected test table: ${table}`);
    }
  };
}

function authorQuery() {
  let requestedAuthorId = null;
  const query = {
    select() {
      return query;
    },
    eq(column, value) {
      if (column === "author_id") requestedAuthorId = value;
      return query;
    },
    limit() {
      if (state.authorError) return Promise.resolve({ data: null, error: state.authorError });
      const found = state.authorIds.includes(requestedAuthorId);
      return Promise.resolve({
        data: found ? [{ author_id: requestedAuthorId }] : [],
        error: null
      });
    }
  };
  return query;
}

function postQuery() {
  let inserted = null;
  const query = {
    insert(payload) {
      inserted = { ...payload };
      state.insertedPosts.push(inserted);
      return query;
    },
    select() {
      return query;
    },
    limit() {
      if (state.insertError) return Promise.resolve({ data: null, error: state.insertError });
      return Promise.resolve({
        data: [{ post_id: state.postId, ...(inserted ?? {}) }],
        error: null
      });
    }
  };
  return query;
}

export async function recordAudit(event) {
  state.audits.push({ ...event });
}

export function getSafeRequestId() {
  return "content-create-verifier";
}

export function logSecurityError() {}
export function logSecurityInfo() {}
export function logSecurityWarn() {}
