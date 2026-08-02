import { useCallback, useEffect, useState } from 'react';

import {
  getSpendingRepository,
  type CreateSpendingInput,
  type Spending,
  type SpendingRepository,
  type UpdateSpendingInput,
} from '@/data/spendingRepository';

/**
 * Loads a single spending by id (for the Confirm Spend screen's edit mode)
 * against the given repository (the real on-device one by default) and
 * exposes create/update/delete actions. `spendingId` is optional so this
 * hook also works purely for its actions — e.g. Feature 1.3 (spendings list)
 * can call `useSpending().deleteSpending` from its list rows without loading
 * any particular spending here, per docs/features/03-manual-spend-entry.md
 * ("expose a deleteSpending action/hook ... that Feature 1.3 will wire into
 * its list rows").
 */
export function useSpending(
  spendingId?: string,
  repository: SpendingRepository = getSpendingRepository(),
) {
  const [spending, setSpending] = useState<Spending | null>(null);
  const [loading, setLoading] = useState(Boolean(spendingId));
  const [error, setError] = useState<string | null>(null);

  // Not written as an async function called directly at the effect's top
  // level, mirroring the pattern in src/features/categories/useCategories.ts
  // (see the comment there re: react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!spendingId) {
      // `loading` already initializes to `false` in this case (see useState
      // above), so there's nothing to synchronize here.
      return;
    }

    // `loading` already initializes to `true` here (spendingId is present on
    // the first render whenever it's ever present — see useState above), so
    // there's no synchronous setLoading(true) needed at the top of the effect.
    let ignore = false;

    repository
      .getById(spendingId)
      .then((result) => {
        if (!ignore) {
          setSpending(result);
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
  }, [spendingId, repository]);

  const createSpending = useCallback(
    async (input: CreateSpendingInput): Promise<Spending | null> => {
      try {
        const created = await repository.create(input);
        setError(null);
        return created;
      } catch {
        setError('saving');
        return null;
      }
    },
    [repository],
  );

  const updateSpending = useCallback(
    async (id: string, input: UpdateSpendingInput): Promise<Spending | null> => {
      try {
        const updated = await repository.update(id, input);
        setError(null);
        return updated;
      } catch {
        setError('saving');
        return null;
      }
    },
    [repository],
  );

  const deleteSpending = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await repository.delete(id);
        setError(null);
        return true;
      } catch {
        setError('deleting');
        return false;
      }
    },
    [repository],
  );

  return { spending, loading, error, createSpending, updateSpending, deleteSpending };
}
