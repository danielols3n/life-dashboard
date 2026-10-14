import { CalendarWidget } from "@/components/widgets/CalendarWidget";

export const meta = () => [{ title: "Kalender · Life Dashboard" }];

export default function Calendar() {
  return (
    <main className="page">
      <CalendarWidget days={14} max={60} />
    </main>
  );
}
