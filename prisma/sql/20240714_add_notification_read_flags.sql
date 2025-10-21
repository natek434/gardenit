ALTER TABLE "Notification"
  ADD COLUMN "readAt" TIMESTAMP NULL,
  ADD COLUMN "clearedAt" TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_idx"
  ON "Notification" ("userId", "readAt");

CREATE INDEX IF NOT EXISTS "Notification_userId_clearedAt_idx"
  ON "Notification" ("userId", "clearedAt");
