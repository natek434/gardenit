import classNames from "classnames";
import { ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
  variant?: "success" | "warning" | "danger" | "muted" | "outline";
};

export function Badge({ children, variant = "muted" }: BadgeProps) {
  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase",
        {
          "bg-emerald-100 text-emerald-700": variant === "success",
          "bg-amber-100 text-amber-700": variant === "warning",
          "bg-rose-100 text-rose-700": variant === "danger",
          "bg-slate-100 text-slate-600": variant === "muted",
          "border border-slate-300 text-slate-700": variant === "outline",
        },
      )}
    >
      {children}
    </span>
  );
}
