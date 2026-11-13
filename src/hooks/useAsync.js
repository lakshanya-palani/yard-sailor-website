import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs `asyncFn` and tracks { data, error, loading }.
 *
 * - Re-runs when `deps` change (like useEffect deps; `asyncFn` may close over them).
 * - Only the latest call can update state, and nothing updates after unmount.
 * - Previous `data` is kept while reloading, so refetches don't flash empty.
 * - `refetchOnEvents`: window event names that trigger a reload,
 *   e.g. ["yardSailorProductsUpdated", "focus"].
 * - `immediate: false` skips the automatic run; call `reload()` yourself.
 *
 * `reload()` returns a promise resolving to the new data (or undefined if it
 * failed or was superseded). `setData` accepts a value or updater function.
 */
export function useAsync(asyncFn, deps = [], { immediate = true, refetchOnEvents = [] } = {}) {
  const [state, setState] = useState({ data: undefined, error: null, loading: immediate });
  const fnRef = useRef(asyncFn);
  const requestRef = useRef(0);
  const mountedRef = useRef(false);

  // Keep the latest function without making it a dependency. Declared first so
  // it runs before the effects below that call it.
  useEffect(() => {
    fnRef.current = asyncFn;
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
    };
  }, []);

  const reload = useCallback(async () => {
    const request = ++requestRef.current;
    const isCurrent = () => mountedRef.current && request === requestRef.current;
    // Yield first so callers inside effects never set state synchronously.
    await Promise.resolve();
    if (!isCurrent()) return undefined;
    setState(current => (current.loading && !current.error ? current : { ...current, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      if (isCurrent()) setState({ data, error: null, loading: false });
      return isCurrent() ? data : undefined;
    } catch (error) {
      if (isCurrent()) setState(current => ({ ...current, error, loading: false }));
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (immediate) reload();
    // `deps` is the caller's dependency list, forwarded as-is.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, reload, ...deps]);

  const eventKey = refetchOnEvents.join('\n');
  useEffect(() => {
    if (!eventKey) return undefined;
    const names = eventKey.split('\n');
    const handler = () => { reload(); };
    names.forEach(name => window.addEventListener(name, handler));
    return () => names.forEach(name => window.removeEventListener(name, handler));
  }, [eventKey, reload]);

  const setData = useCallback(update => {
    setState(current => ({ ...current, data: typeof update === 'function' ? update(current.data) : update }));
  }, []);

  return { data: state.data, error: state.error, loading: state.loading, reload, setData };
}
