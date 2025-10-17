import { ButtonHTMLAttributes, DetailedHTMLProps } from "react";
import classNames from "classnames";

type ButtonProps = DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={classNames(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition",
        {
          "bg-primary text-white hover:bg-primary-light": variant === "primary",
          "bg-white text-primary border border-primary hover:bg-primary/10": variant === "secondary",
          "text-slate-600 hover:bg-slate-100": variant === "ghost",
        },
        className,
      )}
      {...props}
    />
  );
}
