import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import { reactRouter } from "@react-router/dev/vite";

// .env ligger i hovedmappen til repoet, ikke i apps/web
const envDir = fileURLToPath(new URL("../..", import.meta.url));

// React Router v7 (framework mode). reactRouter()-pluginen tar seg av React-transformasjonen.
export default defineConfig(({ mode }) => {
  // Gjør .env tilgjengelig for loaderne via process.env i dev, slik som i produksjon
  Object.assign(process.env, loadEnv(mode, envDir, ""));

  return {
    envDir,
    plugins: [reactRouter()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./app", import.meta.url)) },
    },
    server: { port: 3000 },
  };
});
