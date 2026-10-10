import { expect, test } from "@playwright/test";

test("ten-card demo can be dismissed and expires after thirty seconds without ending play", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  const demo = page.getByRole("button", { name: "Simuler 10 cartes · nouvelle manche guidée" });
  await demo.click();
  const notice = page.getByRole("region", { name: "Annonce des 10 cartes de Vous" });
  await expect(notice.getByRole("img")).toHaveCount(10);
  await expect(page.locator(".result-banner")).toHaveCount(0);
  await notice.getByRole("button", { name: "Fermer l’annonce" }).click();
  await expect(notice).toHaveCount(0);
  // A manual close must survive subsequent countdown ticks.
  await page.clock.runFor(1000);
  await expect(notice).toHaveCount(0);
  await page.getByRole("button", { name: "Piocher une carte", exact: true }).click();
  await page.clock.runFor(1000);
  await expect(notice).toHaveCount(0);
  await expect(page.locator(".hand-cards .playing-card")).toHaveCount(14);
  await expect(page.getByRole("region", { name: "Cartes exposées par Vous" }).getByRole("img")).toHaveCount(10);
  await demo.click();
  await expect(notice).toBeVisible();
  await page.clock.fastForward(30000);
  await expect(notice).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Piocher une carte", exact: true })).toBeEnabled();
  await expect(page.locator(".hand-cards .playing-card")).toHaveCount(13);
});

test('exposure validates detected groups before opening the large announcement', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Essayer la main guidée' }).click();
  const expose = page.getByRole('button', { name: 'Afficher 10 cartes' });
  await expect(expose).toBeEnabled();
  await expose.click();
  const notice = page.getByRole('region', { name: 'Annonce des 10 cartes de Vous' });
  await expect(notice.getByRole('img')).toHaveCount(10);
  await expect(notice).toContainText('Fermeture automatique dans');
  expect(await notice.getByRole('img').first().evaluate(img => img.getBoundingClientRect().width)).toBeGreaterThan(40);
  await notice.screenshot({ path: testInfo.outputPath('exposure-large.png') });
  await notice.getByRole('button', { name: 'Fermer l’annonce' }).click();
  await expect(notice).toHaveCount(0);
  await page.getByRole('button', { name: 'Simuler une victoire avec joker' }).click();
  await expect(expose).toBeDisabled();
});
