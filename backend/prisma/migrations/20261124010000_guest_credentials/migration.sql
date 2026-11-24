CREATE TABLE "GuestCredentialToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "pendingEmail" TEXT,
    "sessionVersion" INTEGER NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GuestCredentialToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "GuestCredentialToken_tokenHash_key" ON "GuestCredentialToken"("tokenHash");
CREATE INDEX "GuestCredentialToken_userId_purpose_createdAt_idx" ON "GuestCredentialToken"("userId", "purpose", "createdAt");
CREATE INDEX "GuestCredentialToken_expiresAt_idx" ON "GuestCredentialToken"("expiresAt");
