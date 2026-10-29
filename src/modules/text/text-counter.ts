import type { TextResult } from "./types";

export type TextCounts = Omit<TextResult, "kind">;

const WHITESPACE = /\s/;

export class TextCounter {
  private characters = 0;
  private words = 0;
  private inWord = false;

  push(chunk: string): void {
    for (const char of chunk) {
      this.characters++;

      if (WHITESPACE.test(char)) {
        this.inWord = false;
      } else if (!this.inWord) {
        this.words++;
        this.inWord = true;
      }
    }
  }

  finish(): TextCounts {
    return {
      characters: this.characters,
      words: this.words,
      lines: 0,
    };
  }
}
