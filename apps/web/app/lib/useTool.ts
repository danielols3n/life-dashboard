import { useCallback, useEffect, useRef, useState } from "react";

export type ToolState<T> =
  | { status: "loading" }
  | { status: "ok"; data: T; fetchedAt: number }
  | { status: "error"; message: string; kind: "config" | "upstream"; data?: T };

export type ToolQuery = Record<string, string | number | boolean | undefined>;

export class ToolError extends Error {
  constructor(
    message: string,
    public kind: "config" | "upstream",
  ) {
    super(message);
  }
}

const toQs = (query: ToolQuery) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== "") qs.set(k, String(v));
  const s = qs.toString();
  return s ? `?${s}` : "";
};

/** Kaller et verktøy én gang. Kaster ToolError med meldingen fra serveren. */
export async function fetchTool<T>(name: string, query: ToolQuery = {}, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/tools/${name}${toQs(query)}`, { cache: "no-store", signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ToolError("Får ikke kontakt med serveren.", "upstream");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ToolError(body.error ?? `Feil ${res.status}`, body.kind === "config" ? "config" : "upstream");
  return body as T;
}

/**
 * Henter et verktøy fra /api/tools og oppdaterer med fast intervall.
 * Med query = null venter den (f.eks. til posisjon eller valg er klart).
 */
export function useTool<T>(name: string, refreshMs: number, query: ToolQuery | null) {
  const [state, setState] = useState<ToolState<T>>({ status: "loading" });
  const qs = query ? toQs(query) : null;
  // Svar på en gammel forespørsel (før holdeplassen ble byttet) skal ikke vises
  const current = useRef(qs);
  current.current = qs;

  const load = useCallback(async () => {
    if (qs === null) return;
    try {
      const data = await fetchTool<T>(name, query!);
      if (current.current === qs) setState({ status: "ok", data, fetchedAt: Date.now() });
    } catch (err) {
      if (current.current !== qs) return;
      const e = err instanceof ToolError ? err : new ToolError("Noe gikk galt.", "upstream");
      setState((prev) => ({
        status: "error",
        message: e.message,
        kind: e.kind,
        data: prev.status === "ok" ? prev.data : prev.status === "error" ? prev.data : undefined,
      }));
    }
    // query er representert av qs, så den trenger ikke stå i listen
  }, [name, qs]);

  useEffect(() => {
    // Nytt valg: ikke vis data fra forrige holdeplass eller sted
    setState({ status: "loading" });
    if (qs === null) return;
    load();
    const id = setInterval(load, refreshMs);
    // Hent på nytt med en gang skjermen våkner igjen
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, refreshMs, qs]);

  return state;
}

/** Data fra en ToolState, også når siste henting feilet men en tidligere lyktes. */
export const dataOf = <T>(state: ToolState<T>) =>
  state.status === "ok" ? state.data : state.status === "error" ? state.data : undefined;

/** Nåtid som oppdateres jevnlig, null før første render i nettleseren. */
export function useNow(everyMs = 1000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}
