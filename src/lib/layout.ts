export function calculatePlantCapacity(
  bedWidthCm: number,
  bedHeightCm: number,
  spacingInRowCm: number,
  spacingBetweenRowsCm: number,
) {
  if (spacingInRowCm <= 0 || spacingBetweenRowsCm <= 0) {
    throw new Error("Spacing must be greater than zero");
  }
  const columns = Math.max(1, Math.floor(bedWidthCm / spacingInRowCm));
  const rows = Math.max(1, Math.floor(bedHeightCm / spacingBetweenRowsCm));
  return columns * rows;
}
