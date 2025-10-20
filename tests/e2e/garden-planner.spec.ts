import { test, expect } from "@playwright/test";

const CELL_SIZE_CM = 10;
const BED_WIDTH_CM = 200;
const BED_LENGTH_CM = 300;

function parsePercentFromStyle(style: string | null, property: "left" | "top") {
  if (!style) throw new Error("Missing style attribute");
  const match = style.match(new RegExp(`${property}\\s*:\\s*([0-9.]+)%`));
  if (!match) {
    throw new Error(`Could not parse ${property} from style: ${style}`);
  }
  return parseFloat(match[1]);
}

test.describe("Garden planner sandbox", () => {
  test("dragging a plant snaps to the nearest cell center", async ({ page }) => {
    await page.goto("/dev/garden-sandbox");
    const plantCard = page.getByTestId("plant-card-demo-tomato");
    const bedCanvas = page.getByTestId("garden-bed-canvas");

    await plantCard.dragTo(bedCanvas, { targetPosition: { x: 123, y: 187 } });

    const pending = page.getByTestId("pending-placement");
    await expect(pending).toBeVisible();
    const style = await pending.getAttribute("style");
    const leftPercent = parsePercentFromStyle(style, "left");
    const topPercent = parsePercentFromStyle(style, "top");

    const xCm = (leftPercent / 100) * BED_WIDTH_CM;
    const yCm = (topPercent / 100) * BED_LENGTH_CM;

    const expectedX = Math.round((xCm - CELL_SIZE_CM / 2) / CELL_SIZE_CM) * CELL_SIZE_CM + CELL_SIZE_CM / 2;
    const expectedY = Math.round((yCm - CELL_SIZE_CM / 2) / CELL_SIZE_CM) * CELL_SIZE_CM + CELL_SIZE_CM / 2;

    expect(Math.abs(xCm - expectedX)).toBeLessThan(0.6);
    expect(Math.abs(yCm - expectedY)).toBeLessThan(0.6);
  });

  test("planting popovers stay within bed bounds at every edge", async ({ page }) => {
    await page.goto("/dev/garden-sandbox");
    const bedCanvas = page.getByTestId("garden-bed-canvas");
    const bedBox = await bedCanvas.boundingBox();
    if (!bedBox) throw new Error("Bed bounding box not found");

    const markerIds = ["edge-nw", "edge-ne", "edge-sw", "edge-se"];

    for (const markerId of markerIds) {
      const marker = page.getByTestId(`planting-marker-${markerId}`);
      await marker.hover();
      const popover = page.getByTestId("planting-popover");
      await expect(popover).toBeVisible();
      const popBox = await popover.boundingBox();
      if (!popBox) throw new Error("Popover bounding box not found");
      const popLeft = popBox.x;
      const popRight = popBox.x + popBox.width;
      const popTop = popBox.y;
      const popBottom = popBox.y + popBox.height;
      const bedLeft = bedBox.x;
      const bedRight = bedBox.x + bedBox.width;
      const bedTop = bedBox.y;
      const bedBottom = bedBox.y + bedBox.height;
      expect(popLeft).toBeGreaterThanOrEqual(bedLeft - 2);
      expect(popRight).toBeLessThanOrEqual(bedRight + 2);
      expect(popTop).toBeGreaterThanOrEqual(bedTop - 2);
      expect(popBottom).toBeLessThanOrEqual(bedBottom + 2);
      const zIndex = await popover.evaluate((element) => window.getComputedStyle(element).zIndex);
      expect(Number(zIndex)).toBeGreaterThanOrEqual(9999);
      await page.mouse.move(0, 0);
    }
  });
});
