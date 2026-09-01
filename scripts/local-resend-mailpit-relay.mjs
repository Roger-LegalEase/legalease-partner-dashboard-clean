#!/usr/bin/env node

import http from "node:http";

const host = "127.0.0.1";
const port = Number(process.env.LOCAL_RESEND_RELAY_PORT ?? 54399);
const mailpitUrl = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
if (!["127.0.0.1", "localhost", "::1"].includes(new URL(mailpitUrl).hostname)) {
  throw new Error("The local Resend relay only sends to loopback Mailpit.");
}

let failNext = false;
const server = http.createServer(async (request, response) => {
  if (request.method === "POST" && request.url === "/__fail-next") {
    failNext = true;
    return json(response, 200, { ok: true });
  }
  if (request.method !== "POST" || request.url !== "/emails") {
    return json(response, 404, { message: "not found" });
  }
  if (failNext) {
    failNext = false;
    return json(response, 503, { message: "synthetic local relay failure" });
  }

  try {
    const body = await boundedJson(request);
    const recipients = Array.isArray(body.to) ? body.to.filter((value) => typeof value === "string") : [];
    if (recipients.length === 0 || typeof body.from !== "string" || typeof body.subject !== "string") {
      return json(response, 400, { message: "invalid local email payload" });
    }
    const sent = await fetch(`${mailpitUrl.replace(/\/+$/u, "")}/api/v1/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        From: address(body.from),
        To: recipients.map(address),
        Subject: body.subject,
        Text: typeof body.text === "string" ? body.text : "",
        HTML: typeof body.html === "string" ? body.html : ""
      })
    });
    if (!sent.ok) return json(response, 502, { message: "Mailpit rejected the message" });
    return json(response, 200, { id: `mailpit-${crypto.randomUUID()}` });
  } catch {
    return json(response, 400, { message: "invalid local email payload" });
  }
});

server.listen(port, host, () => {
  process.stdout.write(`Local Resend-to-Mailpit relay ready on http://${host}:${port}\n`);
});

function address(value) {
  const match = String(value).match(/^\s*(.*?)\s*<([^>]+)>\s*$/u);
  return match ? { Name: match[1], Email: match[2] } : { Email: String(value).trim() };
}

async function boundedJson(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 256 * 1024) throw new Error("payload too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}
