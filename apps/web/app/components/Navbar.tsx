import { NavLink } from "react-router";
import type { MailResult } from "@life/tools";
import { useTool } from "@/lib/useTool";
import { Icon, type IconName } from "./Icon";

const ITEMS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: "/", label: "Oversikt", icon: "overview", end: true },
  { to: "/vaer", label: "Vær", icon: "weather" },
  { to: "/reise", label: "Reise", icon: "travel" },
  { to: "/kalender", label: "Kalender", icon: "calendar" },
  { to: "/epost", label: "E-post", icon: "mail" },
];

export function Navbar() {
  // Bare antallet uleste; serveren cacher innboksen i et minutt uansett
  const mail = useTool<MailResult>("hent_epost", 60_000, { count: 1 });
  const unread = mail.status === "ok" ? mail.data.unread : 0;

  return (
    <nav className="nav" aria-label="Hovedmeny">
      {ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} viewTransition className="nav-link">
          <Icon name={item.icon} />
          <span className="nav-label">{item.label}</span>
          {item.icon === "mail" && unread > 0 && (
            <span className="nav-badge" aria-label={`${unread} uleste`}>
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
