import type { TextResult } from "./types";
import type { Processor } from "../../shared/processor";
import type { Readable } from "node:stream";
import { TextCounter } from "./text-counter";
import { decodeUtf8 } from "../../shared/decode-utf8";

export class TextProcessor implements Processor<TextResult> {
  async process(input: Readable): Promise<TextResult> {
    const counter = new TextCounter();

    for await (const text of decodeUtf8(input)) {
      counter.push(text);
    }

    return { kind: "text", ...counter.finish() };
  }
}
