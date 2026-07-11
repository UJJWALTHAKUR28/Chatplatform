import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the Django backend origin for API calls and WebSocket
  async rewrites() {
    return [];
  },
};

export default nextConfig;
