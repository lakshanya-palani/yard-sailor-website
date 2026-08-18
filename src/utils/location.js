const EARTH_RADIUS_MILES = 3958.8;
let locationRequest;

export function calculateDistanceMiles(lat1, lon1, lat2, lon2) {
  const values = [lat1, lon1, lat2, lon2].map(Number);
  if (values.some((value) => !Number.isFinite(value))) return null;

  const [startLat, startLon, endLat, endLon] = values;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(endLat - startLat);
  const longitudeDelta = toRadians(endLon - startLon);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(startLat)) *
      Math.cos(toRadians(endLat)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function hasValidCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function requestUserLocation() {
  if (!navigator.geolocation) return Promise.resolve(null);

  if (!locationRequest) {
    locationRequest = new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    });
  }

  return locationRequest;
}

export async function geocodeAddress(address) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  if (!token) throw new Error("Mapbox is not configured for address lookup.");

  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${encodeURIComponent(token)}&limit=1&country=US`
  );

  if (!response.ok) throw new Error("Unable to look up that address right now.");
  const data = await response.json();
  const feature = data.features?.[0];
  const geometryCoordinates = feature?.geometry?.coordinates;

  if (!Array.isArray(geometryCoordinates) || geometryCoordinates.length < 2) {
    throw new Error("Could not find valid coordinates for this address.");
  }

  const [rawLongitude, rawLatitude] = geometryCoordinates;
  const latitude = Number(rawLatitude);
  const longitude = Number(rawLongitude);

  if (!hasValidCoordinates(latitude, longitude)) {
    throw new Error("Invalid coordinates returned for this address.");
  }

  return { latitude, longitude, placeName: feature.place_name };
}

export function getPublicLocation(address) {
  if (!address) return "Location available on listing";
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length >= 3 ? parts.slice(-3, -1).join(", ") : parts.slice(-2).join(", ");
}
