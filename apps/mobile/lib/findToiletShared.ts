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

export const FIND_TOILET_ICON = Toilet;
/** Inline pin beside distance on each nearby row. */
export const FIND_TOILET_DISTANCE_ICON = MapPin;

/** Search radius passed to Toilet Map (metres). */
export const FIND_TOILET_RADIUS_M = 1500;

export const FIND_TOILET_ATTRIBUTION =
  "Contains data from the Toilet Map © Public Convenience Ltd – CC BY 4.0";

export const FIND_TOILET_ATTRIBUTION_URL = "https://www.toiletmap.org.uk/dataset";

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
    return { lat: last.coords.latitude, lng: last.coords.longitude };
  }

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
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
  const url =
    Platform.OS === "ios"
      ? `http://maps.apple.com/?daddr=${lat},${lng}&q=${label}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  await Linking.openURL(url);
}
