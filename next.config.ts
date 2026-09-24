import type { NextConfig } from "next";
import { README_URL } from "./lib/site";

const nextConfig: NextConfig = {
  images: { formats: ["image/avif", "image/webp"] },
  // Inline the (small) stylesheet so it does not block the first paint.
  experimental: { inlineCss: true },
  // /docs points at the README until real docs exist.
  async redirects() {
    return [{ source: "/docs", destination: README_URL, permanent: false }];
  },
};

export default nextConfig;
