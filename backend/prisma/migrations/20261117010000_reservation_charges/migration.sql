CREATE TABLE "ReservationCharge" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "reservationId" TEXT NOT NULL,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('DAMAGE', 'LATE_CHECKOUT')),
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED', 'VOIDED')),
  "description" TEXT NOT NULL,
  "evidenceNotes" TEXT,
  "amountCentavos" INTEGER NOT NULL CHECK ("amountCentavos" BETWEEN 0 AND 2147483647),
  "proposedByUserId" TEXT NOT NULL,
  "reviewedByUserId" TEXT,
  "reviewedAt" DATETIME,
  "billingBaseDepartureAt" DATETIME,
  "fromDepartureAt" DATETIME,
  "requestedDepartureAt" DATETIME,
  "hourlyRateCentavos" INTEGER,
  "billableHours" INTEGER,
  "appliedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("reservationId") REFERENCES "Reservation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("proposedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("reviewedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "ReservationChargeReceipt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "chargeId" TEXT NOT NULL,
  "amountCentavos" INTEGER NOT NULL CHECK ("amountCentavos" BETWEEN 1 AND 2147483647),
  "collectedByUserId" TEXT NOT NULL,
  "collectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "correctionRequired" BOOLEAN NOT NULL DEFAULT false,
  "refundedAt" DATETIME,
  "refundedByUserId" TEXT,
  "refundReason" TEXT,
  FOREIGN KEY ("chargeId") REFERENCES "ReservationCharge" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("collectedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("refundedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ReservationCharge_reservationId_createdAt_idx" ON "ReservationCharge"("reservationId", "createdAt");
CREATE INDEX "ReservationCharge_proposedByUserId_idx" ON "ReservationCharge"("proposedByUserId");
CREATE INDEX "ReservationCharge_reviewedByUserId_idx" ON "ReservationCharge"("reviewedByUserId");
CREATE UNIQUE INDEX "ReservationChargeReceipt_chargeId_key" ON "ReservationChargeReceipt"("chargeId");
CREATE INDEX "ReservationChargeReceipt_collectedByUserId_idx" ON "ReservationChargeReceipt"("collectedByUserId");
CREATE INDEX "ReservationChargeReceipt_refundedByUserId_idx" ON "ReservationChargeReceipt"("refundedByUserId");
