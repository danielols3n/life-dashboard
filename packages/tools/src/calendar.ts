import { z } from "zod";
import ICAL from "ical.js";
import { defineTool, ToolConfigError } from "./registry.ts";

export type CalendarEvent = {
  id: string;
  title: string;
  /** ISO-tid, eller «YYYY-MM-DD» for heldagshendelser */
  start: string;
  /** Slutt (eksklusiv for heldagshendelser, som i iCal) */
  end: string;
  allDay: boolean;
  location: string | null;
  /** Indeks i calendars, for farge og navn */
  calendar: number;
};

export type CalendarResult = {
  calendars: { name: string }[];
  events: CalendarEvent[];
  /** Antall kalendere som ikke kunne hentes denne gangen */
  failed: number;
};

// Vern mot uendelige gjentakelser (f.eks. daglig uten slutt siden 2010)
const MAX_ITERATIONS = 20_000;

export const calendar = defineTool({
  name: "hent_kalender",
  description:
    "Henter kommende avtaler fra brukerens kalendere de neste dagene: tittel, tid og sted. Bruk days for hvor langt fram.",
  input: z.object({
    days: z.coerce.number().int().min(1).max(31).default(7),
    max: z.coerce.number().int().min(1).max(100).default(50),
  }),
  cacheSeconds: 5 * 60,
  async run({ days, max }, ctx): Promise<CalendarResult> {
    const urls = ctx.config.calendars ?? [];
    if (urls.length === 0) {
      throw new ToolConfigError(
        "Kalender er ikke satt opp. Sett CALENDAR_ICS_URLS i .env til den hemmelige iCal-adressen fra Google Kalender.",
      );
    }

    const from = new Date();
    const to = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);

    const results = await Promise.allSettled(urls.map((url) => fetchIcs(url)));
    const failures = results.filter((r) => r.status === "rejected");
    if (failures.length === results.length) throw failures[0].reason;

    const calendars: { name: string }[] = [];
    const events: CalendarEvent[] = [];
    results.forEach((r, i) => {
      if (r.status !== "fulfilled") {
        calendars.push({ name: `Kalender ${i + 1}` });
        return;
      }
      const parsed = parseIcs(r.value, from, to, i);
      calendars.push({ name: parsed.name ?? `Kalender ${i + 1}` });
      events.push(...parsed.events);
    });

    // Heldagshendelser først på hver dag, så etter starttid
    events.sort((a, b) => sortKey(a) - sortKey(b));
    return { calendars, events: events.slice(0, max), failed: failures.length };
  },
});

async function fetchIcs(url: string) {
  let res: Response;
  try {
    res = await fetch(url, { headers: { "User-Agent": "life-dashboard/0.1" } });
  } catch {
    throw new Error("Får ikke kontakt med kalenderen.");
  }
  if (res.status === 404 || res.status === 403) {
    throw new ToolConfigError(
      "Kalenderadressen virker ikke lenger. Hent den hemmelige iCal-adressen på nytt i Google Kalender.",
    );
  }
  if (!res.ok) throw new Error(`Kalenderen svarte ${res.status}`);
  return res.text();
}

function parseIcs(text: string, from: Date, to: Date, calendarIndex: number) {
  const root = new ICAL.Component(ICAL.parse(text));
  // Google legger ved tidssonene; uten dem blir tidene tolket som lokal tid
  for (const tz of root.getAllSubcomponents("vtimezone")) ICAL.TimezoneService.register(tz);

  const masters = new Map<string, ICAL.Event>();
  const exceptions: ICAL.Event[] = [];
  for (const vevent of root.getAllSubcomponents("vevent")) {
    const event = new ICAL.Event(vevent);
    if (event.isRecurrenceException()) exceptions.push(event);
    else masters.set(event.uid, event);
  }
  // Flyttede eller endrede forekomster av gjentakende avtaler
  for (const ex of exceptions) masters.get(ex.uid)?.relateException(ex);

  const events: CalendarEvent[] = [];
  const add = (item: ICAL.Event, start: ICAL.Time, end: ICAL.Time) => {
    if (item.component.getFirstPropertyValue("status") === "CANCELLED") return;
    if (toDate(end) <= from || toDate(start) >= to) return;
    events.push({
      id: `${item.uid}:${start.toString()}`,
      title: item.summary || "(uten tittel)",
      start: start.isDate ? start.toString() : start.toJSDate().toISOString(),
      end: end.isDate ? end.toString() : end.toJSDate().toISOString(),
      allDay: start.isDate,
      location: item.location || null,
      calendar: calendarIndex,
    });
  };

  for (const event of masters.values()) {
    if (!event.isRecurring()) {
      add(event, event.startDate, event.endDate);
      continue;
    }
    const it = event.iterator();
    for (let i = 0, next = it.next(); next && i < MAX_ITERATIONS; i++, next = it.next()) {
      if (toDate(next) >= to) break;
      const occ = event.getOccurrenceDetails(next);
      add(occ.item, occ.startDate, occ.endDate);
    }
  }

  return { name: (root.getFirstPropertyValue("x-wr-calname") as string | null) || null, events };
}

const offsetFmt = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Oslo", timeZoneName: "longOffset" });

/** Midnatt norsk tid for en dato «YYYY-MM-DD», med sommertid. */
function osloMidnight(ymd: string) {
  const utc = new Date(`${ymd}T00:00:00Z`);
  const name = offsetFmt.formatToParts(utc).find((p) => p.type === "timeZoneName")?.value ?? "GMT+01:00";
  const [, sign, h, m] = name.match(/GMT([+-])(\d{2}):(\d{2})/) ?? [, "+", "01", "00"];
  const offsetMin = (sign === "-" ? -1 : 1) * (Number(h) * 60 + Number(m));
  return new Date(utc.getTime() - offsetMin * 60_000);
}

/** Heldagsdatoer gjelder fra midnatt norsk tid, ikke UTC. */
function toDate(t: ICAL.Time) {
  return t.isDate ? osloMidnight(t.toString()) : t.toJSDate();
}

// Heldagshendelser rett før det som starter ved midnatt samme dag
const sortKey = (e: CalendarEvent) => (e.allDay ? osloMidnight(e.start).getTime() - 1 : new Date(e.start).getTime());
