"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import classNames from "classnames";

const links: Array<{ href: string; label: string }> = [
  { href: "/", label: "Home" },
  { href: "/plants", label: "Plants" },
  { href: "/garden", label: "My Garden" },
  { href: "/settings", label: "Settings" },
];

export function Header(): ReactNode {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold text-lg text-primary">
          Gardenit
        </Link>
        <nav className="flex gap-4 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={classNames("rounded px-3 py-1 transition", {
                "bg-primary text-white": pathname === link.href,
                "text-slate-600 hover:bg-slate-100": pathname !== link.href,
              })}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
