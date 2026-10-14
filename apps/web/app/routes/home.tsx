import { WeatherWidget } from "@/components/widgets/WeatherWidget";
import { TransitWidget } from "@/components/widgets/TransitWidget";
import { MailWidget } from "@/components/widgets/MailWidget";
import { CalendarWidget } from "@/components/widgets/CalendarWidget";
import { WasteWidget } from "@/components/widgets/WasteWidget";

export default function Home() {
  return (
    <main className="overview">
      <WeatherWidget href="/vaer" />
      <TransitWidget href="/reise/avganger" />
      <CalendarWidget days={3} max={6} href="/kalender" />
      <WasteWidget show={3} href="/avfall" />
      <MailWidget count={5} href="/epost" />
    </main>
  );
}
