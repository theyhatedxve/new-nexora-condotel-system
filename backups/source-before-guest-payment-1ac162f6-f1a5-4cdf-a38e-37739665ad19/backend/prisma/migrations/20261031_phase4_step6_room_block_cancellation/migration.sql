
-- Phase 4 Step 6: preserve canceled room blocks.
-- Existing rows remain active.

ALTER TABLE "RoomBlock"
ADD COLUMN "canceledAt" DATETIME;
