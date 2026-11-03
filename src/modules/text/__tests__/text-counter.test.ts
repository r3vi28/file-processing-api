import { TextCounter } from "../text-counter";

function countCharacters(...chunks: string[]): number {
  const counter = new TextCounter();
  for (const chunk of chunks) {
    counter.push(chunk);
  }
  return counter.finish().characters;
}

function countWords(...chunks: string[]): number {
  const counter = new TextCounter();
  for (const chunk of chunks) {
    counter.push(chunk);
  }
  return counter.finish().words;
}

function countLines(...chunks: string[]): number {
  const counter = new TextCounter();
  for (const chunk of chunks) {
    counter.push(chunk);
  }
  return counter.finish().lines;
}

describe("TextCounter characters", () => {
  it("counts 0 when nothing is pushed", () => {
    expect(countCharacters()).toBe(0);
  });

  it("counts 0 for an empty chunk", () => {
    expect(countCharacters("")).toBe(0);
  });

  it("counts ASCII characters", () => {
    expect(countCharacters("hello")).toBe(5);
  });

  it("adds up characters across chunks", () => {
    expect(countCharacters("hel", "", "lo")).toBe(5);
  });

  it("counts whitespace and line breaks as characters", () => {
    expect(countCharacters("a b\n", "\r\n", "\t")).toBe(7);
  });

  it("counts an accented letter once, not by its UTF-8 bytes", () => {
    // "é" is 2 bytes in UTF-8
    expect(countCharacters("café")).toBe(4);
  });

  it("counts CJK characters once each", () => {
    // each one is 3 bytes in UTF-8
    expect(countCharacters("日本語")).toBe(3);
  });

  it("counts an emoji once, not by its UTF-16 code units", () => {
    // "😀".length is 2 in JavaScript (a surrogate pair)
    expect(countCharacters("😀")).toBe(1);
  });

  it("counts code points, not user-perceived characters", () => {
    // "e" + combining acute accent: looks like one "é", but it is two code points
    expect(countCharacters("e\u0301")).toBe(2);
  });

  it("keeps a separate count per instance", () => {
    const first = new TextCounter();
    const second = new TextCounter();

    first.push("abc");
    second.push("de");

    expect(first.finish().characters).toBe(3);
    expect(second.finish().characters).toBe(2);
  });
});

describe("TextCounter words", () => {
  it("counts 0 when nothing is pushed", () => {
    expect(countWords()).toBe(0);
  });

  it("counts 0 when there is only whitespace", () => {
    expect(countWords(" \t\n\r\n ")).toBe(0);
  });

  it("counts a single word", () => {
    expect(countWords("hello")).toBe(1);
  });

  it("counts words separated by spaces", () => {
    expect(countWords("hello world")).toBe(2);
  });

  it("ignores leading, trailing and repeated whitespace", () => {
    expect(countWords("  hello   world  ")).toBe(2);
  });

  it("separates words with tabs and line feeds", () => {
    expect(countWords("a\tb\nc")).toBe(3);
  });

  it("does not count an empty CRLF line as a word", () => {
    // known bug in file-processor: "\r" did not separate words
    expect(countWords("a\r\n\r\nb")).toBe(2);
  });

  it("separates words with a lone carriage return", () => {
    expect(countWords("a\rb")).toBe(2);
  });

  it("separates words with a non-breaking space, a vertical tab and a form feed", () => {
    // known bug in file-processor: NBSP, \v and \f did not separate words
    expect(countWords("a\u00A0b\vc\fd")).toBe(4);
  });

  it("separates words with other Unicode spaces", () => {
    // em space and ideographic space
    expect(countWords("a\u2003b\u3000c")).toBe(3);
  });

  it("keeps punctuation as part of the word", () => {
    expect(countWords("don't stop-now, ok.")).toBe(3);
  });

  it("counts words made of non-ASCII characters", () => {
    expect(countWords("café 日本語 😀")).toBe(3);
  });

  it("counts a word split across two chunks once", () => {
    expect(countWords("hel", "lo")).toBe(1);
  });

  it("counts a word split across many chunks once", () => {
    expect(countWords("a", "b", "", "c")).toBe(1);
  });

  it("counts the words on both sides of a split", () => {
    expect(countWords("hello wo", "rld again")).toBe(3);
  });

  it("separates words when the whitespace is at the end of a chunk", () => {
    expect(countWords("hello ", "world")).toBe(2);
  });

  it("separates words when the whitespace is at the start of a chunk", () => {
    expect(countWords("hello", " world")).toBe(2);
  });

  it("keeps a separate word state per instance", () => {
    const first = new TextCounter();
    const second = new TextCounter();

    first.push("hel");
    second.push("lo");

    expect(first.finish().words).toBe(1);
    expect(second.finish().words).toBe(1);
  });
});

describe("TextCounter lines", () => {
  it("counts 0 when nothing is pushed", () => {
    expect(countLines()).toBe(0);
  });

  it("counts 0 for an empty chunk", () => {
    expect(countLines("")).toBe(0);
  });

  it("counts 1 line for text without a line break", () => {
    expect(countLines("a")).toBe(1);
  });

  it("counts a line made only of spaces", () => {
    expect(countLines("   ")).toBe(1);
  });

  it("does not add a line for a trailing line break", () => {
    expect(countLines("a\n")).toBe(1);
  });

  it("counts the last line when there is no trailing line break", () => {
    expect(countLines("a\nb")).toBe(2);
  });

  it("counts a single line break as one empty line", () => {
    expect(countLines("\n")).toBe(1);
  });

  it("counts empty lines", () => {
    expect(countLines("a\n\n")).toBe(2);
    expect(countLines("\n\n\n")).toBe(3);
  });

  it("counts CRLF as a single line break", () => {
    expect(countLines("a\r\nb\r\n")).toBe(2);
    expect(countLines("\r\n")).toBe(1);
  });

  it("counts a lone carriage return as a line break", () => {
    expect(countLines("a\rb")).toBe(2);
    expect(countLines("a\r")).toBe(1);
  });

  it("counts a carriage return followed by CRLF as two line breaks", () => {
    expect(countLines("a\r\r\n")).toBe(2);
  });

  it("handles mixed line endings", () => {
    expect(countLines("a\nb\r\nc\rd")).toBe(4);
  });

  it("counts CRLF split across two chunks once", () => {
    expect(countLines("a\r", "\nb")).toBe(2);
  });

  it("counts a carriage return at the end of a chunk when the next chunk does not start with a line feed", () => {
    expect(countLines("a\r", "b")).toBe(2);
    expect(countLines("a\r", "\r\n")).toBe(2);
  });

  it("applies the trailing line break rule to the last chunk, not to each chunk", () => {
    expect(countLines("a\n", "b")).toBe(2);
    expect(countLines("a", "\n", "")).toBe(1);
  });

  it("returns the same counts when finish is called twice", () => {
    const counter = new TextCounter();
    counter.push("a\nb");

    expect(counter.finish()).toEqual(counter.finish());
    expect(counter.finish().lines).toBe(2);
  });

  it("keeps a separate line state per instance", () => {
    const first = new TextCounter();
    const second = new TextCounter();

    first.push("a\r");
    second.push("\nb");

    expect(first.finish().lines).toBe(1);
    expect(second.finish().lines).toBe(2);
  });
});
