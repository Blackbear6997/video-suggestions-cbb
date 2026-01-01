import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-store, must-revalidate',
        },
      ],
    },
  ],
};

export default nextConfig;
