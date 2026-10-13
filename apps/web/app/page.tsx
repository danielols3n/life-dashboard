import { Clock } from "@/components/Clock";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WeatherWidget } from "@/components/widgets/WeatherWidget";
import { TransitWidget } from "@/components/widgets/TransitWidget";
import { placeName } from "@/lib/context";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="board">
      <header className="top">
        <Clock />
        <ThemeToggle />
      </header>
      <WeatherWidget place={placeName()} />
      <TransitWidget />
    </main>
  );
}
