import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import type { MapStop, StopsResult } from "@life/tools";
import "leaflet/dist/leaflet.css";
import { fetchTool, ToolError } from "@/lib/useTool";
import { Icon } from "./Icon";

// Holdeplasser hentes i faste ruter, så panorering gjenbruker det som er hentet
const CELL_LAT = 0.02;
const CELL_LON = 0.04;
// Lenger ut blir det for mange punkter til å være lesbart
const MIN_ZOOM = 14;

const MODE_NAME: Record<string, string> = {
  bus: "buss",
  coach: "buss",
  tram: "bybane",
  metro: "t-bane",
  rail: "tog",
  water: "båt",
  air: "fly",
};

type Status = { kind: "zoom" } | { kind: "loading" } | { kind: "ok"; count: number } | { kind: "error"; message: string };

/** Kart over holdeplasser. Klikk på en holdeplass og velg den med knappen i boblen. */
export function StopMap({
  center,
  selectedId,
  onPick,
  pickLabel = "Velg holdeplass",
}: {
  center: { lat: number; lon: number };
  selectedId?: string;
  onPick: (stop: MapStop) => void;
  pickLabel?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  // Nyeste verdier for håndterere som Leaflet holder på
  const latest = useRef({ onPick, selectedId, pickLabel });
  latest.current = { onPick, selectedId, pickLabel };

  useEffect(() => {
    let disposed = false;
    const cells = new Map<string, MapStop[]>();
    let layer: LayerGroup | null = null;
    let request = 0;

    (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !el.current) return;

      const m = L.map(el.current, { zoomControl: true }).setView([center.lat, center.lon], 16);
      map.current = m;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      layer = L.layerGroup().addTo(m);
      // Kartet kan ha fått størrelse etter at det ble laget (f.eks. i en dialog)
      requestAnimationFrame(() => m.invalidateSize());

      const draw = () => {
        if (!layer) return;
        layer.clearLayers();
        const seen = new Set<string>();
        const bounds = m.getBounds().pad(0.1);
        for (const list of cells.values()) {
          for (const s of list) {
            if (seen.has(s.id) || !bounds.contains([s.lat, s.lon])) continue;
            seen.add(s.id);
            const selected = s.id === latest.current.selectedId;
            const marker = L.circleMarker([s.lat, s.lon], {
              radius: selected ? 10 : 7,
              weight: selected ? 4 : 2.5,
              fillOpacity: 1,
              className: `stop-marker${s.modes.includes("tram") ? " stop-tram" : ""}${selected ? " stop-selected" : ""}`,
            });
            marker.bindTooltip(s.name, { direction: "top", offset: [0, -8] });
            marker.bindPopup(() => popupFor(s));
            marker.addTo(layer);
          }
        }
        return seen.size;
      };

      const load = async () => {
        if (m.getZoom() < MIN_ZOOM) {
          layer?.clearLayers();
          return setStatus({ kind: "zoom" });
        }
        const b = m.getBounds();
        const missing: [number, number][] = [];
        for (let y = Math.floor(b.getSouth() / CELL_LAT); y * CELL_LAT < b.getNorth(); y++) {
          for (let x = Math.floor(b.getWest() / CELL_LON); x * CELL_LON < b.getEast(); x++) {
            if (!cells.has(`${y}:${x}`)) missing.push([y, x]);
          }
        }
        const id = ++request;
        if (missing.length) setStatus({ kind: "loading" });
        try {
          await Promise.all(
            missing.map(async ([y, x]) => {
              const res = await fetchTool<StopsResult>("holdeplasser_i_omrade", {
                minLat: (y * CELL_LAT).toFixed(2),
                minLon: (x * CELL_LON).toFixed(2),
                maxLat: ((y + 1) * CELL_LAT).toFixed(2),
                maxLon: ((x + 1) * CELL_LON).toFixed(2),
              });
              cells.set(`${y}:${x}`, res.stops);
            }),
          );
        } catch (err) {
          if (!disposed && id === request) {
            setStatus({ kind: "error", message: err instanceof ToolError ? err.message : "Fikk ikke hentet holdeplasser." });
          }
          return;
        }
        if (disposed || id !== request) return;
        setStatus({ kind: "ok", count: draw() ?? 0 });
      };

      const popupFor = (s: MapStop) => {
        const box = document.createElement("div");
        box.className = "stop-popup";
        const name = document.createElement("strong");
        name.textContent = s.name;
        const modes = document.createElement("small");
        modes.textContent = [...new Set(s.modes.map((x) => MODE_NAME[x] ?? x))].join(", ");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "pick";
        button.textContent = latest.current.pickLabel;
        button.addEventListener("click", () => {
          m.closePopup();
          latest.current.onPick(s);
        });
        box.append(name, modes, button);
        return box;
      };

      m.on("moveend", load);
      load();
    })();

    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
    };
    // Kartet lages én gang; senere senterendringer skal ikke nullstille utsnittet
  }, []);

  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => map.current?.setView([p.coords.latitude, p.coords.longitude], 16),
      () => setStatus({ kind: "error", message: "Fant ikke posisjonen din." }),
      { maximumAge: 60_000, timeout: 15_000 },
    );

  return (
    <div className="stop-map">
      <div ref={el} className="stop-map-canvas" role="application" aria-label="Kart over holdeplasser" />
      <div className="stop-map-bar">
        <span className="quiet" aria-live="polite">
          {status.kind === "zoom" && "Zoom inn for å se holdeplasser."}
          {status.kind === "loading" && "Henter holdeplasser …"}
          {status.kind === "ok" && (status.count ? "Trykk på en holdeplass for å velge den." : "Ingen holdeplasser her.")}
          {status.kind === "error" && status.message}
        </span>
        <button type="button" className="pick" onClick={locate}>
          <Icon name="locate" size={18} />
          <span>Min posisjon</span>
        </button>
      </div>
    </div>
  );
}
