import { useNavigate } from "react-router";
import { StopMap } from "@/components/StopMap";
import { WidgetHeader } from "@/components/WidgetHeader";
import { useHome } from "@/lib/location";
import { updateSettings, useSettings } from "@/lib/settings";

export const meta = () => [{ title: "Holdeplasskart · Life Dashboard" }];

export default function StopMapPage() {
  const settings = useSettings();
  const home = useHome();
  const navigate = useNavigate();
  const stop = settings?.stop;

  return (
    <section className="card map-card" aria-labelledby="map-title">
      <WidgetHeader id="map-title" title="Holdeplasskart" />
      {/* Venter på valgene, så kartet starter på riktig holdeplass */}
      {settings && (
        <StopMap
          center={stop?.mode === "saved" ? stop.place : { lat: home?.lat ?? 60.3913, lon: home?.lon ?? 5.3221 }}
          selectedId={stop?.mode === "saved" ? stop.place.id : undefined}
          pickLabel="Vis avganger herfra"
          onPick={(s) => {
            updateSettings({ stop: { mode: "saved", place: { id: s.id, name: s.name, lat: s.lat, lon: s.lon } } });
            navigate("/reise/avganger", { viewTransition: true });
          }}
        />
      )}
    </section>
  );
}
