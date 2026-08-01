import type { SFSymbol } from 'sf-symbols-typescript';

// Simple preset swatches for v1 (see docs/features/02-categories-management.md):
// a full color picker / free-text icon input isn't needed, a curated list is
// enough and avoids an invalid-icon-name failure mode later.
export const CATEGORY_COLOR_PRESETS: string[] = [
  '#FF9500', // orange
  '#007AFF', // blue
  '#AF52DE', // purple
  '#FF3B30', // red
  '#5856D6', // indigo
  '#34C759', // green
  '#8E8E93', // gray
  '#FF2D55', // pink
  '#5AC8FA', // teal
  '#FFCC00', // yellow
];

// Includes the icons used by the seeded default categories (see
// src/data/seedCategories.ts) plus a handful of other common category icons.
export const CATEGORY_ICON_PRESETS: SFSymbol[] = [
  'fork.knife',
  'car.fill',
  'bag.fill',
  'doc.text.fill',
  'film.fill',
  'heart.fill',
  'house.fill',
  'airplane',
  'gamecontroller.fill',
  'book.fill',
  'pawprint.fill',
  'gift.fill',
  'cart.fill',
  'creditcard.fill',
  'wrench.and.screwdriver.fill',
  'tag.fill',
  'graduationcap.fill',
  'ellipsis.circle.fill',
];
