/** Content routes may add capability checks but may not replace internal-admin authorization. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);
register("./lib/internal-auth-test-loader.mjs", import.meta.url);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const { setInternalAuthTestState } = await import("./lib/internal-auth-test-doubles.mjs");
const {
  denyUnlessContentCapability,
  resolveContentPageAccess,
  resolveContentSession
} = await import("../src/lib/content/auth.ts");

setInternalAuthTestState({});
await assert.rejects(
  () => resolveContentPageAccess("/internal/content"),
  (error) => error?.location === "/sign-in?next=%2Finternal%2Fcontent"
);

const signedOut = await denyUnlessContentCapability(
  "content.read",
  "/api/internal/content/posts",
  "content-cms-test"
);
assert.equal(signedOut.denied?.status, 401);

setInternalAuthTestState({
  user: {
    id: "20000000-0000-4000-8000-000000000001",
    email: "editor@outside.test",
    app_metadata: { content_role: "primary_admin" }
  },
  rows: []
});
const claimedRole = await denyUnlessContentCapability(
  "content.publish",
  "/api/internal/content/posts/example/transition",
  "content-cms-test"
);
assert.equal(claimedRole.denied?.status, 403);

const internalId = "20000000-0000-4000-8000-000000000002";
setInternalAuthTestState({
  user: { id: internalId, email: "content-admin@legalease.test" },
  rows: [{
    auth_user_id: internalId,
    partner_slug: null,
    role: "internal_admin",
    status: "active"
  }]
});
assert.deepEqual(await resolveContentSession(), {
  userId: internalId,
  role: "primary_admin",
  partnerSlug: null
});

const authSource = read("src/lib/content/auth.ts");
assert.ok(authSource.includes("requireInternalAdminSession()"));
assert.ok(!authSource.includes('.from("content_admin_users")'));

for (const file of walk("src/app/internal/content", "page.tsx")) {
  assert.ok(
    read(file).includes("resolveContentPageAccess("),
    `${file} must run the canonical content page adapter`
  );
}

for (const file of walk("src/app/api/internal/content", "route.ts")) {
  assert.ok(
    read(file).includes("denyUnlessContentCapability("),
    `${file} must run the canonical content API adapter`
  );
}

const proxy = read("src/proxy.ts");
assert.ok(!proxy.includes("INTERNAL_ADMIN_ACCESS_TOKEN"));
assert.ok(proxy.includes("intentionally not an authorization"));

console.log("Content CMS access verification passed.");
console.log("All CMS pages and APIs require UUID-bound internal_admin before content capability checks.");

function walk(relative, basename) {
  const absolute = path.join(root, relative);
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(relative, entry.name).replaceAll("\\", "/");
    return entry.isDirectory() ? walk(child, basename) : entry.name === basename ? [child] : [];
  });
}
