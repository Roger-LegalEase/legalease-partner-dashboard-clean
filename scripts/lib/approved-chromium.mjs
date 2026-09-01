import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const CHROMIUM_RESOLUTION_ERROR =
  "No approved Chromium executable found. Set RCAP_CHROMIUM_PATH to an executable Chromium binary.";

export const APPROVED_SYSTEM_CHROMIUM_CANDIDATES = [
  "chromium",
  "chromium-browser",
  "google-chrome",
  "google-chrome-stable"
];

/**
 * Resolve one browser before Playwright launches.
 *
 * Explicit configuration is authoritative: a configured path that is missing,
 * non-executable, or a directory fails instead of silently selecting a
 * different binary. The managed candidate is accepted only when it exists and
 * is executable. System lookup is restricted to the approved names above.
 */
export function resolveApprovedChromiumExecutable({
  env = process.env,
  managedExecutablePath,
  systemCandidates = APPROVED_SYSTEM_CHROMIUM_CANDIDATES,
  findSystemExecutable = findOnPath
} = {}) {
  const explicit = [
    ["RCAP_CHROMIUM_PATH", env.RCAP_CHROMIUM_PATH],
    ["PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH", env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH]
  ];

  for (const [key, candidate] of explicit) {
    if (typeof candidate !== "string" || !candidate.trim()) continue;
    const executablePath = executableAbsolutePath(candidate.trim());
    if (!executablePath) throw new Error(CHROMIUM_RESOLUTION_ERROR);
    return { executablePath, pathClass: `environment:${key}` };
  }

  const managed = executableAbsolutePath(managedExecutablePath);
  if (managed) return { executablePath: managed, pathClass: "playwright-managed" };

  for (const command of systemCandidates) {
    const candidate = findSystemExecutable(command);
    const executablePath = executableAbsolutePath(candidate);
    if (executablePath) return { executablePath, pathClass: `system:${command}` };
  }

  throw new Error(CHROMIUM_RESOLUTION_ERROR);
}

export function announceChromiumResolution(resolution) {
  // Intentionally emit only the class. An environment path may encode a user,
  // workspace, mount, or other operational detail that does not belong in logs.
  console.log(`Chromium resolver: ${resolution.pathClass}.`);
}

function executableAbsolutePath(candidate) {
  if (typeof candidate !== "string" || !candidate.trim()) return null;
  const absolute = path.resolve(candidate.trim());
  try {
    if (!fs.statSync(absolute).isFile()) return null;
    fs.accessSync(absolute, fs.constants.X_OK);
    return absolute;
  } catch {
    return null;
  }
}

function findOnPath(command) {
  try {
    const resolved = execFileSync("which", [command], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim().split(/\r?\n/, 1)[0];
    return resolved || null;
  } catch {
    return null;
  }
}
