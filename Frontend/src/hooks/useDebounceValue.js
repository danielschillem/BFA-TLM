import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Debounce a value — updates only after the specified delay with no new changes.
 * Perfect for search inputs, filter controls, and API query params.
 *
 * @param {*} initialValue - The initial value
 * @param {number} [delay=500] - Debounce delay in ms
 * @returns {[debouncedValue, setValue, { cancel, flush, isPending }]}
 */
export function useDebounceValue(initialValue, delay = 500) {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);
  const timerRef = useRef(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (value === debouncedValue) {
      setIsPending(false);
      return;
    }

    setIsPending(true);
    timerRef.current = setTimeout(() => {
      setDebouncedValue(value);
      setIsPending(false);
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delay]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsPending(false);
  }, []);

  const flush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setDebouncedValue(value);
    setIsPending(false);
  }, [value]);

  return [debouncedValue, setValue, { cancel, flush, isPending }];
}
