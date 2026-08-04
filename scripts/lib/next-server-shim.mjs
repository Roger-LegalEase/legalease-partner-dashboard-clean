/**
 * ESM bridge for route verifiers that import `next/server`.
 *
 * Requiring the installed CommonJS module avoids Node 24's undefined synthetic
 * export values when an ESM customization hook resolves the bare specifier.
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextServer = require("../../node_modules/next/server.js");

export const NextRequest = nextServer.NextRequest;
export const NextResponse = nextServer.NextResponse;
export const ImageResponse = nextServer.ImageResponse;
export const userAgentFromString = nextServer.userAgentFromString;
export const userAgent = nextServer.userAgent;
export const URLPattern = nextServer.URLPattern;
export const after = nextServer.after;
export const connection = nextServer.connection;

export default nextServer;
