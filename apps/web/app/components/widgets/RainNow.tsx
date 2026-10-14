import type { RainResult } from "@life/tools";
import { dataOf, useNow, useTool, type ToolQuery } from "@/lib/useTool";
import { clock, mm } from "@/lib/format";

const WET = 0.1;

/** Nedbør neste 90 minutter fra radar, med varsel om når regnet kommer eller gir seg. */
export function RainNow({ query }: { query: ToolQuery | null }) {
  const state = useTool<RainResult>("regnvarsel", 5 * 60_000, query);
  const now = useNow(30_000);
  const data = dataOf(state);

  // Utenfor Norden eller uten radar: ingen stripe, været over holder
  if (!data || !now) return null;
  if (data.coverage === "unavailable") return <p className="rain-note quiet">Værradaren er nede akkurat nå.</p>;
  if (data.coverage !== "ok") return null;

  const points = data.points.filter((p) => new Date(p.time).getTime() > now.getTime() - 5 * 60_000);
  if (points.length === 0) return null;

  const minutesTo = (t: string) => Math.max(0, Math.round((new Date(t).getTime() - now.getTime()) / 60_000));
  const wetNow = points[0].rate >= WET;
  const max = Math.max(...points.map((p) => p.rate));
  const scale = Math.max(2, max);

  let message: string;
  let tone: "dry" | "soon" | "wet";
  if (wetNow) {
    tone = "wet";
    message = data.stopsAt
      ? `${intensity(points[0].rate)} nå, gir seg om ca. ${minutesTo(data.stopsAt)} min.`
      : `${intensity(points[0].rate)} nå, og det fortsetter den neste halvannen timen.`;
  } else if (data.startsAt) {
    const m = minutesTo(data.startsAt);
    const after = points.filter((p) => new Date(p.time) >= new Date(data.startsAt!)).slice(0, 6);
    const peak = Math.max(...after.map((p) => p.rate));
    tone = m <= 30 ? "soon" : "dry";
    message = `${intensity(peak)} om ${m <= 2 ? "et par minutter" : `ca. ${m} min`}, rundt kl. ${clock(data.startsAt)}.`;
  } else {
    tone = "dry";
    message = "Opphold den neste halvannen timen.";
  }

  const summary = `${message} Kraftigst ${mm(max)} mm i timen.`;

  return (
    <div className="rain-now" data-tone={tone}>
      <p className="rain-message">{message}</p>
      <div className="rain-bars" role="img" aria-label={max > 0 ? summary : message}>
        {points.map((p) => (
          <span
            key={p.time}
            className="rain-bar"
            data-wet={p.rate >= WET || undefined}
            style={{ height: `${p.rate >= WET ? Math.max(12, Math.min(100, (p.rate / scale) * 100)) : 4}%` }}
          />
        ))}
      </div>
      <div className="rain-axis" aria-hidden="true">
        <span>Nå</span>
        <span>30 min</span>
        <span>60 min</span>
        <span>90 min</span>
      </div>
    </div>
  );
}

/** Ord for nedbørsintensitet i mm/t, omtrent som Yr. */
function intensity(rate: number) {
  if (rate < 0.5) return "Lett regn";
  if (rate < 2.5) return "Regn";
  return "Kraftig regn";
}
