import { useState, useEffect, useCallback, useRef } from 'react';

export function useInfiniteScroll(callback: () => Promise<void>, hasMore: boolean) {
  const observer = useRef<IntersectionObserver | null>(null);

  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(
        async (entries) => {
          if (entries[0].isIntersecting && hasMore) {
            await callback();
          }
        },
        { threshold: 0.1 }
      );
      if (node) observer.current.observe(node);
    },
    [callback, hasMore]
  );

  useEffect(() => {
    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, []);

  return { lastElementRef };
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export { useFormValidation } from './useFormValidation';
