import { createSecureHeaders } from "next-secure-headers";

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: createSecureHeaders(),
    },
  ],
};

export default nextConfig;
