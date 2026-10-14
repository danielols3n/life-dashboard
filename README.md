# Life Dashboard

Et veggdashboard for hjemme: vær, langtidsvarsel og regnradar fra Yr, avganger, holdeplasskart og reiseplanlegger fra Entur (Skyss), Google Kalender, tømmekalender fra BIR og innboksen din, i lyst og mørkt tema.

Bygget rundt ett verktøyregister i `packages/tools`. Hver datakilde er skrevet én gang som et verktøy, og widgetene henter dem via `/api/tools/:navn`. Den samme lista blir senere verktøyene stemmeassistenten får.

## Kom i gang

```bash
npm install
cp .env.example .env                  # fyll inn HOME_STOP_ID
npm run dev                           # http://localhost:3000
```

Holdeplass-ID-en (`NSR:StopPlace:…`) finner du på [stoppested.entur.org](https://stoppested.entur.org).

I produksjon (f.eks. på Pi-en):

```bash
npm run build    # bygger til apps/web/build
npm start        # react-router-serve på port 3000 (PORT overstyrer), leser .env
```

Krever Node 22 eller nyere.

## Oppsett i `.env`

| Variabel | Brukes til |
| --- | --- |
| `HOME_STOP_ID` | Standard holdeplass for avganger |
| `HOME_LAT`, `HOME_LON`, `HOME_PLACE_NAME` | Standard sted for været |
| `IMAP_USER`, `IMAP_PASSWORD` | Innboksen. For Gmail: e-postadressen og et [app-passord](https://myaccount.google.com/apppasswords) (krever totrinnsbekreftelse) |
| `IMAP_HOST`, `IMAP_PORT` | Valgfritt, standard `imap.gmail.com` og `993` |
| `CALENDAR_ICS_URLS` | Den hemmelige iCal-adressen fra Google Kalender (Innstillinger → kalenderen → Integrer kalender → «Hemmelig adresse i iCal-format»). Flere kalendere skilles med mellomrom |
| `WASTE_ADDRESS` | Adressen din slik BIR har den, f.eks. `Lyderhornsveien 12 A`. Tømmekalenderen finnes bare for adresser med spann |

Kalenderadressen gir lesetilgang til hele kalenderen for den som har den, så behandle den som et passord. E-post leses bare: avsender, emne, tid og om den er lest. Innholdet i e-postene hentes aldri. Alle som når dashboardet på nettverket kan se lista, så ikke åpne porten mot internett.

## Sider

| Side | Innhold |
| --- | --- |
| `/` | Oversikt med vær, avganger, kalender, tømming og e-post (veggskjermen) |
| `/vaer` | Været neste 24 timer, regn neste 90 minutter fra radar og langtidsvarsel ti dager fram |
| `/reise` | Avganger og reiseplanlegger, med `/reise/avganger`, `/reise/planlegger` og `/reise/kart` (holdeplasskart) |
| `/kalender` | Avtaler de neste 14 dagene |
| `/avfall` | Tømmedager de neste 90 dagene |
| `/epost` | De siste 20 e-postene |

Holdeplass og værsted velges med knappene i widgetene: standard fra `.env`, enhetens posisjon, et sted fra søk eller (for holdeplass) fra kartet. Valgene huskes per skjerm i nettleseren. Posisjon krever https eller `localhost`.

## Struktur

```
apps/web/                          React Router v7 (framework mode, SSR) – dashboard og API
  app/root.tsx                     dokumentskall, metadata og temaskript
  app/routes.ts                    rutetabellen
  app/routes/layout.tsx            klokke, navbar og temaknapp på alle sider
  app/routes/api-tools.ts          GET /api/tools/:navn (ressursrute)
  app/lib/tools.server.ts          cache per verktøy og ToolContext fra miljøvariabler
  app/lib/settings.ts              valgene for skjermen (localStorage)
  app/lib/location.ts              posisjon og oppslag av valgt sted/holdeplass
  app/components/StopMap.tsx       holdeplasskart (Leaflet + OpenStreetMap)
  app/components/widgets/          WeatherWidget (med RainNow), TransitWidget, TripPlanner, CalendarWidget, WasteWidget, MailWidget
packages/tools/src/                verktøyregisteret
  registry.ts                      defineTool, toLlmTools
  weather.ts                       hent_vaer (MET Locationforecast)
  transit.ts                       neste_avganger (Entur Journey Planner v3)
  places.ts                        finn_sted (Entur Geocoder)
  trip.ts                          reiseplan (Entur Journey Planner v3)
  mail.ts                          hent_epost (IMAP)
  calendar.ts                      hent_kalender (iCal)
  stops.ts                         holdeplasser_i_omrade (Entur Journey Planner v3)
  rain.ts                          regnvarsel (MET Nowcast)
  longforecast.ts                  langtidsvarsel (MET Locationforecast, dag for dag)
  waste.ts                         tommekalender (BIR)
```

Verktøyene leser aldri `process.env` selv; konfig kommer inn via `ctx`, slik at samme kode kan kjøres i Supabase Edge Functions senere.

## API

| Rute | Input | Cache |
| --- | --- | --- |
| `/api/tools/hent_vaer` | `lat`, `lon`, `hours` (1–48, standard 12) | 30 min |
| `/api/tools/neste_avganger` | `stopId`, `count` (1–20, standard 8) | 30 s |
| `/api/tools/finn_sted` | `text` eller `lat`+`lon`, `type` (`stop`/`place`), `size` | 24 t |
| `/api/tools/reiseplan` | `from`, `to` (`NSR:StopPlace:…` eller `lat,lon`), `when`, `arriveBy`, `count` | 30 s |
| `/api/tools/hent_epost` | `count` (1–30, standard 8) | 1 min |
| `/api/tools/hent_kalender` | `days` (1–31, standard 7), `max` | 5 min |
| `/api/tools/langtidsvarsel` | `lat`, `lon`, `days` (1–11, standard 10) | 30 min |
| `/api/tools/regnvarsel` | `lat`, `lon` (bare Norden) | 5 min |
| `/api/tools/tommekalender` | `days` (1–120, standard 45) | 6 t |
| `/api/tools/holdeplasser_i_omrade` | `minLat`, `minLon`, `maxLat`, `maxLon` (maks ca. 11 × 11 km) | 24 t |

Hvis en kilde er nede, svarer ruta med siste vellykkede svar i stedet for en feil.

## Tema

Følger systemet som standard. Knappen øverst til høyre bytter mellom system, lyst og mørkt, og valget huskes i nettleseren.

Værdata fra [Yr](https://www.yr.no), levert av Meteorologisk institutt og NRK (CC BY 4.0). Værikoner fra [metno/weathericons](https://github.com/metno/weathericons) (MIT). Rutedata fra [Entur](https://developer.entur.org) (NLOD). Kart fra [OpenStreetMap](https://www.openstreetmap.org/copyright).
