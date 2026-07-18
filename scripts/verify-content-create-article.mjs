/**
 * Create Article contract regression coverage.
 *
 * Drives the real POST route through its real strict Zod body parser while replacing only auth,
 * storage, audit, and logging boundaries with deterministic doubles. The client payload builder is
 * executed directly so the form and route are checked against the same shared TypeScript contract.
 */

import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

register("./lib/next-server-loader.mjs", import.meta.url);
register("./lib/ts-esm-loader.mjs", import.meta.url);
register("./lib/content-create-test-loader.mjs", import.meta.url);

const { POST } = await import("../src/app/api/internal/content/posts/route.ts");
const { EMPTY_DOC } = await import("../src/lib/content/types.ts");
const { buildCreateArticlePayload, createdPostEditorPath } = await import(
  "../src/components/content/admin/create-article-payload.ts"
);
const { getContentCreateTestState, resetContentCreateTestState } = await import(
  "./lib/content-create-test-doubles.mjs"
);

const USER_ID = "11111111-1111-4111-8111-111111111111";
const AUTHOR_ID = "33333333-3333-4333-8333-333333333333";
const POST_ID = "22222222-2222-4222-8222-222222222222";

const basePayload = {
  title: "A clean start",
  slug: "a-clean-start",
  destination: "expungement_ai",
  contentType: "blog_article",
  legalSensitive: false,
  jurisdictionCode: null,
  partnerSlug: null
};

// --- Client contract -----------------------------------------------------------------------------

const withoutAuthor = buildCreateArticlePayload({
  ...basePayload,
  authorId: "",
  jurisdictionCode: "",
  partnerSlug: ""
});
assert(!Object.hasOwn(withoutAuthor, "authorId"), "The form must omit authorId when no author is selected.");
assert(!Object.hasOwn(withoutAuthor, "doc"), "The Create Article form payload must not contain doc.");

const withAuthor = buildCreateArticlePayload({
  ...basePayload,
  authorId: AUTHOR_ID,
  jurisdictionCode: "MS",
  partnerSlug: "partner-one"
});
assert(withAuthor.authorId === AUTHOR_ID, "The form must send a selected authorId unchanged.");
assert(
  createdPostEditorPath({ post_id: POST_ID }) === `/internal/content/articles/${POST_ID}`,
  "A successful create response must route to the new article editor."
);

const formSource = read("src/components/content/admin/CreateArticleForm.tsx");
assert(
  formSource.includes("contentApi.createPost(") && formSource.includes("buildCreateArticlePayload({"),
  "CreateArticleForm must send the tested strict payload builder to contentApi.createPost()."
);
assert(
  formSource.includes("router.push(createdPostEditorPath(result.data.post ?? {}))"),
  "CreateArticleForm must navigate using the tested editor-path resolver after success."
);

// --- Route behavior ------------------------------------------------------------------------------

resetContentCreateTestState();
let response = await post(basePayload);
let body = await response.json();
let captured = getContentCreateTestState();
assert(response.status === 201 && body.success === true, "A create request with no author must succeed.");
assert(captured.insertedPosts[0]?.author_id === null, "No selected author must persist author_id=null.");
assert(
  deepEqual(captured.insertedPosts[0]?.doc, EMPTY_DOC),
  "The server must initialize the post document with EMPTY_DOC."
);
assert(captured.insertedPosts[0]?.status === "draft", "The server must initialize status=draft.");
assert(
  captured.insertedPosts[0]?.created_by === USER_ID,
  "created_by must come from the authenticated content session."
);

resetContentCreateTestState();
response = await post({ ...basePayload, authorId: null });
captured = getContentCreateTestState();
assert(response.status === 201, "A create request with authorId=null must be accepted.");
assert(captured.insertedPosts[0]?.author_id === null, "A nullable authorId must persist author_id=null.");

resetContentCreateTestState({ authorIds: [AUTHOR_ID] });
response = await post({ ...basePayload, authorId: AUTHOR_ID });
captured = getContentCreateTestState();
assert(response.status === 201, "A create request with a valid authorId must succeed.");
assert(
  captured.insertedPosts[0]?.author_id === AUTHOR_ID,
  "A valid selected author must persist to content_posts.author_id."
);

resetContentCreateTestState();
response = await post({ ...basePayload, authorId: "not-a-uuid" });
assert(response.status === 400, "An arbitrary non-UUID authorId must be rejected.");
assert(getContentCreateTestState().insertedPosts.length === 0, "An invalid authorId must not reach storage.");

resetContentCreateTestState();
response = await post({ ...basePayload, authorId: "44444444-4444-4444-8444-444444444444" });
body = await response.json();
assert(response.status === 400, "A nonexistent author UUID must return a client-safe 400.");
assert(
  body.error === "The selected author is not available.",
  "A nonexistent author must return the clear safe author-unavailable error."
);

for (const [field, value] of [
  ["doc", { type: "doc", content: [] }],
  ["unexpected", true],
  ["status", "published"],
  ["createdBy", USER_ID],
  ["created_by", USER_ID],
  ["publishedAt", "2026-07-18T00:00:00.000Z"],
  ["published_at", "2026-07-18T00:00:00.000Z"],
  ["scheduledFor", "2026-07-19T00:00:00.000Z"],
  ["scheduled_for", "2026-07-19T00:00:00.000Z"],
  ["legalApprovedAt", "2026-07-18T00:00:00.000Z"],
  ["legal_approved_at", "2026-07-18T00:00:00.000Z"],
  ["legalApprovedBy", USER_ID],
  ["legal_approved_by", USER_ID],
  ["editorialApprovedAt", "2026-07-18T00:00:00.000Z"],
  ["editorial_approved_at", "2026-07-18T00:00:00.000Z"],
  ["editorialApprovedBy", USER_ID],
  ["editorial_approved_by", USER_ID],
  ["renderedHtml", "<p>client html</p>"],
  ["rendered_html", "<p>client html</p>"],
  ["version", 99]
]) {
  resetContentCreateTestState();
  response = await post({ ...basePayload, [field]: value });
  assert(response.status === 400, `Client-supplied ${field} must be rejected by the strict schema.`);
  assert(
    getContentCreateTestState().insertedPosts.length === 0,
    `Client-supplied ${field} must not reach content_posts.insert().`
  );
}

// The content capability gate still runs before body parsing or storage.
resetContentCreateTestState({ gateDeniedStatus: 403 });
response = await POST(
  new Request("http://localhost/api/internal/content/posts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "not-json"
  })
);
captured = getContentCreateTestState();
assert(response.status === 403, "A user without content.create must remain forbidden before parsing.");
assert(captured.insertedPosts.length === 0, "A denied content role must never reach storage.");
assert(captured.gateCalls[0]?.capability === "content.create", "The create route must require content.create.");

// Partner contributors cannot select another organization by changing the request payload.
resetContentCreateTestState({
  session: { role: "partner_contributor", partnerSlug: "scoped-partner" }
});
response = await post({ ...basePayload, partnerSlug: "other-partner" });
captured = getContentCreateTestState();
assert(response.status === 201, "A scoped partner contributor with content.create may create a draft.");
assert(
  captured.insertedPosts[0]?.partner_slug === "scoped-partner",
  "Partner contributor creation must remain forced to the authenticated partner scope."
);

// Confirm the database contract this patch relies on without changing the Phase 43 migration.
const phase43 = read("supabase/phase-43-content-platform.sql");
assert(
  /create table if not exists public\.content_authors[\s\S]*?author_id uuid primary key/.test(phase43),
  "Phase 43 must define content_authors.author_id as UUID."
);
assert(
  /author_id uuid references public\.content_authors\(author_id\)/.test(phase43),
  "content_posts.author_id must remain a UUID foreign key to content_authors."
);

if (failures.length) {
  console.error("Create Article contract verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Create Article contract verification passed.");
console.log("Client: doc is absent; empty authorId is omitted; successful creation routes to the editor.");
console.log("API: UUID authorId is strict, persisted, and checked for existence with a safe 400 response.");
console.log("Server authority: EMPTY_DOC, draft status, and authenticated created_by are preserved.");
console.log("Authorization: content.create and partner-contributor scoping remain enforced.");

function post(payload) {
  return POST(
    new Request("http://localhost/api/internal/content/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })
  );
}

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
