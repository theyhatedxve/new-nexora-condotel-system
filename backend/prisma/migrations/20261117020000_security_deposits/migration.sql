CREATE TABLE "DepositReturnAuthorization" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "reservationId" TEXT NOT NULL,
  "amountCentavos" INTEGER NOT NULL CHECK ("amountCentavos" BETWEEN 1 AND 2147483647),
  "reason" TEXT NOT NULL,
  "approvedByUserId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "DepositMovement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "reservationId" TEXT NOT NULL,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('COLLECT', 'DEDUCT', 'RETURN', 'RESTORE')),
  "amountCentavos" INTEGER NOT NULL CHECK ("amountCentavos" BETWEEN 1 AND 2147483647),
  "reason" TEXT NOT NULL,
  "recordedByUserId" TEXT NOT NULL,
  "returnAuthorizationId" TEXT,
  "reversesMovementId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("returnAuthorizationId") REFERENCES "DepositReturnAuthorization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("reversesMovementId") REFERENCES "DepositMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DepositMovement_returnAuthorizationId_key" ON "DepositMovement"("returnAuthorizationId");
CREATE UNIQUE INDEX "DepositMovement_reversesMovementId_key" ON "DepositMovement"("reversesMovementId");
CREATE INDEX "DepositMovement_reservationId_createdAt_idx" ON "DepositMovement"("reservationId", "createdAt");
CREATE INDEX "DepositMovement_recordedByUserId_idx" ON "DepositMovement"("recordedByUserId");
CREATE INDEX "DepositReturnAuthorization_reservationId_createdAt_idx" ON "DepositReturnAuthorization"("reservationId", "createdAt");
CREATE INDEX "DepositReturnAuthorization_approvedByUserId_idx" ON "DepositReturnAuthorization"("approvedByUserId");
ALTER TABLE "ReservationChargeReceipt"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'CASH' CHECK ("source" IN ('CASH', 'DEPOSIT'));
ALTER TABLE "ReservationChargeReceipt"
  ADD COLUMN "depositMovementId" TEXT
  REFERENCES "DepositMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE
  CHECK (
    ("source" = 'CASH' AND "depositMovementId" IS NULL)
    OR ("source" = 'DEPOSIT' AND "depositMovementId" IS NOT NULL)
  );
CREATE UNIQUE INDEX "ReservationChargeReceipt_depositMovementId_key" ON "ReservationChargeReceipt"("depositMovementId");
