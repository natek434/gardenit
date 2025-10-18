import NextAuth from "next-auth";
import type { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      email?: string | null;
      name?: string | null;
      locationLat?: number | null;
      locationLon?: number | null;
      climateZoneId?: string | null;
      role?: "USER" | "ADMIN";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    locationLat?: number | null;
    locationLon?: number | null;
    climateZoneId?: string | null;
    role?: "USER" | "ADMIN";
  }
}
