import type { WasteResult } from "@life/tools";
import { dataOf, useNow, useTool } from "@/lib/useTool";
import { dayKey, dayLabel } from "@/lib/format";
import { WidgetHeader } from "../WidgetHeader";

/** Neste tømmedager fra BIR. Med href lenker tittelen til avfallssiden. */
export function WasteWidget({ days = 45, show = 4, href }: { days?: number; show?: number; href?: string }) {
  // Tømmekalenderen endrer seg sjelden; serveren cacher den i seks timer
  const state = useTool<WasteResult>("tommekalender", 60 * 60_000, { days });
  const now = useNow(60_000);
  const data = dataOf(state);

  const today = now ? dayKey(now) : null;
  const tomorrow = now ? dayKey(new Date(now.getTime() + 24 * 60 * 60 * 1000)) : null;
  const pickups = data && today ? data.pickups.filter((p) => p.date >= today).slice(0, show) : [];
  const name = (id: string) => data?.types.find((t) => t.id === id)?.name ?? id;
  const next = pickups[0];

  return (
    <section className="waste card" aria-labelledby="waste-title">
      <WidgetHeader id="waste-title" title="Tømming" href={href} />

      {!data && state.status === "loading" && <p className="quiet">Henter tømmekalenderen …</p>}
      {!data && state.status === "error" && <p className="notice">{state.message}</p>}

      {next && (next.date === today || next.date === tomorrow) && (
        <p className="waste-alert">
          {next.date === today ? "Tømmes i dag: " : "Sett ut i kveld: "}
          <strong>{next.types.map(name).join(", ")}</strong>
        </p>
      )}

      {data && now && pickups.length === 0 && <p className="quiet">Ingen tømming de neste {days} dagene.</p>}
      {now && pickups.length > 0 && (
        <ol className="waste-list">
          {pickups.map((p) => (
            <li key={p.date} className="waste-row">
              <span className="waste-day">
                {dayLabel(p.date, now)}
                {/* «I dag» og «I morgen» sier det selv */}
                {daysUntil(p.date, today!) > 1 && <small>om {daysUntil(p.date, today!)} dager</small>}
              </span>
              <span className="waste-types">
                {p.types.map((t) => (
                  <span key={t} className="waste-chip" data-waste={t}>
                    {name(t)}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ol>
      )}

      {data && <p className="source">{data.address} · tømmekalender fra BIR</p>}
    </section>
  );
}

const daysUntil = (date: string, today: string) =>
  Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
