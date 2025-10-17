import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const monthRange = (start: number, end: number) => ({ start, end });

async function main() {
  await prisma.reminder.deleteMany();
  await prisma.planting.deleteMany();
  await prisma.bed.deleteMany();
  await prisma.garden.deleteMany();
  await prisma.companion.deleteMany();
  await prisma.climatePlantWindow.deleteMany();
  await prisma.plant.deleteMany();
  await prisma.climateZone.deleteMany();
  await prisma.user.deleteMany();

  await prisma.climateZone.createMany({
    data: [
      {
        id: "nz-north",
        name: "New Zealand North",
        country: "NZ",
        frostFirst: new Date(Date.UTC(new Date().getUTCFullYear(), 5, 1)),
        frostLast: new Date(Date.UTC(new Date().getUTCFullYear(), 8, 1)),
        notes: "Generally frost free coastal north.",
      },
      {
        id: "nz-south",
        name: "New Zealand South",
        country: "NZ",
        frostFirst: new Date(Date.UTC(new Date().getUTCFullYear(), 4, 15)),
        frostLast: new Date(Date.UTC(new Date().getUTCFullYear(), 9, 15)),
        notes: "Cooler winters with regular frosts.",
      },
    ],
    skipDuplicates: true,
  });

  const plants = [
    {
      commonName: "Lettuce",
      scientificName: "Lactuca sativa",
      category: "vegetable",
      sunRequirement: "partial",
      soilNotes: "Moist, fertile soil.",
      waterGeneral: "Keep consistently moist.",
      sowDepthMm: 5,
      spacingInRowCm: 25,
      spacingBetweenRowsCm: 30,
      daysToMaturity: 55,
      careNotes: "Mulch to retain moisture.",
    },
    {
      commonName: "Carrot",
      scientificName: "Daucus carota",
      category: "vegetable",
      sunRequirement: "full sun",
      soilNotes: "Loose, stone-free soil.",
      waterGeneral: "Water lightly but regularly.",
      sowDepthMm: 6,
      spacingInRowCm: 5,
      spacingBetweenRowsCm: 20,
      daysToMaturity: 70,
      careNotes: "Thin seedlings early.",
    },
    {
      commonName: "Beetroot",
      scientificName: "Beta vulgaris",
      category: "vegetable",
      sunRequirement: "full sun",
      soilNotes: "Rich, well-drained soil.",
      waterGeneral: "Moderate watering.",
      sowDepthMm: 10,
      spacingInRowCm: 10,
      spacingBetweenRowsCm: 30,
      daysToMaturity: 60,
      careNotes: "Harvest when bulbs reach golf ball size.",
    },
    {
      commonName: "Silverbeet",
      scientificName: "Beta vulgaris var. cicla",
      category: "vegetable",
      sunRequirement: "partial",
      soilNotes: "Rich, moist soil.",
      waterGeneral: "Water weekly.",
      sowDepthMm: 15,
      spacingInRowCm: 30,
      spacingBetweenRowsCm: 45,
      daysToMaturity: 60,
      careNotes: "Cut leaves as needed.",
    },
    {
      commonName: "Kale",
      scientificName: "Brassica oleracea",
      category: "vegetable",
      sunRequirement: "full sun",
      soilNotes: "Rich soil with compost.",
      waterGeneral: "Water twice weekly.",
      sowDepthMm: 10,
      spacingInRowCm: 40,
      spacingBetweenRowsCm: 45,
      daysToMaturity: 65,
      careNotes: "Protect from caterpillars.",
    },
    {
      commonName: "Tomato",
      scientificName: "Solanum lycopersicum",
      category: "fruit",
      sunRequirement: "full sun",
      soilNotes: "Warm, well-drained soil.",
      waterGeneral: "Deep water twice weekly.",
      sowDepthMm: 6,
      spacingInRowCm: 50,
      spacingBetweenRowsCm: 75,
      daysToMaturity: 85,
      careNotes: "Stake plants and remove laterals.",
    },
    {
      commonName: "Basil",
      scientificName: "Ocimum basilicum",
      category: "herb",
      sunRequirement: "full sun",
      soilNotes: "Rich, well-drained soil.",
      waterGeneral: "Keep evenly moist.",
      sowDepthMm: 5,
      spacingInRowCm: 25,
      spacingBetweenRowsCm: 30,
      daysToMaturity: 50,
      careNotes: "Pinch growing tips.",
    },
    {
      commonName: "Dwarf Beans",
      scientificName: "Phaseolus vulgaris",
      category: "vegetable",
      sunRequirement: "full sun",
      soilNotes: "Warm, well-drained soil.",
      waterGeneral: "Water weekly.",
      sowDepthMm: 30,
      spacingInRowCm: 10,
      spacingBetweenRowsCm: 45,
      daysToMaturity: 65,
      careNotes: "Mulch to retain moisture.",
    },
    {
      commonName: "Peas",
      scientificName: "Pisum sativum",
      category: "vegetable",
      sunRequirement: "full sun",
      soilNotes: "Moist, fertile soil.",
      waterGeneral: "Regular watering especially during flowering.",
      sowDepthMm: 30,
      spacingInRowCm: 5,
      spacingBetweenRowsCm: 45,
      daysToMaturity: 70,
      careNotes: "Provide trellis support.",
    },
    {
      commonName: "Spring Onion",
      scientificName: "Allium fistulosum",
      category: "vegetable",
      sunRequirement: "full sun",
      soilNotes: "Moist, well-drained soil.",
      waterGeneral: "Water lightly but consistently.",
      sowDepthMm: 10,
      spacingInRowCm: 5,
      spacingBetweenRowsCm: 20,
      daysToMaturity: 60,
      careNotes: "Harvest when stems are pencil thick.",
    },
  ];

  const createdPlants = await Promise.all(
    plants.map((plant) =>
      prisma.plant.upsert({
        where: { commonName: plant.commonName },
        update: plant,
        create: plant,
      }),
    ),
  );

  const windows = [
    {
      plant: "Lettuce",
      zone: "nz-north",
      sowOutdoors: [monthRange(1, 12)],
    },
    {
      plant: "Lettuce",
      zone: "nz-south",
      sowOutdoors: [monthRange(8, 4)],
    },
    {
      plant: "Carrot",
      zone: "nz-north",
      sowOutdoors: [monthRange(7, 4)],
    },
    {
      plant: "Carrot",
      zone: "nz-south",
      sowOutdoors: [monthRange(8, 2)],
    },
    {
      plant: "Tomato",
      zone: "nz-north",
      sowIndoors: [monthRange(7, 9)],
      transplant: [monthRange(10, 12)],
    },
    {
      plant: "Tomato",
      zone: "nz-south",
      sowIndoors: [monthRange(8, 10)],
      transplant: [monthRange(11, 1)],
    },
    {
      plant: "Basil",
      zone: "nz-north",
      sowIndoors: [monthRange(8, 11)],
      transplant: [monthRange(10, 1)],
    },
    {
      plant: "Basil",
      zone: "nz-south",
      sowIndoors: [monthRange(9, 12)],
      transplant: [monthRange(11, 2)],
    },
    {
      plant: "Dwarf Beans",
      zone: "nz-north",
      sowOutdoors: [monthRange(10, 2)],
    },
    {
      plant: "Dwarf Beans",
      zone: "nz-south",
      sowOutdoors: [monthRange(11, 1)],
    },
    {
      plant: "Peas",
      zone: "nz-north",
      sowOutdoors: [monthRange(3, 8)],
    },
    {
      plant: "Peas",
      zone: "nz-south",
      sowOutdoors: [monthRange(2, 7)],
    },
    {
      plant: "Kale",
      zone: "nz-north",
      sowOutdoors: [monthRange(2, 6)],
    },
    {
      plant: "Kale",
      zone: "nz-south",
      sowOutdoors: [monthRange(1, 4)],
    },
    {
      plant: "Beetroot",
      zone: "nz-north",
      sowOutdoors: [monthRange(7, 4)],
    },
    {
      plant: "Beetroot",
      zone: "nz-south",
      sowOutdoors: [monthRange(8, 2)],
    },
    {
      plant: "Silverbeet",
      zone: "nz-north",
      sowOutdoors: [monthRange(1, 12)],
    },
    {
      plant: "Silverbeet",
      zone: "nz-south",
      sowOutdoors: [monthRange(2, 10)],
    },
    {
      plant: "Spring Onion",
      zone: "nz-north",
      sowOutdoors: [monthRange(1, 12)],
    },
    {
      plant: "Spring Onion",
      zone: "nz-south",
      sowOutdoors: [monthRange(2, 11)],
    },
  ];

  for (const window of windows) {
    const plant = createdPlants.find((p) => p.commonName === window.plant);
    if (!plant) continue;
    await prisma.climatePlantWindow.upsert({
      where: { plantId_climateZoneId: { plantId: plant.id, climateZoneId: window.zone } },
      update: {
        sowIndoors: window.sowIndoors ?? null,
        sowOutdoors: window.sowOutdoors ?? null,
        transplant: window.transplant ?? null,
      },
      create: {
        plantId: plant.id,
        climateZoneId: window.zone,
        sowIndoors: window.sowIndoors ?? null,
        sowOutdoors: window.sowOutdoors ?? null,
        transplant: window.transplant ?? null,
      },
    });
  }

  const plantMap = Object.fromEntries(createdPlants.map((p) => [p.commonName, p.id]));

  const companions = [
    { plantA: "Tomato", plantB: "Basil", type: "companion", reason: "Basil repels pests and enhances flavour." },
    { plantA: "Carrot", plantB: "Lettuce", type: "companion", reason: "Shade and moisture retention." },
    { plantA: "Peas", plantB: "Carrot", type: "companion", reason: "Nitrogen fixation benefits carrots." },
  ];

  const antagonists = [
    { plantA: "Dwarf Beans", plantB: "Spring Onion", type: "antagonist", reason: "Alliums inhibit bean growth." },
    { plantA: "Peas", plantB: "Spring Onion", type: "antagonist", reason: "Alliums stunt pea roots." },
  ];

  for (const entry of [...companions, ...antagonists]) {
    const plantAId = plantMap[entry.plantA];
    const plantBId = plantMap[entry.plantB];
    if (!plantAId || !plantBId) continue;
    await prisma.companion.create({
      data: {
        plantAId,
        plantBId,
        type: entry.type,
        reason: entry.reason,
      },
    });
  }

  await prisma.user.upsert({
    where: { email: "demo@gardenit.nz" },
    update: {},
    create: {
      email: "demo@gardenit.nz",
      name: "Garden Demo",
      locationLat: -36.8485,
      locationLon: 174.7633,
      climateZoneId: "nz-north",
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
