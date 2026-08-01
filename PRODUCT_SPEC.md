# PRODUCT_SPEC.md — FinanceTracker

This is the functional spec: what the app supports and how it behaves. See `CLAUDE.md` for engineering rules/stack.

## Overview

FinanceTracker is a personal, iOS-first spend-tracking app. Its core hook is that Apple Pay purchases can be captured into the app with minimal manual effort via an iOS Shortcuts automation, then organized into monthly, categorized spendings with a current-month dashboard.

## ApplePay capture flow

iOS does not allow one app to read another app's notifications, so automatic "listening" for Apple Pay notifications isn't possible. Instead, capture is driven by the **iOS Shortcuts "Apple Pay Transaction" Personal Automation**, which the user sets up once in the Shortcuts app to open a deep link whenever a payment happens.

**Deep link contract:** `financetracker://add-spend?amount=&merchant=&currency=`

- `amount` — best-effort from Shortcuts, may be absent
- `merchant` — best-effort from Shortcuts, may be absent
- `currency` — optional; defaults to the user's configured currency if not provided

All params are treated as pre-fill hints, not trusted final values — the user always confirms before saving.

**Flow:**
1. **Onboarding**: an in-app screen with step-by-step instructions for creating the Shortcuts automation (the app cannot configure this on the user's behalf).
2. **On deep link received**: open a "Confirm Spend" screen pre-filled with amount/merchant/currency. Category is required (no default), date defaults to now, note is optional.
3. **Save**: spend is persisted with `source: 'shortcut'`.
4. **Manual entry**: a "+ Add Spend" action is always available for purchases not made via Apple Pay (or if the automation didn't fire), using the same Confirm Spend screen with `source: 'manual'`.

## Spendings list

- Grouped by month.
- Filterable by category.
- Searchable — free-text search across merchant and note.
- Each row: merchant, category, amount, date.
- Supports edit and delete on existing entries.

## Recurring expenses

- User can define recurring expenses (e.g. Rent, subscriptions) with a name, amount, category, and a day of the month they recur on.
- User can add, edit, and remove recurring expenses at any time.
- Each period, the app generates a normal spend entry from the active recurring expense definition (`source: 'recurring'`), so recurring expenses appear in the Spendings list and dashboard like any other spend.
- Editing a recurring expense's amount (e.g. a rent increase) only affects entries generated from that point forward. Already-generated past entries keep the amount they were created with — each is its own saved spend row, not a live reference back to the recurring expense.

## Dashboard

- **Current month**: total spent, spend-by-category breakdown (chart), simple comparison against the previous month's total.
- **Yearly view**: total spent per month across the year (chart), spend-by-category breakdown for the year — same underlying spend data, aggregated over 12 months instead of one.
- Once income tracking lands (see Roadmap), the dashboard expands to also show income, savings (income − expenses), and cash flow for the selected period — not v1 until income exists.

## Categories

- Predefined defaults: Food, Transport, Shopping, Bills, Entertainment, Health, Other.
- Users can add, rename, recolor, and delete categories.
- Deleting a category reassigns its existing spends to "Other" rather than deleting the spend data.

## Settings

- **Currency** — the user's home currency, used for display formatting in v1 (no conversion between currencies yet) and as the conversion target once multi-currency lands (see Roadmap).
- **Language** — in-app language switch.
- **Appearance** — Light / Dark / System, defaults to System.
- **Manage categories** — same add/edit/delete capability as above, surfaced from Settings.
- **Export data to CSV** — exports full spending history via the native share sheet.
- *Documented for later, not v1*: iCloud sync toggle, backend account / multi-device sync.

## Data model (conceptual)

```
Spending {
  id
  amount
  currency
  merchant
  categoryId
  date
  note
  source: 'shortcut' | 'manual' | 'recurring'
}

Category {
  id
  name
  color
  icon
}

RecurringExpense {
  id
  name
  amount
  categoryId
  dayOfMonth
  active
}
```

## Roadmap / Future Enhancements (not v1)

Directionally agreed but intentionally deferred — do not build until explicitly requested. Documented now so scope and feasibility constraints aren't lost by the time this gets picked up.

### Budget & income tracking
- User defines a monthly budget (overall and/or per category).
- User records income as **Brutto** (gross) and **Netto** (net).
- Dashboard compares spendings against budget and income, and unlocks the savings/cash-flow views described in Dashboard above.

### Automatic merchant recognition & categorization
Goal: reduce/remove the manual category step on each spend, on-device (no data leaves the phone).

- **Phase 1 (near-term target)**: normalize merchant strings (strip store numbers/suffixes, e.g. "STARBUCKS #1234" → "starbucks"), match against a bundled merchant→category dictionary, and — the highest-value part — remember the user's own past choices, so a merchant categorized once is auto-applied next time. No ML needed; pure logic, works in the app as-is.
- **Phase 2 (stretch)**: for merchants the dictionary/history don't resolve, an on-device text classifier trained via Apple's Create ML / Natural Language framework, shipped as a Core ML model. Fully on-device, no network calls. Requires an **Expo Development Build** (EAS-built custom dev client) since Core ML isn't reachable from plain Expo Go — still managed workflow, not ejecting.
- User can always override the suggested category; overrides feed back into the learned history from Phase 1.

### Automatic recurring-expense detection
Distinct from the manual Recurring Expenses feature already in v1 (where the user defines "Rent" etc. themselves). This would be the app noticing a recurring pattern on its own (same/similar merchant, similar amount, roughly monthly cadence) and suggesting it as a recurring expense. Flagged as genuinely hard — noisy merchant names and amount variance make this prone to false positives/negatives. No concrete approach agreed yet; revisit once Phase 1 of merchant categorization (above) exists, since the two share the "normalize + match" groundwork.

### Investments
- Bring in investment/portfolio data from Trade Republic and Deutsche Bank (Germany) alongside spending, likely via CSV import rather than direct API integration.

### Multi-currency
- Each spend can already be in its own currency (see `Spending.currency` in the data model) — that part doesn't need to change.
- What's deferred is converting everything to the user's home currency for totals/dashboard. Planned approach: fetch exchange rates from a free API (e.g. Frankfurter, ECB-based, no key required), cached locally by calendar date — checked once per day at most (on app open), not on every transaction. Haven't found a better source than an API for this — manual rate entry or a bundled static table would just go stale.
- **Refresh behavior**: on app foreground, if no rate is cached for today, fetch one and store it date-stamped. If the fetch fails (offline), keep using the most recently cached rate rather than blocking spend entry on connectivity — this matters especially for Apple Pay/Shortcut-triggered captures, which can happen without the user actively online.
- **Rate snapshot**: every spend — manual, Shortcut, or recurring-generated — records the rate that was active at the moment it's created, directly on the row. This keeps historical totals accurate even if the cached rate later changes or the API becomes unreachable. (One accepted quirk: if the source updates its rate mid-day, spends added before vs. after the next app-open that day can end up with slightly different rates — fine for a personal tracker.)

## Non-goals for v1

- Android support
- Automatic notification reading (not possible on iOS without Shortcuts)
- Converting between currencies for totals/dashboard (per-spend currency is already tracked; see Roadmap)
- Budget/income tracking, investments, automatic merchant categorization, and automatic recurring-expense detection (see Roadmap above — deferred, not abandoned)

These are explicitly out of scope for v1 so work doesn't silently expand beyond what's been agreed. If any of these become desired sooner, update this file first.
