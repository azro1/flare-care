/**
 * Find a Toilet — nearby usable toilets (GB Toilet Map via FlareCare API).
 * Not an authority on open/accessible status — be honest about freshness.
 *
 * Data: Great British Public Toilet Map (CC BY 4.0).
 * https://www.toiletmap.org.uk/dataset
 */
import { Linking, Platform } from "react-native";
import * as Location from "expo-location";
import { MapPin, Toilet } from "lucide-react-native";
import { SCREEN_EDGE_PADDING } from "./layoutConstants";

export const FIND_TOILET_ICON = Toilet;
/** Inline pin beside distance on each nearby row. */
export const FIND_TOILET_DISTANCE_ICON = MapPin;

/** Search radius passed to Toilet Map (metres). */
export const FIND_TOILET_RADIUS_M = 1500;

/**
 * On-screen credit (Toilet Map dataset “In short” wording).
 * Keep visible + link to the dataset page / licence.
 * https://www.toiletmap.org.uk/dataset
 */
export const FIND_TOILET_ATTRIBUTION =
  "Contains data from the Toilet Map © 2025 – CC BY 4.0";

export const FIND_TOILET_ATTRIBUTION_URL = "https://www.toiletmap.org.uk/dataset";

/** Map badge height (pill width grows with label). */
export const FIND_TOILET_MAP_MARKER_SIZE = 32;

/** Bottom sheet peek — strip at bottom so the map stays visible. */
export const FIND_TOILET_SHEET_PEEK_H = 132;
/** Gap between the top controls / place UI and the fully raised sheet. */
export const FIND_TOILET_SHEET_TOP_GAP = SCREEN_EDGE_PADDING * 3;
/** Max height of the Choose a place results list (sheet stops under this). */
export const FIND_TOILET_PLACE_DROPDOWN_MAX_H = 220;

export type ToiletMapFilter = "all" | "free" | "accessible" | "radarKey";

export const TOILET_MAP_FILTERS: { id: ToiletMapFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "free", label: "Free" },
  { id: "accessible", label: "Accessible" },
  { id: "radarKey", label: "Radar key" },
];

export type NearbyToilet = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  free: boolean;
  accessible: boolean;
  radarKey: boolean;
  babyChange: boolean;
  allGender: boolean;
  attended: boolean;
  automatic: boolean;
  /** Short “Open today …” line when hours known. */
  openToday: string | null;
  notes: string | null;
  paymentDetails: string | null;
  updatedAt: string | null;
  verifiedAt: string | null;
};

export type NearbyToiletsResult = {
  toilets: NearbyToilet[];
  radiusMeters: number;
  attribution: string;
  attributionUrl: string;
};

export type UserCoords = { lat: number; lng: number };

/** Map search centre — GPS (near me) or a planned place. */
export type ToiletSearchAnchor = {
  coords: UserCoords;
  label: string;
  kind: "me" | "place";
};

export type PlaceSearchHit = {
  label: string;
  coords: UserCoords;
};

function webApiBase(): string {
  return (process.env.EXPO_PUBLIC_WEB_API_BASE_URL || "").replace(/\/$/, "");
}

const NEARBY_QUERY = `
  query findLoosNearby($lat: Float!, $lng: Float!, $radius: Int!) {
    loosByProximity(from: { lat: $lat, lng: $lng, maxDistance: $radius }) {
      id
      name
      location { lat lng }
      noPayment
      allGender
      automatic
      accessible
      babyChange
      radar
      attended
      notes
      paymentDetails
      openingTimes
      updatedAt
      verifiedAt
    }
  }
`;

const EARTH_RADIUS_M = 6371000;

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Toilet Map openingTimes is Mon→Sun; each day [open, close] or []. */
function formatOpenToday(openingTimes: unknown): string | null {
  if (!Array.isArray(openingTimes) || openingTimes.length < 7) return null;
  const mondayIndex = (new Date().getDay() + 6) % 7;
  const slot = openingTimes[mondayIndex];
  if (!Array.isArray(slot) || slot.length < 2) return "Closed today";
  const open = typeof slot[0] === "string" ? slot[0] : null;
  const close = typeof slot[1] === "string" ? slot[1] : null;
  if (!open || !close) return "Closed today";
  return `Open today ${open}–${close}`;
}

function cleanNote(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.replace(/\s+/g, " ").trim();
  return t.length > 0 ? t : null;
}

function normalizeLoos(
  loos: unknown[],
  origin: UserCoords,
): NearbyToilet[] {
  return loos
    .map((raw) => {
      const loo = raw as Record<string, unknown>;
      const loc = loo.location as { lat?: number; lng?: number } | null;
      if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return null;
      const lat = loc.lat as number;
      const lng = loc.lng as number;
      return {
        id: String(loo.id ?? ""),
        name: (typeof loo.name === "string" && loo.name.trim()) || "Public toilet",
        lat,
        lng,
        distanceMeters: Math.round(haversineMeters(origin.lat, origin.lng, lat, lng)),
        free: loo.noPayment === true,
        accessible: loo.accessible === true,
        radarKey: loo.radar === true,
        babyChange: loo.babyChange === true,
        allGender: loo.allGender === true,
        attended: loo.attended === true,
        automatic: loo.automatic === true,
        openToday: formatOpenToday(loo.openingTimes),
        notes: cleanNote(loo.notes),
        paymentDetails: cleanNote(loo.paymentDetails),
        updatedAt: typeof loo.updatedAt === "string" ? loo.updatedAt : null,
        verifiedAt: typeof loo.verifiedAt === "string" ? loo.verifiedAt : null,
      } satisfies NearbyToilet;
    })
    .filter((t): t is NearbyToilet => Boolean(t?.id))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

async function fetchNearbyViaProxy(
  base: string,
  coords: UserCoords,
  radiusMeters: number,
): Promise<NearbyToiletsResult> {
  const url = `${base}/api/toilets/nearby?lat=${encodeURIComponent(String(coords.lat))}&lng=${encodeURIComponent(String(coords.lng))}&radius=${encodeURIComponent(String(radiusMeters))}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error("Couldn't load toilets nearby");
    const data = (await res.json()) as NearbyToiletsResult & { error?: string };
    if (data.error) throw new Error(data.error);
    return {
      toilets: Array.isArray(data.toilets) ? data.toilets : [],
      radiusMeters: data.radiusMeters ?? radiusMeters,
      attribution: data.attribution || FIND_TOILET_ATTRIBUTION,
      attributionUrl: data.attributionUrl || FIND_TOILET_ATTRIBUTION_URL,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchNearbyViaToiletMap(
  coords: UserCoords,
  radiusMeters: number,
): Promise<NearbyToiletsResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch("https://www.toiletmap.org.uk/api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: NEARBY_QUERY,
        variables: { lat: coords.lat, lng: coords.lng, radius: radiusMeters },
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error("Couldn't load toilets nearby");
    const payload = (await res.json()) as {
      data?: { loosByProximity?: unknown[] };
      errors?: unknown[];
    };
    if (payload.errors?.length) throw new Error("Couldn't load toilets nearby");
    const loos = Array.isArray(payload.data?.loosByProximity) ? payload.data!.loosByProximity! : [];
    return {
      toilets: normalizeLoos(loos, coords),
      radiusMeters,
      attribution: FIND_TOILET_ATTRIBUTION,
      attributionUrl: FIND_TOILET_ATTRIBUTION_URL,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Prefer FlareCare proxy; fall back to Toilet Map GraphQL if proxy missing/fails (e.g. not on Vercel yet). */
export async function fetchNearbyToilets(
  coords: UserCoords,
  radiusMeters = FIND_TOILET_RADIUS_M,
): Promise<NearbyToiletsResult> {
  const base = webApiBase();
  if (base) {
    try {
      return await fetchNearbyViaProxy(base, coords, radiusMeters);
    } catch {
      // Proxy not deployed / unreachable — use Toilet Map directly.
    }
  }
  return fetchNearbyViaToiletMap(coords, radiusMeters);
}

export async function requestUserLocation(): Promise<UserCoords> {
  // Don't re-prompt if already decided — Android can flash a lock/permission screen.
  const existing = await Location.getForegroundPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const req = await Location.requestForegroundPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") {
    throw new Error("Location permission is needed to find toilets near you");
  }

  // Prefer last known — avoids waking GPS / system location UI on every retry.
  const last = await Location.getLastKnownPositionAsync();
  if (last?.coords) {
    const coords = { lat: last.coords.latitude, lng: last.coords.longitude };
    rememberNearMeCoords(coords);
    return coords;
  }

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  rememberNearMeCoords(coords);
  return coords;
}

/** Last near-me point — paints the map on the next open before GPS resolves. */
let rememberedNearMeCoords: UserCoords | null = null;

export function peekRememberedNearMeCoords(): UserCoords | null {
  return rememberedNearMeCoords;
}

export function rememberNearMeCoords(coords: UserCoords): void {
  rememberedNearMeCoords = coords;
}

/** UK-friendly distance label. */
export function formatToiletDistance(meters: number): string {
  const mi = meters / 1609.344;
  if (mi < 0.1) return `${Math.max(1, Math.round(meters))} m`;
  if (mi < 10) return `${mi.toFixed(1)} mi`;
  return `${Math.round(mi)} mi`;
}

export function toiletBadgeLabels(t: NearbyToilet): string[] {
  const badges: string[] = [];
  if (t.free) badges.push("Free");
  if (t.accessible) badges.push("Accessible");
  if (t.radarKey) badges.push("Radar key");
  if (t.babyChange) badges.push("Baby change");
  if (t.allGender) badges.push("All gender");
  if (t.attended) badges.push("Attended");
  if (t.automatic) badges.push("Automatic");
  return badges;
}

export function formatToiletLastChecked(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Hand off to Apple Maps / Google Maps — no in-app navigation. */
export async function openToiletDirections(toilet: NearbyToilet): Promise<void> {
  const label = encodeURIComponent(toilet.name);
  const { lat, lng } = toilet;
  // Prefer native schemes first — smoother hand-off than https web URLs.
  const candidates =
    Platform.OS === "ios"
      ? [
          `maps://?daddr=${lat},${lng}&q=${label}`,
          `http://maps.apple.com/?daddr=${lat},${lng}&q=${label}`,
        ]
      : [
          `google.navigation:q=${lat},${lng}`,
          `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
        ];

  for (const url of candidates) {
    try {
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      // try next
    }
  }
  await Linking.openURL(candidates[candidates.length - 1]).catch(() => {});
}

export function filterNearbyToilets(
  toilets: NearbyToilet[],
  filter: ToiletMapFilter,
): NearbyToilet[] {
  if (filter === "all") return toilets;
  if (filter === "free") return toilets.filter((t) => t.free);
  if (filter === "accessible") return toilets.filter((t) => t.accessible);
  return toilets.filter((t) => t.radarKey);
}

/** Label inside map pills (Free, or distance). */
export function formatToiletMarkerLabel(toilet: NearbyToilet): string {
  if (toilet.free) return "Free";
  return formatToiletDistance(toilet.distanceMeters);
}

export function formatToiletMapCount(count: number, anchorLabel?: string): string {
  const where = anchorLabel ? ` near ${anchorLabel}` : " nearby";
  if (count <= 0) return `No toilets${where}`;
  if (count === 1) return `1 toilet${where}`;
  return `${count} toilets${where}`;
}

/** Initial map region around the search anchor (~search radius). */
export function toiletMapRegion(coords: UserCoords) {
  return {
    latitude: coords.lat,
    longitude: coords.lng,
    latitudeDelta: 0.028,
    longitudeDelta: 0.028,
  };
}

/**
 * UK place search for the secondary “choose a place” flow (planning).
 * Prefer device geocoder (reliable in RN) — Nominatim as enrichment when it works.
 */
export async function searchUkPlaces(query: string): Promise<PlaceSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const fromNominatim = await searchNominatimPlaces(q).catch(() => [] as PlaceSearchHit[]);
  if (fromNominatim.length > 0) return fromNominatim;

  // RN often strips Nominatim’s required User-Agent → empty/403. Fall back to expo-location.
  const geos = await Location.geocodeAsync(`${q}, United Kingdom`);
  if (!Array.isArray(geos) || geos.length === 0) return [];

  const hits: PlaceSearchHit[] = [];
  for (const g of geos.slice(0, 5)) {
    if (!Number.isFinite(g.latitude) || !Number.isFinite(g.longitude)) continue;
    let label = q;
    try {
      const rev = await Location.reverseGeocodeAsync({
        latitude: g.latitude,
        longitude: g.longitude,
      });
      const r = rev[0];
      if (r) {
        const parts = [r.name, r.city || r.subregion, r.region].filter(
          (p): p is string => Boolean(p && String(p).trim()),
        );
        if (parts.length > 0) label = parts.slice(0, 3).join(", ");
      }
    } catch {
      // keep query as label
    }
    hits.push({ label, coords: { lat: g.latitude, lng: g.longitude } });
  }
  return hits;
}

async function searchNominatimPlaces(query: string): Promise<PlaceSearchHit[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?format=json` +
    `&q=${encodeURIComponent(query)}` +
    `&countrycodes=gb&limit=5&addressdetails=0`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        // Nominatim requires identifying UA; may be ignored by RN — hence geocode fallback.
        "User-Agent": "FlareCare/1.0 (https://flarecare.app; find-a-toilet)",
      },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{
      display_name?: string;
      lat?: string;
      lon?: string;
    }>;
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row) => {
        const lat = Number(row.lat);
        const lng = Number(row.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        const label = formatPlaceHitLabel(
          typeof row.display_name === "string" ? row.display_name : "",
        );
        return { label, coords: { lat, lng } } satisfies PlaceSearchHit;
      })
      .filter((h): h is PlaceSearchHit => Boolean(h?.label));
  } finally {
    clearTimeout(timeout);
  }
}

/** e.g. "The Royal London Hospital, Whitechapel Road, London" — not just the query echo. */
function formatPlaceHitLabel(displayName: string): string {
  const parts = displayName
    .split(",")
    .map((p) => p.trim())
    .filter(
      (p) =>
        Boolean(p) &&
        !/^(united kingdom|england|scotland|wales|northern ireland|uk)$/i.test(p),
    );
  if (parts.length === 0) return "Place";
  return parts.slice(0, 3).join(", ");
}
