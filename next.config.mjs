import { createSecureHeaders } from "next-secure-headers";

const nextConfig = {
  reactStrictMode: true,
  headers: async () => [
    {
      source: "/(.*)",
      headers: createSecureHeaders(),
    },
  ],
};

export default nextConfig;
