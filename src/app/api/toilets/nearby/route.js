/**
 * Nearby toilets proxy — Great British Public Toilet Map GraphQL (CC BY 4.0).
 * Attribution: Contains data from the Toilet Map © Public Convenience Ltd – CC BY 4.0
 * https://www.toiletmap.org.uk/dataset
 */
export const dynamic = "force-dynamic";

const TOILET_MAP_GRAPHQL = "https://www.toiletmap.org.uk/api";

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
      openingTimes
      updatedAt
      verifiedAt
    }
  }
`;

const EARTH_RADIUS_M = 6371000;

function haversineMeters(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

function clampRadius(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 1500;
  return Math.min(5000, Math.max(200, Math.round(n)));
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radius = clampRadius(searchParams.get("radius"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return Response.json({ error: "Invalid lat/lng" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(TOILET_MAP_GRAPHQL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "FlareCare/1.0 (+https://flarecare.app)",
      },
      body: JSON.stringify({
        query: NEARBY_QUERY,
        variables: { lat, lng, radius },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return Response.json({ error: "Toilet data unavailable" }, { status: 502 });
    }

    const payload = await res.json();
    if (payload.errors?.length) {
      return Response.json({ error: "Toilet data unavailable" }, { status: 502 });
    }

    const loos = Array.isArray(payload?.data?.loosByProximity) ? payload.data.loosByProximity : [];
    const toilets = loos
      .filter((loo) => loo?.location && Number.isFinite(loo.location.lat) && Number.isFinite(loo.location.lng))
      .map((loo) => {
        const distanceMeters = Math.round(
          haversineMeters(lat, lng, loo.location.lat, loo.location.lng),
        );
        return {
          id: String(loo.id),
          name: (loo.name && String(loo.name).trim()) || "Public toilet",
          lat: loo.location.lat,
          lng: loo.location.lng,
          distanceMeters,
          free: loo.noPayment === true,
          accessible: loo.accessible === true,
          radarKey: loo.radar === true,
          babyChange: loo.babyChange === true,
          allGender: loo.allGender === true,
          updatedAt: loo.updatedAt || null,
          verifiedAt: loo.verifiedAt || null,
        };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    return Response.json({
      toilets,
      radiusMeters: radius,
      attribution:
        "Contains data from the Toilet Map © Public Convenience Ltd – CC BY 4.0",
      attributionUrl: "https://www.toiletmap.org.uk/dataset",
    });
  } catch {
    return Response.json({ error: "Toilet data unavailable" }, { status: 502 });
  }
}
