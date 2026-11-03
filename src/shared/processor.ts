import type { Readable } from "node:stream";

/** Consumes a byte stream and resolves with the result of one file type. */
export interface Processor<TResult> {
  process(input: Readable): Promise<TResult>;
}
