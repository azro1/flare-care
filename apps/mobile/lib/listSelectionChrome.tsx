import React, { createContext, useContext, useMemo, useState } from "react";

/** Trial: My Meds list bulk-select — swaps a bottom-tab slot while active. */
export type ListSelectionChromeState = {
  routeName: string;
  selectedCount: number;
  totalCount: number;
  onCancel: () => void;
  onSelectAll: () => void;
  onDelete: () => void;
  deleteDisabled: boolean;
};

type ListSelectionChromeContextValue = {
  chrome: ListSelectionChromeState | null;
  setChrome: (chrome: ListSelectionChromeState | null) => void;
};

const ListSelectionChromeContext = createContext<ListSelectionChromeContextValue | null>(null);

export function ListSelectionChromeProvider({ children }: { children: React.ReactNode }) {
  const [chrome, setChrome] = useState<ListSelectionChromeState | null>(null);
  const value = useMemo(() => ({ chrome, setChrome }), [chrome]);
  return <ListSelectionChromeContext.Provider value={value}>{children}</ListSelectionChromeContext.Provider>;
}

export function useListSelectionChrome() {
  const ctx = useContext(ListSelectionChromeContext);
  if (!ctx) {
    throw new Error("useListSelectionChrome must be used within ListSelectionChromeProvider");
  }
  return ctx;
}
