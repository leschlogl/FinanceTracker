import { useCallback, useEffect, useState } from 'react';

import {
  getRecurringExpenseRepository,
  type CreateRecurringExpenseInput,
  type RecurringExpense,
  type RecurringExpenseRepository,
  type UpdateRecurringExpenseInput,
} from '@/data/recurringExpenseRepository';

/**
 * Loads recurring expenses from the given repository (the real on-device one
 * by default) and exposes create/update/delete actions that refresh the list
 * afterwards. Mirrors src/features/categories/useCategories.ts's shape and
 * effect patterns (including its set-state-in-effect comment, which applies
 * here identically). `repository` is overridable so the screen can be
 * rendered in tests against a test/fake `RecurringExpenseRepository` instead
 * of the real expo-sqlite-backed singleton.
 *
 * Uses `listActive()` (the repository's only list method — there's no plain
 * `list()`) since this feature has no "deactivate without deleting" UI; every
 * recurring expense created through this screen stays active until deleted.
 */
export function useRecurringExpenses(
  repository: RecurringExpenseRepository = getRecurringExpenseRepository(),
) {
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await repository.listActive();
      setRecurringExpenses(list);
      setError(null);
    } catch {
      setError('loading');
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    let ignore = false;

    repository
      .listActive()
      .then((list) => {
        if (!ignore) {
          setRecurringExpenses(list);
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
  }, [repository]);

  const addRecurringExpense = useCallback(
    async (input: CreateRecurringExpenseInput) => {
      try {
        await repository.create(input);
        await refresh();
        return true;
      } catch {
        setError('saving');
        return false;
      }
    },
    [repository, refresh],
  );

  const updateRecurringExpense = useCallback(
    async (id: string, input: UpdateRecurringExpenseInput) => {
      try {
        await repository.update(id, input);
        await refresh();
        return true;
      } catch {
        setError('saving');
        return false;
      }
    },
    [repository, refresh],
  );

  const removeRecurringExpense = useCallback(
    async (id: string) => {
      try {
        await repository.delete(id);
        await refresh();
        return true;
      } catch {
        setError('deleting');
        return false;
      }
    },
    [repository, refresh],
  );

  return {
    recurringExpenses,
    loading,
    error,
    addRecurringExpense,
    updateRecurringExpense,
    removeRecurringExpense,
    refresh,
  };
}
