import { createHash, createHmac, randomUUID } from "node:crypto";

export function signWorkerRequest(secret: string, method: string, path: string, body?: string | Uint8Array<ArrayBuffer>): Record<string, string> {
  const timestamp = Date.now().toString();
  const requestId = randomUUID();
  const bytes = body === undefined ? Buffer.alloc(0) : Buffer.from(body);
  const bodyHash = createHash("sha256").update(bytes).digest("hex");
  const canonical = `${method}\n${path}\n${bodyHash}\n${timestamp}\n${requestId}`;
  return {
    "X-Fanofin-BFF-Timestamp": timestamp,
    "X-Fanofin-BFF-Request-ID": requestId,
    "X-Fanofin-BFF-Signature": createHmac("sha256", secret).update(canonical).digest("hex"),
  };
}
