import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "realcore.info",
        pathname: "/bilder/**",
      },
    ],
  },
};

export default nextConfig;
