const wardCentroids = [
  {
    id: "30000000-0000-0000-0000-000000000001",
    code: "ward-4",
    name: "Ward 4",
    latitude: 17.4012,
    longitude: 78.4749,
  },
  {
    id: "30000000-0000-0000-0000-000000000002",
    code: "ward-8",
    name: "Ward 8",
    latitude: 17.3725,
    longitude: 78.5028,
  },
  {
    id: "30000000-0000-0000-0000-000000000003",
    code: "ward-12",
    name: "Ward 12",
    latitude: 17.3562,
    longitude: 78.4728,
  },
] as const;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function calculateDistanceKm(
  firstLatitude: number,
  firstLongitude: number,
  secondLatitude: number,
  secondLongitude: number,
) {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(secondLatitude - firstLatitude);
  const longitudeDelta = toRadians(secondLongitude - firstLongitude);
  const originLatitude = toRadians(firstLatitude);
  const targetLatitude = toRadians(secondLatitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.sin(longitudeDelta / 2) ** 2 * Math.cos(originLatitude) * Math.cos(targetLatitude);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function inferWardFromCoordinates(latitude: number, longitude: number) {
  const ranked = wardCentroids
    .map((ward) => ({
      ...ward,
      distanceKm: calculateDistanceKm(latitude, longitude, ward.latitude, ward.longitude),
    }))
    .sort((left, right) => left.distanceKm - right.distanceKm);

  const nearest = ranked[0];

  if (!nearest) {
    return null;
  }

  return {
    id: nearest.id,
    code: nearest.code,
    name: nearest.name,
    distanceKm: nearest.distanceKm,
    confidence:
      nearest.distanceKm < 1.5
        ? "high"
        : nearest.distanceKm < 3
          ? "medium"
          : "low",
  } as const;
}

