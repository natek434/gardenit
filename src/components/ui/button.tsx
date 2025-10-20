import {
  ButtonHTMLAttributes,
  DetailedHTMLProps,
  ReactNode,
  cloneElement,
  forwardRef,
  isValidElement,
} from "react";
import classNames from "classnames";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
type ButtonSize = "md" | "sm";

type ButtonProps = DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
  children?: ReactNode;
};

function resolveClasses(variant: ButtonVariant, size: ButtonSize, className?: string) {
  return classNames(
    "inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
    {
      "px-4 py-2 text-sm": size === "md",
      "px-3 py-1.5 text-sm": size === "sm",
    },
    {
      "bg-primary text-white hover:bg-primary-light": variant === "primary",
      "bg-white text-primary border border-primary hover:bg-primary/10": variant === "secondary",
      "text-slate-600 hover:bg-slate-100": variant === "ghost",
      "border border-slate-200 text-slate-700 hover:bg-slate-50": variant === "outline",
    },
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", asChild = false, className, children, ...rest },
  ref,
) {
  const classes = resolveClasses(variant, size, className);

  if (asChild && isValidElement(children)) {
    const element = children as typeof children & { props: { className?: string } };
    return cloneElement(element, {
      ...(rest as Record<string, unknown>),
      className: classNames(element.props.className, classes),
      ref,
    } as unknown as Record<string, unknown>);
  }

  return (
    <button ref={ref} className={classes} {...rest}>
      {children}
    </button>
  );
});
