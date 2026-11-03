/**
 * Decodes UTF-8 byte chunks into text, handling multi-byte characters split
 * across chunks. Strips a leading BOM; invalid bytes become U+FFFD.
 *
 * @param source - Async iterable of raw bytes, e.g. a Node.js `Readable`.
 * @returns Decoded text chunks (never empty strings).
 */
export async function* decodeUtf8(
  source: AsyncIterable<Uint8Array>,
): AsyncGenerator<string> {
  const decoder = new TextDecoder("utf-8", { fatal: false, ignoreBOM: false });

  for await (const chunk of source) {
    const text = decoder.decode(chunk, { stream: true });
    if (text !== "") yield text;
  }

  const rest = decoder.decode();
  if (rest !== "") yield rest;
}
