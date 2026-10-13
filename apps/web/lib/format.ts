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
