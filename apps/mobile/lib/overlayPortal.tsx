import React, { useEffect, useReducer, useRef } from "react";

/**
 * Minimal top-layer portal (no extra deps).
 *
 * `<Portal>` renders its children into `<OverlayOutlet />` instead of in place, so overlays escape
 * their local parent's padding / ScrollView content box and cover the whole app. Uses an external
 * registry + subscription so mounting a portal re-renders ONLY the outlet, never the app tree
 * (which would loop). Mount `<OverlayOutlet />` once as the last sibling under the app root.
 */

type Listener = () => void;

const registry = new Map<string, React.ReactNode>();
const listeners = new Set<Listener>();
let nextId = 0;

function emit() {
  listeners.forEach((l) => l());
}

export function OverlayOutlet() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    listeners.add(force);
    return () => {
      listeners.delete(force);
    };
  }, []);
  return (
    <>
      {Array.from(registry.entries()).map(([id, node]) => (
        <React.Fragment key={id}>{node}</React.Fragment>
      ))}
    </>
  );
}

export function Portal({ children }: { children: React.ReactNode }) {
  const idRef = useRef<string>();
  if (!idRef.current) idRef.current = `overlay-${++nextId}`;
  const id = idRef.current;

  // Sync the latest children into the registry on every render (keeps dynamic content — e.g. a
  // changing button label — up to date), then remove on unmount.
  useEffect(() => {
    registry.set(id, children);
    emit();
  });
  useEffect(
    () => () => {
      registry.delete(id);
      emit();
    },
    [id],
  );

  return null;
}
