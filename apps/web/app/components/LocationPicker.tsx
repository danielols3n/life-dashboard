import { useEffect, useId, useRef, useState } from "react";
import type { Place, PlacesResult } from "@life/tools";
import { fetchTool, ToolError } from "@/lib/useTool";
import type { LocationChoice } from "@/lib/settings";
import { useHome } from "@/lib/location";
import { Icon } from "./Icon";
import { StopMap } from "./StopMap";

type Props = {
  /** stop = bare holdeplasser, place = steder, adresser og holdeplasser */
  type: "stop" | "place";
  /** Tittel i dialogen, f.eks. «Velg holdeplass» */
  title: string;
  value: LocationChoice | null;
  onChange: (choice: LocationChoice) => void;
  /** Teksten på knappen som åpner dialogen */
  buttonLabel: string;
  buttonClassName?: string;
  /** Vises som eget valg når satt, f.eks. «Bergen (standard)» */
  homeLabel?: string;
  gpsLabel: string;
  gpsHint: string;
};

type Search = { status: "idle" } | { status: "searching" } | { status: "done"; places: Place[] } | { status: "error"; message: string };

export function LocationPicker(props: Props) {
  const { type, title, value, onChange, buttonLabel, buttonClassName = "pick", homeLabel, gpsLabel, gpsHint } = props;
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const [text, setText] = useState("");
  const [search, setSearch] = useState<Search>({ status: "idle" });
  // Holdeplasser kan også velges på kart
  const [view, setView] = useState<"search" | "map">("search");
  const home = useHome();

  // Søk mens brukeren skriver, med litt pause så vi ikke spør for hvert tastetrykk
  useEffect(() => {
    const q = text.trim();
    if (q.length < 2) return setSearch({ status: "idle" });
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearch({ status: "searching" });
      try {
        const res = await fetchTool<PlacesResult>("finn_sted", { text: q, type, size: 8 }, ctrl.signal);
        setSearch({ status: "done", places: res.places });
      } catch (err) {
        if (ctrl.signal.aborted) return;
        setSearch({ status: "error", message: err instanceof ToolError ? err.message : "Søket feilet." });
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [text, type]);

  const open = () => {
    setText("");
    setView("search");
    dialog.current?.showModal();
    input.current?.focus();
  };
  const choose = (choice: LocationChoice) => {
    onChange(choice);
    dialog.current?.close();
  };

  const mode = value?.mode;

  return (
    <>
      <button type="button" className={buttonClassName} onClick={open}>
        <Icon name={mode === "gps" ? "locate" : "pin"} size={18} />
        <span>{buttonLabel}</span>
      </button>

      <dialog
        ref={dialog}
        className={view === "map" ? "picker picker-wide" : "picker"}
        aria-labelledby={titleId}
        // Klikk på bakgrunnen lukker
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
      >
        <div className="picker-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-button" onClick={() => dialog.current?.close()} aria-label="Lukk">
            <Icon name="close" />
          </button>
        </div>

        <div className="picker-options">
          {homeLabel && (
            <button type="button" className="option" aria-pressed={mode === "home"} onClick={() => choose({ mode: "home" })}>
              <Icon name="home" />
              <span>
                <strong>Standard</strong>
                <small>{homeLabel}</small>
              </span>
            </button>
          )}
          <button type="button" className="option" aria-pressed={mode === "gps"} onClick={() => choose({ mode: "gps" })}>
            <Icon name="locate" />
            <span>
              <strong>{gpsLabel}</strong>
              <small>{gpsHint}</small>
            </span>
          </button>
        </div>

        {type === "stop" && (
          <div className="segmented" role="group" aria-label="Velg fra">
            <button type="button" aria-pressed={view === "search"} onClick={() => setView("search")}>
              Søk
            </button>
            <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}>
              Kart
            </button>
          </div>
        )}

        {view === "map" && (
          <StopMap
            center={value?.mode === "saved" ? value.place : { lat: home?.lat ?? 60.3913, lon: home?.lon ?? 5.3221 }}
            selectedId={value?.mode === "saved" ? value.place.id : undefined}
            onPick={(s) => choose({ mode: "saved", place: { id: s.id, name: s.name, lat: s.lat, lon: s.lon } })}
          />
        )}

        <label className="search" hidden={view === "map"}>
          <Icon name="search" />
          <span className="visually-hidden">Søk</span>
          <input
            ref={input}
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={type === "stop" ? "Søk etter holdeplass" : "Søk etter sted, adresse eller holdeplass"}
            autoComplete="off"
            enterKeyHint="search"
          />
        </label>

        <div className="results" aria-live="polite" hidden={view === "map"}>
          {search.status === "searching" && <p className="quiet">Søker …</p>}
          {search.status === "error" && <p className="notice">{search.message}</p>}
          {search.status === "done" && search.places.length === 0 && <p className="quiet">Ingen treff på «{text.trim()}».</p>}
          {search.status === "done" && search.places.length > 0 && (
            <ul>
              {search.places.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="option"
                    aria-pressed={value?.mode === "saved" && value.place.id === p.id}
                    onClick={() => choose({ mode: "saved", place: { id: p.id, name: p.name, lat: p.lat, lon: p.lon } })}
                  >
                    <Icon name={p.kind === "stop" ? "travel" : "pin"} />
                    <span>
                      <strong>{p.name}</strong>
                      {p.label !== p.name && <small>{p.label}</small>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </dialog>
    </>
  );
}
