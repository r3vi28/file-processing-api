import type { Readable } from "node:stream";

export interface Processor<TResult> {
  process(input: Readable): Promise<TResult>;
}
