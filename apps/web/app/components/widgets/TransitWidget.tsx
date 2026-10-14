import type { Departure, TransitResult } from "@life/tools";
import { dataOf, useNow, useTool } from "@/lib/useTool";
import { useStopQuery } from "@/lib/location";
import { updateSettings } from "@/lib/settings";
import { clock } from "@/lib/format";
import { WidgetHeader } from "../WidgetHeader";
import { LocationPicker } from "../LocationPicker";

/** Neste avganger fra valgt holdeplass. Med href lenker tittelen til avgangssiden. */
export function TransitWidget({ show = 7, href }: { show?: number; href?: string }) {
  // Hent litt flere enn vi viser, så lista er full selv om noen nettopp har gått
  const { choice, query, pending } = useStopQuery(show + 2);
  const state = useTool<TransitResult>("neste_avganger", 30 * 1000, query);
  const now = useNow(15 * 1000);
  const data = dataOf(state);

  // Skjul avganger som har gått siden siste henting
  const upcoming = data && now ? data.departures.filter((d) => new Date(d.at).getTime() > now.getTime() - 30_000) : [];

  return (
    <section className="transit card" aria-labelledby="transit-title">
      <WidgetHeader id="transit-title" title={data ? `Avganger fra ${data.stop}` : "Avganger"} href={href}>
        <LocationPicker
          type="stop"
          title="Velg holdeplass"
          value={choice ?? null}
          onChange={(stop) => updateSettings({ stop })}
          buttonLabel={choice?.mode === "gps" ? "Nærmeste" : "Bytt holdeplass"}
          homeLabel="Holdeplassen fra oppsettet"
          gpsLabel="Nærmeste holdeplass"
          gpsHint="Følger posisjonen til denne skjermen"
        />
      </WidgetHeader>

      {pending && <p className={pending.kind === "error" ? "notice" : "quiet"}>{pending.message}</p>}
      {!pending && !data && state.status === "loading" && <p className="quiet">Henter avganger fra Entur …</p>}
      {!data && state.status === "error" && (
        <p className="notice">
          {state.message}
          {state.kind === "upstream" && " Prøver igjen om et halvt minutt."}
        </p>
      )}

      {data && now && upcoming.length === 0 && (
        <p className="quiet">Ingen flere avganger herfra i kveld.</p>
      )}

      {data && now && upcoming.length > 0 && (
        <ol className="departures">
          {upcoming.slice(0, show).map((d) => (
            <DepartureRow key={`${d.line}-${d.aimedAt}-${d.to}`} d={d} now={now} />
          ))}
        </ol>
      )}

      {data && state.status === "error" && (
        <p className="source">Viser sist kjente avganger. Får ikke kontakt med Entur akkurat nå.</p>
      )}
    </section>
  );
}

function DepartureRow({ d, now }: { d: Departure; now: Date }) {
  const mins = Math.floor((new Date(d.at).getTime() - now.getTime()) / 60_000);
  const delay = Math.round((new Date(d.at).getTime() - new Date(d.aimedAt).getTime()) / 60_000);

  let when: string;
  if (mins < 1) when = "nå";
  else if (mins < 15) when = `${mins} min`;
  else when = clock(d.at);

  return (
    <li className="dep" data-cancelled={d.cancelled || undefined} data-soon={(!d.cancelled && mins < 5) || undefined}>
      <span className="dep-line" data-mode={d.mode}>
        {d.line}
      </span>
      <span className="dep-to">
        <span>{d.to}</span>
        {d.cancelled ? (
          <span className="dep-note">Innstilt</span>
        ) : delay >= 2 ? (
          <span className="dep-note">Forsinket, rutetid {clock(d.aimedAt)}</span>
        ) : null}
      </span>
      <span className="dep-when">
        {!d.realtime && !d.cancelled && <span className="dep-ca">ca.</span>}
        {when}
      </span>
    </li>
  );
}
