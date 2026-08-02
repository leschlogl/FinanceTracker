import { useCallback, useEffect, useState } from 'react';

import {
  getCategoryRepository,
  type Category,
  type CategoryRepository,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '@/data/categoryRepository';

/**
 * Loads categories from the given repository (the real on-device one by
 * default) and exposes create/update/delete actions that refresh the list
 * afterwards. `repository` is overridable so screens can be rendered in
 * tests against a test/mock `CategoryRepository` instead of the real
 * expo-sqlite-backed singleton.
 */
export function useCategories(repository: CategoryRepository = getCategoryRepository()) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await repository.list();
      setCategories(list);
      setError(null);
    } catch {
      setError('loading');
    } finally {
      setLoading(false);
    }
  }, [repository]);

  // Not written as `refresh()` here on purpose: the react-hooks/set-state-in-effect
  // lint rule flags calling a (transitively) setState-calling function directly at
  // an effect's top level. Doing the fetch + all setState calls via .then/.catch
  // instead mirrors the pattern already used in src/app/_layout.tsx.
  useEffect(() => {
    let ignore = false;

    repository
      .list()
      .then((list) => {
        if (!ignore) {
          setCategories(list);
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

  const addCategory = useCallback(
    async (input: CreateCategoryInput) => {
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

  const updateCategory = useCallback(
    async (id: string, input: UpdateCategoryInput) => {
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

  const removeCategory = useCallback(
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

  return { categories, loading, error, addCategory, updateCategory, removeCategory, refresh };
}
