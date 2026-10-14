import type { ForecastDay, LongForecastResult } from "@life/tools";
import { dataOf, useNow, useTool, type ToolQuery } from "@/lib/useTool";
import { dayKey, dayLabel, describeSymbol, mm, temp } from "@/lib/format";
import { WeatherIcon } from "../WeatherIcon";

const shortDay = new Intl.DateTimeFormat("nb-NO", { weekday: "short", timeZone: "UTC" });

/**
 * Langtidsvarsel dag for dag. «compact» er en rad med de neste dagene (oversikten),
 * «full» er en liste med temperaturstolper, nedbør og vind (værsiden).
 */
export function LongForecast({
  query,
  variant,
  days = variant === "compact" ? 5 : 10,
}: {
  query: ToolQuery | null;
  variant: "compact" | "full";
  days?: number;
}) {
  const state = useTool<LongForecastResult>("langtidsvarsel", 30 * 60_000, query && { ...query, days: days + 1 });
  const now = useNow(60_000);
  const data = dataOf(state);

  if (!data || !now || data.days.length === 0) {
    return state.status === "error" && !data ? <p className="notice">{state.message}</p> : null;
  }

  // Dropp i dag når det bare er noen timer igjen; da sier timesvarselet over mer
  const list = (data.days[0].date === dayKey(now) && now.getHours() >= 18 ? data.days.slice(1) : data.days).slice(0, days);

  if (variant === "compact") {
    return (
      <ol className="lf-strip" aria-label="Været de neste dagene">
        {list.map((d) => (
          <li key={d.date} className="lf-cell">
            <span className="lf-cell-day">{label(d.date, now, true)}</span>
            <WeatherIcon symbol={d.symbol} size={40} />
            <span className="lf-cell-temp">
              <span data-sign={sign(d.tempMax)}>{temp(d.tempMax)}</span>
              <span className="quiet">{temp(d.tempMin)}</span>
            </span>
            {/* Hard mellomrom holder raden like høy når det er opphold */}
            <span className="lf-cell-rain">{d.precipMm >= 0.1 ? `${mm(d.precipMm)} mm` : "\u00a0"}</span>
          </li>
        ))}
      </ol>
    );
  }

  const lo = Math.min(...list.map((d) => d.tempMin));
  const hi = Math.max(...list.map((d) => d.tempMax));
  const span = Math.max(1, hi - lo);

  return (
    <section className="lf" aria-labelledby="lf-title">
      <h3 id="lf-title" className="lf-title">
        Langtidsvarsel
      </h3>
      <ol className="lf-list">
        {list.map((d) => (
          <li key={d.date} className="lf-row">
            <span className="lf-day">
              {/* Kort dagnavn på smale skjermer, byttes med CSS */}
              <span className="lf-day-long">{label(d.date, now, false)}</span>
              <span className="lf-day-short">{label(d.date, now, "date")}</span>
            </span>
            <WeatherIcon symbol={d.symbol} size={44} />
            <span className="lf-desc">{describeSymbol(d.symbol)}</span>
            <span className="lf-temps">
              <span className="lf-min" data-sign={sign(d.tempMin)}>
                {temp(d.tempMin)}
              </span>
              <span className="lf-track" aria-hidden="true">
                <span
                  className="lf-bar"
                  data-range={range(d)}
                  style={{ left: `${((d.tempMin - lo) / span) * 100}%`, width: `${Math.max(4, ((d.tempMax - d.tempMin) / span) * 100)}%` }}
                />
              </span>
              <span className="lf-max" data-sign={sign(d.tempMax)}>
                {temp(d.tempMax)}
              </span>
            </span>
            <span className="lf-rain" data-dry={d.precipMm < 0.1 || undefined}>
              {d.precipMm >= 0.1 ? `${mm(d.precipMm)} mm` : "–"}
            </span>
            <span className="lf-wind">{d.windMax} m/s</span>
          </li>
        ))}
      </ol>
      <p className="source">
        Temperatur er laveste og høyeste i løpet av dagen. Langtidsvarsel fra Yr, levert av Meteorologisk institutt og NRK.
      </p>
    </section>
  );
}

/** Fullt dagnavn, kort («Fre») eller kort med dato («Fre 16.»). */
function label(date: string, now: Date, short: boolean | "date") {
  const l = dayLabel(date, now);
  if (!short || l === "I dag") return l;
  if (l === "I morgen") return "I morgen";
  const s = shortDay.format(new Date(`${date}T12:00:00Z`)).replace(".", "");
  return s.charAt(0).toUpperCase() + s.slice(1) + (short === "date" ? ` ${Number(date.slice(8))}.` : "");
}

const sign = (t: number) => (Math.round(t) < 0 ? "minus" : "plus");

/** Farge på stolpen: helt over null, helt under, eller krysser null. */
const range = (d: ForecastDay) => (d.tempMin >= 0 ? "plus" : d.tempMax < 0 ? "minus" : "cross");
