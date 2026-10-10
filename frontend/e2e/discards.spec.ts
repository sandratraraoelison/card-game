import { expect, test } from "@playwright/test";

test("keeps every discard in front of the next player after two rotations", async ({
  page,
}) => {
  await page.goto("/");
  const draw = page.getByRole("button", {
    name: "Piocher une carte",
    exact: true,
  });
  let firstSource: string | null = null;
  for (let round = 1; round <= 2; round++) {
    await draw.click();
    await page.locator(".hand-cards button").first().dblclick();
    await expect(draw).toBeEnabled({ timeout: 15000 });
    for (const name of ["Soa", "Hery", "Mialy", "Vous"]) {
      const region = page.getByRole("region", {
        name: `Cartes défaussées devant ${name}`,
      });
      await expect(region.getByRole("listitem")).toHaveCount(round);
      await expect(region.getByRole("img")).toHaveCount(round);
    }
    const first = page
      .getByRole("region", { name: "Cartes défaussées devant Mialy" })
      .getByRole("img")
      .first();
    if (round === 1) firstSource = await first.getAttribute("src");
    else await expect(first).toHaveAttribute("src", firstSource!);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
