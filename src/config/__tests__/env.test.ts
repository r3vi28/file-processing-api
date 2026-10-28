import { env, parseEnv } from "../env";

describe("parseEnv", () => {
  describe("valid input", () => {
    it("applies defaults when the variables are not set", () => {
      expect(parseEnv({})).toEqual({
        NODE_ENV: "development",
        PORT: 3000,
        CORS_ORIGINS: [],
      });
    });

    it("accepts valid values and converts PORT to a number", () => {
      const result = parseEnv({
        NODE_ENV: "production",
        PORT: "8080",
        CORS_ORIGINS: "https://example.com",
      });

      expect(result).toEqual({
        NODE_ENV: "production",
        PORT: 8080,
        CORS_ORIGINS: ["https://example.com"],
      });
    });

    it("splits CORS_ORIGINS by commas, trimming spaces and dropping empty entries", () => {
      const result = parseEnv({
        CORS_ORIGINS: " http://localhost:5173 , https://example.com ,",
      });

      expect(result.CORS_ORIGINS).toEqual([
        "http://localhost:5173",
        "https://example.com",
      ]);
    });

    it("ignores variables it does not know", () => {
      const result = parseEnv({ HOME: "/home/user", PATH: "/usr/bin" });

      expect(result).not.toHaveProperty("HOME");
      expect(result).not.toHaveProperty("PATH");
    });
  });

  describe("invalid input", () => {
    it.each(["staging", ""])("rejects NODE_ENV=%j", (value) => {
      expect(() => parseEnv({ NODE_ENV: value })).toThrow(/NODE_ENV/);
    });

    it.each(["abc", "0", "65536", "3000.5", ""])("rejects PORT=%j", (value) => {
      expect(() => parseEnv({ PORT: value })).toThrow(/PORT/);
    });

    it.each([
      "not-a-url",
      "ftp://example.com",
      "https://example.com/",
      "https://example.com/app",
    ])("rejects the CORS origin %j", (value) => {
      expect(() => parseEnv({ CORS_ORIGINS: value })).toThrow(/CORS_ORIGINS/);
    });

    it("reports every invalid variable in a single error", () => {
      const parse = () => parseEnv({ NODE_ENV: "staging", PORT: "abc" });

      expect(parse).toThrow(/Invalid environment variables/);
      expect(parse).toThrow(/NODE_ENV/);
      expect(parse).toThrow(/PORT/);
    });
  });
});

describe("env", () => {
  it("is parsed from process.env when the module loads", () => {
    // Jest sets NODE_ENV to "test" before running the tests.
    expect(env.NODE_ENV).toBe("test");
  });
});
