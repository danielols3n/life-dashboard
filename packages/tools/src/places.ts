import { z } from "zod";
import { defineTool } from "./registry.ts";
import { geocoder } from "./entur.ts";

export type Place = {
  /** NSR:StopPlace:… for holdeplasser, ellers Entur sin ID for stedet */
  id: string;
  name: string;
  /** Navn med kommune, f.eks. «Fyllingsdalen terminal, Bergen» */
  label: string;
  lat: number;
  lon: number;
  kind: "stop" | "place";
  /** Avstand i km, bare ved oppslag på posisjon */
  distanceKm?: number;
};

export type PlacesResult = { places: Place[] };

export const places = defineTool({
  name: "finn_sted",
  description:
    "Finner holdeplasser eller steder i Norge, enten ved tekstsøk eller nærmest en posisjon. Bruk type=stop for holdeplasser og type=place for steder og adresser.",
  input: z
    .object({
      text: z.string().trim().min(2).max(100).optional(),
      lat: z.coerce.number().min(-90).max(90).optional(),
      lon: z.coerce.number().min(-180).max(180).optional(),
      type: z.enum(["stop", "place"]).default("place"),
      size: z.coerce.number().int().min(1).max(10).default(6),
    })
    .refine((i) => i.text || (i.lat !== undefined && i.lon !== undefined), {
      message: "Oppgi enten text eller både lat og lon",
    }),
  cacheSeconds: 24 * 60 * 60,
  async run({ text, lat, lon, type, size }): Promise<PlacesResult> {
    const stops = type === "stop";
    const data = text
      ? await geocoder("autocomplete", {
          text,
          size,
          lang: "no",
          layers: stops ? "venue" : undefined,
          // Gir treff nær brukeren høyere rangering
          "focus.point.lat": lat,
          "focus.point.lon": lon,
        })
      : await geocoder("reverse", {
          "point.lat": lat,
          "point.lon": lon,
          "boundary.circle.radius": stops ? 2 : 10,
          size,
          lang: "no",
          layers: stops ? "venue" : "address,locality",
        });

    const found: Place[] = (data.features as any[])
      .filter((f) => !stops || String(f.properties.id).startsWith("NSR:StopPlace:"))
      .map((f) => {
        const p = f.properties;
        // Ved posisjonsoppslag for vær er kommunen/tettstedet mer nyttig enn nærmeste adresse
        const name = !text && !stops ? (p.locality ?? p.name) : p.name;
        return {
          id: p.id,
          name,
          label: !text && !stops ? name : (p.label ?? name),
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
          kind: String(p.id).startsWith("NSR:StopPlace:") ? "stop" : "place",
          ...(p.distance !== undefined && { distanceKm: p.distance }),
        };
      });

    return { places: found };
  },
});
