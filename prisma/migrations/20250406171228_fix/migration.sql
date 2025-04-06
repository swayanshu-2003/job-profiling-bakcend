-- DropForeignKey
ALTER TABLE "JobApplication" DROP CONSTRAINT "JobApplication_seekerId_fkey";

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_seekerId_fkey" FOREIGN KEY ("seekerId") REFERENCES "SeekerProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
