import { Readable } from "node:stream";
import { decodeUtf8 } from "../decode-utf8";

function bytes(...chunks: number[][]): Readable {
  return Readable.from(chunks.map((chunk) => Buffer.from(chunk)));
}

async function collect(source: AsyncIterable<Uint8Array>): Promise<string[]> {
  const pieces: string[] = [];
  for await (const piece of decodeUtf8(source)) {
    pieces.push(piece);
  }
  return pieces;
}

async function decodeAll(source: AsyncIterable<Uint8Array>): Promise<string> {
  return (await collect(source)).join("");
}

describe("decodeUtf8", () => {
  it("yields nothing visible for an empty source", async () => {
    expect(await decodeAll(bytes())).toBe("");
  });

  it("decodes ASCII", async () => {
    expect(await decodeAll(Readable.from([Buffer.from("hello")]))).toBe(
      "hello",
    );
  });

  it("decodes text spread over several buffers", async () => {
    expect(
      await decodeAll(
        Readable.from([Buffer.from("hel"), Buffer.from(""), Buffer.from("lo")]),
      ),
    ).toBe("hello");
  });

  it("decodes a 2-byte character split across two buffers", async () => {
    // "é" is C3 A9
    const text = await decodeAll(bytes([0x63, 0x61, 0x66, 0xc3], [0xa9]));

    expect(text).toBe("café");
    expect(text).not.toContain("\uFFFD");
  });

  it("decodes 3-byte characters split at different points", async () => {
    // "日本" is E6 97 A5 E6 9C AC
    const text = await decodeAll(
      bytes([0xe6], [0x97, 0xa5, 0xe6, 0x9c], [0xac]),
    );

    expect(text).toBe("日本");
  });

  it("never yields half of a 4-byte character", async () => {
    // "😀" is F0 9F 98 80; one byte per buffer
    const pieces = await collect(bytes([0xf0], [0x9f], [0x98], [0x80]));

    expect(pieces.join("")).toBe("😀");
    expect(pieces.filter((piece) => piece !== "")).toEqual(["😀"]);
  });

  it("removes a UTF-8 BOM at the start", async () => {
    // BOM is EF BB BF
    expect(await decodeAll(bytes([0xef, 0xbb, 0xbf, 0x61]))).toBe("a");
  });

  it("removes a BOM split across buffers", async () => {
    expect(await decodeAll(bytes([0xef], [0xbb], [0xbf, 0x61]))).toBe("a");
  });

  it("keeps a BOM that is not at the start", async () => {
    expect(await decodeAll(bytes([0x61, 0xef, 0xbb, 0xbf]))).toBe("a\uFEFF");
  });

  it("replaces invalid bytes with U+FFFD instead of failing", async () => {
    expect(await decodeAll(bytes([0x61, 0xff, 0x62]))).toBe("a\uFFFDb");
  });

  it("replaces a sequence cut off at the end of the source with U+FFFD", async () => {
    // C3 starts a 2-byte character that never ends
    expect(await decodeAll(bytes([0x61, 0xc3]))).toBe("a\uFFFD");
  });

  it("propagates errors from the source", async () => {
    async function* failingSource(): AsyncGenerator<Uint8Array> {
      yield Buffer.from("partial");
      throw new Error("disk failure");
    }

    await expect(decodeAll(failingSource())).rejects.toThrow("disk failure");
  });
});
