import type { Tool } from "./registry.ts";
import { weather } from "./weather.ts";
import { transit } from "./transit.ts";
import { places } from "./places.ts";
import { trip } from "./trip.ts";
import { mail } from "./mail.ts";
import { calendar } from "./calendar.ts";
import { stops } from "./stops.ts";
import { rain } from "./rain.ts";
import { waste } from "./waste.ts";
import { longForecast } from "./longforecast.ts";

export * from "./registry.ts";
export type { WeatherHour, WeatherResult } from "./weather.ts";
export type { Departure, TransitResult } from "./transit.ts";
export type { Place, PlacesResult } from "./places.ts";
export type { TripLeg, TripPattern, TripResult } from "./trip.ts";
export type { MailMessage, MailResult } from "./mail.ts";
export type { CalendarEvent, CalendarResult } from "./calendar.ts";
export type { MapStop, StopsResult } from "./stops.ts";
export type { RainPoint, RainResult } from "./rain.ts";
export type { WasteType, WastePickup, WasteResult } from "./waste.ts";
export type { ForecastDay, LongForecastResult } from "./longforecast.ts";

/** Alle verktøy, slått opp på navnet språkmodellen og REST-rutene bruker. */
export const tools = {
  [weather.name]: weather,
  [transit.name]: transit,
  [places.name]: places,
  [trip.name]: trip,
  [mail.name]: mail,
  [calendar.name]: calendar,
  [stops.name]: stops,
  [rain.name]: rain,
  [waste.name]: waste,
  [longForecast.name]: longForecast,
} as Record<string, Tool>;
