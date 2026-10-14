import { z } from "zod";
import { defineTool } from "./registry.ts";

export type ForecastDay = {
  /** «YYYY-MM-DD» i norsk tid */
  date: string;
  /** Yr-symbol for midt på dagen, f.eks. «partlycloudy_day» */
  symbol: string | null;
  tempMin: number;
  tempMax: number;
  precipMm: number;
  /** Høyeste sannsynlighet for nedbør i løpet av dagen, i prosent */
  precipChance: number | null;
  windMax: number;
};

export type LongForecastResult = {
  updatedAt: string;
  days: ForecastDay[];
};

const coord = (n: number) => n.toFixed(4);
const dayFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Oslo" });
const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Oslo", hour: "2-digit", hourCycle: "h23" });
const HOUR = 60 * 60 * 1000;

export const longForecast = defineTool({
  name: "langtidsvarsel",
  description:
    "Værvarsel dag for dag de neste ti dagene fra Yr: vær, laveste og høyeste temperatur, nedbør og vind. Bruk hjemstedet hvis brukeren ikke nevner et sted.",
  input: z.object({
    lat: z.coerce.number().min(-90).max(90).optional(),
    lon: z.coerce.number().min(-180).max(180).optional(),
    // MET gir varsel litt over ti døgn fram; 11 gir en full tidagersliste også sent på kvelden
    days: z.coerce.number().int().min(1).max(11).default(10),
  }),
  cacheSeconds: 30 * 60,
  async run({ lat, lon, days }, ctx): Promise<LongForecastResult> {
    const la = lat ?? ctx.config.homeLat;
    const lo = lon ?? ctx.config.homeLon;
    // «complete» har min/maks-temperatur og nedbørssannsynlighet for seks­timers­periodene
    const res = await fetch(
      `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${coord(la)}&lon=${coord(lo)}`,
      { headers: { "User-Agent": "life-dashboard/0.1 github.com/danielols3n" } },
    );
    if (!res.ok) throw new Error(`MET svarte ${res.status}`);
    const data = await res.json();
    const series = data.properties.timeseries as any[];

    type Acc = {
      min: number;
      max: number;
      wind: number;
      chance: number | null;
      symbol: { hour: number; code: string } | null;
    };
    const acc = new Map<string, Acc>();
    const get = (key: string) => {
      let a = acc.get(key);
      if (!a) acc.set(key, (a = { min: Infinity, max: -Infinity, wind: 0, chance: null, symbol: null }));
      return a;
    };

    // Nedbør regnes to måter, fordi MET sine time- og seks­timers­verdier ikke alltid stemmer
    // overens: summen av timene, og summen av seks­timers­periodene som starter 00, 06, 12 og 18 UTC
    const rainByHour = new Map<number, number>();
    const rainBySix = new Map<string, number>();

    for (const t of series) {
      const at = new Date(t.time).getTime();
      const key = dayFmt.format(at);
      const a = get(key);
      const d = t.data;
      const inst = d.instant.details;
      a.min = Math.min(a.min, inst.air_temperature);
      a.max = Math.max(a.max, inst.air_temperature);
      a.wind = Math.max(a.wind, inst.wind_speed ?? 0);

      const six = d.next_6_hours;
      if (six) {
        if (six.details.air_temperature_min !== undefined) a.min = Math.min(a.min, six.details.air_temperature_min);
        if (six.details.air_temperature_max !== undefined) a.max = Math.max(a.max, six.details.air_temperature_max);
        // Symbolet for perioden som starter nærmest kl. 12 beskriver dagen best
        const hour = Number(hourFmt.format(at));
        if (six.summary?.symbol_code && (!a.symbol || Math.abs(hour - 12) < Math.abs(a.symbol.hour - 12))) {
          a.symbol = { hour, code: six.summary.symbol_code };
        }
      }
      const chance = d.next_1_hours?.details.probability_of_precipitation ?? six?.details.probability_of_precipitation;
      if (chance !== undefined) a.chance = Math.max(a.chance ?? 0, chance);

      if (six && new Date(at).getUTCHours() % 6 === 0) {
        rainBySix.set(key, (rainBySix.get(key) ?? 0) + (six.details.precipitation_amount ?? 0));
      }
      if (d.next_1_hours) {
        rainByHour.set(at, d.next_1_hours.details.precipitation_amount ?? 0);
      } else if (six) {
        const share = (six.details.precipitation_amount ?? 0) / 6;
        for (let h = 0; h < 6; h++) if (!rainByHour.has(at + h * HOUR)) rainByHour.set(at + h * HOUR, share);
      }
    }

    const rainByDay = new Map<string, number>();
    for (const [at, mm] of rainByHour) {
      const key = dayFmt.format(at);
      rainByDay.set(key, (rainByDay.get(key) ?? 0) + mm);
    }

    return {
      updatedAt: data.properties.meta.updated_at,
      days: [...acc.entries()]
        .filter(([, a]) => Number.isFinite(a.min))
        .slice(0, days)
        .map(([date, a]) => ({
          date,
          symbol: a.symbol?.code ?? null,
          tempMin: Math.round(a.min * 10) / 10,
          tempMax: Math.round(a.max * 10) / 10,
          precipMm: Math.round(Math.max(rainByDay.get(date) ?? 0, rainBySix.get(date) ?? 0) * 10) / 10,
          precipChance: a.chance === null ? null : Math.round(a.chance),
          windMax: Math.round(a.wind),
        })),
    };
  },
});
