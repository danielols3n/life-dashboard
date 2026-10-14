import type { Route } from "./+types/api-tools";
import { runTool } from "@/lib/tools.server";

// Ressursrute uten komponent: GET /api/tools/:navn svarer med JSON
export function loader({ request, params }: Route.LoaderArgs) {
  return runTool(request, params.name);
}
