-- DropForeignKey
ALTER TABLE "Fabric" DROP CONSTRAINT "Fabric_itemId_fkey";

-- AddForeignKey
ALTER TABLE "Fabric" ADD CONSTRAINT "Fabric_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
