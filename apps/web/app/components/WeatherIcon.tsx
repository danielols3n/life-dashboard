import { describeSymbol } from "@/lib/format";

// Yr sine værikoner (MIT), låst til en bestemt commit så de ikke endrer seg uten at vi vet det
const ICONS = "https://cdn.jsdelivr.net/gh/metno/weathericons@89e3173756248b4696b9b10677b66c4ef435db53/weather/svg";

export function WeatherIcon({ symbol, size = 40 }: { symbol: string | null; size?: number }) {
  if (!symbol) return <span className="weather-icon" style={{ width: size, height: size }} />;
  return (
    <img
      className="weather-icon"
      src={`${ICONS}/${symbol}.svg`}
      alt={describeSymbol(symbol)}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
    />
  );
}
