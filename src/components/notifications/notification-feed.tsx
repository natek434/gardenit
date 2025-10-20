"use client";

import { useMemo, useState } from "react";
import classNames from "classnames";

type Channel = "inapp" | "email" | "push";
type Severity = "info" | "warning" | "critical";

type NotificationSummary = {
  id: string;
  title: string;
  body: string;
  severity: Severity;
  channel: Channel;
  dueAt: string;
  meta?: Record<string, unknown> | null;
};

type NotificationFeedProps = {
  notifications: NotificationSummary[];
};

const severityStyles: Record<Severity, string> = {
  info: "border-sky-200 bg-sky-100 text-sky-800",
  warning: "border-amber-200 bg-amber-100 text-amber-800",
  critical: "border-rose-200 bg-rose-100 text-rose-800",
};

const channelLabels: Record<Channel, string> = {
  inapp: "In-app",
  email: "Email",
  push: "Push",
};

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function NotificationFeed({ notifications }: NotificationFeedProps) {
  const sorted = useMemo(
    () =>
      [...notifications].sort((a, b) => {
        const left = new Date(a.dueAt).getTime();
        const right = new Date(b.dueAt).getTime();
        return right - left;
      }),
    [notifications],
  );
  const channelCounts = useMemo(() => {
    return sorted.reduce(
      (acc, notification) => {
        acc[notification.channel] += 1;
        return acc;
      },
      { inapp: 0, email: 0, push: 0 } as Record<Channel, number>,
    );
  }, [sorted]);

  const initialChannel = useMemo<Channel>(() => {
    if (channelCounts.inapp > 0) return "inapp";
    if (channelCounts.email > 0) return "email";
    if (channelCounts.push > 0) return "push";
    return "inapp";
  }, [channelCounts]);

  const [channel, setChannel] = useState<Channel>(initialChannel);

  const filtered = useMemo(
    () => sorted.filter((notification) => notification.channel === channel),
    [sorted, channel],
  );

  const channels: Channel[] = ["inapp", "email", "push"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {channels.map((candidate) => {
          const count = channelCounts[candidate];
          return (
            <button
              key={candidate}
              type="button"
              onClick={() => setChannel(candidate)}
              disabled={!count}
              className={classNames(
                "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
                {
                  "border-primary bg-primary text-white": channel === candidate && count,
                  "border-slate-200 bg-white text-slate-600 hover:border-primary/60 hover:text-primary":
                    channel !== candidate && count,
                  "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300": !count,
                },
              )}
            >
              <span>{channelLabels[candidate]}</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
                {count}
              </span>
            </button>
          );
        })}
      </div>
      {filtered.length ? (
        <ul className="space-y-4">
          {filtered.map((notification) => (
            <li
              key={notification.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide">
                    <span
                      className={classNames(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold",
                        severityStyles[notification.severity],
                      )}
                    >
                      {notification.severity === "info"
                        ? "Info"
                        : notification.severity === "warning"
                        ? "Warning"
                        : "Critical"}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">
                      {channelLabels[notification.channel]}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-800">{notification.title}</h3>
                  <p className="whitespace-pre-line text-sm text-slate-600">{notification.body}</p>
                </div>
                <time className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {formatTimestamp(notification.dueAt)}
                </time>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          No {channelLabels[channel].toLowerCase()} notifications yet. Configure smart rules or wait for built-in alerts to run.
        </div>
      )}
    </div>
  );
}
