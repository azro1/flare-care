import React, { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmModal } from "./ConfirmModal";

/** Same shape as React Native `Alert` button options. */
export type FlareAlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

export type FlareAlertOptions = {
  /**
   * Keep the modal mounted until `dismissFlareAlert()` — use when `onPress` navigates
   * (same idea as logout overlay / Reminders Done: don’t clear the cover before the destination paints).
   */
  holdUntilDismissed?: boolean;
};

type FlareAlertPayload = {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmDestructive: boolean;
  notice: boolean;
  holdUntilDismissed: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

type HostShow = (payload: FlareAlertPayload) => void;

let hostShow: HostShow | null = null;
let hostDismiss: (() => void) | null = null;

function bindHost(show: HostShow | null, dismiss: (() => void) | null) {
  hostShow = show;
  hostDismiss = dismiss;
}

function mapButtons(buttons?: FlareAlertButton[]): Omit<FlareAlertPayload, "title" | "message" | "holdUntilDismissed"> {
  const list = buttons?.length ? buttons : [{ text: "OK" }];

  if (list.length === 1) {
    const only = list[0];
    const run = () => only.onPress?.();
    return {
      confirmLabel: only.text,
      cancelLabel: "Cancel",
      confirmDestructive: only.style === "destructive",
      notice: true,
      onConfirm: run,
      onCancel: run,
    };
  }

  const cancelBtn = list.find((b) => b.style === "cancel") ?? list[0];
  const confirmBtn =
    list.find((b) => b !== cancelBtn && b.style === "destructive") ??
    list.find((b) => b !== cancelBtn) ??
    list[list.length - 1];

  return {
    confirmLabel: confirmBtn.text,
    cancelLabel: cancelBtn.text,
    confirmDestructive: confirmBtn.style === "destructive",
    notice: false,
    onConfirm: () => confirmBtn.onPress?.(),
    onCancel: () => cancelBtn.onPress?.(),
  };
}

/**
 * Drop-in for `Alert.alert` — renders `ConfirmModal` (app theme).
 * Must have `<FlareAlertHost />` mounted under `FlareThemeProvider`.
 */
export function showFlareAlert(
  title: string,
  message?: string,
  buttons?: FlareAlertButton[],
  options?: FlareAlertOptions,
) {
  if (!hostShow) {
    if (__DEV__) {
      console.warn("showFlareAlert: FlareAlertHost is not mounted");
    }
    return;
  }
  hostShow({
    title,
    message,
    holdUntilDismissed: Boolean(options?.holdUntilDismissed),
    ...mapButtons(buttons),
  });
}

/** Close a held alert after navigation has painted (pair with `holdUntilDismissed`). */
export function dismissFlareAlert() {
  hostDismiss?.();
}

/** Mount once next to app root (inside theme provider). */
export function FlareAlertHost() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<FlareAlertPayload | null>(null);
  const busyRef = useRef(false);

  const dismiss = useCallback(() => {
    busyRef.current = false;
    setOpen(false);
    setPayload(null);
  }, []);

  const show = useCallback((next: FlareAlertPayload) => {
    busyRef.current = false;
    setPayload(next);
    setOpen(true);
  }, []);

  useEffect(() => {
    bindHost(show, dismiss);
    return () => bindHost(null, null);
  }, [show, dismiss]);

  // Keep the native Modal permanently mounted and drive it via `visible` only.
  // Unmounting/remounting makes Android recreate the dialog window and play its
  // slide-in every time — toggling `visible` on a mounted Modal appears instantly.
  const run = (action: () => void) => {
    if (busyRef.current || !payload) return;
    busyRef.current = true;
    action();
    if (!payload.holdUntilDismissed) dismiss();
  };

  return (
    <ConfirmModal
      visible={open}
      title={payload?.title ?? ""}
      message={payload?.message}
      confirmLabel={payload?.confirmLabel ?? "OK"}
      cancelLabel={payload?.cancelLabel ?? "Cancel"}
      confirmDestructive={payload?.confirmDestructive}
      notice={payload?.notice}
      onConfirm={() => run(payload?.onConfirm ?? (() => {}))}
      onCancel={() => run(payload?.onCancel ?? (() => {}))}
    />
  );
}
