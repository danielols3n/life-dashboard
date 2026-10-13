"use client";

import type { WeatherResult } from "@life/tools";
import { useTool } from "@/lib/useTool";
import { clock, describeSymbol, mm, temp, windFrom } from "@/lib/format";
import { Meteogram } from "./Meteogram";

export function WeatherWidget({ place }: { place: string }) {
  const state = useTool<WeatherResult>("hent_vaer", 10 * 60 * 1000, { hours: "12" });
  const data = state.status === "ok" ? state.data : state.status === "error" ? state.data : undefined;

  return (
    <section className="weather" aria-labelledby="weather-title">
      <h2 id="weather-title" className="widget-title">
        Været i {place}
      </h2>

      {!data && state.status === "loading" && <p className="quiet">Henter varsel fra Yr …</p>}
      {!data && state.status === "error" && (
        <p className="notice">{state.message} Prøver igjen om ti minutter.</p>
      )}

      {data && data.hours.length > 0 && <Forecast data={data} />}

      {data && (
        <p className="source">
          Varsel fra Yr, levert av Meteorologisk institutt og NRK. Oppdatert {clock(data.updatedAt)}.
          {state.status === "error" && " Får ikke hentet nyere varsel akkurat nå."}
        </p>
      )}
    </section>
  );
}

function Forecast({ data }: { data: WeatherResult }) {
  const [now, ...rest] = data.hours;
  const next3 = data.hours.slice(0, 3).reduce((sum, h) => sum + h.rainMm, 0);
  const temps = data.hours.map((h) => h.tempC);
  const lo = Math.round(Math.min(...temps));
  const hi = Math.round(Math.max(...temps));

  const rainLine =
    next3 < 0.1
      ? "Opphold de neste tre timene."
      : `${mm(next3)} mm nedbør de neste tre timene.`;

  return (
    <>
      <div className="now">
        <p className="now-temp" data-sign={now.tempC < -0.5 ? "minus" : "plus"}>
          {temp(now.tempC)}
        </p>
        <div className="now-text">
          <p className="now-symbol">{describeSymbol(now.symbol)}</p>
          <p>
            {rainLine} Vind {Math.round(now.windMs)} m/s fra {windFrom(now.windFromDeg)}.
          </p>
          {rest.length > 0 && (
            <p className="quiet">
              {lo === hi ? `Rundt ${temp(lo)}` : `Mellom ${temp(lo)} og ${temp(hi)}`} fram til {clock(data.hours.at(-1)!.time)}.
            </p>
          )}
        </div>
      </div>
      <Meteogram hours={data.hours} />
    </>
  );
}
