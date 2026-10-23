-- CreateTable
CREATE TABLE "notification_rules" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "target" TEXT NOT NULL DEFAULT 'TELEGRAM',
    "channelId" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "throttleSec" INTEGER NOT NULL DEFAULT 30,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_rules_enabled_eventType_idx" ON "notification_rules"("enabled", "eventType");
