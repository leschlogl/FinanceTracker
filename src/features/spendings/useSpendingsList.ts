import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  getSpendingRepository,
  type Spending,
  type SpendingRepository,
} from '@/data/spendingRepository';

import { groupSpendingsByMonth, type SpendingMonthSection } from './groupSpendingsByMonth';

/**
 * How many trailing calendar months (including the current one) to fetch and
 * group. SpendingRepository.list() is scoped to a single {year, month} per
 * call (see src/data/spendingRepository.ts) — there's no range query — so
 * fetching "a reasonable window" (per this feature's implementation notes)
 * means issuing one list() call per month in the window via Promise.all and
 * merging the results in a single coordinated fetch, rather than querying
 * lazily per rendered section as the user scrolls (which would be the
 * architecture the notes are actually steering away from).
 */
const MONTHS_WINDOW = 12;

function trailingMonths(count: number, from: Date): { year: number; month: number }[] {
  const months: { year: number; month: number }[] = [];

  for (let offset = 0; offset < count; offset += 1) {
    const date = new Date(from.getFullYear(), from.getMonth() - offset, 1);
    months.push({ year: date.getFullYear(), month: date.getMonth() + 1 });
  }

  return months;
}

async function fetchTrailingMonths(
  repository: SpendingRepository,
  categoryId: string | null | undefined,
  search: string | undefined,
): Promise<Spending[]> {
  const months = trailingMonths(MONTHS_WINDOW, new Date());
  const trimmedSearch = search?.trim() || undefined;

  const results = await Promise.all(
    months.map(({ year, month }) =>
      repository.list({ year, month, categoryId: categoryId ?? undefined, search: trimmedSearch }),
    ),
  );

  return results.flat();
}

type UseSpendingsListOptions = {
  categoryId?: string | null;
  search?: string;
};

/**
 * Loads the last MONTHS_WINDOW months of spendings from the given repository
 * (the real on-device one by default), filtering at the repository level
 * (categoryId/search are passed straight through to
 * SpendingRepository.list(), which already supports both — see
 * docs/features/04-spendings-list.md), and groups the merged result by month
 * for SectionList. Refetches whenever the category filter or search term
 * changes.
 */
export function useSpendingsList(
  { categoryId, search }: UseSpendingsListOptions = {},
  repository: SpendingRepository = getSpendingRepository(),
): {
  sections: SpendingMonthSection[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [spendings, setSpendings] = useState<Spending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Not written as a call to `refresh` directly at the effect's top level,
  // mirroring src/features/categories/useCategories.ts's pattern (see its
  // comment re: react-hooks/set-state-in-effect) — `fetchTrailingMonths`
  // itself never calls setState, only the `.then`/`.catch`/`.finally`
  // continuations here do.
  useEffect(() => {
    let ignore = false;

    fetchTrailingMonths(repository, categoryId, search)
      .then((results) => {
        if (!ignore) {
          setSpendings(results);
          setError(null);
        }
      })
      .catch(() => {
        if (!ignore) {
          setError('loading');
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [repository, categoryId, search]);

  const refresh = useCallback(async () => {
    try {
      const results = await fetchTrailingMonths(repository, categoryId, search);
      setSpendings(results);
      setError(null);
    } catch {
      setError('loading');
    }
  }, [repository, categoryId, search]);

  const sections = useMemo(() => groupSpendingsByMonth(spendings), [spendings]);

  return { sections, loading, error, refresh };
}
