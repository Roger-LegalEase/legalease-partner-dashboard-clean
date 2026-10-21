import { createRequire } from "node:module";

// Node 24 detects the late `exports.*` assignments in Next's CommonJS
// `next/server.js`, but those assignments target the pre-`module.exports`
// object and surface undefined named ESM exports. Load the real CommonJS
// module through require and re-export its actual values for plain-node
// verification scripts.
const require = createRequire(import.meta.url);
const nextServer = require("next/server");

export const NextRequest = nextServer.NextRequest;
export const NextResponse = nextServer.NextResponse;
export const ImageResponse = nextServer.ImageResponse;
export const userAgentFromString = nextServer.userAgentFromString;
export const userAgent = nextServer.userAgent;
export const URLPattern = nextServer.URLPattern;
export const after = nextServer.after;
export const connection = nextServer.connection;
export default nextServer;
