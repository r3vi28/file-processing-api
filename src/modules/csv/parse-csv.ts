import { parse, type InfoRecord } from "csv-parse";
import { pipeline } from "node:stream";
import { decodeUtf8 } from "../../shared/decode-utf8";

export interface CsvRow {
  line: number;
  record: Record<string, string>;
  error?: string;
}

type ParsedRecord = { record: string[]; info: InfoRecord };

export async function* parseCsv(
  source: AsyncIterable<Uint8Array>,
): AsyncGenerator<CsvRow> {
  const parser = parse({
    info: true,
    relax_column_count: true,
    relax_quotes: true,
    skip_empty_lines: true,
  });

  pipeline(decodeUtf8(source), parser, () => {});

  let header: string[] | undefined;

  for await (const { record, info } of parser as AsyncIterable<ParsedRecord>) {
    if (header === undefined) {
      header = record;
      continue;
    }

    if (record.length !== header.length) {
      yield {
        line: info.lines,
        record: {},
        error: `Expected ${header.length} columns, found ${record.length}`,
      };
      continue;
    }

    const row: Record<string, string> = {};
    for (const [i, name] of header.entries()) {
      row[name] = record[i] ?? "";
    }
    yield { line: info.lines, record: row };
  }
}
