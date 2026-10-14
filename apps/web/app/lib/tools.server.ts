import { tools, ToolConfigError, type ToolContext } from "@life/tools";
import { z } from "zod";

// react-router-serve leser ikke .env selv (i dev gjør vite.config.ts det).
// npm-skriptene kjører fra apps/web, så .env i hovedmappen ligger to nivåer opp.
// Variabler som allerede er satt i miljøet, vinner.
try {
  process.loadEnvFile("../../.env");
} catch {}

// Enkel minnecache per verktøy og input. Holder lenge nok på én Pi.
// Stedssøk gir mange ulike nøkler, så de eldste kastes når cachen blir full.
const cache = new Map<string, { expires: number; value: unknown }>();
const CACHE_MAX = 500;

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return v && Number.isFinite(n) ? n : fallback;
};

/** Bygger ToolContext fra miljøvariablene. Én bruker inntil auth kommer på plass. */
export async function contextFor(_req: Request): Promise<ToolContext> {
  return {
    userId: "daniel",
    config: {
      homeStopId: process.env.HOME_STOP_ID || undefined,
      homeLat: num(process.env.HOME_LAT, 60.3913),
      homeLon: num(process.env.HOME_LON, 5.3221),
      mail:
        process.env.IMAP_USER && process.env.IMAP_PASSWORD
          ? {
              host: process.env.IMAP_HOST || "imap.gmail.com",
              port: num(process.env.IMAP_PORT, 993),
              user: process.env.IMAP_USER,
              // Google viser app-passord med mellomrom; de skal ikke være med
              password: process.env.IMAP_PASSWORD.replace(/\s+/g, ""),
            }
          : undefined,
      // Én eller flere adresser, skilt med mellomrom (komma kan forekomme i nettadresser)
      calendars: (process.env.CALENDAR_ICS_URLS ?? "").split(/\s+/).filter(Boolean),
      wasteAddress: process.env.WASTE_ADDRESS || undefined,
    },
  };
}

/** Standardvalgene fra .env, som brukes når skjermen ikke har valgt noe selv. */
export const homeDefaults = () => ({
  place: process.env.HOME_PLACE_NAME || "Bergen",
  stopId: process.env.HOME_STOP_ID || null,
  // Midtpunktet kartet starter på når ingen holdeplass er valgt
  lat: num(process.env.HOME_LAT, 60.3913),
  lon: num(process.env.HOME_LON, 5.3221),
});

/** Kjører et verktøy for GET /api/tools/:navn, med cache og siste gode svar som reserve. */
export async function runTool(req: Request, name: string): Promise<Response> {
  const tool = tools[name];
  if (!tool) return Response.json({ error: `Ukjent verktøy: ${name}` }, { status: 404 });

  const query = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = tool.input.safeParse(query);
  if (!parsed.success) {
    return Response.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }

  const key = `${name}:${JSON.stringify(parsed.data)}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return Response.json(hit.value);

  try {
    const value = await tool.run(parsed.data, await contextFor(req));
    if (tool.cacheSeconds) {
      cache.delete(key);
      cache.set(key, { expires: Date.now() + tool.cacheSeconds * 1000, value });
      if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
    }
    return Response.json(value);
  } catch (err) {
    // Bruk forrige svar hvis kilden er nede, heller enn en tom widget
    if (hit) return Response.json(hit.value, { headers: { "X-Stale": "1" } });
    const message = err instanceof Error ? err.message : String(err);
    const status = err instanceof ToolConfigError ? 422 : 502;
    return Response.json({ error: message, kind: status === 422 ? "config" : "upstream" }, { status });
  }
}
