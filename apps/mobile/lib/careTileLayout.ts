import AsyncStorage from "@react-native-async-storage/async-storage";

/** Fixed My care tools — ids match dashboard `careCards` keys. */
export type CareToolId = "weight" | "supplies" | "appointments" | "reports";

export type CareBoardItem =
  | { kind: "tool"; id: CareToolId }
  | { kind: "folder"; id: string; childIds: CareToolId[] };

export const DEFAULT_CARE_BOARD: CareBoardItem[] = [
  { kind: "tool", id: "weight" },
  { kind: "tool", id: "supplies" },
  { kind: "tool", id: "appointments" },
  { kind: "tool", id: "reports" },
];

/** Max tiles on the My care board (tools + folders). Room under this shows a + create tile. */
export const MAX_CARE_BOARD_SLOTS = 4;

const ALL_TOOLS: CareToolId[] = ["weight", "supplies", "appointments", "reports"];

function storageKey(userId: string) {
  return `flarecare.careBoard.v1.${userId}`;
}

function isToolId(v: unknown): v is CareToolId {
  return typeof v === "string" && (ALL_TOOLS as string[]).includes(v);
}

/** Validate + heal layout so every tool appears exactly once. Empty folders are kept. */
export function normalizeCareBoard(raw: unknown): CareBoardItem[] {
  const seen = new Set<CareToolId>();
  const out: CareBoardItem[] = [];
  let keptEmptyFolder = false;

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const kind = (item as { kind?: string }).kind;
      if (kind === "tool") {
        const id = (item as { id?: unknown }).id;
        if (!isToolId(id) || seen.has(id)) continue;
        seen.add(id);
        out.push({ kind: "tool", id });
      } else if (kind === "folder") {
        const id = String((item as { id?: unknown }).id ?? "");
        if (!id) continue;
        const childIds = Array.isArray((item as { childIds?: unknown }).childIds)
          ? ((item as { childIds: unknown[] }).childIds.filter(isToolId) as CareToolId[])
          : [];
        const unique = childIds.filter((c) => {
          if (seen.has(c)) return false;
          seen.add(c);
          return true;
        });
        // Keep empty / single-child folders so users can create a parent then drag in.
        // Only one empty folder at a time.
        if (unique.length === 0) {
          if (keptEmptyFolder) continue;
          keptEmptyFolder = true;
          out.push({ kind: "folder", id, childIds: [] });
          continue;
        }
        out.push({ kind: "folder", id, childIds: unique });
      }
    }
  }

  for (const id of ALL_TOOLS) {
    if (!seen.has(id)) out.push({ kind: "tool", id });
  }

  return out.length ? out : [...DEFAULT_CARE_BOARD];
}

export async function loadCareBoard(userId: string): Promise<CareBoardItem[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return [...DEFAULT_CARE_BOARD];
    return normalizeCareBoard(JSON.parse(raw));
  } catch {
    return [...DEFAULT_CARE_BOARD];
  }
}

export async function saveCareBoard(userId: string, board: CareBoardItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(normalizeCareBoard(board)));
  } catch {
    // ignore
  }
}

export function moveCareItem(board: CareBoardItem[], fromIndex: number, toIndex: number): CareBoardItem[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return board;
  if (fromIndex >= board.length || toIndex >= board.length) return board;
  const next = [...board];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

/** Drop `fromIndex` onto `ontoIndex` — merge tools/folders into one folder. */
export function stackCareItems(board: CareBoardItem[], fromIndex: number, ontoIndex: number): CareBoardItem[] {
  if (fromIndex === ontoIndex || fromIndex < 0 || ontoIndex < 0) return board;
  if (fromIndex >= board.length || ontoIndex >= board.length) return board;

  const next = [...board];
  const from = next[fromIndex];
  const onto = next[ontoIndex];

  const fromIds: CareToolId[] =
    from.kind === "tool" ? [from.id] : [...(Array.isArray(from.childIds) ? from.childIds : [])];
  const ontoIds: CareToolId[] =
    onto.kind === "tool" ? [onto.id] : [...(Array.isArray(onto.childIds) ? onto.childIds : [])];

  // Empty folder drag — nothing to merge.
  if (fromIds.length === 0) return board;

  const merged = [...ontoIds];
  for (const id of fromIds) {
    if (!merged.includes(id)) merged.push(id);
  }

  // Tool-on-tool still needs 2+. Dropping into an existing folder may leave 1 child.
  const ontoIsFolder = onto.kind === "folder";
  if (merged.length < 1) return board;
  if (merged.length < 2 && !ontoIsFolder) return board;

  const folder: CareBoardItem = {
    kind: "folder",
    id: onto.kind === "folder" ? onto.id : `folder-${Date.now()}`,
    childIds: merged,
  };

  const high = Math.max(fromIndex, ontoIndex);
  const low = Math.min(fromIndex, ontoIndex);
  next.splice(high, 1);
  next.splice(low, 1, folder);
  return normalizeCareBoard(next);
}

export function ungroupCareFolder(board: CareBoardItem[], folderIndex: number): CareBoardItem[] {
  const item = board[folderIndex];
  if (!item || item.kind !== "folder") return board;
  const next = [...board];
  const kids = Array.isArray(item.childIds) ? item.childIds : [];
  if (kids.length === 0) {
    next.splice(folderIndex, 1);
  } else {
    next.splice(folderIndex, 1, ...kids.map((id) => ({ kind: "tool" as const, id })));
  }
  return normalizeCareBoard(next);
}

/** Add an empty parent folder when a board slot is free (only one empty folder at a time). */
export function createEmptyCareFolder(board: CareBoardItem[]): CareBoardItem[] {
  if (board.length >= MAX_CARE_BOARD_SLOTS) return board;
  const hasEmpty = board.some(
    (item) => item.kind === "folder" && (!item.childIds || item.childIds.length === 0),
  );
  if (hasEmpty) return board;
  return normalizeCareBoard([
    ...board,
    { kind: "folder", id: `folder-${Date.now()}`, childIds: [] },
  ]);
}

/** Pull one tool out of a folder onto the board (keeps empty parent if last child leaves). */
export function extractCareToolFromFolder(
  board: CareBoardItem[],
  folderIndex: number,
  toolId: CareToolId,
): CareBoardItem[] {
  const item = board[folderIndex];
  if (!item || item.kind !== "folder") return board;
  const childIds = Array.isArray(item.childIds) ? item.childIds : [];
  if (!childIds.includes(toolId)) return board;

  const remaining = childIds.filter((id) => id !== toolId);
  const next = [...board];

  next[folderIndex] = { ...item, childIds: remaining };
  next.splice(folderIndex + 1, 0, { kind: "tool", id: toolId });

  return normalizeCareBoard(next);
}
