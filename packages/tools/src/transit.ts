import { z } from "zod";
import { defineTool, ToolConfigError } from "./registry.ts";
import { journeyPlanner } from "./entur.ts";

const QUERY = `query($id: String!, $n: Int!) {
  stopPlace(id: $id) {
    name
    estimatedCalls(numberOfDepartures: $n) {
      aimedDepartureTime
      expectedDepartureTime
      realtime
      cancellation
      destinationDisplay { frontText }
      quay { publicCode }
      serviceJourney { line { publicCode transportMode } }
    }
  }
}`;

export type Departure = {
  line: string;
  mode: string;
  to: string;
  platform: string | null;
  aimedAt: string;
  at: string;
  realtime: boolean;
  cancelled: boolean;
};

export type TransitResult = {
  stopId: string;
  stop: string;
  departures: Departure[];
};

export const transit = defineTool({
  name: "neste_avganger",
  description:
    "Neste avganger med sanntid fra en holdeplass i Entur (dekker Skyss). Bruk standard holdeplass hvis brukeren ikke nevner en.",
  input: z.object({
    stopId: z.string().startsWith("NSR:StopPlace:").optional(),
    count: z.coerce.number().int().min(1).max(20).default(8),
  }),
  cacheSeconds: 30,
  async run({ stopId, count }, ctx): Promise<TransitResult> {
    const id = stopId ?? ctx.config.homeStopId;
    if (!id) {
      throw new ToolConfigError(
        "Ingen holdeplass er valgt. Sett HOME_STOP_ID i .env i hovedmappen.",
      );
    }

    const data = await journeyPlanner(QUERY, { id, n: count });
    if (!data?.stopPlace) {
      throw new ToolConfigError(`Fant ingen holdeplass med ID ${id}.`);
    }

    return {
      stopId: id,
      stop: data.stopPlace.name,
      departures: data.stopPlace.estimatedCalls.map((c: any) => ({
        line: c.serviceJourney.line.publicCode,
        mode: c.serviceJourney.line.transportMode,
        to: c.destinationDisplay.frontText,
        platform: c.quay?.publicCode || null,
        aimedAt: c.aimedDepartureTime,
        at: c.expectedDepartureTime,
        realtime: c.realtime,
        cancelled: c.cancellation,
      })),
    };
  },
});
