import { WasteWidget } from "@/components/widgets/WasteWidget";

export const meta = () => [{ title: "Tømming · Life Dashboard" }];

export default function Waste() {
  return (
    <main className="page">
      <WasteWidget days={90} show={30} />
    </main>
  );
}
