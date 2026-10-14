import { Outlet, useLocation } from "react-router";
import { Clock } from "@/components/Clock";
import { Navbar } from "@/components/Navbar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { homeDefaults } from "@/lib/tools.server";

// Standardsted og -holdeplass fra .env, brukt når skjermen ikke har valgt noe selv
export function loader() {
  return homeDefaults();
}

export default function Layout() {
  // Stor klokke på oversikten (veggskjermen), mindre på de andre sidene
  const overview = useLocation().pathname === "/";

  return (
    <div className="shell" data-overview={overview || undefined}>
      <header className="top">
        <Clock />
        <div className="top-actions">
          <Navbar />
          <ThemeToggle />
        </div>
      </header>
      <Outlet />
    </div>
  );
}
