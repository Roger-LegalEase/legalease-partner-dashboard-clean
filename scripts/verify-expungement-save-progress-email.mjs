import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const root = process.cwd();
const failures = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertIncludes(source, marker, label) {
  assert(source.includes(marker), `${label} missing marker: ${marker}`);
}

function clearEmailEnv() {
  for (const key of [
    "ENABLE_PARTNER_EMAIL_DELIVERY",
    "PARTNER_EMAIL_PROVIDER",
    "PARTNER_EMAIL_FROM",
    "PARTNER_EMAIL_REPLY_TO",
    "EXPUNGEMENT_EMAIL_PROVIDER",
    "EXPUNGEMENT_EMAIL_FROM",
    "EXPUNGEMENT_EMAIL_REPLY_TO",
    "RESEND_API_KEY"
  ]) {
    delete process.env[key];
  }
}

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

const email = await import("../src/lib/expungement-ai/screening-resume-email.ts");
const service = await import("../src/lib/expungement-ai/screening-resume-service.ts");
const routeSource = read("src/app/api/expungement-ai/screening/save-resume/route.ts");
const flowSource = read("src/components/expungement-ai/screening/ScreeningFlow.tsx");
const emailSource = read("src/lib/expungement-ai/screening-resume-email.ts");
const nudgeEmailSource = read("src/lib/expungement-ai/screening-drop-point-nudge-email.ts");
const envExample = read(".env.example");

try {
  clearEmailEnv();
  process.env.NODE_ENV = "production";
  globalThis.fetch = async () => {
    throw new Error("fetch should not run when email config is missing");
  };

  const missingConfig = await email.sendScreeningResumeEmail({
    to: "person@example.com",
    resumeUrl: "https://expungement.ai/screening/resume?token=test"
  });
  assert(missingConfig.ok === false, "Production-like missing email config must return ok:false.");
  assert(missingConfig.provider === "disabled", "Missing config should report provider disabled.");
  assert(missingConfig.deliveryAttempted === false, "Missing config must not claim delivery was attempted.");

  const storage = createStorage();
  let threw = false;
  try {
    await service.saveScreeningResumeLink(storage, {
      jurisdiction: "MS",
      answers: { ownership_scope: "Yes" },
      email: "person@example.com",
      position: {
        currentQuestionId: "ownership_scope",
        furthestStage: "identity",
        lastDropQuestion: "ownership_scope"
      }
    }, 1_700_000_000_000);
  } catch (error) {
    threw = true;
    assert(error instanceof Error && error.message === service.resumeEmailSendFailureMessage, "Disabled provider must throw the safe save-progress failure message.");
  }
  assert(threw, "saveScreeningResumeLink must not return success when provider is disabled.");

  clearEmailEnv();
  process.env.NODE_ENV = "test";
  process.env.EXPUNGEMENT_EMAIL_PROVIDER = "mock";
  const mockStorage = createStorage();
  const mocked = await service.saveScreeningResumeLink(mockStorage, {
    jurisdiction: "MS",
    answers: { ownership_scope: "Yes" },
    email: "person@example.com",
    position: {
      currentQuestionId: "ownership_scope",
      furthestStage: "identity",
      lastDropQuestion: "ownership_scope"
    }
  }, 1_700_000_000_000);
  assert(mocked.ok === true, "Explicit non-production mock mode may return ok:true for tests.");
  assert(mocked.message === service.resumeEmailSentMessage, "Mock success must use the truthful success message.");

  clearEmailEnv();
  process.env.NODE_ENV = "production";
  process.env.EXPUNGEMENT_EMAIL_PROVIDER = "resend";
  process.env.RESEND_API_KEY = "test-resend-key";
  process.env.EXPUNGEMENT_EMAIL_FROM = "Expungement.ai <no-reply@example.com>";
  globalThis.fetch = async () => new Response(JSON.stringify({ id: "em_test_123" }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
  const delivered = await email.sendScreeningResumeEmail({
    to: "person@example.com",
    resumeUrl: "https://expungement.ai/screening/resume?token=test"
  });
  assert(delivered.ok === true, "Configured Resend success must return ok:true.");
  assert(delivered.provider === "resend", "Configured delivery must report provider resend.");
  assert(delivered.deliveryAttempted === true, "Configured delivery must mark deliveryAttempted true.");
  assert(delivered.providerMessageId === "em_test_123", "Configured delivery should preserve provider message id.");

  globalThis.fetch = async () => new Response(JSON.stringify({ message: "raw provider rejection" }), {
    status: 400,
    headers: { "Content-Type": "application/json" }
  });
  const rejected = await email.sendScreeningResumeEmail({
    to: "person@example.com",
    resumeUrl: "https://expungement.ai/screening/resume?token=test"
  });
  assert(rejected.ok === false, "Provider rejection must return ok:false.");
  assert(rejected.deliveryAttempted === true, "Provider rejection must record that delivery was attempted.");

  assertIncludes(routeSource, "resumeEmailSendFailureMessage", "save-resume route safe failure copy");
  assertIncludes(routeSource, "status: 503", "save-resume route disabled-provider status");
  assert(!routeSource.includes("providerError("), "save-resume route must not expose provider error details.");

  assertIncludes(flowSource, 'translate("screening.save_progress_sent", "Check your email for a saved-progress link.")', "UI truthful success copy");
  assertIncludes(flowSource, 'translate("screening.save_progress_error", "We could not send that link right now. You can continue without saving or try again.")', "UI truthful failure copy");
  assert(!flowSource.includes("If the email is valid, a saved-progress link has been sent."), "UI must not claim a link was sent under anti-enumeration wording.");

  for (const marker of [
    "EXPUNGEMENT_EMAIL_PROVIDER",
    "EXPUNGEMENT_EMAIL_FROM",
    "EXPUNGEMENT_EMAIL_REPLY_TO",
    "RESEND_API_KEY",
    "PARTNER_EMAIL_PROVIDER",
    "PARTNER_EMAIL_FROM",
    "PARTNER_EMAIL_REPLY_TO"
  ]) {
    assertIncludes(emailSource, marker, `resume sender env support ${marker}`);
  }
  assertIncludes(emailSource, 'process.env.NODE_ENV !== "production"', "mock mode production guard");
  assertIncludes(nudgeEmailSource, 'ok: false', "nudge sender disabled delivery fail closed");
  assertIncludes(envExample, "EXPUNGEMENT_EMAIL_PROVIDER=resend", "env example consumer provider");
  assertIncludes(envExample, "EXPUNGEMENT_EMAIL_FROM=", "env example consumer from");
  assertIncludes(envExample, "EXPUNGEMENT_EMAIL_REPLY_TO=", "env example consumer reply-to");

  const combinedUserCopy = `${flowSource}\n${routeSource}\n${read("src/lib/expungement-ai/localization.ts")}`;
  assert(!/raw provider rejection|Resume email provider rejected the request/.test(combinedUserCopy), "Raw provider error text must not appear in user-facing copy.");
} finally {
  process.env = originalEnv;
  globalThis.fetch = originalFetch;
}

if (failures.length) {
  console.error("Expungement.ai save-progress email verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Expungement.ai save-progress email verifier passed.");
console.log("Disabled/missing production email config fails closed; configured Resend success is required for sent copy.");

function createStorage() {
  const rows = new Map();
  return {
    async saveSession(input) {
      const row = {
        sessionId: input.sessionId ?? "00000000-0000-4000-8000-000000000001",
        jurisdiction: input.jurisdiction,
        answers: input.answers,
        currentQuestionId: input.currentQuestionId,
        furthestStage: input.furthestStage,
        status: input.status,
        lastDropQuestion: input.lastDropQuestion,
        createdAt: new Date(1_700_000_000_000).toISOString(),
        updatedAt: new Date(1_700_000_000_000).toISOString()
      };
      rows.set(row.sessionId, row);
      return row;
    },
    async loadSession(sessionId) {
      return rows.get(sessionId) ?? null;
    },
    async updateResumeDelivery(input) {
      const existing = rows.get(input.sessionId);
      const row = {
        ...existing,
        resumeEmail: input.email,
        resumeEmailNormalized: input.emailNormalized,
        resumeTokenHash: input.tokenHash,
        resumeTokenExpiresAt: input.tokenExpiresAt,
        resumeTokenRotatedAt: input.sentAt,
        previousResumeTokenHash: null,
        previousResumeTokenGraceExpiresAt: null,
        resumeSentAt: input.sentAt,
        resumeConfirmFailedAttempts: 0,
        resumeConfirmLockedUntil: null,
        resumeLastFailedAt: null,
        resumeConsentAt: input.consentAt,
        resumeConsentTextVersion: input.consentTextVersion
      };
      rows.set(input.sessionId, row);
      return row;
    },
    async findByTokenHash() {
      return null;
    },
    async recordResumeConfirmFailure() {
      return undefined;
    },
    async rotateResumeToken() {
      throw new Error("Not used by save-progress email verifier.");
    }
  };
}
