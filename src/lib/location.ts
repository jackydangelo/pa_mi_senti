export interface Coordinates {
  latitude: number;
  longitude: number;
}

const formatCoordinate = (value: number): string => value.toFixed(5);

export const buildGoogleMapsLink = (coords: Coordinates): string => {
  const lat = formatCoordinate(coords.latitude);
  const lng = formatCoordinate(coords.longitude);
  return `https://www.google.com/maps/place/${lat},${lng}`;
};

/**
 * Appende link Google Maps con coordinate fornite
 * @param message Messaggio a cui appendere il link
 * @param coords Coordinate già ottenute (da mappa o GPS)
 * @returns Messaggio con link appeso
 */
export const appendLocationLinkFromCoords = (
  message: string,
  coords: Coordinates
): string => {
  const mapsLink = buildGoogleMapsLink(coords);
  const trimmed = message.trim();
  return trimmed ? `${trimmed} ${mapsLink}` : mapsLink;
};

interface NominatimAddress {
  road?: string;
  pedestrian?: string;
  footway?: string;
  path?: string;
  square?: string;
  neighbourhood?: string;
  house_number?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
}

/**
 * Compone un indirizzo leggibile dai campi address di Nominatim.
 * Es. "Via Roma 12, Palermo". Ritorna null se non c'è una via utilizzabile.
 */
const composeAddress = (address: NominatimAddress): string | null => {
  const road =
    address.road ||
    address.pedestrian ||
    address.footway ||
    address.path ||
    address.square ||
    address.neighbourhood;
  if (!road) {
    return null;
  }
  const street = address.house_number ? `${road} ${address.house_number}` : road;
  const city =
    address.city || address.town || address.village || address.municipality;
  return city ? `${street}, ${city}` : street;
};

/**
 * Reverse geocoding via Nominatim (OpenStreetMap): coordinate → nome della via.
 * Nessuna API key. Timeout breve per non bloccare la pubblicazione del messaggio.
 * Ritorna null in caso di errore, timeout o indirizzo non determinabile.
 */
export const reverseGeocode = async (
  coords: Coordinates,
  timeoutMs = 2500
): Promise<string | null> => {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams({
    format: "json",
    addressdetails: "1",
    zoom: "18",
    "accept-language": "it",
    lat: String(coords.latitude),
    lon: String(coords.longitude)
  });
  const url = `https://nominatim.openstreetmap.org/reverse?${params.toString()}`;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { address?: NominatimAddress };
    return data.address ? composeAddress(data.address) : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
};

export const requestCurrentPosition = (): Promise<Coordinates> =>
  new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("Geolocalizzazione non supportata"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });

interface MaybeAppendLocationOptions {
  confirmMessage?: string;
  onRequestStart?: () => void;
  onRequestEnd?: () => void;
}

export const maybeAppendLocationLink = async (
  message: string,
  options?: MaybeAppendLocationOptions
): Promise<string> => {
  if (typeof window === "undefined") {
    return message;
  }

  // Se confirmMessage è stringa vuota, non mostrare il dialogo
  const shouldAskConfirmation = options?.confirmMessage !== "";

  const wantsLocation = shouldAskConfirmation
    ? window.confirm(
        options?.confirmMessage ??
          "Vuoi aggiungere un link con la tua posizione attuale al messaggio?"
      )
    : true;

  if (!wantsLocation) {
    return message;
  }

  try {
    options?.onRequestStart?.();
    const coords = await requestCurrentPosition();
    const mapsLink = buildGoogleMapsLink(coords);
    const trimmed = message.trim();
    return trimmed ? `${trimmed} ${mapsLink}` : mapsLink;
  } catch (error) {
    window.alert("Non è stato possibile recuperare la tua posizione.");
    return message;
  } finally {
    options?.onRequestEnd?.();
  }
};
