import type { WeatherResult } from "@life/tools";
import { dataOf, useTool } from "@/lib/useTool";
import { useHome, useWeatherQuery } from "@/lib/location";
import { updateSettings } from "@/lib/settings";
import { clock, describeSymbol, mm, temp, windFrom } from "@/lib/format";
import { WidgetHeader } from "../WidgetHeader";
import { LocationPicker } from "../LocationPicker";
import { Meteogram } from "./Meteogram";
import { RainNow } from "./RainNow";
import { LongForecast } from "./LongForecast";

/**
 * Været nå, meteogram og langtidsvarsel. «compact» viser de neste dagene på én rad (oversikten),
 * «full» viser hele tidagersvarselet (værsiden). Med href lenker tittelen til værsiden.
 */
export function WeatherWidget({
  hours = 12,
  long = "compact",
  href,
}: {
  hours?: number;
  long?: "compact" | "full";
  href?: string;
}) {
  const { choice, query, label, pending } = useWeatherQuery(hours);
  const home = useHome();
  const state = useTool<WeatherResult>("hent_vaer", 10 * 60 * 1000, query);
  const data = dataOf(state);
  // Samme sted for radar og langtidsvarsel; uten lat/lon bruker verktøyene hjemstedet
  const place = query && { lat: query.lat, lon: query.lon };

  return (
    <section className="weather" aria-labelledby="weather-title">
      <WidgetHeader id="weather-title" title={label ? `Været i ${label}` : "Været"} href={href}>
        <LocationPicker
          type="place"
          title="Velg sted for været"
          value={choice ?? null}
          onChange={(weather) => updateSettings({ weather })}
          buttonLabel={choice?.mode === "gps" ? "Min posisjon" : "Bytt sted"}
          homeLabel={home ? `${home.place}, fra oppsettet` : undefined}
          gpsLabel="Min posisjon"
          gpsHint="Været der denne skjermen er"
        />
      </WidgetHeader>

      {pending && <p className={pending.kind === "error" ? "notice" : "quiet"}>{pending.message}</p>}
      {!pending && !data && state.status === "loading" && <p className="quiet">Henter varsel fra Yr …</p>}
      {!data && state.status === "error" && (
        <p className="notice">
          {state.message}
          {state.kind === "upstream" && " Prøver igjen om ti minutter."}
        </p>
      )}

      {data && data.hours.length > 0 && (
        <Forecast data={data}>
          <RainNow query={place} />
        </Forecast>
      )}

      {data && <LongForecast query={place} variant={long} />}

      {data && (
        <p className="source">
          Varsel fra Yr, levert av Meteorologisk institutt og NRK. Oppdatert {clock(data.updatedAt)}.
          {state.status === "error" && " Får ikke hentet nyere varsel akkurat nå."}
        </p>
      )}
    </section>
  );
}

function Forecast({ data, children }: { data: WeatherResult; children?: React.ReactNode }) {
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
          {children}
        </div>
      </div>
      <Meteogram hours={data.hours} />
    </>
  );
}
