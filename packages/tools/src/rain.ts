import { z } from "zod";
import { defineTool, ToolConfigError } from "./registry.ts";

export type RainPoint = { time: string; /** mm/t */ rate: number };

export type RainResult = {
  /** ok, eller at radaren er nede eller ikke dekker stedet */
  coverage: "ok" | "unavailable" | "none";
  updatedAt: string;
  points: RainPoint[];
  /** Første tidspunkt med nedbør når det er opphold nå */
  startsAt: string | null;
  /** Første tidspunkt uten nedbør når det regner nå */
  stopsAt: string | null;
};

// Under dette regnes det som opphold (MET bruker 0,1 mm/t som grense for «nedbør»)
const WET = 0.1;

const coord = (n: number) => n.toFixed(4);

export const rain = defineTool({
  name: "regnvarsel",
  description:
    "Nedbør de neste 90 minuttene fra værradar, i steg på fem minutter: om det begynner eller slutter å regne snart. Bare i Norden. Bruk hjemstedet hvis brukeren ikke nevner et sted.",
  input: z.object({
    lat: z.coerce.number().min(-90).max(90).optional(),
    lon: z.coerce.number().min(-180).max(180).optional(),
  }),
  cacheSeconds: 5 * 60,
  async run({ lat, lon }, ctx): Promise<RainResult> {
    const la = lat ?? ctx.config.homeLat;
    const lo = lon ?? ctx.config.homeLon;
    const res = await fetch(
      `https://api.met.no/weatherapi/nowcast/2.0/complete?lat=${coord(la)}&lon=${coord(lo)}`,
      { headers: { "User-Agent": "life-dashboard/0.1 github.com/danielols3n" } },
    );
    // MET svarer 422 for steder utenfor radardekningen
    if (res.status === 422) throw new ToolConfigError("Regnvarsel fra radar finnes bare for Norden.");
    if (!res.ok) throw new Error(`MET svarte ${res.status}`);
    const data = await res.json();

    const meta = data.properties.meta;
    const coverage = meta.radar_coverage === "ok" ? "ok" : meta.radar_coverage === "temporarily unavailable" ? "unavailable" : "none";
    // Hopp over steg som allerede er passert
    const cutoff = Date.now() - 5 * 60 * 1000;
    const points: RainPoint[] = (data.properties.timeseries as any[])
      .filter((t) => new Date(t.time).getTime() > cutoff)
      .map((t) => ({ time: t.time, rate: t.data.instant.details.precipitation_rate ?? 0 }));

    const wetNow = (points[0]?.rate ?? 0) >= WET;
    const change = points.find((p) => (p.rate >= WET) !== wetNow);

    return {
      coverage,
      updatedAt: meta.updated_at,
      points,
      startsAt: !wetNow && change ? change.time : null,
      stopsAt: wetNow && change ? change.time : null,
    };
  },
});
