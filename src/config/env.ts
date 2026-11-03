import "dotenv/config";
import { z } from "zod";

// CORS compares origins exactly: "https://a.com/" would never match.
// `abort: true` skips the refine when the URL is invalid (new URL would throw).
const originSchema = z.url({ protocol: /^https?$/, abort: true }).refine(
  (value) => {
    return new URL(value).origin === value;
  },
  {
    message:
      "must be an origin without a path or trailing slash (e.g. https://example.com)",
  },
);

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .pipe(z.array(originSchema)),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}

export const env = parseEnv(process.env);
