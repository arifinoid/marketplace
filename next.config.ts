import type { NextConfig } from "next";
import { PUBLIC_CACHE_CONTROL } from "./src/lib/api/cache-policy";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // The home grid is anonymously readable and changes only when someone
        // posts a listing, so the CDN may serve it stale-while-revalidate
        // instead of hitting Supabase on every first load.
        source: "/",
        headers: [{ key: "Cache-Control", value: PUBLIC_CACHE_CONTROL }],
      },
    ];
  },
};

export default nextConfig;
