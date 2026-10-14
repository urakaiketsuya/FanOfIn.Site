/** Bounded reads also cover chunked responses without a Content-Length header. */
export async function readBytes(response: Response, maximum: number): Promise<Buffer> {
  if (!response.ok || !response.body) throw new Error("Preview source unavailable");
  if (Number(response.headers.get("content-length")) > maximum) { await response.body.cancel(); throw new Error("Preview source too large"); }
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maximum) { await reader.cancel(); throw new Error("Preview source too large"); }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

