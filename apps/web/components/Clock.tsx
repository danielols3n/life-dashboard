"use client";

import { useNow } from "@/lib/useTool";
import { clock, longDate } from "@/lib/format";

export function Clock() {
  const now = useNow(1000);
  return (
    <div className="clock">
      <time className="clock-time" dateTime={now?.toISOString()}>
        {now ? clock(now) : "--:--"}
      </time>
      <span className="clock-date">{now ? longDate(now) : " "}</span>
    </div>
  );
}
