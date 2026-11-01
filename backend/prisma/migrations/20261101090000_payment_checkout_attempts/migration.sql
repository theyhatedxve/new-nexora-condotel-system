ALTER TABLE "Payment" ADD COLUMN "checkoutRequestKeyHash" TEXT;
ALTER TABLE "Payment" ADD COLUMN "checkoutRequestFingerprint" TEXT;
ALTER TABLE "Payment" ADD COLUMN "checkoutState" TEXT;
ALTER TABLE "Payment" ADD COLUMN "checkoutUrl" TEXT;
CREATE UNIQUE INDEX "Payment_checkoutRequestKeyHash_key" ON "Payment"("checkoutRequestKeyHash");
