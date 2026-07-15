-- Password reset support: store only a hash of the emailed token + its expiry.
ALTER TABLE "User" ADD COLUMN "passwordResetTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3);
