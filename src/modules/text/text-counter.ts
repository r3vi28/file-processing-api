import type { TextResult } from "./types";

export type TextCounts = Omit<TextResult, "kind">;

const WHITESPACE = /\s/;

/**
 * Streaming counter: call `push` for each decoded chunk, then `finish` once.
 * State is kept between chunks, so words and CRLF split across chunks are
 * counted correctly. Characters are counted as code points.
 */
export class TextCounter {
  private characters = 0;
  private words = 0;
  private inWord = false;
  private lineBreaks = 0;
  private previousWasCR = false;
  private endsWithBreak = false;

  push(chunk: string): void {
    for (const char of chunk) {
      this.characters++;

      // CRLF counts as one break; a lone CR also counts (old Mac line endings)
      if (char === "\r") {
        this.lineBreaks++;
      } else if (char === "\n" && !this.previousWasCR) {
        this.lineBreaks++;
      }

      this.previousWasCR = char === "\r";
      this.endsWithBreak = char === "\r" || char === "\n";

      if (WHITESPACE.test(char)) {
        this.inWord = false;
      } else if (!this.inWord) {
        this.words++;
        this.inWord = true;
      }
    }
  }

  finish(): TextCounts {
    // A trailing newline does not start a new line; non-empty text without one does
    const lines =
      this.lineBreaks + (this.characters > 0 && !this.endsWithBreak ? 1 : 0);

    return {
      characters: this.characters,
      words: this.words,
      lines,
    };
  }
}
