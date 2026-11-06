import { parse, type Info } from "csv-parse";
import { pipeline } from "node:stream";
import { decodeUtf8 } from "../../shared/decode-utf8";

export interface CsvRow {
  line: number;
  record: Record<string, string>;
}

type ParsedRecord = { record: Record<string, string>; info: Info };

export async function* parseCsv(
  source: AsyncIterable<Uint8Array>,
): AsyncGenerator<CsvRow> {
  const parser = parse({ columns: true, info: true });

  pipeline(decodeUtf8(source), parser, () => {});

  for await (const { record, info } of parser as AsyncIterable<ParsedRecord>) {
    yield { line: info.lines, record };
  }
}
