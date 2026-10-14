import { z } from "zod";

/**
 * Det et verktøy får vite om omgivelsene sine. Verktøyene leser aldri
 * process.env selv, slik at samme kode kan kjøres i Deno (Edge Functions) senere.
 */
export type ToolContext = {
  userId: string;
  config: {
    homeStopId?: string;
    homeLat: number;
    homeLon: number;
    /** IMAP-konto for innboksen. Mangler når e-post ikke er satt opp. */
    mail?: { host: string; port: number; user: string; password: string };
    /** Hemmelige iCal-adresser til kalenderne. Tom når kalender ikke er satt opp. */
    calendars?: string[];
    /** Adressen tømmekalenderen gjelder, slik den står hos BIR */
    wasteAddress?: string;
  };
};

export type Tool<I extends z.ZodTypeAny = z.ZodTypeAny, O = unknown> = {
  name: string;
  /** Leses av språkmodellen når den velger verktøy – skriv det som en instruks. */
  description: string;
  input: I;
  cacheSeconds?: number;
  run: (input: z.infer<I>, ctx: ToolContext) => Promise<O>;
};

export const defineTool = <I extends z.ZodTypeAny, O>(t: Tool<I, O>) => t;

/** Samme register blir både REST-ruter og LLM-verktøy. */
export const toLlmTools = (tools: Tool[]) =>
  tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: z.toJSONSchema(t.input),
  }));

/** Feil verktøyet vet hvordan brukeren kan rette opp. Meldingen vises i UI-et. */
export class ToolConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolConfigError";
  }
}
