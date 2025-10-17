import classNames from "classnames";

export function Skeleton({ className }: { className?: string }) {
  return <div className={classNames("animate-pulse rounded bg-slate-200", className)} />;
}
