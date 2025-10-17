import { test, expect } from "@playwright/test";

test.describe("Gardenit", () => {
  test("landing page has hero", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /grow smarter/i })).toBeVisible();
  });
});
