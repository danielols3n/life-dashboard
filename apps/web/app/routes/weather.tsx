import { WeatherWidget } from "@/components/widgets/WeatherWidget";

export const meta = () => [{ title: "Vær · Life Dashboard" }];

export default function Weather() {
  return (
    <main className="page">
      <WeatherWidget hours={24} long="full" />
    </main>
  );
}
