"use client";

import { useCallback, useEffect, useState } from "react";

export type ToolState<T> =
  | { status: "loading" }
  | { status: "ok"; data: T; fetchedAt: number }
  | { status: "error"; message: string; kind: "config" | "upstream"; data?: T };

/** Henter et verktøy fra /api/tools og oppdaterer med fast intervall. */
export function useTool<T>(name: string, refreshMs: number, query?: Record<string, string>) {
  const [state, setState] = useState<ToolState<T>>({ status: "loading" });
  const qs = query ? `?${new URLSearchParams(query)}` : "";

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tools/${name}${qs}`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) {
        setState((prev) => ({
          status: "error",
          message: body.error ?? `Feil ${res.status}`,
          kind: body.kind === "config" ? "config" : "upstream",
          data: prev.status === "ok" ? prev.data : prev.status === "error" ? prev.data : undefined,
        }));
        return;
      }
      setState({ status: "ok", data: body as T, fetchedAt: Date.now() });
    } catch {
      setState((prev) => ({
        status: "error",
        message: "Får ikke kontakt med serveren.",
        kind: "upstream",
        data: prev.status === "ok" ? prev.data : prev.status === "error" ? prev.data : undefined,
      }));
    }
  }, [name, qs]);

  useEffect(() => {
    load();
    const id = setInterval(load, refreshMs);
    // Hent på nytt med en gang skjermen våkner igjen
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, refreshMs]);

  return state;
}

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
