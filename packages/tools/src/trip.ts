import { z } from "zod";
import { defineTool } from "./registry.ts";
import { journeyPlanner } from "./entur.ts";

const QUERY = `query($from: Location!, $to: Location!, $n: Int!, $dateTime: DateTime, $arriveBy: Boolean) {
  trip(from: $from, to: $to, numTripPatterns: $n, dateTime: $dateTime, arriveBy: $arriveBy) {
    tripPatterns {
      expectedStartTime
      expectedEndTime
      duration
      walkDistance
      legs {
        mode
        distance
        expectedStartTime
        expectedEndTime
        aimedStartTime
        realtime
        fromPlace { name quay { publicCode } }
        toPlace { name }
        line { publicCode transportMode }
        fromEstimatedCall { destinationDisplay { frontText } cancellation }
      }
    }
  }
}`;

export type TripLeg = {
  /** foot, bus, tram, rail, water, … */
  mode: string;
  line: string | null;
  towards: string | null;
  from: string;
  to: string;
  platform: string | null;
  start: string;
  end: string;
  aimedStart: string;
  realtime: boolean;
  cancelled: boolean;
  distanceM: number;
};

export type TripPattern = {
  start: string;
  end: string;
  durationMin: number;
  walkM: number;
  legs: TripLeg[];
};

export type TripResult = { trips: TripPattern[] };

/** «NSR:StopPlace:123» eller «60.39,5.32» → Location-input i Journey Planner. */
const location = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v.startsWith("NSR:")) return { place: v };
    const [lat, lon] = v.split(",").map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lon)) return { coordinates: { latitude: lat, longitude: lon } };
    ctx.addIssue({ code: "custom", message: "Bruk en holdeplass-ID (NSR:…) eller «lat,lon»" });
    return z.NEVER;
  });

export const trip = defineTool({
  name: "reiseplan",
  description:
    "Finner reiseforslag med kollektivtransport i Norge fra ett sted til et annet. from og to er holdeplass-ID (NSR:StopPlace:…) eller koordinater «lat,lon». Uten when gjelder søket nå.",
  input: z.object({
    from: location,
    fromName: z.string().max(100).optional(),
    to: location,
    toName: z.string().max(100).optional(),
    when: z.iso.datetime({ offset: true }).optional(),
    arriveBy: z.stringbool().default(false),
    count: z.coerce.number().int().min(1).max(8).default(5),
  }),
  cacheSeconds: 30,
  async run({ from, fromName, to, toName, when, arriveBy, count }): Promise<TripResult> {
    const data = await journeyPlanner(QUERY, {
      from: { ...from, name: fromName },
      to: { ...to, name: toName },
      n: count,
      dateTime: when,
      arriveBy,
    });

    return {
      trips: (data.trip.tripPatterns as any[]).map((p) => ({
        start: p.expectedStartTime,
        end: p.expectedEndTime,
        durationMin: Math.round(p.duration / 60),
        walkM: Math.round(p.walkDistance),
        legs: (p.legs as any[]).map((l) => ({
          mode: l.line?.transportMode ?? l.mode,
          line: l.line?.publicCode ?? null,
          towards: l.fromEstimatedCall?.destinationDisplay.frontText ?? null,
          from: l.fromPlace.name,
          to: l.toPlace.name,
          platform: l.fromPlace.quay?.publicCode || null,
          start: l.expectedStartTime,
          end: l.expectedEndTime,
          aimedStart: l.aimedStartTime,
          realtime: l.realtime,
          cancelled: l.fromEstimatedCall?.cancellation ?? false,
          distanceM: Math.round(l.distance),
        })),
      })),
    };
  },
});
