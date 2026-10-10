import { expect, test } from "@playwright/test";

for (const confirmFirst of [false, true]) {
  test(`exposes ten detected cards with ${confirmFirst ? "one" : "no"} confirmed group`, async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Essayer la main guidée" }).click();
    await expect(page.locator(".suggested-meld")).toHaveCount(3);
    if (confirmFirst) {
      await page.getByRole("button", { name: "Confirmer la combinaison" }).first().click();
      await expect(page.locator(".suggested-meld")).toHaveCount(2);
    }

    await page.getByRole("button", { name: "Afficher 10 cartes" }).click();

    await expect(page.getByRole("region", { name: "Cartes exposées par Vous" }).getByRole("img")).toHaveCount(10);
    await expect(page.locator(".meld-group")).toHaveCount(3);
    await expect(page.locator(".suggested-meld")).toHaveCount(0);
    await expect(page.locator(".feedback.error")).toHaveCount(0);
    await expect(page.locator(".result-banner")).toHaveCount(0);
    await expect(page.locator(".hand-cards .playing-card")).toHaveCount(13);
    await expect(page.getByRole("button", { name: "Piocher une carte", exact: true })).toBeEnabled();
  });
}

test("finish accepts all detected groups without individual confirmation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Essayer la main guidée" }).click();
  await page
    .getByRole("button", { name: "Piocher une carte", exact: true })
    .click();
  await page.locator('.hand-cards [data-card-id="0-diamonds-13"]').click();
  await page
    .getByRole("button", { name: "Déplacer la carte à gauche" })
    .click();
  await page.getByRole("button", { name: "Tout désélectionner" }).click();
  await expect(page.locator(".suggested-meld")).toHaveCount(4);
  await expect(page.locator(".meld-group")).toHaveCount(0);
  await page.getByRole("button", { name: "Terminer à 13" }).click();
  await expect(
    page.getByText("Bien joué, la manche est terminée !"),
  ).toBeVisible();
  await expect(page.locator(".hand-cards .playing-card")).toHaveCount(13);
  await expect(
    page
      .getByRole("region", { name: "Cartes défaussées devant Mialy" })
      .getByRole("img"),
  ).toHaveAttribute("src", "/cards/diamonds-12.svg");
});
test("adjacent natural groups glow and can be confirmed in combination slots", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Essayer la main guidée" }).click();
  await expect(page.locator(".suggested-meld")).toHaveCount(3);
  await expect(page.locator(".hand-cards .valid-combination")).toHaveCount(10);
  await page
    .getByRole("button", { name: "Confirmer la combinaison" })
    .first()
    .click();
  await expect(page.locator(".meld-group.valid-combination")).toHaveCount(1);
  await expect(page.locator(".suggested-meld")).toHaveCount(2);
});
