ALTER TABLE "RoomType" ADD COLUMN "includedOccupancy" INTEGER;
UPDATE "RoomType" SET "includedOccupancy" = "capacity";

CREATE TABLE "RentalRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomTypeId" TEXT NOT NULL,
    "rentalType" TEXT NOT NULL,
    "rateCentavos" INTEGER NOT NULL,
    "extraPersonFeeCentavos" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RentalRate_roomTypeId_fkey" FOREIGN KEY ("roomTypeId")
      REFERENCES "RoomType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RentalRate_roomTypeId_rentalType_key"
  ON "RentalRate"("roomTypeId", "rentalType");

INSERT INTO "RentalRate" (
  "id", "roomTypeId", "rentalType", "rateCentavos",
  "extraPersonFeeCentavos", "isActive", "createdAt", "updatedAt"
)
SELECT 'nightly_' || "id", "id", 'NIGHTLY', "baseRateCentavos",
       0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "RoomType";
