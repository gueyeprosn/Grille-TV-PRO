ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'REGIE';

ALTER TABLE "programs" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE TYPE "ProgramOccurrenceStatus" AS ENUM ('PLANNED', 'ON_AIR', 'AIRED', 'CANCELLED');

CREATE TABLE "program_occurrences" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "service_date" DATE NOT NULL,
    "title_snapshot" TEXT NOT NULL,
    "start_time_snapshot" TEXT NOT NULL,
    "end_time_snapshot" TEXT NOT NULL,
    "duration_min_snapshot" INTEGER NOT NULL,
    "status" "ProgramOccurrenceStatus",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_occurrences_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "program_occurrences_program_id_fkey"
      FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "program_occurrences_program_id_service_date_key"
  ON "program_occurrences"("program_id", "service_date");

CREATE INDEX "program_occurrences_service_date_status_idx"
  ON "program_occurrences"("service_date", "status");
