import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Header } from "@/src/components/layout/header";
import { Container } from "@/src/components/layout/container";
import { SessionProvider } from "@/src/components/auth/session-provider";
import { ToastProvider } from "@/src/components/ui/toast";
import { auth } from "@/src/lib/auth/options";

export const metadata: Metadata = {
  title: "Gardenit",
  description: "Location aware gardening guidance for New Zealand and beyond.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">
        <ToastProvider>
          <SessionProvider session={session}>
            <Header />
            <main>
              <Container>{children}</Container>
            </main>
          </SessionProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
