import "server-only";

type LogLevel = "info" | "warn" | "error";

export type SecurityLogFields = {
  event: string;
  route: string;
  outcome: string;
  requestId?: string;
  error?: unknown;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

const sensitiveKeys = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "access_token",
  "refresh_token",
  "session",
  "session_id",
  "password",
  "email",
  "phone",
  "message",
  "contact_name",
  "organization",
  "organization_name",
  "request_body",
  "body"
]);

const allowedMetadataKeys = new Set([
  "status",
  "old_status",
  "new_status",
  "row_id",
  "mode",
  "action",
  "error_code",
  "retry_after_seconds"
]);

export function logSecurityInfo(fields: SecurityLogFields) {
  writeLog("info", fields);
}

export function logSecurityWarn(fields: SecurityLogFields) {
  writeLog("warn", fields);
}

export function logSecurityError(fields: SecurityLogFields) {
  writeLog("error", fields);
}

export function getSafeRequestId(request: Request) {
  const candidate =
    request.headers.get("x-request-id") ??
    request.headers.get("x-vercel-id") ??
    request.headers.get("cf-ray") ??
    crypto.randomUUID();

  return sanitizeIdentifier(candidate);
}

function writeLog(level: LogLevel, fields: SecurityLogFields) {
  const line = serializeLog(level, fields);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

function serializeLog(level: LogLevel, fields: SecurityLogFields) {
  return JSON.stringify({
    level,
    event: sanitizeText(fields.event),
    route: sanitizeRoute(fields.route),
    timestamp: new Date().toISOString(),
    outcome: sanitizeText(fields.outcome),
    request_id: fields.requestId ? sanitizeIdentifier(fields.requestId) : undefined,
    error: fields.error ? safeError(fields.error) : undefined,
    metadata: sanitizeMetadata(fields.metadata)
  });
}

function safeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: sanitizeText(error.name),
      message: sanitizeErrorMessage(error.message)
    };
  }

  return {
    name: "UnknownError",
    message: "Non-Error exception"
  };
}

function sanitizeMetadata(metadata?: Record<string, string | number | boolean | null | undefined>) {
  if (!metadata) {
    return undefined;
  }

  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata)) {
    const normalizedKey = key.toLowerCase();
    if (sensitiveKeys.has(normalizedKey) || !allowedMetadataKeys.has(normalizedKey) || value === undefined) {
      continue;
    }

    safe[normalizedKey] = typeof value === "string" ? sanitizeText(value) : value;
  }

  return Object.keys(safe).length > 0 ? safe : undefined;
}

function sanitizeRoute(value: string) {
  return sanitizeText(value).replace(/[?#].*$/, "");
}

function sanitizeIdentifier(value: string) {
  return sanitizeText(value).replace(/[^a-zA-Z0-9:._-]/g, "").slice(0, 96) || "unknown";
}

function sanitizeErrorMessage(value: string) {
  const lower = value.toLowerCase();
  if ([...sensitiveKeys].some((key) => lower.includes(key))) {
    return "Sensitive error detail redacted";
  }

  return sanitizeText(value)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b(?:access|refresh)[_-]?token\b[^\s]*/gi, "[redacted-token]")
    .slice(0, 180);
}

function sanitizeText(value: string) {
  return value.replace(/[\r\n\t]/g, " ").slice(0, 180);
}
