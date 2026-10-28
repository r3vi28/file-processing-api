import { TextCounter } from "../text-counter";

function countCharacters(...chunks: string[]): number {
  const counter = new TextCounter();
  for (const chunk of chunks) {
    counter.push(chunk);
  }
  return counter.finish().characters;
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
    expect(countCharacters("é")).toBe(2);
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
