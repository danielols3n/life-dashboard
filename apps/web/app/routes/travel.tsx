import { NavLink, Outlet } from "react-router";

export const meta = () => [{ title: "Reise · Life Dashboard" }];

const TABS = [
  { to: "/reise", label: "Alt", end: true },
  { to: "/reise/avganger", label: "Avganger" },
  { to: "/reise/planlegger", label: "Reiseplanlegger" },
  { to: "/reise/kart", label: "Kart" },
];

export default function Travel() {
  return (
    <main className="page">
      <nav className="subnav" aria-label="Reise">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} viewTransition className="subnav-link">
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </main>
  );
}
