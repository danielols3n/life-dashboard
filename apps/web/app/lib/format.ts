const TZ = "Europe/Oslo";

const clockFmt = new Intl.DateTimeFormat("nb-NO", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: TZ,
});
const hourFmt = new Intl.DateTimeFormat("nb-NO", { hour: "2-digit", hourCycle: "h23", timeZone: TZ });
const dateFmt = new Intl.DateTimeFormat("nb-NO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TZ,
});
const decimal = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 1 });

export const clock = (d: Date | string) => clockFmt.format(new Date(d));
export const hour = (d: Date | string) => hourFmt.format(new Date(d));
export const longDate = (d: Date) => dateFmt.format(d);
export const mm = (n: number) => decimal.format(n);
/** Avrundet temperatur; unngår «-0». */
export const temp = (c: number) => {
  const r = Math.round(c);
  return `${r === 0 ? 0 : r}°`;
};

const DIRECTIONS = ["nord", "nordøst", "øst", "sørøst", "sør", "sørvest", "vest", "nordvest"];
export const windFrom = (deg: number) => DIRECTIONS[Math.round(deg / 45) % 8];

const SYMBOLS: Record<string, string> = {
  clearsky: "Klarvær",
  fair: "Lettskyet",
  partlycloudy: "Delvis skyet",
  cloudy: "Skyet",
  fog: "Tåke",
  lightrain: "Lett regn",
  rain: "Regn",
  heavyrain: "Kraftig regn",
  lightrainshowers: "Lette regnbyger",
  rainshowers: "Regnbyger",
  heavyrainshowers: "Kraftige regnbyger",
  lightsleet: "Lett sludd",
  sleet: "Sludd",
  heavysleet: "Kraftig sludd",
  lightsleetshowers: "Lette sluddbyger",
  sleetshowers: "Sluddbyger",
  heavysleetshowers: "Kraftige sluddbyger",
  lightsnow: "Lett snø",
  snow: "Snø",
  heavysnow: "Kraftig snø",
  lightsnowshowers: "Lette snøbyger",
  snowshowers: "Snøbyger",
  heavysnowshowers: "Kraftige snøbyger",
};

export function describeSymbol(code: string | null): string {
  if (!code) return "";
  const base = code.replace(/_(day|night|polartwilight)$/, "");
  if (base.includes("thunder")) {
    const rest = base.replace("andthunder", "");
    return `${SYMBOLS[rest] ?? "Nedbør"} og torden`;
  }
  return SYMBOLS[base] ?? base;
}

export const isNight = (code: string | null) => !!code?.endsWith("_night");

const dayKeyFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ });
const shortDateFmt = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short", timeZone: TZ });

/** Dato i Oslo som «YYYY-MM-DD», for å gruppere per dag. */
export const dayKey = (d: Date | string) => dayKeyFmt.format(new Date(d));

const weekdayFmt = new Intl.DateTimeFormat("nb-NO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** «I dag», «I morgen» eller «Fredag 16. oktober» for en dag-nøkkel. */
export function dayLabel(key: string, now: Date) {
  const today = dayKey(now);
  const tomorrow = dayKey(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  if (key === today) return "I dag";
  if (key === tomorrow) return "I morgen";
  const s = weekdayFmt.format(new Date(`${key}T12:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Klokkeslett hvis det er i dag, ellers kort dato. Til e-postlista. */
export const whenShort = (d: Date | string, now: Date) =>
  dayKeyFmt.format(new Date(d)) === dayKeyFmt.format(now) ? clock(d) : shortDateFmt.format(new Date(d));

/** «45 min» eller «1 t 5 min». */
export const duration = (min: number) => {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return min % 60 ? `${h} t ${min % 60} min` : `${h} t`;
};

/** «250 m» eller «1,2 km». */
export const distance = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${decimal.format(m / 1000)} km`);
