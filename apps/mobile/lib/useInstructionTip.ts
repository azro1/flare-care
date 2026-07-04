import { useCallback, useEffect, useState } from "react";

export function useInstructionTip(
  userId: string,
  readEligible: (userId: string) => Promise<boolean>,
  readDismissed: (userId: string) => Promise<boolean>,
  markDismissedFn: (userId: string) => Promise<void>,
) {
  const [dismissed, setDismissed] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [dismissedValue, eligibleValue] = await Promise.all([readDismissed(userId), readEligible(userId)]);
      if (!cancelled) {
        setDismissed(dismissedValue);
        setEligible(eligibleValue);
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [readDismissed, readEligible, userId]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    void markDismissedFn(userId);
  }, [markDismissedFn, userId]);

  return { visible: hydrated && eligible && !dismissed, dismiss };
}
