"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import classNames from "classnames";
import { useSession, signOut } from "next-auth/react";
import { Button } from "../ui/button";
import { NotificationBell } from "@/src/components/notifications/notification-bell";

export function Header(): ReactNode {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const navLinks: Array<{ href: string; label: string }> = [
    { href: "/", label: "Home" },
    { href: "/plants", label: "Plants" },
    { href: "/plants/collection", label: "Collections" },
    { href: "/garden", label: "My Garden" },
    { href: "/notifications", label: "Notifications" },
  ];

  if (session?.user?.role === "ADMIN") {
    navLinks.push({ href: "/admin/plants", label: "Admin" });
  }

  navLinks.push({ href: "/settings", label: "Settings" });

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold text-lg text-primary">
          Gardenit
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href || (link.href !== "/" && pathname.startsWith(`${link.href}/`));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={classNames("rounded px-3 py-1 transition", {
                  "bg-primary text-white": isActive,
                  "text-slate-600 hover:bg-slate-100": !isActive,
                })}
              >
                {link.label}
              </Link>
            );
          })}
          {session?.user ? <NotificationBell /> : null}
          {status === "loading" ? null : session?.user ? (
            <Button
              type="button"
              variant="ghost"
              className="text-xs font-medium text-primary hover:text-primary"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Sign out
            </Button>
          ) : (
            <Link
              href="/auth/signin"
              className={classNames("rounded px-3 py-1 text-xs font-semibold", {
                "bg-primary text-white": pathname === "/auth/signin",
                "text-primary hover:bg-primary/10": pathname !== "/auth/signin",
              })}
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
