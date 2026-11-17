CREATE TABLE "BookingNotification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "reservationId" TEXT NOT NULL,
  "templateKey" TEXT NOT NULL DEFAULT 'RESERVATION_CONFIRMED',
  "status" TEXT NOT NULL DEFAULT 'PENDING'
    CHECK ("status" IN (
      'PENDING',
      'SENDING',
      'SMTP_ACCEPTED',
      'REVIEW_REQUIRED',
      'SKIPPED'
    )),
  "failureCode" TEXT,
  "claimedAt" DATETIME,
  "smtpAcceptedAt" DATETIME,
  "completedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("reservationId")
    REFERENCES "Reservation" ("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BookingNotification_reservationId_templateKey_key"
  ON "BookingNotification" ("reservationId", "templateKey");

CREATE INDEX "BookingNotification_status_createdAt_idx"
  ON "BookingNotification" ("status", "createdAt");
