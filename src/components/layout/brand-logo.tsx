"use client";

import { HTMLAttributes } from "react";
import classNames from "classnames";

export function BrandLogo({ className, ...props }: HTMLAttributes<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-hidden="true"
      className={classNames("h-8 w-8 text-emerald-300", className)}
      {...props}
    >
      <title>Gardenit</title>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M24 43c9.941 0 18-8.059 18-18 0-9.492-7.7-14.872-18-22-10.3 7.128-18 12.508-18 22 0 9.941 8.059 18 18 18Z" fill="currentColor" opacity="0.12" />
        <path d="M24 33c3.866 0 7-3.358 7-7.5C31 19 24 12 24 12s-7 7-7 13.5c0 4.142 3.134 7.5 7 7.5Z" />
        <path d="M24 22c-3.866 0-7 3.134-7 7 0 3.314 2.686 6 6 6 3.866 0 7-3.134 7-7 0-3.314-2.686-6-6-6Z" opacity="0.6" />
        <path d="M24 28v13" />
        <path d="M18 36s-4-2-6-6" opacity="0.6" />
        <path d="M30 36s4-2 6-6" opacity="0.6" />
      </g>
    </svg>
  );
}
