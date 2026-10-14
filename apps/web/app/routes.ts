import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  // Felles toppfelt med klokke, navbar og temaknapp
  layout("routes/layout.tsx", [
    index("routes/home.tsx"),
    route("vaer", "routes/weather.tsx"),
    route("reise", "routes/travel.tsx", [
      index("routes/travel-overview.tsx"),
      route("avganger", "routes/departures.tsx"),
      route("planlegger", "routes/planner.tsx"),
      route("kart", "routes/stop-map.tsx"),
    ]),
    route("kalender", "routes/calendar.tsx"),
    route("avfall", "routes/waste.tsx"),
    route("epost", "routes/mail.tsx"),
  ]),
  route("api/tools/:name", "routes/api-tools.ts"),
] satisfies RouteConfig;
