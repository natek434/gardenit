import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { PATCH as patchNotification } from "@/app/api/notifications/[notificationId]/route";
import { POST as markAllReadRoute } from "@/app/api/notifications/read/route";
import { POST as clearAllRoute } from "@/app/api/notifications/clear/route";
import { GET as getSummaryRoute } from "@/app/api/notifications/summary/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  markNotificationRead: vi.fn(),
  clearNotification: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  clearAllNotifications: vi.fn(),
  getNotificationSummary: vi.fn(),
}));

vi.mock("@/src/lib/auth/options", () => ({
  auth: mocks.auth,
}));

vi.mock("@/src/server/notification-service", () => ({
  markNotificationRead: mocks.markNotificationRead,
  clearNotification: mocks.clearNotification,
  markAllNotificationsRead: mocks.markAllNotificationsRead,
  clearAllNotifications: mocks.clearAllNotifications,
  getNotificationSummary: mocks.getNotificationSummary,
}));

const authMock = mocks.auth;
const markNotificationReadMock = mocks.markNotificationRead;
const clearNotificationMock = mocks.clearNotification;
const markAllNotificationsReadMock = mocks.markAllNotificationsRead;
const clearAllNotificationsMock = mocks.clearAllNotifications;
const getNotificationSummaryMock = mocks.getNotificationSummary;

const baseRequestInit = { headers: { "Content-Type": "application/json" } } satisfies RequestInit;

describe("notifications API routes", () => {
  beforeEach(() => {
    authMock.mockReset();
    markNotificationReadMock.mockReset();
    clearNotificationMock.mockReset();
    markAllNotificationsReadMock.mockReset();
    clearAllNotificationsMock.mockReset();
    getNotificationSummaryMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("PATCH /api/notifications/[id]", () => {
    test("returns 401 when user is unauthenticated", async () => {
      authMock.mockResolvedValueOnce(null);
      const request = new Request("http://localhost/api/notifications/notif-1", {
        ...baseRequestInit,
        method: "PATCH",
        body: JSON.stringify({ read: true }),
      });

      const response = await patchNotification(request, { params: { notificationId: "notif-1" } });

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toMatchObject({ error: "Unauthorized" });
    });

    test("returns 400 when payload is invalid", async () => {
      authMock.mockResolvedValueOnce({ user: { id: "user-1" } });
      const request = new Request("http://localhost/api/notifications/notif-1", {
        ...baseRequestInit,
        method: "PATCH",
        body: JSON.stringify({ read: "yes" }),
      });

      const response = await patchNotification(request, { params: { notificationId: "notif-1" } });

      expect(response.status).toBe(400);
    });

    test("marks notification as read", async () => {
      const now = new Date("2024-01-01T00:00:00Z");
      authMock.mockResolvedValueOnce({ user: { id: "user-1" } });
      markNotificationReadMock.mockResolvedValueOnce({ id: "notif-1", readAt: now, clearedAt: null });

      const request = new Request("http://localhost/api/notifications/notif-1", {
        ...baseRequestInit,
        method: "PATCH",
        body: JSON.stringify({ read: true }),
      });

      const response = await patchNotification(request, { params: { notificationId: "notif-1" } });

      expect(markNotificationReadMock).toHaveBeenCalledWith("user-1", "notif-1");
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toMatchObject({
        notification: { id: "notif-1", readAt: now.toISOString(), clearedAt: null },
      });
    });

    test("clears notifications when requested", async () => {
      const now = new Date("2024-02-02T00:00:00Z");
      authMock.mockResolvedValueOnce({ user: { id: "user-1" } });
      clearNotificationMock.mockResolvedValueOnce({ id: "notif-2", readAt: now, clearedAt: now });

      const request = new Request("http://localhost/api/notifications/notif-2", {
        ...baseRequestInit,
        method: "PATCH",
        body: JSON.stringify({ clear: true }),
      });

      const response = await patchNotification(request, { params: { notificationId: "notif-2" } });

      expect(clearNotificationMock).toHaveBeenCalledWith("user-1", "notif-2");
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.notification).toMatchObject({
        clearedAt: now.toISOString(),
        readAt: now.toISOString(),
      });
    });

    test("returns 404 when notification is missing", async () => {
      authMock.mockResolvedValueOnce({ user: { id: "user-1" } });
      markNotificationReadMock.mockResolvedValueOnce(null);

      const request = new Request("http://localhost/api/notifications/notif-3", {
        ...baseRequestInit,
        method: "PATCH",
        body: JSON.stringify({ read: true }),
      });

      const response = await patchNotification(request, { params: { notificationId: "notif-3" } });

      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/notifications/read", () => {
    test("requires authentication", async () => {
      authMock.mockResolvedValueOnce(null);

      const response = await markAllReadRoute();

      expect(response.status).toBe(401);
    });

    test("marks all notifications read", async () => {
      authMock.mockResolvedValueOnce({ user: { id: "user-1" } });
      markAllNotificationsReadMock.mockResolvedValueOnce({ count: 3 });

      const response = await markAllReadRoute();

      expect(markAllNotificationsReadMock).toHaveBeenCalledWith("user-1");
      expect(await response.json()).toEqual({ updated: 3 });
    });
  });

  describe("POST /api/notifications/clear", () => {
    test("requires authentication", async () => {
      authMock.mockResolvedValueOnce(null);

      const response = await clearAllRoute();

      expect(response.status).toBe(401);
    });

    test("clears notifications for the user", async () => {
      authMock.mockResolvedValueOnce({ user: { id: "user-1" } });
      clearAllNotificationsMock.mockResolvedValueOnce({ count: 4 });

      const response = await clearAllRoute();

      expect(clearAllNotificationsMock).toHaveBeenCalledWith("user-1");
      expect(await response.json()).toEqual({ cleared: 4 });
    });
  });

  describe("GET /api/notifications/summary", () => {
    test("returns empty summary for guests", async () => {
      authMock.mockResolvedValueOnce(null);

      const response = await getSummaryRoute(new Request("http://localhost/api/notifications/summary"));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ notifications: [], unreadCount: 0 });
    });

    test("limits the number of notifications returned", async () => {
      const now = new Date("2024-03-03T00:00:00Z");
      authMock.mockResolvedValueOnce({ user: { id: "user-1" } });
      getNotificationSummaryMock.mockResolvedValueOnce({
        notifications: [
          {
            id: "notif-1",
            title: "Alert",
            body: "Body",
            severity: "info",
            channel: "inapp",
            dueAt: now,
            readAt: null,
            rule: { id: "rule-1", name: "Morning digest" },
          },
        ],
        unreadCount: 1,
      });

      const response = await getSummaryRoute(
        new Request("http://localhost/api/notifications/summary?limit=50"),
      );

      expect(getNotificationSummaryMock).toHaveBeenCalledWith("user-1", 25);
      const payload = await response.json();
      expect(payload).toEqual({
        notifications: [
          {
            id: "notif-1",
            title: "Alert",
            body: "Body",
            severity: "info",
            channel: "inapp",
            dueAt: now.toISOString(),
            readAt: null,
            ruleName: "Morning digest",
          },
        ],
        unreadCount: 1,
      });
    });
  });
});

