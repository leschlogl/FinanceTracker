// Amount parsing/formatting: user-facing decimal strings (e.g. "12.99") <->
// the integer minor-units storage format (e.g. 1299 cents, see the comment on
// `spendings.amount` in src/data/schema.ts). Owned by manual spend entry
// (Feature 1.2) but shared by the spendings list (1.3) and dashboard (3.1),
// which all need to convert amounts the same way.

const MINOR_UNITS_PER_MAJOR = 100;

/**
 * Parses a user-typed decimal amount string (e.g. "12.99", "12", "12,50")
 * into integer minor units. Returns `null` if the input doesn't parse to a
 * positive finite number — callers surface a validation error at that
 * boundary rather than this function throwing.
 */
export function parseAmountInput(value: string): number | null {
  const normalized = value.trim().replace(',', '.');

  if (!/^\d+(\.\d*)?$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount * MINOR_UNITS_PER_MAJOR);
}

/**
 * Converts minor units back into a plain decimal string suitable for
 * pre-filling an editable amount input (e.g. 1299 -> "12.99"). Always "."
 * as the decimal separator, deliberately not localized — kept separate from
 * `formatCurrency` below, which is for read-only display and isn't meant to
 * round-trip back through `parseAmountInput`.
 */
export function minorUnitsToInputValue(amount: number): string {
  return (amount / MINOR_UNITS_PER_MAJOR).toFixed(2);
}

/**
 * Formats minor units as a localized currency string for read-only display
 * (list rows, dashboard totals) via `Intl.NumberFormat`, per CLAUDE.md's
 * "Currency display uses Intl.NumberFormat" rule.
 */
export function formatCurrency(amount: number, currency: string, locale?: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
    amount / MINOR_UNITS_PER_MAJOR,
  );
}
