import { expect, test } from "@playwright/test";

test("drawn reference stays centered between piles with four and five players", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  for (const count of ["4", "5"]) {
    await page.getByLabel("Nombre de joueurs").selectOption(count);
    await expect(page.locator(".opponent")).toHaveCount(Number(count) - 1);
    const reference = page.getByLabel("Carte tirée de référence des jokers");
    await expect(reference.getByRole("img")).toBeVisible();
    await expect(reference.locator(".joker-mark")).toHaveCount(0);
    await reference.scrollIntoViewIfNeeded();
    const board = await page.locator(".game-board").boundingBox();
    const card = await reference.getByRole("img").boundingBox();
    const draw = await page
      .getByRole("button", { name: "Piocher une carte", exact: true })
      .boundingBox();
    const discard = await page
      .getByRole("button", { name: "Prendre la dernière défausse" })
      .boundingBox();
    if (!board || !card || !draw || !discard)
      throw new Error("Table not visible");
    expect(
      Math.abs(board.x + board.width / 2 - (card.x + card.width / 2)),
    ).toBeLessThan(2);
    expect(draw.x + draw.width).toBeLessThan(card.x);
    expect(card.x + card.width).toBeLessThan(discard.x);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await expect
    .poll(() =>
      page
        .locator(".playing-card img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("centered-reference.png"),
    fullPage: true,
  });
});
