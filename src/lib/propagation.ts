export type PropagationGuideSection = {
  title: string;
  summary: string;
  bestFor: string;
  steps: string[];
  aftercare?: string[];
  tips?: string[];
};

export const PROPAGATION_SECTIONS: PropagationGuideSection[] = [
  {
    title: "Seed Propagation",
    summary:
      "Raising plants from seed is the most economical way to produce a large batch of uniform seedlings while keeping access to rare cultivars.",
    bestFor: "Annual vegetables, herbs, and any crop that doesn't root reliably from cuttings.",
    steps: [
      "Use fresh seed and store it somewhere cool and dry until sowing time.",
      "Fill trays or pots with a fine seed-starting mix and pre-moisten it so it holds together when squeezed.",
      "Sow seeds at the depth recommended on the packet—typically 2–3 times the seed's diameter—and firm the mix gently for good contact.",
      "Cover the tray to hold humidity and keep temperatures in the germination range listed for the crop.",
      "Vent covers once seedlings emerge and move them into bright light to prevent stretching.",
    ],
    aftercare: [
      "Feed with a diluted, balanced fertiliser once true leaves form.",
      "Harden off transplants by gradually introducing outdoor conditions for 7–10 days before planting out.",
    ],
  },
  {
    title: "Cutting Propagation",
    summary:
      "Cuttings clone the parent plant exactly, letting you multiply standout performers or maintain named cultivars.",
    bestFor: "Tender herbs, many woody perennials, and crops with flexible, pest-free shoots.",
    steps: [
      "Select disease-free stems with several nodes and cut just below a node using sterilised snips.",
      "Remove the lower foliage so at least two nodes are exposed for rooting.",
      "Dip the cut end in rooting hormone if the species is slow to root, then insert it into a loose, moist medium like perlite and peat.",
      "Mist the foliage and cover the cuttings with a humidity dome or clear bag to prevent wilting.",
      "Keep the medium barely moist and provide bright, indirect light until new growth indicates rooting.",
    ],
    tips: [
      "Bottom heat encourages faster rooting for warmth-loving crops like peppers and basil.",
      "Take cuttings early in the day when stems are fully hydrated.",
    ],
  },
  {
    title: "Division",
    summary:
      "Dividing mature crowns refreshes growth and creates new plants without the unpredictability of seed-grown offspring.",
    bestFor: "Clump-forming herbs and vegetables that produce offsets, such as chives, rhubarb, and perennial brassicas.",
    steps: [
      "Water the plant well the day before digging to reduce stress.",
      "Lift the crown carefully with a fork, keeping as many roots intact as possible.",
      "Split the crown into sections, ensuring each division retains healthy buds and roots.",
      "Trim away any dead or diseased material and dust cuts with cinnamon or sulphur if rot is a concern.",
      "Replant divisions at the same depth they were growing originally and water deeply to settle the soil.",
    ],
    aftercare: [
      "Provide shade cloth or fleece if the weather is hot or windy while divisions re-establish.",
      "Resume feeding once new growth resumes, typically after a few weeks.",
    ],
  },
  {
    title: "Crown Division",
    summary:
      "Crown division targets plants with a central crown—such as asparagus and rhubarb—where fresh buds arise from a woody base.",
    bestFor: "Perennials that form dense crowns with obvious bud clusters.",
    steps: [
      "Lift the plant during dormancy or very early spring when buds are just visible.",
      "Use a clean knife or pruning saw to cut the crown into pieces, keeping at least two strong buds on each section.",
      "Inspect the interior for signs of rot and discard any discoloured tissue.",
      "Dust cut surfaces with fungicidal powder if crowns are prone to fungal issues.",
      "Replant divisions immediately in well-drained soil enriched with compost, watering to remove air pockets.",
    ],
    tips: [
      "Avoid harvesting spears the first season after dividing asparagus to let crowns rebuild energy.",
    ],
  },
  {
    title: "Layering Propagation",
    summary:
      "Layering roots a stem while it remains attached to the parent plant, providing a steady supply of moisture and carbohydrates.",
    bestFor: "Vining crops and herbs with pliable stems, such as squash family members or rosemary.",
    steps: [
      "Choose a low, flexible stem and gently wound a section of bark where roots should form.",
      "Dust the wound with rooting hormone if desired and pin the stem into contact with moist soil or a pot of compost.",
      "Cover the pegged section with soil or moss, leaving the tip exposed to keep growing.",
      "Maintain even moisture around the pegged node for several weeks.",
      "Sever the new plant from the parent once a strong root system develops and transplant it carefully.",
    ],
  },
  {
    title: "Grafting Propagation",
    summary:
      "Grafting joins a desirable scion to a robust rootstock, combining vigour with prized fruit or foliage traits.",
    bestFor: "Fruit trees, peppers, tomatoes, and crops where disease resistance from the rootstock is valuable.",
    steps: [
      "Match scion and rootstock diameters closely and make complementary cuts (whip-and-tongue, cleft, or splice).",
      "Align the cambium layers carefully so they can knit together.",
      "Bind the union firmly with grafting tape or parafilm to exclude air and retain moisture.",
      "Seal exposed cuts with grafting wax to limit desiccation.",
      "Grow the grafted plant in a sheltered environment until the union calluses and new growth pushes from the scion.",
    ],
    tips: [
      "Maintain high humidity around freshly grafted vegetables such as tomatoes to prevent wilting.",
      "Remove any shoots that sprout from below the graft union so the rootstock doesn't overtake the scion.",
    ],
  },
];

export function propagationSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
