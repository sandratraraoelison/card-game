import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ["@rami/game"],
  turbopack: { root: path.resolve(__dirname, "..") },
};

export default nextConfig;
