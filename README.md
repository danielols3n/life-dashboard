# Life Dashboard

Et veggdashboard for hjemme: vær fra Yr og neste avganger fra Entur (Skyss), i lyst og mørkt tema.

Bygget rundt ett verktøyregister i `packages/tools`. Hver datakilde er skrevet én gang som et verktøy, og widgetene henter dem via `/api/tools/:navn`. Den samme lista blir senere verktøyene stemmeassistenten får.

## Kom i gang

```bash
pnpm install
cp .env.example apps/web/.env.local   # fyll inn HOME_STOP_ID
pnpm dev
```

Holdeplass-ID-en (`NSR:StopPlace:…`) finner du på [stoppested.entur.org](https://stoppested.entur.org).

## Struktur

```
apps/web/                          Next.js – dashboard og API
  app/api/tools/[name]/route.ts    GET /api/tools/:navn, med cache per verktøy
  components/widgets/              WeatherWidget, Meteogram, TransitWidget
  lib/context.ts                   ToolContext fra miljøvariabler
packages/tools/src/                verktøyregisteret
  registry.ts                      defineTool, toLlmTools
  weather.ts                       hent_vaer (MET Locationforecast)
  transit.ts                       neste_avganger (Entur Journey Planner v3)
```

Verktøyene leser aldri `process.env` selv; konfig kommer inn via `ctx`, slik at samme kode kan kjøres i Supabase Edge Functions senere.

## API

| Rute | Input | Cache |
| --- | --- | --- |
| `/api/tools/hent_vaer` | `lat`, `lon`, `hours` (1–48, standard 12) | 30 min |
| `/api/tools/neste_avganger` | `stopId`, `count` (1–20, standard 8) | 30 s |

Hvis en kilde er nede, svarer ruta med siste vellykkede svar i stedet for en feil.

## Tema

Følger systemet som standard. Knappen øverst til høyre bytter mellom system, lyst og mørkt, og valget huskes i nettleseren.

Værdata fra [Yr](https://www.yr.no), levert av Meteorologisk institutt og NRK (CC BY 4.0). Rutedata fra [Entur](https://developer.entur.org) (NLOD).
