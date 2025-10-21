"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import classNames from "classnames";
import { useToast } from "@/src/components/ui/toast";
import { emitNotificationUpdate } from "@/src/lib/notifications-events";

type Channel = "inapp" | "email" | "push";
type Severity = "info" | "warning" | "critical";

type NotificationSummary = {
  id: string;
  title: string;
  body: string;
  severity: Severity;
  channel: Channel;
  dueAt: string;
  readAt: string | null;
  ruleName: string | null;
  meta?: Record<string, unknown> | null;
};

type NotificationFeedProps = {
  notifications: NotificationSummary[];
  initialFocusId?: string;
};

const severityPills: Record<Severity, string> = {
  info: "bg-sky-100 text-sky-800 border-sky-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  critical: "bg-rose-100 text-rose-800 border-rose-200",
};

const channelLabels: Record<Channel, string> = {
  inapp: "In-app",
  email: "Email",
  push: "Push",
};

const channels: Channel[] = ["inapp", "email", "push"];

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

function humanizeKey(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

function describeMetaValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "Not specified";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return value.toString();
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (Array.isArray(value)) {
    return value.map((entry) => describeMetaValue(entry)).join(", ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([nestedKey, nestedValue]) => `${humanizeKey(nestedKey)}: ${describeMetaValue(nestedValue)}`)
      .join(" • ");
  }
  return String(value);
}

export function NotificationFeed({ notifications, initialFocusId }: NotificationFeedProps) {
  const { pushToast } = useToast();
  const sorted = useMemo(
    () =>
      [...notifications].sort((a, b) => {
        const left = new Date(a.dueAt).getTime();
        const right = new Date(b.dueAt).getTime();
        return right - left;
      }),
    [notifications],
  );
  const [items, setItems] = useState(sorted);
  const [channel, setChannel] = useState<Channel>(() => {
    const counts = channels.map((candidate) => ({
      key: candidate,
      count: sorted.filter((notification) => notification.channel === candidate).length,
    }));
    const firstWithItems = counts.find((entry) => entry.count > 0);
    return firstWithItems ? firstWithItems.key : "inapp";
  });
  const [expandedId, setExpandedId] = useState<string | null>(initialFocusId ?? null);
  const [clearingId, setClearingId] = useState<string | null>(null);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  useEffect(() => {
    setItems(sorted);
  }, [sorted]);

  useEffect(() => {
    if (initialFocusId) {
      setExpandedId(initialFocusId);
    }
  }, [initialFocusId]);

  const markNotificationAsRead = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/notifications/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read: true }),
        });
        if (!response.ok) {
          throw new Error("Unable to mark notification as read");
        }
        const now = new Date().toISOString();
        setItems((current) =>
          current.map((item) => (item.id === id ? { ...item, readAt: item.readAt ?? now } : item)),
        );
        emitNotificationUpdate();
      } catch (error) {
        pushToast({
          title: "Could not mark as read",
          description: error instanceof Error ? error.message : "Unable to update notification",
          variant: "error",
        });
      }
    },
    [pushToast],
  );

  useEffect(() => {
    if (!expandedId) {
      return;
    }
    const target = items.find((item) => item.id === expandedId);
    if (!target || target.readAt) {
      return;
    }
    void markNotificationAsRead(expandedId);
  }, [expandedId, items, markNotificationAsRead]);

  async function handleToggle(notificationId: string) {
    setExpandedId((current) => (current === notificationId ? null : notificationId));
  }

  async function handleClear(notificationId: string) {
    setClearingId(notificationId);
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear: true }),
      });
      if (!response.ok) {
        throw new Error("Unable to clear notification");
      }
      setItems((current) => current.filter((item) => item.id !== notificationId));
      setExpandedId((current) => (current === notificationId ? null : current));
      emitNotificationUpdate();
    } catch (error) {
      pushToast({
        title: "Could not clear notification",
        description: error instanceof Error ? error.message : "Unable to clear notification",
        variant: "error",
      });
    } finally {
      setClearingId(null);
    }
  }

  async function handleMarkAllRead() {
    setIsMarkingAllRead(true);
    try {
      const response = await fetch("/api/notifications/read", { method: "POST" });
      if (!response.ok) {
        throw new Error("Unable to mark notifications as read");
      }
      const now = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? now })));
      emitNotificationUpdate();
    } catch (error) {
      pushToast({
        title: "Could not mark all read",
        description: error instanceof Error ? error.message : "Unable to update notifications",
        variant: "error",
      });
    } finally {
      setIsMarkingAllRead(false);
    }
  }

  async function handleClearAll() {
    setIsClearingAll(true);
    try {
      const response = await fetch("/api/notifications/clear", { method: "POST" });
      if (!response.ok) {
        throw new Error("Unable to clear notifications");
      }
      setItems([]);
      setExpandedId(null);
      emitNotificationUpdate();
    } catch (error) {
      pushToast({
        title: "Could not clear notifications",
        description: error instanceof Error ? error.message : "Unable to clear notifications",
        variant: "error",
      });
    } finally {
      setIsClearingAll(false);
    }
  }

  const channelCounts = useMemo(() => {
    return channels.reduce<Record<Channel, number>>((acc, candidate) => {
      acc[candidate] = items.filter((item) => item.channel === candidate).length;
      return acc;
    }, { inapp: 0, email: 0, push: 0 });
  }, [items]);

  useEffect(() => {
    if (channelCounts[channel] === 0) {
      const next = channels.find((candidate) => channelCounts[candidate] > 0);
      if (next) {
        setChannel(next);
      }
    }
  }, [channelCounts, channel]);

  const filtered = items.filter((item) => item.channel === channel);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition",
                  {
                    "border-emerald-500 bg-emerald-500 text-white shadow": channel === candidate && count,
                    "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100":
                      channel !== candidate && count,
                    "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400": !count,
                  },
                )}
              >
                <span>{channelLabels[candidate]}</span>
                <span
                  className={classNames("rounded-full px-2 py-0.5 text-[10px] font-semibold", {
                    "bg-white/15 text-white": channel === candidate && count,
                    "bg-white text-emerald-700": channel !== candidate && count,
                    "bg-slate-200 text-slate-500": !count,
                  })}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={!items.some((item) => !item.readAt) || isMarkingAllRead}
            className="rounded border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          >
            {isMarkingAllRead ? "Marking…" : "Mark all read"}
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            disabled={!items.length || isClearingAll}
            className="rounded border border-rose-200 bg-rose-50 px-3 py-1 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          >
            {isClearingAll ? "Clearing…" : "Clear all"}
          </button>
        </div>
      </div>
      {filtered.length ? (
        <ul className="divide-y divide-emerald-100 rounded-xl border border-emerald-100 bg-white/95 shadow-sm">
          {filtered.map((notification) => {
            const isExpanded = expandedId === notification.id;
            const isUnread = !notification.readAt;
            return (
              <li key={notification.id} className="bg-transparent">
                <button
                  type="button"
                  onClick={() => handleToggle(notification.id)}
                  className={classNames(
                    "flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-emerald-50/40",
                    { "bg-emerald-50/70": isExpanded },
                  )}
                >
                  <div className="flex flex-1 items-center gap-3">
                    <span
                      className={classNames("h-2.5 w-2.5 rounded-full", {
                        "bg-primary": isUnread,
                        "bg-slate-300": !isUnread,
                      })}
                    />
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={classNames(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold",
                            severityPills[notification.severity],
                          )}
                        >
                          {notification.severity === "info"
                            ? "Info"
                            : notification.severity === "warning"
                            ? "Warning"
                            : "Critical"}
                        </span>
                        <span className="rounded bg-emerald-100 px-2 py-0.5 font-medium uppercase tracking-wide text-emerald-700">
                          {channelLabels[notification.channel]}
                        </span>
                        {notification.ruleName ? (
                          <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600">
                            {notification.ruleName}
                          </span>
                        ) : null}
                      </div>
                      <p className={classNames("text-sm font-medium", { "text-slate-800": isUnread, "text-slate-600": !isUnread })}>
                        {notification.title}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <time className="text-[11px] font-medium uppercase tracking-wide text-emerald-700/70">
                      {formatTimestamp(notification.dueAt)}
                    </time>
                    <span className="text-[11px] text-emerald-700/80">{isExpanded ? "Hide details" : "View details"}</span>
                  </div>
                </button>
                {isExpanded ? (
                  <div className="space-y-3 border-t border-emerald-100 bg-emerald-50/50 px-4 py-3 text-sm text-slate-700">
                    <p className="whitespace-pre-line text-slate-700">{notification.body}</p>
                    {notification.meta && Object.keys(notification.meta).length ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/80">Additional context</p>
                        <dl className="space-y-2">
                          {Object.entries(notification.meta).map(([key, value]) => (
                            <div key={key} className="flex gap-2 text-sm">
                              <dt className="w-32 shrink-0 text-slate-600">{humanizeKey(key)}</dt>
                              <dd className="flex-1 text-slate-700">{describeMetaValue(value)}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Recorded {formatTimestamp(notification.dueAt)}</span>
                      <button
                        type="button"
                        onClick={() => handleClear(notification.id)}
                        disabled={clearingId === notification.id}
                        className="rounded border border-rose-200 bg-rose-50 px-3 py-1 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        {clearingId === notification.id ? "Clearing…" : "Clear notification"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 p-6 text-center text-sm text-emerald-700">
          No {channelLabels[channel].toLowerCase()} notifications yet. Configure smart rules or wait for built-in alerts to run.
        </div>
      )}
    </div>
  );
}
