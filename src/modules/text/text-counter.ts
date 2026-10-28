import type { TextResult } from "./types";

export type TextCounts = Omit<TextResult, "kind">;

export class TextCounter {
  private characters = 0;

  push(chunk: string): void {
    this.characters += Array.from(chunk).length;
  }

  finish(): TextCounts {
    return {
      characters: this.characters,
      words: 0,
      lines: 0,
    };
  }
}
