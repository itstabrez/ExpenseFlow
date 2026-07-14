import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@expense-flow/shared"],
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"]
    }
  }
};

export default nextConfig;
