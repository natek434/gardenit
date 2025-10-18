import { SVGProps } from "react";
import classNames from "classnames";

type GlyphProps = SVGProps<SVGSVGElement> & { active?: boolean };

const baseClasses = "h-4 w-4";

export function SunGlyph({ active = false, className, ...props }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={classNames(baseClasses, className, {
        "fill-yellow-400 stroke-yellow-500": active,
        "fill-transparent stroke-slate-400": !active,
      })}
      strokeWidth={1.5}
      {...props}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5.64 5.64l-1.4-1.4M19.76 19.76l-1.4-1.4M5.64 18.36l-1.4 1.4M19.76 4.24l-1.4 1.4" />
    </svg>
  );
}

export function WaterGlyph({ active = false, className, ...props }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={classNames(baseClasses, className, {
        "fill-sky-400 stroke-sky-500": active,
        "fill-transparent stroke-slate-400": !active,
      })}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      {...props}
    >
      <path d="M12 3c-4 5-6 7.5-6 10a6 6 0 1 0 12 0c0-2.5-2-5-6-10z" />
    </svg>
  );
}

export function FlowerGlyph({ active = false, className, ...props }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={classNames(baseClasses, className, {
        "fill-rose-300 stroke-rose-500": active,
        "fill-transparent stroke-slate-400": !active,
      })}
      strokeWidth={1.3}
      {...props}
    >
      <circle cx="12" cy="12" r="2" />
      <path d="M12 4c1.5 3 0 4-2 4s-3.5-1-2-4c-3 1.5-4 0-4-2s1-3.5 4-2c-1.5-3 0-4 2-4s3.5 1 2 4c3-1.5 4 0 4 2s-1 3.5-4 2c1.5 3 0 4-2 4s-3.5-1-2-4" />
    </svg>
  );
}

export function ThornGlyph({ active = false, className, ...props }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={classNames(baseClasses, className, {
        "fill-emerald-300 stroke-emerald-500": active,
        "fill-transparent stroke-slate-400": !active,
      })}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      {...props}
    >
      <path d="M12 22V2m0 0c1.5 2 3 3 5 3-1 2-2.5 3-5 3m0 0c-1.5 2-3 3-5 3 1 2 2.5 3 5 3" />
    </svg>
  );
}

export function EdibleGlyph({ active = false, className, ...props }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={classNames(baseClasses, className, {
        "fill-lime-300 stroke-lime-500": active,
        "fill-transparent stroke-slate-400": !active,
      })}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      {...props}
    >
      <path d="M12 3c3 0 7 3 7 8s-4 8-7 8-7-3-7-8 4-8 7-8z" />
      <path d="M9 9c1-1 2-1 3-1s2 0 3 1" />
    </svg>
  );
}

export function CautionGlyph({ active = false, className, ...props }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={classNames(baseClasses, className, {
        "fill-amber-200 stroke-amber-500": active,
        "fill-transparent stroke-slate-400": !active,
      })}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      {...props}
    >
      <path d="M12 3 2 20h20L12 3z" />
      <path d="M12 9v5" />
      <circle cx="12" cy="17" r="1" />
    </svg>
  );
}
