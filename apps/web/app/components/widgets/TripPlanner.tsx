import { useState } from "react";
import type { TripLeg, TripPattern, TripResult } from "@life/tools";
import { dataOf, useTool, type ToolQuery } from "@/lib/useTool";
import { tripParam, useGeolocation, useHome, type GeoState } from "@/lib/location";
import { updateSettings, useSettings, type LocationChoice } from "@/lib/settings";
import { clock, distance, duration } from "@/lib/format";
import { WidgetHeader } from "../WidgetHeader";
import { LocationPicker } from "../LocationPicker";
import { Icon } from "../Icon";

type When = "now" | "depart" | "arrive";

const MODE_NAME: Record<string, string> = {
  bus: "Buss",
  coach: "Buss",
  tram: "Bane",
  metro: "T-bane",
  rail: "Tog",
  water: "Båt",
  air: "Fly",
  foot: "Gå",
};

/** Reisesøk fra A til B med Entur. Med href lenker tittelen til planleggersiden. */
export function TripPlanner({ href }: { href?: string }) {
  const settings = useSettings();
  const home = useHome();
  // Uten tidligere søk starter «fra» på holdeplassen avgangene vises for
  const from = settings ? (settings.planner.from ?? settings.stop) : null;
  const to = settings?.planner.to ?? null;
  const [when, setWhen] = useState<When>("now");
  const [time, setTime] = useState("");

  const geo = useGeolocation(from?.mode === "gps" || to?.mode === "gps");
  const fromEnd = resolve(from, geo, home?.stopId ?? null);
  const toEnd = resolve(to, geo, home?.stopId ?? null);

  const query: ToolQuery | null =
    fromEnd?.param && toEnd?.param && (when === "now" || time)
      ? {
          from: fromEnd.param,
          fromName: fromEnd.name,
          to: toEnd.param,
          toName: toEnd.name,
          count: 5,
          when: when === "now" ? undefined : new Date(time).toISOString(),
          arriveBy: when === "arrive" ? true : undefined,
        }
      : null;
  const state = useTool<TripResult>("reiseplan", 60_000, query);
  const data = dataOf(state);

  const setEnds = (planner: { from: LocationChoice | null; to: LocationChoice | null }) => updateSettings({ planner });
  const homeLabel = home?.stopId ? "Holdeplassen fra oppsettet" : undefined;
  const geoProblem = (fromEnd?.pending || toEnd?.pending) ?? null;

  return (
    <section className="planner card" aria-labelledby="planner-title">
      <WidgetHeader id="planner-title" title="Reiseplanlegger" href={href} />

      <div className="planner-ends">
        <div className="end">
          <span className="end-label">Fra</span>
          <LocationPicker
            type="place"
            title="Reise fra"
            value={from}
            onChange={(c) => setEnds({ from: c, to })}
            buttonLabel={endLabel(from, "Velg hvor du reiser fra")}
            buttonClassName="end-button"
            homeLabel={homeLabel}
            gpsLabel="Min posisjon"
            gpsHint="Der denne skjermen er nå"
          />
        </div>
        <button
          type="button"
          className="icon-button swap"
          onClick={() => setEnds({ from: to, to: from })}
          aria-label="Bytt fra og til"
          disabled={!from && !to}
        >
          <Icon name="swap" />
        </button>
        <div className="end">
          <span className="end-label">Til</span>
          <LocationPicker
            type="place"
            title="Reise til"
            value={to}
            onChange={(c) => setEnds({ from, to: c })}
            buttonLabel={endLabel(to, "Velg hvor du skal")}
            buttonClassName="end-button"
            homeLabel={homeLabel}
            gpsLabel="Min posisjon"
            gpsHint="Der denne skjermen er nå"
          />
        </div>
      </div>

      <div className="planner-when">
        <div className="segmented" role="group" aria-label="Når">
          {(["now", "depart", "arrive"] as const).map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={when === w}
              onClick={() => {
                setWhen(w);
                if (w !== "now" && !time) setTime(localInputValue(new Date()));
              }}
            >
              {w === "now" ? "Nå" : w === "depart" ? "Reise kl." : "Fram kl."}
            </button>
          ))}
        </div>
        {when !== "now" && (
          <input
            type="datetime-local"
            className="time-input"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            aria-label={when === "depart" ? "Avreisetid" : "Ankomsttid"}
          />
        )}
      </div>

      <div aria-live="polite">
        {geoProblem && <p className={geoProblem.kind === "error" ? "notice" : "quiet"}>{geoProblem.message}</p>}
        {!geoProblem && !query && (
          <p className="quiet">{!to || !from ? "Velg hvor du reiser fra og til." : "Velg et tidspunkt."}</p>
        )}
        {query && !data && state.status === "loading" && <p className="quiet">Finner reiser …</p>}
        {query && !data && state.status === "error" && <p className="notice">{state.message}</p>}
        {query && data && data.trips.length === 0 && <p className="quiet">Fant ingen reiser mellom disse stedene.</p>}
        {query && data && data.trips.length > 0 && (
          <ol className="trips">
            {data.trips.map((t) => (
              <Trip key={`${t.start}-${t.legs.map((l) => l.line ?? l.mode).join()}`} trip={t} />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

/** Verdien et datetime-local-felt forventer: lokal tid uten sekunder, «2026-10-14T21:30». */
const localInputValue = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function resolve(choice: LocationChoice | null, geo: GeoState, homeStopId: string | null) {
  if (!choice) return null;
  if (choice.mode === "home") return homeStopId ? { param: homeStopId, name: "Holdeplassen fra oppsettet" } : null;
  if (choice.mode === "saved") return { param: tripParam(choice.place), name: choice.place.name };
  if (geo.status === "ok") return { param: tripParam(geo.coords), name: "Min posisjon" };
  return {
    param: null,
    name: "Min posisjon",
    pending:
      geo.status === "error" ? { message: geo.message, kind: "error" as const } : { message: "Finner posisjonen din …", kind: "wait" as const },
  };
}

function endLabel(choice: LocationChoice | null, empty: string) {
  if (!choice) return empty;
  if (choice.mode === "gps") return "Min posisjon";
  if (choice.mode === "home") return "Holdeplassen fra oppsettet";
  return choice.place.name;
}

function Trip({ trip }: { trip: TripPattern }) {
  const firstRide = trip.legs.find((l) => l.mode !== "foot");
  const changes = Math.max(0, trip.legs.filter((l) => l.mode !== "foot").length - 1);
  const cancelled = trip.legs.some((l) => l.cancelled);

  return (
    <li className="trip" data-cancelled={cancelled || undefined}>
      <details>
        <summary>
          <span className="trip-times">
            {clock(trip.start)} – {clock(trip.end)}
          </span>
          <span className="trip-duration">{duration(trip.durationMin)}</span>
          <span className="trip-chain" aria-hidden="true">
            {trip.legs.map((l, i) => (
              <LegChip key={i} leg={l} />
            ))}
          </span>
          <span className="trip-summary">
            {cancelled
              ? "Innstilt underveis"
              : firstRide
                ? `${MODE_NAME[firstRide.mode] ?? "Avgang"} ${firstRide.line ?? ""} fra ${firstRide.from} kl. ${clock(firstRide.start)}${firstRide.platform ? `, plattform ${firstRide.platform}` : ""}`
                : `Gå hele veien, ${distance(trip.walkM)}`}
            {changes > 0 && ` · ${changes} ${changes === 1 ? "bytte" : "bytter"}`}
          </span>
        </summary>
        <ol className="legs">
          {trip.legs.map((l, i) => (
            <li key={i} className="leg" data-cancelled={l.cancelled || undefined}>
              <span className="leg-time">{clock(l.start)}</span>
              <LegChip leg={l} />
              <span className="leg-text">
                {l.mode === "foot" ? (
                  <>
                    Gå {distance(l.distanceM)} til {l.to}
                  </>
                ) : (
                  <>
                    <strong>
                      {MODE_NAME[l.mode] ?? "Linje"} {l.line}
                      {l.towards && ` mot ${l.towards}`}
                    </strong>
                    <small>
                      {l.from}
                      {l.platform && ` (plattform ${l.platform})`} → {l.to}, framme {clock(l.end)}
                      {l.cancelled && " · Innstilt"}
                      {!l.cancelled && !l.realtime && " · rutetid"}
                    </small>
                  </>
                )}
              </span>
            </li>
          ))}
        </ol>
      </details>
    </li>
  );
}

function LegChip({ leg }: { leg: TripLeg }) {
  if (leg.mode === "foot") {
    const min = Math.max(1, Math.round((new Date(leg.end).getTime() - new Date(leg.start).getTime()) / 60_000));
    return (
      <span className="leg-walk" title={`Gå ${distance(leg.distanceM)}`}>
        <Icon name="walk" size={16} />
        {min}
      </span>
    );
  }
  return (
    <span className="dep-line" data-mode={leg.mode}>
      {leg.line}
    </span>
  );
}
