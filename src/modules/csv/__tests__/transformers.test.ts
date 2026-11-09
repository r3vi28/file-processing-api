import { toBoolean, toNumber } from "../transformers";

describe("toNumber", () => {
  it.each([
    ["30", 30],
    ["0", 0],
    ["-5", -5],
    ["+5", 5],
    ["0.5", 0.5],
    ["19.99", 19.99],
  ])("converts %j to %j", (input, expected) => {
    expect(toNumber(input)).toBe(expected);
  });

  it("keeps decimals instead of truncating them", () => {
    // known bug in csv-processor: parseInt turned "30.7" into 30
    expect(toNumber("30.7")).toBe(30.7);
  });

  it("ignores spaces around the number", () => {
    expect(toNumber("  42 ")).toBe(42);
  });

  it.each([
    ["an empty value", ""],
    ["a value with only spaces", "   "],
  ])("returns null for %s, not 0", (_label, input) => {
    // known bug in csv-processor: "" was converted to 0 and counted in averages
    expect(toNumber(input)).toBeNull();
  });

  it.each([
    ["text", "abc"],
    ["a number followed by text", "30abc"],
    ["a decimal comma", "1,5"],
    ["a space inside the number", "1 000"],
    ["two dots", "1.2.3"],
    ["a hexadecimal number", "0x10"],
    ["exponent notation", "1e3"],
    ["Infinity", "Infinity"],
    ["NaN", "NaN"],
    ["a lone sign", "-"],
    ["a lone dot", "."],
  ])("returns null for %s (%j)", (_label, input) => {
    expect(toNumber(input)).toBeNull();
  });
});

describe("toBoolean", () => {
  it.each([
    ["true", true],
    ["1", true],
    ["false", false],
    ["0", false],
  ])("converts %j to %j", (input, expected) => {
    expect(toBoolean(input)).toBe(expected);
  });

  it.each([
    ["TRUE", true],
    ["True", true],
    ["FALSE", false],
  ])("ignores case: %j is %j", (input, expected) => {
    expect(toBoolean(input)).toBe(expected);
  });

  it.each([
    [" true", true],
    ["true ", true],
    [" 0 ", false],
  ])("ignores spaces around the value: %j is %j", (input, expected) => {
    // known bug in csv-processor: " true" passed validation and became false
    expect(toBoolean(input)).toBe(expected);
  });

  it.each(["", "   ", "yes", "no", "maybe", "2", "truee", "t", "1.0"])(
    "returns null for %j instead of guessing false",
    (input) => {
      expect(toBoolean(input)).toBeNull();
    },
  );
});
