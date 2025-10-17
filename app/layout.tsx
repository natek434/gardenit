import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Header } from "@/src/components/layout/header";
import { Container } from "@/src/components/layout/container";

export const metadata: Metadata = {
  title: "Gardenit",
  description: "Location aware gardening guidance for New Zealand and beyond.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">
        <Header />
        <main>
          <Container>{children}</Container>
        </main>
      </body>
    </html>
  );
}
