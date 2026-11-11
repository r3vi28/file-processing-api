import type { z } from "zod";

export type RowValidation<TRow> =
  { success: true; data: TRow } | { success: false; reasons: string[] };

function formatIssue(issue: z.core.$ZodIssue): string {
  if (issue.path.length === 0) {
    return issue.message;
  }

  const column = issue.path.map((key) => String(key)).join(".");

  return `${column}: ${issue.message}`;
}

export function validateRow<TRow>(
  schema: z.ZodType<TRow>,
  record: Record<string, string>,
): RowValidation<TRow> {
  let result: ReturnType<typeof schema.safeParse>;

  try {
    result = schema.safeParse(record);
  } catch (error: unknown) {
    const reason =
      error instanceof Error
        ? `Could not process row: ${error.message}`
        : "Could not process row";
    return { success: false, reasons: [reason] };
  }

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, reasons: result.error.issues.map(formatIssue) };
}
