import { z } from "zod";
import { defineTool } from "./registry.ts";
import { journeyPlanner } from "./entur.ts";

const QUERY = `query($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!) {
  stopPlacesByBbox(minimumLatitude: $minLat, minimumLongitude: $minLon, maximumLatitude: $maxLat, maximumLongitude: $maxLon) {
    id
    name
    latitude
    longitude
    transportMode
  }
}`;

export type MapStop = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** bus, tram, rail, water, … */
  modes: string[];
};

export type StopsResult = { stops: MapStop[] };

export const stops = defineTool({
  name: "holdeplasser_i_omrade",
  description: "Alle holdeplasser innenfor et kartutsnitt (min/maks breddegrad og lengdegrad). Utsnittet kan ikke være større enn omtrent en bydel.",
  input: z
    .object({
      minLat: z.coerce.number().min(-90).max(90),
      minLon: z.coerce.number().min(-180).max(180),
      maxLat: z.coerce.number().min(-90).max(90),
      maxLon: z.coerce.number().min(-180).max(180),
    })
    .refine((b) => b.maxLat > b.minLat && b.maxLon > b.minLon, { message: "Maks må være større enn min" })
    // Omtrent 11 × 11 km i Bergen; større utsnitt gir tusenvis av punkter
    .refine((b) => b.maxLat - b.minLat <= 0.1 && b.maxLon - b.minLon <= 0.2, { message: "Utsnittet er for stort, zoom inn" }),
  cacheSeconds: 24 * 60 * 60,
  async run({ minLat, minLon, maxLat, maxLon }): Promise<StopsResult> {
    const data = await journeyPlanner(QUERY, { minLat, minLon, maxLat, maxLon });
    return {
      stops: (data.stopPlacesByBbox as any[]).map((s) => ({
        id: s.id,
        name: s.name,
        lat: s.latitude,
        lon: s.longitude,
        modes: s.transportMode ?? [],
      })),
    };
  },
});
