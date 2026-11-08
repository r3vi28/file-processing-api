import type { z } from "zod";

export interface InvalidRow {
  line: number;
  reasons: string[];
}

type BaseMetric = { label: string };

export type Metric =
  | (BaseMetric & { type: "number"; value: number | null })
  | (BaseMetric & { type: "counts"; counts: Record<string, number> })
  | (BaseMetric & { type: "top"; value: string | null; count: number });

export interface CsvResult {
  kind: "csv";
  preset: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  invalidSample: InvalidRow[];
  metrics: Metric[];
}

export interface Analyzer<TRow> {
  add(row: TRow): void;
  finish(): Metric[];
}

export interface Preset<TRow> {
  name: string;
  description: string;
  columns: readonly string[];
  schema: z.ZodType<TRow>;
  createAnalyzer(): Analyzer<TRow>;
}
