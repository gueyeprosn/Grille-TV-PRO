-- CreateTable
CREATE TABLE "coordination_messages" (
    "id" TEXT NOT NULL,
    "gridId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coordination_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coordination_messages_gridId_createdAt_idx" ON "coordination_messages"("gridId", "createdAt");

-- AddForeignKey
ALTER TABLE "coordination_messages" ADD CONSTRAINT "coordination_messages_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "grids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coordination_messages" ADD CONSTRAINT "coordination_messages_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "coordination_tasks" (
    "id" TEXT NOT NULL,
    "gridId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "ownerId" TEXT,
    "ownerName" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'TODO',
    "deadline" TIMESTAMP(3),
    "description" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coordination_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coordination_tasks_gridId_state_idx" ON "coordination_tasks"("gridId", "state");

-- AddForeignKey
ALTER TABLE "coordination_tasks" ADD CONSTRAINT "coordination_tasks_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "grids"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coordination_tasks" ADD CONSTRAINT "coordination_tasks_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coordination_tasks" ADD CONSTRAINT "coordination_tasks_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
