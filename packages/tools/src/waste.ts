import { z } from "zod";
import { defineTool, ToolConfigError } from "./registry.ts";

export type WasteType = {
  /** Fra ikonfila hos BIR, f.eks. «restavfall» eller «papirOgPlast» */
  id: string;
  name: string;
};

export type WastePickup = {
  /** «YYYY-MM-DD» */
  date: string;
  types: string[];
};

export type WasteResult = {
  address: string;
  types: WasteType[];
  pickups: WastePickup[];
};

const BIR = "https://bir.no";
const HEADERS = { "User-Agent": "life-dashboard/0.1 github.com/danielols3n" };
const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, mai: 5, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, nov: 11, des: 12,
};

// BIR skriver husnummer både som «12 A» og «12B»
const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, "");

export const waste = defineTool({
  name: "tommekalender",
  description:
    "Når søppelet hentes hjemme (BIR i Bergen-området): neste tømmedager og hvilke avfallstyper, f.eks. restavfall, matavfall eller papir og plast.",
  input: z.object({
    days: z.coerce.number().int().min(1).max(120).default(45),
  }),
  cacheSeconds: 6 * 60 * 60,
  async run({ days }, ctx): Promise<WasteResult> {
    const wanted = ctx.config.wasteAddress;
    if (!wanted) {
      throw new ToolConfigError("Tømmekalender er ikke satt opp. Sett WASTE_ADDRESS i .env til adressen din, f.eks. «Lyderhornsveien 12 A».");
    }

    const address = await findAddress(wanted);
    const res = await fetch(`${BIR}/adressesoek/toemmekalender?rId=${encodeURIComponent(address.Id)}`, { headers: HEADERS });
    if (!res.ok) throw new Error(`BIR svarte ${res.status}`);
    const html = await res.text();

    const types = parseTypes(html);
    const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Oslo" }).format(new Date());
    const last = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const pickups = parsePickups(html).filter((p) => p.date >= today && p.date <= last);

    if (pickups.length === 0 && !html.includes("month-container")) {
      throw new ToolConfigError(
        `${address.Title} har ikke tømmekalender hos BIR. Den finnes bare for adresser der spann settes fram på faste dager.`,
      );
    }
    return { address: address.Title, types, pickups };
  },
});

async function search(q: string): Promise<{ Id: string; Title: string }[]> {
  const res = await fetch(`${BIR}/api/search/AddressSearch?q=${encodeURIComponent(q)}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`BIR adressesøk svarte ${res.status}`);
  return res.json();
}

async function findAddress(wanted: string) {
  const target = normalize(wanted.replace(/,.*$/, ""));
  // Søket er strengt på formatet til husnummeret, så prøv også bare gatenavnet
  const street = wanted.replace(/,.*$/, "").replace(/\s*\d+\s*[a-zA-Z]?\s*$/, "").trim();
  for (const q of [wanted, street]) {
    if (!q) continue;
    const hits = await search(q);
    const exact = hits.find((h) => normalize(h.Title) === target);
    if (exact) return exact;
    if (q === street && hits.length) {
      const suggestions = hits.slice(0, 5).map((h) => h.Title).join(", ");
      throw new ToolConfigError(`Fant ikke «${wanted}» hos BIR. Mente du en av disse: ${suggestions}?`);
    }
  }
  throw new ToolConfigError(`Fant ikke «${wanted}» hos BIR. Sjekk WASTE_ADDRESS i .env.`);
}

/** Avfallstypene i forklaringen nederst: ikonfil → navn. */
function parseTypes(html: string): WasteType[] {
  const types: WasteType[] = [];
  for (const m of html.matchAll(/trashicons\/([\w-]+)\.svg"\s*\/?>\s*<div class="trash-text">([^<]+)</g)) {
    if (!types.some((t) => t.id === m[1])) types.push({ id: m[1], name: decode(m[2].trim()) });
  }
  return types;
}

/** Tømmedagene: én blokk per måned, én rad per avfallstype, med datoer som «12. okt». */
function parsePickups(html: string): WastePickup[] {
  const byDate = new Map<string, Set<string>>();
  for (const month of html.split('class="month-container"').slice(1)) {
    const year = Number(month.match(/class="month-title">[^<]*?(\d{4})/)?.[1]);
    if (!year) continue;
    for (const row of month.split('class="category-row"').slice(1)) {
      const type = row.match(/trashicons\/([\w-]+)\.svg/)?.[1];
      if (!type) continue;
      for (const d of row.matchAll(/class="date-item-date">\s*(\d{1,2})\.\s*([a-zæøå]{3})/gi)) {
        const month = MONTHS[d[2].toLowerCase()];
        if (!month) continue;
        const date = `${year}-${String(month).padStart(2, "0")}-${d[1].padStart(2, "0")}`;
        byDate.set(date, (byDate.get(date) ?? new Set()).add(type));
      }
    }
  }
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, types]) => ({ date, types: [...types] }));
}

const decode = (s: string) => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, "&");
