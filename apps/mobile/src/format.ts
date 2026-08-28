/**
 * Display helpers.
 *
 * `AGENTS.md` hard invariant 3: missing measurements remain `null`, never
 * numeric zero. Every formatter here renders absence as an em dash so a
 * missing value can never be mistaken for a measured zero on screen.
 */
export const ABSENT = "—";

export function formatNumber(
  value: number | null | undefined,
  fractionDigits = 2,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return ABSENT;
  }
  return value.toFixed(fractionDigits);
}

export function formatWithUnit(
  value: number | null | undefined,
  unit: string,
  fractionDigits = 2,
): string {
  const formatted = formatNumber(value, fractionDigits);
  return formatted === ABSENT ? ABSENT : `${formatted} ${unit}`;
}

export function formatText(value: string | null | undefined): string {
  if (value === null || value === undefined || value.trim() === "") {
    return ABSENT;
  }
  return value;
}

/** Turns `mass_balance_failed` into `Mass balance failed` for display. */
export function humanizeFailureCode(code: string): string {
  const spaced = code.replace(/_/g, " ").trim();
  if (spaced === "") return ABSENT;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
