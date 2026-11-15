-- Additive: historical dates, totals and assignments remain untouched.
ALTER TABLE "Reservation" ADD COLUMN "rentalType" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "rentalUnits" INTEGER;
ALTER TABLE "Reservation" ADD COLUMN "rentalRateCentavos" INTEGER;
ALTER TABLE "Reservation" ADD COLUMN "includedOccupancy" INTEGER;
ALTER TABLE "Reservation" ADD COLUMN "extraPersonFeeCentavos" INTEGER;
ALTER TABLE "Reservation" ADD COLUMN "accommodationCentavos" INTEGER;
ALTER TABLE "Reservation" ADD COLUMN "extraPersonTotalCentavos" INTEGER;
ALTER TABLE "Reservation" ADD COLUMN "scheduledArrivalAt" DATETIME;
ALTER TABLE "Reservation" ADD COLUMN "scheduledDepartureAt" DATETIME;
ALTER TABLE "Reservation" ADD COLUMN "inventoryStartAt" DATETIME;
ALTER TABLE "Reservation" ADD COLUMN "inventoryEndAt" DATETIME;
ALTER TABLE "Reservation" ADD COLUMN "actualArrivalAt" DATETIME;
ALTER TABLE "Reservation" ADD COLUMN "actualDepartureAt" DATETIME;
CREATE INDEX "Reservation_roomTypeId_inventoryStartAt_inventoryEndAt_idx"
ON "Reservation"("roomTypeId", "inventoryStartAt", "inventoryEndAt");
