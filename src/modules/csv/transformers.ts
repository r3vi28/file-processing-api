const STRICT_NUMBER = /^[+-]?\d+(\.\d+)?$/;
const TRUE_VALUES = new Set(["true", "1"]);
const FALSE_VALUES = new Set(["false", "0"]);

export function toNumber(value: string): number | null {
  const cleanedValue = value.trim();
  if (!STRICT_NUMBER.test(cleanedValue)) {
    return null;
  }

  return Number(cleanedValue);
}

export function toBoolean(value: string): boolean | null {
  const cleanedValue = value.trim().toLowerCase();

  if (TRUE_VALUES.has(cleanedValue)) {
    return true;
  }

  if (FALSE_VALUES.has(cleanedValue)) {
    return false;
  }

  return null;
}
