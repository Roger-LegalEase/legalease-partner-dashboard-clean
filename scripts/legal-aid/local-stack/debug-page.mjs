// Boots the local stack and prints what one signed-in user sees at a path.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chromium } from "playwright";
import { createLocalDatabase, IDS, USERS, root } from "./bootstrap.mjs";
import { makeJwt, startSupabaseShim } from "./supabase-shim.mjs";

const [who, target] = process.argv.slice(2);
const PORT = 3101; const BASE = `http://127.0.0.1:${PORT}`;
const db = await createLocalDatabase();
const shim = await startSupabaseShim({ db, serviceKey: "sk", anonKey: "ak", users: USERS });
const env = { ...process.env, NODE_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: shim.url, NEXT_PUBLIC_SUPABASE_ANON_KEY: "ak", SUPABASE_SERVICE_ROLE_KEY: "sk", LEGAL_AID_RESTRICTED_FIELD_KEY: randomBytes(32).toString("base64"), PARTICIPANT_PRIVACY_PSEUDONYM_SECRET: "local-verification-pseudonym-secret-not-for-production" };
const server = spawn("node", ["node_modules/next/dist/bin/next", "start", "-p", String(PORT), "-H", "127.0.0.1"], { cwd: root, env });
let log = ""; server.stdout.on("data", (c) => { log += c; }); server.stderr.on("data", (c) => { log += c; });
for (let i = 0; i < 120; i++) { try { if ((await fetch(`${BASE}/p/mvlp/clinics`)).status < 500) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", headless: true });
const user = USERS.get(IDS[who]);
const context = await browser.newContext();
if (user) {
  const token = makeJwt({ sub: user.id, email: user.email });
  const value = `base64-${Buffer.from(JSON.stringify({ access_token: token, refresh_token: "r", token_type: "bearer", expires_in: 31536000, expires_at: 4102444800, user: { id: user.id, aud: "authenticated", role: "authenticated", email: user.email, email_confirmed_at: "2026-09-01T00:00:00Z", app_metadata: {}, user_metadata: {}, created_at: "2026-09-01T00:00:00Z" } })).toString("base64url")}`;
  await context.addCookies([{ name: "sb-127-auth-token", value, domain: "127.0.0.1", path: "/" }]);
}
const page = await context.newPage();
const response = await page.goto(`${BASE}${target}`);
console.log("status", response?.status(), "url", page.url());
console.log((await page.innerText("body")).slice(0, 1500));
console.log("--- shim requests:", shim.requests.slice(0, 12).map((r) => `${r.method} ${r.path}`).join("\n"));
console.log("--- server log tail:", log.split("\n").slice(-25).join("\n"));
await browser.close(); server.kill("SIGTERM"); await shim.close(); await db.close();
