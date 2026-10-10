import { expect, test } from "@playwright/test";

test("simulates a completed joker win with four or five players and can replay", async ({ page }, testInfo) => {
  await page.goto("/");
  for (const count of ["4", "5"]) {
    await page.getByLabel("Nombre de joueurs").selectOption(count);
    await page.getByRole("button", { name: "Simuler une victoire avec joker", exact: true }).click();
    await expect(page.locator(".result-banner")).toContainText("avec jokers");
    await expect(page.locator(".opponent")).toHaveCount(Number(count) - 1);
    await expect(page.locator(".meld-group.valid-combination")).toHaveCount(4);
    await expect(page.locator(".meld-group").first()).toContainText("Joker");
    await expect(page.locator(".meld-title small").filter({ hasText: "Naturel" })).toHaveCount(3);
    await expect(page.locator(".hand-cards .playing-card")).toHaveCount(13);
    await expect(page.locator(".hand-cards").getByRole("img", { name: /4 de cœur, exemplaire 1, vrai joker/ })).toHaveCount(1);
    await expect(page.getByLabel("Carte tirée de référence des jokers").getByRole("img")).toHaveAttribute("src", "/cards/spades-4.svg");
    await expect(page.getByRole("button", { name: "Piocher une carte", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Terminer à 13" })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`joker-win-${count}.png`), fullPage: true });

    await page.getByRole("button", { name: "Rejouer" }).click();
    await expect(page.locator(".result-banner")).toHaveCount(0);
    await expect(page.getByLabel("Nombre de joueurs")).toHaveValue(count);
    await expect(page.getByRole("button", { name: "Piocher une carte", exact: true })).toBeEnabled();
  }
});
