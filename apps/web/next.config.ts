import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@life/tools"],
  output: "standalone",
};

export default config;
