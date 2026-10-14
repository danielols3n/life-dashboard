import { TransitWidget } from "@/components/widgets/TransitWidget";

export const meta = () => [{ title: "Avganger · Life Dashboard" }];

export default function Departures() {
  return <TransitWidget show={14} />;
}
