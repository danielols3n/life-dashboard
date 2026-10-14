import type { CalendarEvent, CalendarResult } from "@life/tools";
import { dataOf, useNow, useTool } from "@/lib/useTool";
import { clock, dayKey, dayLabel } from "@/lib/format";
import { WidgetHeader } from "../WidgetHeader";
import { Icon } from "../Icon";

/** Kommende avtaler, gruppert per dag. Med href lenker tittelen til kalendersiden. */
export function CalendarWidget({ days = 7, max = 12, href }: { days?: number; max?: number; href?: string }) {
  const state = useTool<CalendarResult>("hent_kalender", 5 * 60_000, { days, max });
  const now = useNow(60_000);
  const data = dataOf(state);

  // Ferdige avtaler forsvinner mellom hver henting
  const upcoming = data && now ? data.events.filter((e) => endsAt(e) > now.getTime()) : [];
  const groups = now ? groupByDay(upcoming, now) : [];
  const several = (data?.calendars.length ?? 0) > 1;

  return (
    <section className="calendar card" aria-labelledby="calendar-title">
      <WidgetHeader id="calendar-title" title="Kalender" href={href}>
        <a className="pick" href="https://calendar.google.com/" target="_blank" rel="noreferrer">
          <Icon name="external" size={18} />
          <span>Åpne</span>
        </a>
      </WidgetHeader>

      {!data && state.status === "loading" && <p className="quiet">Henter kalenderen …</p>}
      {!data && state.status === "error" && (
        <p className="notice">
          {state.message}
          {state.kind === "upstream" && " Prøver igjen om fem minutter."}
        </p>
      )}

      {data && now && groups.length === 0 && (
        <p className="quiet">Ingen avtaler de neste {days === 1 ? "timene" : `${days} dagene`}.</p>
      )}

      {now &&
        groups.map(([key, events]) => (
          <div key={key} className="cal-day">
            <h3 className="cal-day-title">{dayLabel(key, now)}</h3>
            <ol className="cal-events">
              {events.map((e) => (
                <EventRow key={e.id} e={e} now={now} calendarName={several ? data?.calendars[e.calendar]?.name : undefined} />
              ))}
            </ol>
          </div>
        ))}

      {data && data.failed > 0 && (
        <p className="source">
          {data.failed === 1 ? "Én kalender" : `${data.failed} kalendere`} kunne ikke hentes akkurat nå.
        </p>
      )}
      {data && state.status === "error" && <p className="source">Viser sist kjente avtaler. Får ikke kontakt med kalenderen.</p>}
    </section>
  );
}

function EventRow({ e, now, calendarName }: { e: CalendarEvent; now: Date; calendarName?: string }) {
  const ongoing = !e.allDay && new Date(e.start).getTime() <= now.getTime();
  const lastDay = e.allDay ? previousDay(e.end) : null;
  const multiDay = lastDay !== null && lastDay !== e.start;

  return (
    <li className="cal-event" data-ongoing={ongoing || undefined}>
      <span className="cal-time">
        {e.allDay ? "Hele dagen" : ongoing ? "Nå" : clock(e.start)}
        {!e.allDay && <small>til {clock(e.end)}</small>}
      </span>
      <span className="cal-dot" data-calendar={e.calendar % 4} aria-hidden="true" />
      <span className="cal-text">
        <strong>{e.title}</strong>
        {(e.location || multiDay || calendarName) && (
          <small>
            {[e.location, multiDay && `til og med ${dayLabel(lastDay!, now).toLowerCase()}`, calendarName]
              .filter(Boolean)
              .join(" · ")}
          </small>
        )}
      </span>
    </li>
  );
}

/** Når avtalen slutter, i millisekunder. Heldagsavtaler varer til midnatt i skjermens tidssone. */
const endsAt = (e: CalendarEvent) => (e.allDay ? new Date(`${e.end}T00:00:00`).getTime() : new Date(e.end).getTime());

/** Dagen før en «YYYY-MM-DD»; sluttdatoen i iCal er eksklusiv. */
const previousDay = (ymd: string) => {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

/** Grupper per dag. Avtaler som startet tidligere og fortsatt pågår, vises under i dag. */
function groupByDay(events: CalendarEvent[], now: Date) {
  const today = dayKey(now);
  const groups = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const start = e.allDay ? e.start : dayKey(e.start);
    const key = start < today ? today : start;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return [...groups.entries()];
}
