import { isRouteErrorResponse, Link, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import type { Route } from "./+types/root";
import "@fontsource-variable/atkinson-hyperlegible-next";
import "./styles/globals.css";

// Undersidene overstyrer tittelen; resten står fast i <head> under
export function meta() {
  return [{ title: "Life Dashboard" }];
}

// Fjordblå sirkel med en sol, rett i HTML-en så vi slipper en egen fil
const FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#1d2b2f"/><circle cx="16" cy="16" r="6" fill="#f08068"/></svg>`,
  );

// Setter valgt tema før første maling, så siden ikke blinker
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="description" content="Vær, avganger, reiseplanlegger og e-post på en skjerm." />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#e6ebec" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#142024" />
        <link rel="icon" href={FAVICON} />
        <Meta />
        <Links />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main className="shell error-page">
      <h1>{notFound ? "Fant ikke siden" : "Noe gikk galt"}</h1>
      <p className="quiet">
        {notFound ? "Adressen finnes ikke på dashboardet." : "Last siden på nytt, eller gå tilbake til oversikten."}
      </p>
      <Link to="/" className="pick">
        Til oversikten
      </Link>
    </main>
  );
}
