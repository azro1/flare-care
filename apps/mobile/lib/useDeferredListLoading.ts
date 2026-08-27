import { useEffect, useState } from "react";

/**
 * Avoid a spit-second spinner flash on cold first open.
 * Returns true only if `listInitialLoad` stays true past `delayMs`.
 */
export function useDeferredListLoading(listInitialLoad: boolean, delayMs = 160): boolean {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (!listInitialLoad) {
      setShowLoading(false);
      return;
    }
    const t = setTimeout(() => setShowLoading(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs, listInitialLoad]);

  return showLoading;
}
