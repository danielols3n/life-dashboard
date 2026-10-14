import { useSyncExternalStore } from "react";

/** Et sted eller en holdeplass brukeren har valgt fra søket. */
export type SavedPlace = { id: string; name: string; lat: number; lon: number };

/** home = standard fra .env, gps = enhetens posisjon, saved = valgt fra søk. */
export type LocationChoice = { mode: "home" } | { mode: "gps" } | { mode: "saved"; place: SavedPlace };

export type Settings = {
  weather: LocationChoice;
  stop: LocationChoice;
  /** Sist brukte fra/til i reiseplanleggeren */
  planner: { from: LocationChoice | null; to: LocationChoice | null };
};

const KEY = "life-dashboard:settings";
const DEFAULTS: Settings = {
  weather: { mode: "home" },
  stop: { mode: "home" },
  planner: { from: null, to: null },
};

let snapshot: Settings | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function read(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULTS;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Endringer fra andre faner
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    snapshot = read();
    notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => (snapshot ??= read());

/** Valgene for denne skjermen. null på serveren og under hydrering. */
export function useSettings(): Settings | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function updateSettings(patch: Partial<Settings>) {
  snapshot = { ...getSnapshot(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {}
  notify();
}
