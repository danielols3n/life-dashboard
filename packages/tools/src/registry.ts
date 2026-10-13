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
