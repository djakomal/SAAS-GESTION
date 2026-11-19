-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_clientId_fkey";

-- DropIndex
DROP INDEX "Invoice_clientId_idx";

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "clientId",
ADD COLUMN     "cashReceived" DECIMAL(12,2) NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'PAID';

-- DropTable
DROP TABLE "Client";
