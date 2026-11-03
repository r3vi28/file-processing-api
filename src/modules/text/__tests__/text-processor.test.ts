import { createReadStream } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import type { Processor } from "../../../shared/processor";
import { TextProcessor } from "../text-processor";
import type { TextResult } from "../types";

function bytes(...chunks: number[][]): Readable {
  return Readable.from(chunks.map((chunk) => Buffer.from(chunk)));
}

function text(...chunks: string[]): Readable {
  return Readable.from(chunks.map((chunk) => Buffer.from(chunk)));
}

describe("TextProcessor", () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "text-processor-"));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("implements the Processor contract", () => {
    const processor: Processor<TextResult> = new TextProcessor();

    expect(typeof processor.process).toBe("function");
  });

  it("returns zero counts for an empty stream", async () => {
    const result = await new TextProcessor().process(text());

    expect(result).toEqual({ kind: "text", characters: 0, words: 0, lines: 0 });
  });

  it("returns the text result with its kind", async () => {
    const result = await new TextProcessor().process(text("hello world\n"));

    expect(result).toEqual({
      kind: "text",
      characters: 12,
      words: 2,
      lines: 1,
    });
  });

  it("counts correctly when characters, words and CRLF are split across buffers", async () => {
    // "café\r\nworld": "é" (C3 A9) and "\r\n" are both split
    const result = await new TextProcessor().process(
      bytes(
        [0x63, 0x61, 0x66, 0xc3],
        [0xa9, 0x0d],
        [0x0a, 0x77, 0x6f],
        [0x72, 0x6c, 0x64],
      ),
    );

    expect(result).toEqual({
      kind: "text",
      characters: 11,
      words: 2,
      lines: 2,
    });
  });

  it("does not count a leading BOM", async () => {
    const result = await new TextProcessor().process(
      bytes([0xef, 0xbb, 0xbf], [0x61, 0x20, 0x62, 0x0a]),
    );

    expect(result).toEqual({ kind: "text", characters: 4, words: 2, lines: 1 });
  });

  it("processes a real file read in small chunks", async () => {
    const path = join(tempDir, "sample.txt");
    await writeFile(path, "Hola, mundo 😀\r\nsegunda línea\r\n\r\nfin", "utf8");

    // 3-byte chunks split the emoji (bytes 12-15) and the second CRLF (32-33)
    const result = await new TextProcessor().process(
      createReadStream(path, { highWaterMark: 3 }),
    );

    expect(result).toEqual({
      kind: "text",
      characters: 35,
      words: 6,
      lines: 4,
    });
  });

  it("rejects when the stream fails", async () => {
    const failing = new Readable({
      read() {
        this.destroy(new Error("disk failure"));
      },
    });

    await expect(new TextProcessor().process(failing)).rejects.toThrow(
      "disk failure",
    );
  });

  it("rejects when the file does not exist", async () => {
    const missing = createReadStream(join(tempDir, "missing.txt"));

    await expect(new TextProcessor().process(missing)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("keeps no state between calls on the same instance", async () => {
    const processor = new TextProcessor();

    const first = await processor.process(text("one two\n"));
    const second = await processor.process(text("three"));

    expect(first).toEqual({ kind: "text", characters: 8, words: 2, lines: 1 });
    expect(second).toEqual({ kind: "text", characters: 5, words: 1, lines: 1 });
  });

  it("processes several streams at the same time on the same instance", async () => {
    const processor = new TextProcessor();

    const [first, second] = await Promise.all([
      processor.process(text("a", " b", " c")),
      processor.process(text("d\n", "e\n")),
    ]);

    expect(first).toEqual({ kind: "text", characters: 5, words: 3, lines: 1 });
    expect(second).toEqual({ kind: "text", characters: 4, words: 2, lines: 2 });
  });
});
