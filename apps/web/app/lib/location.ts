import { useEffect, useState } from "react";
import { useRouteLoaderData } from "react-router";
import type { PlacesResult } from "@life/tools";
import { dataOf, useTool, type ToolQuery } from "./useTool";
import { useSettings, type LocationChoice, type SavedPlace } from "./settings";

export type Coords = { lat: number; lon: number };

export type GeoState =
  | { status: "off" }
  | { status: "locating" }
  | { status: "ok"; coords: Coords }
  | { status: "error"; message: string };

// Tre desimaler er omtrent 100 meter: nok for vær og nærmeste holdeplass,
// og små GPS-svingninger gir ikke nye oppslag hver gang
const round = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;

const GEO_ERRORS: Record<number, string> = {
  1: "Nettleseren har ikke lov til å bruke posisjonen din. Tillat posisjon for denne siden.",
  2: "Fant ikke posisjonen din akkurat nå.",
  3: "Det tok for lang tid å finne posisjonen din.",
};

/** Enhetens posisjon, oppdatert hvert femte minutt mens enabled er sann. */
export function useGeolocation(enabled: boolean): GeoState {
  const [state, setState] = useState<GeoState>({ status: "off" });

  useEffect(() => {
    if (!enabled) return setState({ status: "off" });
    if (!window.isSecureContext) {
      return setState({ status: "error", message: "Posisjon virker bare over https eller på localhost." });
    }
    if (!("geolocation" in navigator)) {
      return setState({ status: "error", message: "Denne nettleseren kan ikke dele posisjon." });
    }

    let active = true;
    setState((s) => (s.status === "ok" ? s : { status: "locating" }));
    const locate = () =>
      navigator.geolocation.getCurrentPosition(
        (p) => {
          if (!active) return;
          const coords = { lat: round(p.coords.latitude), lon: round(p.coords.longitude) };
          setState((s) =>
            s.status === "ok" && s.coords.lat === coords.lat && s.coords.lon === coords.lon ? s : { status: "ok", coords },
          );
        },
        (err) => active && setState({ status: "error", message: GEO_ERRORS[err.code] ?? "Fant ikke posisjonen din." }),
        { enableHighAccuracy: false, maximumAge: 5 * 60_000, timeout: 20_000 },
      );
    locate();
    const id = setInterval(locate, 5 * 60_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [enabled]);

  return state;
}

/** Standardvalgene fra .env, lastet av layout-ruten. */
export function useHome() {
  return useRouteLoaderData("routes/layout") as { place: string; stopId: string | null; lat: number; lon: number } | undefined;
}

/** Hvor et valgt sted skal sendes til Entur: holdeplass-ID hvis det er en, ellers koordinater. */
export const tripParam = (p: SavedPlace | Coords) =>
  "id" in p && p.id.startsWith("NSR:StopPlace:") ? p.id : `${round(p.lat, 4)},${round(p.lon, 4)}`;

/** Status for et valg som ennå ikke kan brukes, til visning i widgeten. */
export type Pending = { message: string; kind: "wait" | "error" } | null;

function pendingFromGeo(geo: GeoState): Pending {
  if (geo.status === "error") return { message: geo.message, kind: "error" };
  if (geo.status !== "ok") return { message: "Finner posisjonen din …", kind: "wait" };
  return null;
}

/** Spørringen til hent_vaer og navnet på stedet, ut fra valget for denne skjermen. */
export function useWeatherQuery(hours: number) {
  const settings = useSettings();
  const home = useHome();
  const choice: LocationChoice | undefined = settings?.weather;
  const geo = useGeolocation(choice?.mode === "gps");

  // Navnet på stedet der enheten er, f.eks. «Bergen»
  const coords = geo.status === "ok" ? geo.coords : null;
  const reverse = useTool<PlacesResult>(
    "finn_sted",
    24 * 60 * 60_000,
    coords ? { lat: coords.lat, lon: coords.lon, type: "place", size: 1 } : null,
  );

  let query: ToolQuery | null = null;
  let label: string | null = null;
  let pending: Pending = null;

  if (choice?.mode === "home") {
    query = { hours };
    label = home?.place ?? null;
  } else if (choice?.mode === "saved") {
    query = { hours, lat: round(choice.place.lat, 4), lon: round(choice.place.lon, 4) };
    label = choice.place.name;
  } else if (choice?.mode === "gps") {
    pending = pendingFromGeo(geo);
    if (coords) {
      query = { hours, lat: coords.lat, lon: coords.lon };
      label = dataOf(reverse)?.places[0]?.name ?? "din posisjon";
    }
  }

  return { choice, query, label, pending };
}

/** Spørringen til neste_avganger, ut fra valget for denne skjermen. */
export function useStopQuery(count: number) {
  const settings = useSettings();
  const choice: LocationChoice | undefined = settings?.stop;
  const geo = useGeolocation(choice?.mode === "gps");

  const coords = geo.status === "ok" ? geo.coords : null;
  const nearest = useTool<PlacesResult>(
    "finn_sted",
    24 * 60 * 60_000,
    coords ? { lat: coords.lat, lon: coords.lon, type: "stop", size: 1 } : null,
  );

  let query: ToolQuery | null = null;
  let pending: Pending = null;

  if (choice?.mode === "home") {
    query = { count };
  } else if (choice?.mode === "saved") {
    query = { count, stopId: choice.place.id };
  } else if (choice?.mode === "gps") {
    pending = pendingFromGeo(geo);
    if (coords) {
      const stop = dataOf(nearest)?.places[0];
      if (stop) query = { count, stopId: stop.id };
      else if (nearest.status === "loading") pending = { message: "Finner nærmeste holdeplass …", kind: "wait" };
      else if (nearest.status === "error") pending = { message: nearest.message, kind: "error" };
      else pending = { message: "Fant ingen holdeplass innen to kilometer.", kind: "error" };
    }
  }

  return { choice, query, pending };
}
