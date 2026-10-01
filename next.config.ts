import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Les tests E2E buildent dans .next-e2e pour ne pas écraser le .next du serveur de dev
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
