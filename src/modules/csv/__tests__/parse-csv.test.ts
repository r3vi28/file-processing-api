import { createReadStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { parseCsv, type CsvRow } from "../parse-csv";

function text(...chunks: string[]): Readable {
  return Readable.from(chunks.map((chunk) => Buffer.from(chunk)));
}

function bytes(...chunks: number[][]): Readable {
  return Readable.from(chunks.map((chunk) => Buffer.from(chunk)));
}

async function collect(source: AsyncIterable<Uint8Array>): Promise<CsvRow[]> {
  const rows: CsvRow[] = [];
  for await (const row of parseCsv(source)) {
    rows.push(row);
  }
  return rows;
}

describe("parseCsv", () => {
  it("yields nothing for an empty source", async () => {
    expect(await collect(text())).toEqual([]);
  });

  it("yields nothing when there is only a header", async () => {
    expect(await collect(text("name,age\n"))).toEqual([]);
  });

  it("yields each row keyed by the header, with its line number", async () => {
    expect(await collect(text("name,age\nAna,30\nLuis,25\n"))).toEqual([
      { line: 2, record: { name: "Ana", age: "30" } },
      { line: 3, record: { name: "Luis", age: "25" } },
    ]);
  });

  it("keeps every value as a string", async () => {
    const [row] = await collect(text("age,active\n30,true\n"));

    expect(row?.record).toEqual({ age: "30", active: "true" });
  });

  it("reads a last row without a trailing line break", async () => {
    expect(await collect(text("name\nAna"))).toEqual([
      { line: 2, record: { name: "Ana" } },
    ]);
  });

  it("handles CRLF line endings", async () => {
    expect(await collect(text("name,age\r\nAna,30\r\n"))).toEqual([
      { line: 2, record: { name: "Ana", age: "30" } },
    ]);
  });

  it("handles quoted commas and escaped quotes", async () => {
    const [row] = await collect(text('name,note\n"Doe, Ana","say ""hi"""\n'));

    expect(row?.record).toEqual({ name: "Doe, Ana", note: 'say "hi"' });
  });

  it("keeps line numbers right after a quoted line break", async () => {
    expect(await collect(text('name,age\n"Ana\nMaria",30\nLuis,25\n'))).toEqual(
      [
        { line: 3, record: { name: "Ana\nMaria", age: "30" } },
        { line: 4, record: { name: "Luis", age: "25" } },
      ],
    );
  });

  it("removes a BOM from the first column name", async () => {
    // known bug in csv-processor: the BOM corrupted the first header
    const [row] = await collect(
      bytes([0xef, 0xbb, 0xbf, 0x61, 0x0a, 0x31, 0x0a]),
    );

    expect(row?.record).toEqual({ a: "1" });
  });

  it("removes a BOM split across buffers", async () => {
    const [row] = await collect(
      bytes([0xef], [0xbb], [0xbf, 0x61, 0x0a, 0x31, 0x0a]),
    );

    expect(row?.record).toEqual({ a: "1" });
  });

  it("keeps a multi-byte character split across buffers", async () => {
    // "city\ncafé\n", with "é" (C3 A9) split
    const [row] = await collect(
      bytes(
        [0x63, 0x69, 0x74, 0x79, 0x0a, 0x63, 0x61, 0x66, 0xc3],
        [0xa9, 0x0a],
      ),
    );

    expect(row?.record).toEqual({ city: "café" });
  });

  it("reads rows that arrive one character per chunk", async () => {
    const rows = await collect(text(..."name,age\nAna,30\n"));

    expect(rows).toEqual([{ line: 2, record: { name: "Ana", age: "30" } }]);
  });

  it("yields a row before the source has finished", async () => {
    let releaseSource = (): void => {};
    const firstRowSeen = new Promise<void>((resolve) => {
      releaseSource = resolve;
    });

    const longName = "L".repeat(200);

    // the rest of the file only arrives after the consumer has seen the first
    // row: an implementation that waits for the whole source would never finish.
    // The long name is there because the parser holds back the last few
    // characters it has received, in case they are part of a delimiter.
    async function* source(): AsyncGenerator<Uint8Array> {
      yield Buffer.from(`name\nAna\n${longName}`);
      await firstRowSeen;
      yield Buffer.from("\n");
    }

    const names: Array<string | undefined> = [];
    for await (const row of parseCsv(source())) {
      names.push(row.record.name);
      releaseSource();
    }

    expect(names).toEqual(["Ana", longName]);
  });

  it("rejects when the source stream fails instead of hanging", async () => {
    // known bug in csv-processor: source errors were not forwarded
    const failing = new Readable({
      read() {
        this.destroy(new Error("disk failure"));
      },
    });

    await expect(collect(failing)).rejects.toThrow("disk failure");
  });

  it("rejects when the source fails after sending data", async () => {
    async function* failingSource(): AsyncGenerator<Uint8Array> {
      yield Buffer.from("name\nAna\n");
      throw new Error("disk failure");
    }

    await expect(collect(failingSource())).rejects.toThrow("disk failure");
  });

  it("rejects when the file does not exist", async () => {
    const missing = createReadStream(
      join(tmpdir(), "parse-csv-test-file-that-does-not-exist.csv"),
    );

    await expect(collect(missing)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("closes the source when the consumer stops early", async () => {
    const source = text("name\nAna\nLuis\n");

    for await (const row of parseCsv(source)) {
      expect(row.record.name).toBe("Ana");
      break;
    }

    expect(source.destroyed).toBe(true);
  });
});
