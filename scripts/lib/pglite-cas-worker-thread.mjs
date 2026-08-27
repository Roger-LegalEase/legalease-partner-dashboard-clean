import { parentPort } from "node:worker_threads";

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { worker } from "@electric-sql/pglite/worker";

if (!parentPort) throw new Error("PGlite CAS worker requires a parent port");

const messages = new EventTarget();
parentPort.on("message", (data) => {
  messages.dispatchEvent(new MessageEvent("message", { data }));
});
globalThis.addEventListener = messages.addEventListener.bind(messages);
globalThis.removeEventListener = messages.removeEventListener.bind(messages);
globalThis.postMessage = (data) => parentPort.postMessage(data);

await worker({
  init: (options) => PGlite.create({ ...options, extensions: { pgcrypto } })
});
