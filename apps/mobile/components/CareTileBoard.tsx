import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from "react-native";
import { FlareLucideIcon } from "../lib/flareLucideIcons";
import type { LucideIcon } from "lucide-react-native";
import {
  loadCareBoard,
  saveCareBoard,
  stackCareItems,
  ungroupCareFolder,
  extractCareToolFromFolder,
  createEmptyCareFolder,
  normalizeCareBoard,
  MAX_CARE_BOARD_SLOTS,
  type CareBoardItem,
  type CareToolId,
} from "../lib/careTileLayout";
import { HOME_TILE_GAP } from "../lib/layoutConstants";
import { FLARE_CHROME_LUCIDE } from "../lib/flareLucideIcons";
import { useFlareColors } from "../theme";
import { SlideUpSheet } from "./SlideUpSheet";

export type CareToolDef = {
  id: CareToolId;
  label: string;
  lucide: LucideIcon;
  onOpen: () => void;
};

type Props = {
  userId: string;
  tileWidth: number;
  tileHeight: number;
  tools: CareToolDef[];
};

type DragState = {
  index: number;
  /** Board-local float top-left when the drag began. */
  originPanX: number;
  originPanY: number;
  /** Finger page coords when the drag began — pan moves by page delta only. */
  originPageX: number;
  originPageY: number;
  floatW: number;
  floatH: number;
  /** When set, dragging one tool out of a folder instead of the whole folder. */
  extractToolId?: CareToolId;
};

const COLS = 2;
const LONG_PRESS_MS = 280;
const TRASH_SIZE = 44;
const TRASH_HIT_PAD = 10;
const FOLDER_PAD = 8;
const FOLDER_GAP = 8;

function toolMap(tools: CareToolDef[]) {
  const map = new Map<CareToolId, CareToolDef>();
  for (const t of tools) map.set(t.id, t);
  return map;
}

function folderLabel(childIds: CareToolId[] | null | undefined, byId: Map<CareToolId, CareToolDef>) {
  const ids = Array.isArray(childIds) ? childIds : [];
  if (ids.length === 0) return "Folder";
  const names = ids.map((id) => byId.get(id)?.label ?? id);
  if (names.length <= 2) return names.join(" + ");
  return `${names[0]} +${names.length - 1}`;
}

function findBoardItemIndex(board: CareBoardItem[], target: CareBoardItem): number {
  if (target.kind === "tool") {
    return board.findIndex((i) => i.kind === "tool" && i.id === target.id);
  }
  return board.findIndex((i) => i.kind === "folder" && i.id === target.id);
}

/**
 * My care board — long-press to drag.
 * Drop on another tile to stack (both shrink / border while targeting).
 * Drop elsewhere to reorder. Folders open in a sheet.
 */
export function CareTileBoard({ userId, tileWidth, tileHeight, tools }: Props) {
  const c = useFlareColors();
  const byId = useMemo(() => toolMap(tools), [tools]);
  const [board, setBoard] = useState<CareBoardItem[]>(() => []);
  const [ready, setReady] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverTrash, setHoverTrash] = useState(false);
  const [folderOpenIndex, setFolderOpenIndex] = useState<number | null>(null);
  /** Soft press feedback while waiting for long-press to fire. */
  const [holding, setHolding] = useState<{ index: number; toolId?: CareToolId } | null>(null);

  const boardRef = useRef(board);
  boardRef.current = board;
  const dragRef = useRef(drag);
  dragRef.current = drag;
  const hoverRef = useRef(hoverIndex);
  hoverRef.current = hoverIndex;
  const hoverTrashRef = useRef(hoverTrash);
  hoverTrashRef.current = hoverTrash;
  const trashTopRef = useRef(0);
  const trashCenterRef = useRef({ x: 0, y: 0 });
  const lastFloatPosRef = useRef({ x: 0, y: 0 });

  const pan = useRef(new Animated.ValueXY()).current;
  const dragScale = useRef(new Animated.Value(1)).current;
  const dragLift = useRef(new Animated.Value(0)).current;
  const boardOrigin = useRef({ x: 0, y: 0 });
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Locked tool id for the in-progress mini long-press / extract drag. */
  const extractLockRef = useRef<CareToolId | null>(null);
  const touchStart = useRef<{
    x: number;
    y: number;
    index: number;
    extractToolId: CareToolId | null;
    /** Touch location inside the pressed view (for grab alignment). */
    localX: number;
    localY: number;
  }>({ x: 0, y: 0, index: -1, extractToolId: null, localX: 0, localY: 0 });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await loadCareBoard(userId);
      if (cancelled) return;
      setBoard(next);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Heal duplicate empty folders (e.g. before one-at-a-time limit).
  useEffect(() => {
    if (!ready) return;
    const emptyCount = board.filter(
      (item) => item.kind === "folder" && (!item.childIds || item.childIds.length === 0),
    ).length;
    if (emptyCount <= 1) return;
    const healed = normalizeCareBoard(board);
    setBoard(healed);
    void saveCareBoard(userId, healed);
  }, [ready, board, userId]);

  const persist = useCallback(
    (next: CareBoardItem[]) => {
      const safe = Array.isArray(next) ? next : [];
      setBoard(safe);
      void saveCareBoard(userId, safe);
    },
    [userId],
  );

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const indexAtPoint = useCallback(
    (boardX: number, boardY: number) => {
      const strideX = tileWidth + HOME_TILE_GAP;
      const strideY = tileHeight + HOME_TILE_GAP;
      const col = Math.floor(boardX / strideX);
      const row = Math.floor(boardY / strideY);
      if (col < 0 || col >= COLS || row < 0) return null;
      const index = row * COLS + col;
      if (index < 0 || index >= boardRef.current.length) return null;
      const localX = boardX - col * strideX;
      const localY = boardY - row * strideY;
      if (localX < 0 || localY < 0 || localX > tileWidth || localY > tileHeight) return null;
      return index;
    },
    [tileHeight, tileWidth],
  );

  const suppressFolderOpenRef = useRef(false);

  const buzz = () => {
    try {
      if (Platform.OS !== "web") Vibration.vibrate(12);
    } catch {
      // ignore
    }
  };

  const endDrag = useCallback(
    (dropIndex: number | null) => {
      const current = dragRef.current;
      const toTrash = hoverTrashRef.current;
      dragRef.current = null;
      extractLockRef.current = null;
      setHolding(null);
      setHoverIndex(null);
      setHoverTrash(false);
      pan.x.stopAnimation();
      pan.y.stopAnimation();
      dragScale.stopAnimation();
      dragLift.stopAnimation();
      // Unmount the float BEFORE resetting pan — otherwise it flashes to (0,0) / left.
      setDrag(null);
      requestAnimationFrame(() => {
        pan.setValue({ x: 0, y: 0 });
        dragScale.setValue(1);
        dragLift.setValue(0);
      });
      if (!current) return;

      const from = current.index;
      const list = boardRef.current;
      if (!Array.isArray(list)) return;
      if (from < 0 || from >= list.length) return;

      try {
        const extractId = current.extractToolId;
        if (extractId) {
          if (dropIndex === from) return; // released back on the folder
          if (dropIndex == null) {
            // Let-go in place often reports null — only extract if the float left the folder cell.
            const col = from % COLS;
            const row = Math.floor(from / COLS);
            const cellLeft = col * (tileWidth + HOME_TILE_GAP);
            const cellTop = row * (tileHeight + HOME_TILE_GAP);
            const { x: fx, y: fy } = lastFloatPosRef.current;
            const stillInside =
              fx >= cellLeft &&
              fx <= cellLeft + tileWidth &&
              fy >= cellTop &&
              fy <= cellTop + tileHeight;
            if (stillInside) return;
            persist(extractCareToolFromFolder(list, from, extractId));
            return;
          }
          if (dropIndex < 0 || dropIndex >= list.length) return;
          const target = list[dropIndex];
          let next = extractCareToolFromFolder(list, from, extractId);
          const extractedIdx = next.findIndex((i) => i.kind === "tool" && i.id === extractId);
          const targetIdx = findBoardItemIndex(next, target);
          if (extractedIdx >= 0 && targetIdx >= 0 && extractedIdx !== targetIdx) {
            next = stackCareItems(next, extractedIdx, targetIdx);
          }
          persist(next);
          return;
        }

        if (toTrash) {
          const item = list[from];
          if (item?.kind === "folder") {
            persist(ungroupCareFolder(list, from));
          }
          return;
        }
        if (dropIndex == null || dropIndex === from) return;
        if (dropIndex < 0 || dropIndex >= list.length) return;
        persist(stackCareItems(list, from, dropIndex));
      } catch {
        // keep prior board
      }
    },
    [dragLift, dragScale, pan, persist, tileHeight, tileWidth],
  );

  const boardViewRef = useRef<View>(null);

  const measureBoard = useCallback((cb?: () => void) => {
    boardViewRef.current?.measureInWindow((x, y) => {
      boardOrigin.current = { x, y };
      cb?.();
    });
  }, []);

  const startDrag = useCallback(
    (index: number, pageX: number, pageY: number, extractToolId?: CareToolId) => {
      if (dragRef.current) return;
      const lockedExtract = extractToolId ?? extractLockRef.current ?? undefined;
      if (extractToolId) extractLockRef.current = extractToolId;

      // No measureInWindow for finger tracking — page deltas only, so no screen-offset drift.
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      const tileLeft = col * (tileWidth + HOME_TILE_GAP);
      const tileTop = row * (tileHeight + HOME_TILE_GAP);
      const pageFingerX = touchStart.current.x || pageX;
      const pageFingerY = touchStart.current.y || pageY;
      const localX = touchStart.current.localX;
      const localY = touchStart.current.localY;

      let floatW: number;
      let floatH: number;
      let originPanX: number;
      let originPanY: number;

      if (lockedExtract) {
        const item = boardRef.current[index];
        const kids =
          item?.kind === "folder" && Array.isArray(item.childIds) ? item.childIds : [];
        const childIdx = Math.max(0, kids.indexOf(lockedExtract));
        const innerW = Math.max(0, tileWidth - FOLDER_PAD * 2);
        const innerH = Math.max(0, tileHeight - FOLDER_PAD * 2);
        const slotW = (innerW - FOLDER_GAP) / 2;
        const slotH = (innerH - FOLDER_GAP) / 2;
        const mCol = childIdx % 2;
        const mRow = Math.floor(childIdx / 2);
        floatW = slotW;
        floatH = slotH;
        // Sit exactly on the mini that was pressed — finger relationship unchanged.
        originPanX = tileLeft + FOLDER_PAD + mCol * (slotW + FOLDER_GAP);
        originPanY = tileTop + FOLDER_PAD + mRow * (slotH + FOLDER_GAP);
      } else {
        floatW = tileWidth * 0.58;
        floatH = tileHeight * 0.58;
        const grabX = Math.max(0, Math.min(floatW, localX * 0.58));
        const grabY = Math.max(0, Math.min(floatH, localY * 0.58));
        originPanX = tileLeft + localX - grabX;
        originPanY = tileTop + localY - grabY;
      }

      const nextDrag: DragState = {
        index,
        originPanX,
        originPanY,
        originPageX: pageFingerX,
        originPageY: pageFingerY,
        floatW,
        floatH,
        extractToolId: lockedExtract,
      };
      setHolding(null);
      // Extract floats stay scale 1 — scaling from top-left makes them jump left.
      // Full tiles still get a light pop.
      const pop = !lockedExtract;
      dragScale.setValue(pop ? 0.94 : 1);
      dragLift.setValue(0);
      pan.setValue({ x: originPanX, y: originPanY });
      dragRef.current = nextDrag;
      setDrag(nextDrag);
      lastFloatPosRef.current = {
        x: originPanX + floatW / 2,
        y: originPanY + floatH / 2,
      };
      suppressFolderOpenRef.current = true;
      buzz();
      if (pop) {
        Animated.parallel([
          Animated.spring(dragScale, {
            toValue: 1.06,
            useNativeDriver: true,
            friction: 6,
            tension: 140,
          }),
          Animated.spring(dragLift, {
            toValue: -5,
            useNativeDriver: true,
            friction: 7,
            tension: 120,
          }),
        ]).start();
      } else {
        Animated.spring(dragLift, {
          toValue: -4,
          useNativeDriver: true,
          friction: 7,
          tension: 120,
        }).start();
      }
      measureBoard();
    },
    [dragLift, dragScale, measureBoard, pan, tileHeight, tileWidth],
  );

  const updateDragFromPage = useCallback(
    (pageX: number, pageY: number) => {
      const d = dragRef.current;
      if (!d) {
        touchStart.current.x = pageX;
        touchStart.current.y = pageY;
        return;
      }
      // Pure page delta — avoids measureInWindow vs pageX mismatch (the ~1cm drift).
      const left = d.originPanX + (pageX - d.originPageX);
      const top = d.originPanY + (pageY - d.originPageY);
      lastFloatPosRef.current = { x: left + d.floatW / 2, y: top + d.floatH / 2 };
      pan.setValue({ x: left, y: top });
      const cx = lastFloatPosRef.current.x;
      const cy = lastFloatPosRef.current.y;
      const tc = trashCenterRef.current;
      const dx = cx - tc.x;
      const dy = cy - tc.y;
      const hitR = TRASH_SIZE / 2 + TRASH_HIT_PAD;
      const overTrash = dx * dx + dy * dy <= hitR * hitR;
      if (overTrash) {
        setHoverTrash(true);
        setHoverIndex(null);
        return;
      }
      setHoverTrash(false);
      const over = indexAtPoint(cx, cy);
      setHoverIndex(over != null && over !== d.index ? over : null);
    },
    [indexAtPoint, pan],
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => dragRef.current != null,
      onMoveShouldSetPanResponder: () => dragRef.current != null,
      onStartShouldSetPanResponderCapture: () => dragRef.current != null,
      onMoveShouldSetPanResponderCapture: () => dragRef.current != null,
      onPanResponderMove: (_e, g: PanResponderGestureState) => {
        updateDragFromPage(g.moveX, g.moveY);
      },
      onPanResponderRelease: (_e, g) => {
        const d = dragRef.current;
        if (!d) return;
        const left = d.originPanX + (g.moveX - d.originPageX);
        const top = d.originPanY + (g.moveY - d.originPageY);
        const over = indexAtPoint(left + d.floatW / 2, top + d.floatH / 2);
        endDrag(over);
      },
      onPanResponderTerminate: () => endDrag(null),
    }),
  ).current;

  const onBoardLayout = () => {
    measureBoard();
  };

  const onTilePressIn = (index: number, e: GestureResponderEvent) => {
    if (dragRef.current) return;
    const item = boardRef.current[index];
    // Filled folders: only minis can start a drag (one tool each).
    if (item?.kind === "folder" && Array.isArray(item.childIds) && item.childIds.length > 0) {
      return;
    }
    extractLockRef.current = null;
    setHolding({ index });
    touchStart.current = {
      x: e.nativeEvent.pageX,
      y: e.nativeEvent.pageY,
      index,
      extractToolId: null,
      localX: e.nativeEvent.locationX,
      localY: e.nativeEvent.locationY,
    };
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      const t = touchStart.current;
      startDrag(t.index, t.x, t.y);
    }, LONG_PRESS_MS);
  };

  const onMiniPressIn = (folderIndex: number, toolId: CareToolId, e: GestureResponderEvent) => {
    if (dragRef.current) return;
    extractLockRef.current = toolId;
    setHolding({ index: folderIndex, toolId });
    touchStart.current = {
      x: e.nativeEvent.pageX,
      y: e.nativeEvent.pageY,
      index: folderIndex,
      extractToolId: toolId,
      localX: e.nativeEvent.locationX,
      localY: e.nativeEvent.locationY,
    };
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      const locked = extractLockRef.current;
      const t = touchStart.current;
      if (!locked || locked !== toolId) return;
      startDrag(t.index, t.x, t.y, locked);
    }, LONG_PRESS_MS);
  };

  const onTilePressOut = () => {
    if (dragRef.current) return;
    if (extractLockRef.current) return;
    clearLongPress();
    setHolding(null);
  };

  const onMiniPressOut = () => {
    // Don't cancel long-press here — re-renders (hold scale) often fire pressOut on Android
    // and would abort the grab. Touch end clears if drag never started.
    if (dragRef.current) return;
  };

  const onTileTouchMove = (e: GestureResponderEvent) => {
    const t = e.nativeEvent.touches[0] ?? e.nativeEvent;
    updateDragFromPage(t.pageX, t.pageY);
  };

  const onTileTouchEnd = (e: GestureResponderEvent) => {
    if (!dragRef.current) {
      clearLongPress();
      extractLockRef.current = null;
      setHolding(null);
      return;
    }
    const t = e.nativeEvent.changedTouches[0] ?? e.nativeEvent;
    const d = dragRef.current;
    const left = d.originPanX + (t.pageX - d.originPageX);
    const top = d.originPanY + (t.pageY - d.originPageY);
    const over = indexAtPoint(left + d.floatW / 2, top + d.floatH / 2);
    endDrag(over);
  };

  const onTilePress = (index: number) => {
    if (dragRef.current) return;
    clearLongPress();
    if (suppressFolderOpenRef.current) {
      suppressFolderOpenRef.current = false;
      return;
    }
    const item = board[index];
    if (!item) return;
    if (item.kind === "folder") {
      setFolderOpenIndex(index);
      return;
    }
    byId.get(item.id)?.onOpen();
  };

  const openFolder = folderOpenIndex != null ? board[folderOpenIndex] : null;
  const folderChildren =
    openFolder?.kind === "folder" && Array.isArray(openFolder.childIds)
      ? (openFolder.childIds.map((id) => byId.get(id)).filter((d): d is CareToolDef => d != null) as CareToolDef[])
      : [];

  const dragItem: CareBoardItem | null = (() => {
    if (!drag || !Array.isArray(board)) return null;
    if (drag.extractToolId) return { kind: "tool", id: drag.extractToolId };
    return board[drag.index] ?? null;
  })();

  const renderItemContent = (
    item: CareBoardItem,
    opts: {
      mini?: boolean;
      /** Shrunk floating preview for a full board tile (icon + title scaled down). */
      compact?: boolean;
      hideToolId?: CareToolId;
      folderIndex?: number;
      interactiveMinis?: boolean;
      holdingToolId?: CareToolId;
    },
  ) => {
    const mini = Boolean(opts.mini);
    const compact = Boolean(opts.compact);
    if (!item) return <View style={styles.tileInner} />;
    if (item.kind === "tool") {
      const def = byId.get(item.id);
      if (!def) return <View style={styles.tileInner} />;
      const iconSize = mini ? 22 : compact ? 18 : 28;
      return (
        <View style={[styles.tileInner, (mini || compact) && styles.tileInnerMini, compact && styles.tileInnerCompact]}>
          <View style={[styles.iconWrap, (mini || compact) && styles.iconWrapMini, compact && styles.iconWrapCompact]}>
            <FlareLucideIcon icon={def.lucide} size={iconSize} color={c.primary} />
          </View>
          {!mini ? (
            <Text
              style={[styles.label, compact && styles.labelCompact, { color: c.text }]}
              numberOfLines={compact ? 2 : 2}
            >
              {def.label}
            </Text>
          ) : null}
        </View>
      );
    }

    const childIds = Array.isArray(item.childIds) ? item.childIds : [];
    const kids = childIds
      .map((id) => byId.get(id))
      .filter((d): d is CareToolDef => d != null);
    const folderPad = mini || compact ? 4 : FOLDER_PAD;
    const folderGap = compact ? 4 : FOLDER_GAP;
    const cellW = compact ? tileWidth * 0.58 : tileWidth;
    const cellH = compact ? tileHeight * 0.58 : tileHeight;
    const innerW = Math.max(0, cellW - folderPad * 2);
    const innerH = Math.max(0, cellH - folderPad * 2);
    const slotW = (innerW - folderGap) / 2;
    const slotH = (innerH - folderGap) / 2;

    if (kids.length === 0) {
      return (
        <View style={[styles.folderInner, styles.folderEmpty]}>
          <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.add} size={mini ? 18 : 22} color={c.textMuted} />
          {!mini ? (
            <Text style={[styles.folderEmptyLabel, { color: c.textMuted }]} numberOfLines={2}>
              Drop tiles here
            </Text>
          ) : null}
        </View>
      );
    }

    return (
      <View style={[styles.folderInner, { padding: 0 }]} pointerEvents="box-none">
        <View
          style={[styles.folderGrid, { width: innerW, height: innerH }]}
          pointerEvents="box-none"
        >
          {kids.slice(0, 4).map((k, i) => {
            const hidden = k.id === opts.hideToolId;
            const isHeldMini = opts.holdingToolId === k.id;
            const col = i % 2;
            const row = Math.floor(i / 2);
            const cardStyle = [
              styles.folderMiniCard,
              {
                position: "absolute" as const,
                left: col * (slotW + folderGap),
                top: row * (slotH + folderGap),
                width: slotW,
                height: slotH,
                backgroundColor: c.surfaceSubtle ?? c.card,
                borderColor: c.cardBorder ?? "#d4d4d4",
                opacity: hidden ? 0 : isHeldMini ? 0.85 : 1,
              },
            ];
            // Keep Pressables mounted during extract drag — unmounting mid-touch jumps/cancels.
            if (opts.folderIndex == null || mini) {
              return (
                <View key={k.id} style={cardStyle} pointerEvents="none">
                  <FlareLucideIcon icon={k.lucide} size={mini ? 10 : 13} color={c.primary} />
                  {!mini ? (
                    <Text style={[styles.folderMiniLabel, { color: c.text }]} numberOfLines={1}>
                      {k.label.replace(/^My\s+/i, "")}
                    </Text>
                  ) : null}
                </View>
              );
            }
            const folderIndex = opts.folderIndex;
            return (
              <Pressable
                key={k.id}
                accessibilityRole="button"
                accessibilityLabel={`Drag ${k.label} out`}
                onPressIn={(e) => onMiniPressIn(folderIndex, k.id, e)}
                onPressOut={onMiniPressOut}
                onTouchMove={onTileTouchMove}
                onTouchEnd={onTileTouchEnd}
                pointerEvents={hidden || !opts.interactiveMinis ? "none" : "auto"}
                style={cardStyle}
              >
                <FlareLucideIcon icon={k.lucide} size={13} color={c.primary} />
                <Text style={[styles.folderMiniLabel, { color: c.text }]} numberOfLines={1}>
                  {k.label.replace(/^My\s+/i, "")}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  if (!ready) {
    return <View style={{ minHeight: tileHeight * 2 + HOME_TILE_GAP }} />;
  }

  const safeBoard = Array.isArray(board) ? board.filter(Boolean) : [];
  const hasEmptyFolder = safeBoard.some(
    (item) => item.kind === "folder" && (!item.childIds || item.childIds.length === 0),
  );
  const showCreateTile = safeBoard.length < MAX_CARE_BOARD_SLOTS && !hasEmptyFolder;
  const rows = Math.max(
    1,
    Math.ceil((showCreateTile ? safeBoard.length + 1 : safeBoard.length) / COLS),
  );
  const outline = c.cardBorder ?? "#d4d4d4";
  const createIndex = safeBoard.length;
  const createCol = createIndex % COLS;
  const createRow = Math.floor(createIndex / COLS);
  const boardWidth = tileWidth * COLS + HOME_TILE_GAP;
  const gridHeight = rows * tileHeight + (rows - 1) * HOME_TILE_GAP;
  trashTopRef.current = gridHeight + HOME_TILE_GAP;
  trashCenterRef.current = {
    x: boardWidth / 2,
    y: trashTopRef.current + TRASH_SIZE / 2,
  };
  const draggingWholeFolder =
    drag != null && safeBoard[drag.index]?.kind === "folder" && !drag.extractToolId;
  const showTrashZone = draggingWholeFolder;
  const boardMinHeight = showTrashZone
    ? trashTopRef.current + TRASH_SIZE
    : gridHeight;

  const removeFolderAt = (index: number) => {
    persist(ungroupCareFolder(board, index));
    if (folderOpenIndex === index) setFolderOpenIndex(null);
  };

  return (
    <View
      ref={boardViewRef}
      style={[styles.board, { width: boardWidth, minHeight: boardMinHeight }]}
      onLayout={onBoardLayout}
      {...panResponder.panHandlers}
    >
      {safeBoard.map((item, index) => {
        const col = index % COLS;
        const row = Math.floor(index / COLS);
        const isDragging = drag?.index === index && !drag.extractToolId;
        const isExtractSource = drag?.index === index && Boolean(drag.extractToolId);
        const isHover = hoverIndex === index;
        const isHoldingCell =
          holding?.index === index && !holding.toolId && !drag;
        const isEmptyFolder = item.kind === "folder" && (!item.childIds || item.childIds.length === 0);
        const isFilledFolder = item.kind === "folder" && !isEmptyFolder;
        const cellStyle = {
          width: tileWidth,
          height: tileHeight,
          left: col * (tileWidth + HOME_TILE_GAP),
          top: row * (tileHeight + HOME_TILE_GAP),
          backgroundColor: c.card,
          opacity: isDragging ? 0.35 : isExtractSource ? 1 : 1,
          borderColor: isHover ? outline : isEmptyFolder ? outline : "transparent",
          borderWidth: isHover || isEmptyFolder ? 1.5 : 0,
          borderStyle: (isHover || isEmptyFolder ? "dashed" : "solid") as "dashed" | "solid",
          transform: [
            ...(isHover || isHoldingCell
              ? [{ scale: isHover ? 1.04 : 0.96 } as const]
              : []),
          ],
        };
        const content = (
          <>
            {renderItemContent(item, {
              mini: false,
              hideToolId: isExtractSource ? drag?.extractToolId : undefined,
              folderIndex: index,
              interactiveMinis: isFilledFolder && !drag,
              holdingToolId: holding?.index === index ? holding.toolId : undefined,
            })}
            {isEmptyFolder && !isDragging ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove folder"
                hitSlop={10}
                onPressIn={() => {
                  clearLongPress();
                  extractLockRef.current = null;
                }}
                onPress={() => removeFolderAt(index)}
                style={styles.folderTrashBtn}
              >
                <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.delete} size={16} color={c.textMuted} />
              </Pressable>
            ) : null}
          </>
        );

        // Filled folder: View shell so parent Pressable can't steal mini drags.
        if (isFilledFolder) {
          return (
            <View
              key={`folder-${item.id}`}
              style={[styles.cell, cellStyle, styles.folderCell]}
              onTouchMove={onTileTouchMove}
              onTouchEnd={onTileTouchEnd}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={folderLabel(item.childIds, byId)}
                onPress={() => onTilePress(index)}
                style={StyleSheet.absoluteFillObject}
              />
              {content}
            </View>
          );
        }

        return (
          <Pressable
            key={item.kind === "tool" ? `tool-${item.id}` : `folder-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={
              item.kind === "tool"
                ? byId.get(item.id)?.label
                : folderLabel(item.childIds, byId)
            }
            onPressIn={(e) => onTilePressIn(index, e)}
            onPressOut={onTilePressOut}
            onPress={() => onTilePress(index)}
            onTouchMove={onTileTouchMove}
            onTouchEnd={onTileTouchEnd}
            style={[
              styles.cell,
              cellStyle,
              item.kind === "folder" ? styles.folderCell : null,
            ]}
          >
            {content}
          </Pressable>
        );
      })}

      {showCreateTile ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create folder"
          onPress={() => persist(createEmptyCareFolder(board))}
          style={[
            styles.cell,
            styles.createCell,
            {
              width: tileWidth,
              height: tileHeight,
              left: createCol * (tileWidth + HOME_TILE_GAP),
              top: createRow * (tileHeight + HOME_TILE_GAP),
              borderColor: outline,
            },
          ]}
        >
          <View style={styles.createInner}>
            <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.add} size={28} color={c.textMuted} />
            <Text style={[styles.createLabel, { color: c.textMuted }]}>Create</Text>
          </View>
        </Pressable>
      ) : null}

      {showTrashZone ? (
        <View
          pointerEvents="none"
          style={[
            styles.trashCircle,
            {
              top: trashTopRef.current,
              left: boardWidth / 2 - TRASH_SIZE / 2,
              width: TRASH_SIZE,
              height: TRASH_SIZE,
              borderRadius: TRASH_SIZE / 2,
              backgroundColor: hoverTrash ? c.textMuted : c.surfaceSubtle,
              transform: [{ scale: hoverTrash ? 1.12 : 1 }],
            },
          ]}
        >
          <FlareLucideIcon
            icon={FLARE_CHROME_LUCIDE.delete}
            size={20}
            color={hoverTrash ? c.card : c.textMuted}
          />
        </View>
      ) : null}

      {drag && dragItem ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.floating,
            {
              width: drag.floatW,
              height: drag.floatH,
              backgroundColor: drag.extractToolId
                ? c.surfaceSubtle ?? c.card
                : c.card,
              borderColor: outline,
              borderWidth: drag.extractToolId ? StyleSheet.hairlineWidth : 1.5,
              paddingVertical: 0,
              paddingHorizontal: 0,
              shadowColor: "#000",
              shadowOpacity: 0.25,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 8 },
              elevation: 12,
              transform: [
                { translateX: pan.x },
                { translateY: Animated.add(pan.y, dragLift) },
                { scale: dragScale },
              ],
            },
          ]}
        >
          {drag.extractToolId && dragItem.kind === "tool" ? (
            <View style={styles.extractFloatInner}>
              <FlareLucideIcon
                icon={byId.get(dragItem.id)?.lucide ?? FLARE_CHROME_LUCIDE.add}
                size={13}
                color={c.primary}
              />
              <Text style={[styles.folderMiniLabel, { color: c.text }]} numberOfLines={1}>
                {(byId.get(dragItem.id)?.label ?? "").replace(/^My\s+/i, "")}
              </Text>
            </View>
          ) : (
            renderItemContent(dragItem, { compact: true })
          )}
        </Animated.View>
      ) : null}

      <SlideUpSheet visible={folderOpenIndex != null} onClose={() => setFolderOpenIndex(null)}>
        <View style={styles.sheetBody}>
          <Text style={[styles.sheetTitle, { color: c.text }]}>
            {openFolder?.kind === "folder" ? folderLabel(openFolder.childIds, byId) : "Folder"}
          </Text>
          {folderChildren.length === 0 ? (
            <Text style={[styles.sheetEmptyHint, { color: c.textMuted }]}>
              Long-press a care tile and drop it here to add it.
            </Text>
          ) : (
            folderChildren.map((def) => (
              <View
                key={def.id}
                style={[styles.sheetRow, { borderBottomColor: c.cardBorder }]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={def.label}
                  onPress={() => {
                    setFolderOpenIndex(null);
                    def.onOpen();
                  }}
                  style={styles.sheetRowMain}
                >
                  <FlareLucideIcon icon={def.lucide} size={22} color={c.primary} />
                  <Text style={[styles.sheetRowLabel, { color: c.text }]}>{def.label}</Text>
                </Pressable>
                {folderOpenIndex != null ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Take ${def.label} out`}
                    hitSlop={8}
                    onPress={() => {
                      const next = extractCareToolFromFolder(board, folderOpenIndex, def.id);
                      persist(next);
                      const stillFolder = next[folderOpenIndex]?.kind === "folder";
                      if (!stillFolder) setFolderOpenIndex(null);
                    }}
                    style={styles.takeOut}
                  >
                    <Text style={{ color: c.textMuted, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                      Take out
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          )}
          {folderOpenIndex != null ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={folderChildren.length === 0 ? "Remove folder" : "Ungroup"}
              onPress={() => {
                removeFolderAt(folderOpenIndex);
              }}
              style={styles.ungroup}
            >
              <Text style={{ color: c.textMuted, fontFamily: "Inter_600SemiBold" }}>
                {folderChildren.length === 0 ? "Remove folder" : "Ungroup"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </SlideUpSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    position: "relative",
  },
  cell: {
    position: "absolute",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    overflow: "hidden",
  },
  folderCell: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  floating: {
    position: "absolute",
    left: 0,
    top: 0,
    borderRadius: 8,
    zIndex: 20,
    elevation: 8,
    overflow: "hidden",
  },
  extractFloatInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  tileInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 10,
  },
  tileInnerMini: {
    gap: 0,
  },
  tileInnerCompact: {
    gap: 3,
    paddingHorizontal: 4,
  },
  iconWrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapMini: {
    width: 32,
    height: 32,
  },
  iconWrapCompact: {
    width: 28,
    height: 28,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  labelCompact: {
    fontSize: 10,
    lineHeight: 12,
  },
  folderInner: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  folderEmpty: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  folderEmptyLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  folderGrid: {
    position: "relative",
    zIndex: 2,
  },
  folderMiniCard: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 3,
    overflow: "hidden",
    zIndex: 3,
  },
  folderMiniLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    width: "100%",
  },
  createCell: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  createInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  createLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  folderTrashBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  trashCircle: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBody: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 4,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  sheetEmptyHint: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    lineHeight: 20,
    marginBottom: 8,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetRowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  sheetRowLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  takeOut: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  ungroup: {
    alignSelf: "center",
    marginTop: 16,
    paddingVertical: 10,
  },
});
