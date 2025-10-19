import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [plants, zones] = await Promise.all([
    prisma.plant.findMany({ select: { id: true, commonName: true } }),
    prisma.climateZone.findMany({ select: { id: true, name: true } }),
  ]);

  let created = 0;

  for (const plant of plants) {
    for (const zone of zones) {
      const existing = await prisma.climatePlantWindow.findUnique({
        where: { plantId_climateZoneId: { plantId: plant.id, climateZoneId: zone.id } },
        select: { id: true },
      });

      if (!existing) {
        await prisma.climatePlantWindow.create({
          data: {
            plantId: plant.id,
            climateZoneId: zone.id,
          },
        });
        created += 1;
        console.log(
          `Created climate window for "${plant.commonName}" in zone "${zone.name}" (${zone.id}).`,
        );
      }
    }
  }

  console.log(
    `Ensured ${plants.length * zones.length} plant/zone combinations. ${created} new records were created.`,
  );
}

main()
  .catch((error) => {
    console.error("Failed to backfill climate windows", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
