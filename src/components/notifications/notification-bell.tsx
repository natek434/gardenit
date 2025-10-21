"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import classNames from "classnames";
import { Bell } from "lucide-react";
import { emitNotificationUpdate } from "@/src/lib/notifications-events";
import { useToast } from "@/src/components/ui/toast";

const severityDot: Record<"info" | "warning" | "critical", string> = {
  info: "bg-sky-500",
  warning: "bg-amber-500",
  critical: "bg-rose-500",
};

const channelLabel: Record<"inapp" | "email" | "push", string> = {
  inapp: "In-app",
  email: "Email",
  push: "Push",
};

type SummaryNotification = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  channel: "inapp" | "email" | "push";
  dueAt: string;
  readAt: string | null;
  ruleName: string | null;
};

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const now = Date.now();
  const target = date.getTime();
  if (Number.isNaN(target)) {
    return value;
  }
  const diff = now - target;
  const minutes = Math.round(diff / (60 * 1000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function NotificationBell() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [notifications, setNotifications] = useState<SummaryNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/summary?limit=5", { cache: "no-store" });
      if (response.status === 401) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }
      if (!response.ok) {
        throw new Error("Unable to load notifications");
      }
      const json = (await response.json()) as {
        notifications: SummaryNotification[];
        unreadCount: number;
      };
      setNotifications(json.notifications);
      setUnreadCount(json.unreadCount);
    } catch (error) {
      pushToast({
        title: "Notifications unavailable",
        description: error instanceof Error ? error.message : "Unable to load notification summary",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void fetchSummary();
    const interval = window.setInterval(() => {
      void fetchSummary();
    }, 60_000);
    const handleUpdate = () => {
      void fetchSummary();
    };
    window.addEventListener("notifications:updated", handleUpdate);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("notifications:updated", handleUpdate);
    };
  }, [fetchSummary]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!open) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const hasUnread = unreadCount > 0;

  const handleToggle = () => {
    setOpen((current) => !current);
  };

  const handleNavigate = async (notification: SummaryNotification) => {
    setOpen(false);
    if (!notification.readAt) {
      try {
        const response = await fetch(`/api/notifications/${notification.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read: true }),
        });
        if (!response.ok) {
          throw new Error("Unable to mark notification as read");
        }
        const now = new Date().toISOString();
        setNotifications((current) =>
          current.map((item) => (item.id === notification.id ? { ...item, readAt: now } : item)),
        );
        setUnreadCount((count) => Math.max(0, count - 1));
        emitNotificationUpdate();
      } catch (error) {
        pushToast({
          title: "Update failed",
          description: error instanceof Error ? error.message : "Unable to update notification",
          variant: "error",
        });
      }
    }
    router.push(`/notifications?focus=${notification.id}`);
  };

  return (
    <div className="relative">
      <button
        type="button"
        ref={buttonRef}
        onClick={handleToggle}
        className={classNames(
          "relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-primary/40 hover:text-primary",
          { "text-primary": open },
        )}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {hasUnread ? (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
            {Math.min(unreadCount, 9)}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          ref={panelRef}
          className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">Notifications</p>
            <span className="text-xs text-slate-500">
              {loading ? "Loading…" : unreadCount === 0 ? "All caught up" : `${unreadCount} unread`}
            </span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length ? (
              <ul className="divide-y divide-slate-200">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => handleNavigate(notification)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50"
                    >
                      <span
                        className={classNames(
                          "mt-1 h-2.5 w-2.5 rounded-full",
                          notification.readAt ? "bg-slate-300" : severityDot[notification.severity],
                        )}
                      />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-slate-800">{notification.title}</p>
                        {notification.ruleName ? (
                          <p className="text-xs text-slate-500">{notification.ruleName}</p>
                        ) : null}
                        <p className="line-clamp-2 text-xs text-slate-500">{notification.body}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] uppercase tracking-wide text-slate-400">
                          {channelLabel[notification.channel]}
                        </span>
                        <span className="text-[10px] text-slate-400">{formatRelativeTime(notification.dueAt)}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                {loading ? "Loading notifications…" : "No recent notifications"}
              </p>
            )}
          </div>
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <Link href="/notifications" className="text-sm font-medium text-primary hover:underline">
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
