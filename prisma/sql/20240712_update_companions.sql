-- Alter Companion relationships to support optional targets and preserve names
ALTER TABLE "Companion" ADD COLUMN IF NOT EXISTS "plantId" TEXT;
ALTER TABLE "Companion" ADD COLUMN IF NOT EXISTS "targetPlantId" TEXT;
ALTER TABLE "Companion" ADD COLUMN IF NOT EXISTS "targetName" TEXT;

UPDATE "Companion" SET "plantId" = COALESCE("plantId", "plantAId"), "targetPlantId" = COALESCE("targetPlantId", "plantBId");

UPDATE "Companion" AS c
SET "targetName" = COALESCE(p."commonName", c."targetName")
FROM "Plant" AS p
WHERE c."targetPlantId" IS NOT NULL
  AND p."id" = c."targetPlantId";

UPDATE "Companion" SET "targetName" = COALESCE(NULLIF("targetName", ''), 'Unknown');

ALTER TABLE "Companion" ALTER COLUMN "plantId" SET NOT NULL;
ALTER TABLE "Companion" ALTER COLUMN "targetName" SET NOT NULL;

ALTER TABLE "Companion" DROP CONSTRAINT IF EXISTS "Companion_plantAId_fkey";
ALTER TABLE "Companion" DROP CONSTRAINT IF EXISTS "Companion_plantBId_fkey";

ALTER TABLE "Companion" DROP COLUMN IF EXISTS "plantAId";
ALTER TABLE "Companion" DROP COLUMN IF EXISTS "plantBId";

ALTER TABLE "Companion" ADD CONSTRAINT IF NOT EXISTS "Companion_plantId_fkey"
  FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Companion" ADD CONSTRAINT IF NOT EXISTS "Companion_targetPlantId_fkey"
  FOREIGN KEY ("targetPlantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
