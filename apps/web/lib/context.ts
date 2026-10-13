import type { ToolContext } from "@life/tools";

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return v && Number.isFinite(n) ? n : fallback;
};

/** Bygger ToolContext fra miljøvariablene. Én bruker inntil auth kommer på plass. */
export async function contextFor(_req: Request): Promise<ToolContext> {
  return {
    userId: "daniel",
    config: {
      homeStopId: process.env.HOME_STOP_ID || undefined,
      homeLat: num(process.env.HOME_LAT, 60.3913),
      homeLon: num(process.env.HOME_LON, 5.3221),
    },
  };
}

export const placeName = () => process.env.HOME_PLACE_NAME || "Bergen";
