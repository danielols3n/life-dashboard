import { tools, ToolConfigError } from "@life/tools";
import { z } from "zod";
import { contextFor } from "@/lib/context";

export const dynamic = "force-dynamic";

// Enkel minnecache per verktøy og input. Holder lenge nok på én Pi.
const cache = new Map<string, { expires: number; value: unknown }>();

export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
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
    if (tool.cacheSeconds) cache.set(key, { expires: Date.now() + tool.cacheSeconds * 1000, value });
    return Response.json(value);
  } catch (err) {
    // Bruk forrige svar hvis kilden er nede, heller enn en tom widget
    if (hit) return Response.json(hit.value, { headers: { "X-Stale": "1" } });
    const message = err instanceof Error ? err.message : String(err);
    const status = err instanceof ToolConfigError ? 422 : 502;
    return Response.json({ error: message, kind: status === 422 ? "config" : "upstream" }, { status });
  }
}
