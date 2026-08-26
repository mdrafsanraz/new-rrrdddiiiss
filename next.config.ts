import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Required for Railway / self-hosted (smaller image, correct start).
  output: "standalone",
};

export default nextConfig;
