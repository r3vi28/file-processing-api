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

describe("parseCsv malformed rows", () => {
  it("does not mark valid rows with an error", async () => {
    const [row] = await collect(text("name,age\nAna,30\n"));

    expect(row?.error).toBeUndefined();
  });

  it("marks a row with too many columns and keeps going", async () => {
    const rows = await collect(text("name,age\nAna,30,x\nLuis,25\n"));

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      line: 2,
      error: "Expected 2 columns, found 3",
    });
    // a malformed row carries no values, so nobody validates half a row
    expect(rows[0]?.record).toEqual({});
    expect(rows[1]).toEqual({ line: 3, record: { name: "Luis", age: "25" } });
  });

  it("marks a row with too few columns and keeps going", async () => {
    const rows = await collect(text("name,age\nAna\nLuis,25\n"));

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      line: 2,
      error: "Expected 2 columns, found 1",
    });
    expect(rows[1]).toEqual({ line: 3, record: { name: "Luis", age: "25" } });
  });

  it("keeps going after several malformed rows", async () => {
    const rows = await collect(text("a,b\n1\n2,2\n3,3,3\n4\n5,5\n"));

    expect(rows.map((row) => [row.line, row.error])).toEqual([
      [2, "Expected 2 columns, found 1"],
      [3, undefined],
      [4, "Expected 2 columns, found 3"],
      [5, "Expected 2 columns, found 1"],
      [6, undefined],
    ]);
  });

  it("accepts an empty value: it is a column, not a missing one", async () => {
    expect(await collect(text("name,age\nAna,\n"))).toEqual([
      { line: 2, record: { name: "Ana", age: "" } },
    ]);
  });

  it("skips blank lines without shifting line numbers", async () => {
    const rows = await collect(text("name,age\nAna,30\n\nLuis,25\n\n\n"));

    expect(rows).toEqual([
      { line: 2, record: { name: "Ana", age: "30" } },
      { line: 4, record: { name: "Luis", age: "25" } },
    ]);
  });

  it("skips blank CRLF lines", async () => {
    const rows = await collect(text("name,age\r\nAna,30\r\n\r\nLuis,25\r\n"));

    expect(rows.map((row) => row.line)).toEqual([2, 4]);
  });

  it("marks a line with only spaces, because it is not blank", async () => {
    const rows = await collect(text("name,age\nAna,30\n   \nLuis,25\n"));

    expect(rows[1]).toMatchObject({
      line: 3,
      error: "Expected 2 columns, found 1",
    });
    expect(rows).toHaveLength(3);
  });

  it("keeps a quote inside an unquoted value as a literal character", async () => {
    const [row] = await collect(text('name,age\nAn"a,30\n'));

    expect(row).toEqual({ line: 2, record: { name: 'An"a', age: "30" } });
  });

  it("keeps text after a closing quote as part of the value", async () => {
    const [row] = await collect(text('name,age\n"Ana"x,30\n'));

    expect(row).toEqual({ line: 2, record: { name: '"Ana"x', age: "30" } });
  });

  it("rejects when a quote is never closed, because the rest of the file cannot be split into rows", async () => {
    await expect(
      collect(text('name,age\nLuis,25\n"Ana,30\nEva,40\n')),
    ).rejects.toMatchObject({ code: "CSV_QUOTE_NOT_CLOSED" });
  });
});
