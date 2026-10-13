import { z } from "zod";
import { defineTool } from "./registry.ts";

export type WeatherHour = {
  time: string;
  tempC: number;
  windMs: number;
  windFromDeg: number;
  symbol: string | null;
  rainMm: number;
};

export type WeatherResult = {
  updatedAt: string;
  hours: WeatherHour[];
};

// MET krever maks fire desimaler i koordinatene
const coord = (n: number) => n.toFixed(4);

export const weather = defineTool({
  name: "hent_vaer",
  description:
    "Henter værvarsel fra Yr for de neste timene: temperatur, vind og nedbør. Bruk hjemstedet hvis brukeren ikke nevner et sted.",
  input: z.object({
    lat: z.coerce.number().min(-90).max(90).optional(),
    lon: z.coerce.number().min(-180).max(180).optional(),
    hours: z.coerce.number().int().min(1).max(48).default(12),
  }),
  cacheSeconds: 1800,
  async run({ lat, lon, hours }, ctx): Promise<WeatherResult> {
    const la = lat ?? ctx.config.homeLat;
    const lo = lon ?? ctx.config.homeLon;
    const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${coord(la)}&lon=${coord(lo)}`;

    const res = await fetch(url, {
      headers: { "User-Agent": "life-dashboard/0.1 github.com/danielols3n" },
    });
    if (!res.ok) throw new Error(`MET svarte ${res.status}`);
    const data = await res.json();

    // Varselet starter ved forrige hele time; hopp over timer som er passert
    const cutoff = Date.now() - 60 * 60 * 1000;
    const series = (data.properties.timeseries as any[]).filter(
      (t) => new Date(t.time).getTime() > cutoff,
    );

    return {
      updatedAt: data.properties.meta.updated_at,
      hours: series.slice(0, hours).map((t) => ({
        time: t.time,
        tempC: t.data.instant.details.air_temperature,
        windMs: t.data.instant.details.wind_speed,
        windFromDeg: t.data.instant.details.wind_from_direction,
        symbol:
          t.data.next_1_hours?.summary.symbol_code ??
          t.data.next_6_hours?.summary.symbol_code ??
          null,
        rainMm: t.data.next_1_hours?.details.precipitation_amount ?? 0,
      })),
    };
  },
});
