import { createSecureHeaders } from "next-secure-headers";

const nextConfig = {
  reactStrictMode: true,
  headers: async () => [
    {
      source: "/(.*)",
      headers: createSecureHeaders(),
    },
  ],
  images: {
    domains: ["www.perenual.com", "perenual.com"],
  },
};

export default nextConfig;
