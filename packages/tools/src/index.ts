import type { Tool } from "./registry.ts";
import { weather } from "./weather.ts";
import { transit } from "./transit.ts";

export * from "./registry.ts";
export type { WeatherHour, WeatherResult } from "./weather.ts";
export type { Departure, TransitResult } from "./transit.ts";

/** Alle verktøy, slått opp på navnet språkmodellen og REST-rutene bruker. */
export const tools = {
  [weather.name]: weather,
  [transit.name]: transit,
} as Record<string, Tool>;
