import { useState, useCallback } from 'react';

export function useLoading() {
  const [state, setState] = useState({
    loading: false,
    error: null,
  });

  const withLoading = useCallback(async (fn) => {
    setState({ loading: true, error: null });
    try {
      const result = await fn();
      setState({ loading: false, error: null });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      setState({ loading: false, error: message });
      return undefined;
    }
  }, []);

  const resetError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return { ...state, withLoading, resetError };
}
