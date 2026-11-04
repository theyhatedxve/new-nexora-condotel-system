ALTER TABLE "Reservation"
  ADD COLUMN "bookingPolicyVersion" TEXT;

ALTER TABLE "Reservation"
  ADD COLUMN "paymentPreference" TEXT;

ALTER TABLE "Reservation"
  ADD COLUMN "expectedArrivalAt" DATETIME;

ALTER TABLE "Reservation"
  ADD COLUMN "firstContactedAt" DATETIME;

ALTER TABLE "Reservation"
  ADD COLUMN "responseDeadlineAt" DATETIME;

ALTER TABLE "Reservation"
  ADD COLUMN "confirmedAt" DATETIME;

CREATE INDEX "Reservation_bookingPolicyVersion_status_holdExpiresAt_idx"
  ON "Reservation"(
    "bookingPolicyVersion",
    "status",
    "holdExpiresAt"
  );

CREATE TABLE "GuestBookingAttempt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "requestId" TEXT NOT NULL,
  "recoveryTokenHash" TEXT NOT NULL,
  "requestFingerprint" TEXT NOT NULL,
  "paymentPreference" TEXT NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'PROCESSING',
  "reservationId" TEXT,
  "recoveryExpiresAt" DATETIME NOT NULL,
  "rejectionCode" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "GuestBookingAttempt_reservationId_fkey"
    FOREIGN KEY ("reservationId")
    REFERENCES "Reservation" ("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "GuestBookingAttempt_requestId_key"
  ON "GuestBookingAttempt"("requestId");

CREATE UNIQUE INDEX "GuestBookingAttempt_recoveryTokenHash_key"
  ON "GuestBookingAttempt"("recoveryTokenHash");

CREATE UNIQUE INDEX "GuestBookingAttempt_reservationId_key"
  ON "GuestBookingAttempt"("reservationId");

CREATE INDEX "GuestBookingAttempt_recoveryExpiresAt_idx"
  ON "GuestBookingAttempt"("recoveryExpiresAt");

CREATE INDEX "GuestBookingAttempt_state_updatedAt_idx"
  ON "GuestBookingAttempt"("state", "updatedAt");