import { z } from "zod";
import { toNumber } from "../transformers";
import { validateRow } from "../validate-row";

// a small schema built only for these tests; real presets come in tasks 10-11
const personSchema = z.object({
  name: z.string().min(1, "Required"),
  age: z.string().transform((value, ctx) => {
    const age = toNumber(value);
    if (age === null) {
      ctx.addIssue({ code: "custom", message: "Expected a number" });
      return z.NEVER;
    }
    return age;
  }),
});

describe("validateRow", () => {
  it("returns the validated and transformed data for a valid row", () => {
    const result = validateRow(personSchema, { name: "Ana", age: "30" });

    expect(result).toEqual({ success: true, data: { name: "Ana", age: 30 } });
  });

  it("keeps the type of the schema output", () => {
    const result = validateRow(personSchema, { name: "Ana", age: "30" });

    if (!result.success) {
      throw new Error("expected a valid row");
    }
    // fails `pnpm typecheck` if data is not typed as { name: string; age: number }
    const age: number = result.data.age;
    expect(age).toBe(30);
  });

  it("drops columns that the schema does not define", () => {
    const result = validateRow(personSchema, {
      name: "Ana",
      age: "30",
      notes: "extra",
    });

    expect(result).toEqual({ success: true, data: { name: "Ana", age: 30 } });
  });

  it("does not change the record it receives", () => {
    const record = { name: "Ana", age: "30" };

    validateRow(personSchema, record);

    expect(record).toEqual({ name: "Ana", age: "30" });
  });

  it("reports an invalid field as 'column: message'", () => {
    const result = validateRow(personSchema, { name: "Ana", age: "abc" });

    expect(result).toEqual({
      success: false,
      reasons: ["age: Expected a number"],
    });
  });

  it("reports every invalid field, in schema order", () => {
    const result = validateRow(personSchema, { name: "", age: "abc" });

    expect(result).toEqual({
      success: false,
      reasons: ["name: Required", "age: Expected a number"],
    });
  });

  it("reports every problem of the same field", () => {
    const schema = z.object({
      code: z
        .string()
        .min(3, "Too short")
        .regex(/^[a-z]+$/, "Only lowercase letters"),
    });

    const result = validateRow(schema, { code: "A1" });

    expect(result).toEqual({
      success: false,
      reasons: ["code: Too short", "code: Only lowercase letters"],
    });
  });

  it("reports a problem of the whole row without a column prefix", () => {
    const schema = z
      .object({ min: z.string(), max: z.string() })
      .refine((row) => row.min <= row.max, "min must not be greater than max");

    const result = validateRow(schema, { min: "b", max: "a" });

    expect(result).toEqual({
      success: false,
      reasons: ["min must not be greater than max"],
    });
  });

  it("marks the row instead of throwing when a transformation throws", () => {
    // known bug in csv-processor: a throwing transformation crashed the whole pipeline
    const schema = z.object({
      value: z.string().transform(() => {
        throw new Error("boom");
      }),
    });

    expect(validateRow(schema, { value: "x" })).toEqual({
      success: false,
      reasons: ["Could not process row: boom"],
    });
  });

  it("marks the row when a transformation throws something that is not an Error", () => {
    const schema = z.object({
      value: z.string().transform(() => {
        throw "oops";
      }),
    });

    expect(validateRow(schema, { value: "x" })).toEqual({
      success: false,
      reasons: ["Could not process row"],
    });
  });
});
