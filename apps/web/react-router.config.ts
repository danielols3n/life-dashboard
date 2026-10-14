import type { Config } from "@react-router/dev/config";

export default {
  // Server-side rendering på, så loaderne og /api/tools kjører på serveren
  ssr: true,
} satisfies Config;
