import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.88.64"],
  devIndicators: false,
  transpilePackages: ["@rami/game"],
  turbopack: { root: path.resolve(__dirname, "..") },
};

export default nextConfig;
