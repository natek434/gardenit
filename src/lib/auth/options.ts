import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth, { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "../prisma";

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user?.hashedPassword) return null;
        const valid = await bcrypt.compare(credentials.password, user.hashedPassword);
        if (!valid) {
          return null;
        }
        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.locationLat = (user as any).locationLat;
        token.locationLon = (user as any).locationLon;
        token.climateZoneId = (user as any).climateZoneId;
        token.role = (user as any).role;
      }
      if (trigger === "update" && token.sub) {
        const latest = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { locationLat: true, locationLon: true, climateZoneId: true, role: true },
        });
        if (latest) {
          token.locationLat = latest.locationLat;
          token.locationLon = latest.locationLon;
          token.climateZoneId = latest.climateZoneId;
          token.role = latest.role;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
        session.user.locationLat = token.locationLat as number | undefined;
        session.user.locationLon = token.locationLon as number | undefined;
        session.user.climateZoneId = token.climateZoneId as string | undefined;
        session.user.role = token.role as "USER" | "ADMIN" | undefined;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
