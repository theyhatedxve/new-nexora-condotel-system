CREATE TABLE "ReservationAccessToken" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "reservationId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "usedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReservationAccessToken_reservationId_fkey"
    FOREIGN KEY ("reservationId")
    REFERENCES "Reservation" ("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ReservationAccessToken_tokenHash_key"
  ON "ReservationAccessToken"("tokenHash");

CREATE INDEX "ReservationAccessToken_reservationId_createdAt_idx"
  ON "ReservationAccessToken"("reservationId", "createdAt");

CREATE INDEX "ReservationAccessToken_expiresAt_idx"
  ON "ReservationAccessToken"("expiresAt");

CREATE TABLE "ReservationAccessSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "reservationId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "revokedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReservationAccessSession_reservationId_fkey"
    FOREIGN KEY ("reservationId")
    REFERENCES "Reservation" ("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ReservationAccessSession_tokenHash_key"
  ON "ReservationAccessSession"("tokenHash");

CREATE INDEX "ReservationAccessSession_reservationId_idx"
  ON "ReservationAccessSession"("reservationId");

CREATE INDEX "ReservationAccessSession_expiresAt_idx"
  ON "ReservationAccessSession"("expiresAt");