import { TransitWidget } from "@/components/widgets/TransitWidget";
import { TripPlanner } from "@/components/widgets/TripPlanner";

export default function TravelOverview() {
  return (
    <div className="travel-grid">
      <TransitWidget href="/reise/avganger" />
      <TripPlanner href="/reise/planlegger" />
    </div>
  );
}
