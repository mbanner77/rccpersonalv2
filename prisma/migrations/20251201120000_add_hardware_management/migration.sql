-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM ('LAPTOP', 'DESKTOP', 'MONITOR', 'PHONE', 'TABLET', 'KEYBOARD', 'MOUSE', 'HEADSET', 'DOCKING_STATION', 'PRINTER', 'CAMERA', 'PROJECTOR', 'FURNITURE', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('IN_STOCK', 'ASSIGNED', 'MAINTENANCE', 'TRANSFER_PENDING', 'SOLD', 'DISPOSED', 'LOST');

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR');

-- CreateEnum
CREATE TYPE "AssetTransferType" AS ENUM ('SALE', 'GIFT', 'RETURN', 'REASSIGNMENT');

-- CreateEnum
CREATE TYPE "AssetTransferStatus" AS ENUM ('PENDING', 'APPROVED', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- AlterTable Asset - Add new columns
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "assetTag" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "category" "AssetCategory" NOT NULL DEFAULT 'OTHER';
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "manufacturer" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "model" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "purchaseDate" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "purchasePrice" DECIMAL(10,2);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "currentValue" DECIMAL(10,2);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "warrantyEnd" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "status" "AssetStatus" NOT NULL DEFAULT 'IN_STOCK';
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "condition" "AssetCondition" NOT NULL DEFAULT 'GOOD';
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3);

-- CreateIndex (only if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS "Asset_assetTag_key" ON "Asset"("assetTag");

-- CreateTable AssetTransfer
CREATE TABLE IF NOT EXISTS "AssetTransfer" (
    "id" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "AssetTransferType" NOT NULL,
    "status" "AssetTransferStatus" NOT NULL DEFAULT 'PENDING',
    "originalValue" DECIMAL(10,2),
    "depreciatedValue" DECIMAL(10,2),
    "salePrice" DECIMAL(10,2),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedById" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectionReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "employeeAccepted" BOOLEAN NOT NULL DEFAULT false,
    "employeeAcceptedAt" TIMESTAMP(3),
    "employeeSignature" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "agreementPdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AssetTransfer_transferNumber_key" ON "AssetTransfer"("transferNumber");
CREATE INDEX IF NOT EXISTS "AssetTransfer_assetId_idx" ON "AssetTransfer"("assetId");
CREATE INDEX IF NOT EXISTS "AssetTransfer_employeeId_idx" ON "AssetTransfer"("employeeId");
CREATE INDEX IF NOT EXISTS "AssetTransfer_status_idx" ON "AssetTransfer"("status");

-- AddForeignKey
ALTER TABLE "AssetTransfer" ADD CONSTRAINT "AssetTransfer_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetTransfer" ADD CONSTRAINT "AssetTransfer_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetTransfer" ADD CONSTRAINT "AssetTransfer_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssetTransfer" ADD CONSTRAINT "AssetTransfer_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetTransfer" ADD CONSTRAINT "AssetTransfer_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
