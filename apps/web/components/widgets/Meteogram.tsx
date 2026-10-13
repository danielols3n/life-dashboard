"use client";

import { useEffect, useRef, useState } from "react";
import type { WeatherHour } from "@life/tools";
import { hour, isNight, mm, temp } from "@/lib/format";

const H = 236;
const TEMP_TOP = 34;
const TEMP_BOTTOM = 112;
const RAIN_BASE = 196;
const RAIN_MAX_H = 58;

/** Temperaturkurve og nedbørsstolper per time, i samme ånd som Yr sitt meteogram. */
export function Meteogram({ hours }: { hours: WeatherHour[] }) {
  // Tegnes i faktisk pikselbredde, så teksten har samme størrelse på mobil og på Pi-en
  const ref = useRef<HTMLElement>(null);
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = hours.length;
  const colW = W / n;
  const x = (i: number) => (i + 0.5) * colW;

  const temps = hours.map((h) => h.tempC);
  let lo = Math.min(...temps);
  let hi = Math.max(...temps);
  // Minst fire grader spenn, så en flat kveld ikke ser dramatisk ut
  if (hi - lo < 4) {
    const mid = (hi + lo) / 2;
    lo = mid - 2;
    hi = mid + 2;
  }
  const y = (t: number) => TEMP_BOTTOM - ((t - lo) / (hi - lo)) * (TEMP_BOTTOM - TEMP_TOP);
  const points = hours.map((h, i) => [x(i), y(h.tempC)] as const);

  // Hvor 0 °C ligger, i prosent nedover temperaturbåndet, for å skifte farge der
  const zeroAt = Math.min(1, Math.max(0, (y(0) - TEMP_TOP) / (TEMP_BOTTOM - TEMP_TOP)));

  const rainScale = Math.max(3, ...hours.map((h) => h.rainMm));
  const labelEvery = colW < 34 ? 3 : 2;
  const night = nightColumns(hours);
  const lineColor = lo >= 0 ? "var(--plus)" : hi < 0 ? "var(--minus)" : "url(#temp-line)";

  const summary = `Neste ${n} timer: fra ${temp(temps[0])} til ${temp(temps[n - 1])}, totalt ${mm(
    hours.reduce((s, h) => s + h.rainMm, 0),
  )} mm nedbør.`;

  return (
    <figure className="meteogram" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
        <defs>
          <linearGradient id="temp-line" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={TEMP_TOP} y2={TEMP_BOTTOM}>
            <stop offset={zeroAt} stopColor="var(--plus)" />
            <stop offset={zeroAt} stopColor="var(--minus)" />
          </linearGradient>
        </defs>

        {hours.map((h, i) =>
          night[i] ? (
            <rect key={`n${i}`} x={i * colW} y={0} width={colW} height={RAIN_BASE} className="mg-night" />
          ) : null,
        )}

        <line x1={0} x2={W} y1={RAIN_BASE} y2={RAIN_BASE} className="mg-base" />

        {hours.map((h, i) => {
          if (h.rainMm <= 0) return null;
          const bh = Math.max(2, (h.rainMm / rainScale) * RAIN_MAX_H);
          return (
            <g key={`r${i}`}>
              <rect x={x(i) - colW * 0.32} y={RAIN_BASE - bh} width={colW * 0.64} height={bh} rx={2} className="mg-rain" />
              {h.rainMm >= 0.1 && (
                <text x={x(i)} y={RAIN_BASE - bh - 6} className="mg-rain-label">
                  {mm(h.rainMm)}
                </text>
              )}
            </g>
          );
        })}

        <path d={smooth(points)} className="mg-temp" stroke={lineColor} />

        {points.map(([px, py], i) =>
          i % labelEvery === 0 ? (
            <g key={`t${i}`}>
              <circle cx={px} cy={py} r={4} className="mg-dot" stroke={lineColor} />
              <text x={px} y={py - 12} className="mg-temp-label">
                {temp(hours[i].tempC)}
              </text>
            </g>
          ) : null,
        )}

        {hours.map((h, i) =>
          i % labelEvery === 0 ? (
            <text key={`h${i}`} x={x(i)} y={H - 6} className="mg-hour">
              {i === 0 ? "Nå" : hour(h.time)}
            </text>
          ) : null,
        )}
      </svg>
    </figure>
  );
}

/**
 * Hvilke timer som er natt. Bare noen symbolkoder har _day/_night (regn har det ikke),
 * så timer uten suffiks arver fra nærmeste time som har.
 */
function nightColumns(hours: WeatherHour[]) {
  const known = hours.map((h) =>
    h.symbol && /_(day|night|polartwilight)$/.test(h.symbol) ? isNight(h.symbol) : null,
  );
  const first = known.find((k) => k !== null) ?? false;
  let last = first;
  return known.map((k) => (k === null ? last : (last = k)));
}

/** Myk kurve gjennom punktene (Catmull-Rom omregnet til Bézier). */
function smooth(pts: readonly (readonly [number, number])[]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}
