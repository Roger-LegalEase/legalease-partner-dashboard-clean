// A network that answers only what a test says it answers.
//
// Installed by the landing-page verifier before it imports the acquisition
// script, so the script's real two-hop behaviour can be exercised without
// reaching any court's website — which this repository's sessions cannot do
// anyway, and which would make the test depend on a third party's uptime.
//
// RCAP_FAKE_NETWORK holds the routing table as JSON: url -> { status,
// contentType, body, bodyBase64, finalUrl }. A URL that is not in the table
// throws, exactly as an unreachable host does.
const routes = JSON.parse(process.env.RCAP_FAKE_NETWORK ?? "{}");

globalThis.fetch = async (input) => {
  const requested = typeof input === "string" ? input : input.href ?? String(input);
  const route = routes[requested];
  if (!route) throw new Error(`fake network has no route for ${requested}`);
  const body = route.bodyBase64
    ? Buffer.from(route.bodyBase64, "base64")
    : Buffer.from(route.body ?? "", "utf8");
  const status = route.status ?? 200;
  return {
    url: route.finalUrl ?? requested,
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name) => {
        const key = String(name).toLowerCase();
        if (key === "content-type") return route.contentType ?? null;
        if (key === "content-length") return String(body.length);
        return null;
      }
    },
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength)
  };
};

await import("../rcap-acquire-official-source.mjs");
