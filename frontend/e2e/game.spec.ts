import { expect, test } from "@playwright/test";

test("choosing four or five players immediately starts a round with that count", async ({ page }) => {
  await page.goto("/");
  const selector = page.getByLabel("Nombre de joueurs");
  const draw = page.getByRole("button", { name: "Piocher une carte", exact: true });

  for (const guided of [false, true]) {
    if (guided)
      await page.getByRole("button", { name: "Essayer la main guidée" }).click();
    for (const count of [5, 4]) {
      await draw.click();
      await expect(page.locator(".hand-cards .playing-card")).toHaveCount(14);
      await selector.selectOption(String(count));

      await expect(page.locator(".opponent")).toHaveCount(count - 1);
      await expect(selector).toHaveValue(String(count));
      await expect(page.locator(".simulation-notice")).toContainText(`${count - 1} joueurs simulés`);
      await expect(page.locator(".board-meta")).toContainText(`${count} JOUEURS`);
      await expect(page.locator(".board-meta")).toContainText(guided ? "MAIN GUIDÉE" : "TABLE LIBRE");
      await expect(page.locator(".hand-cards .playing-card")).toHaveCount(13);
      await expect(page.locator(".stock-count")).toHaveText(count === 5 ? "38" : "51");
      await expect(draw).toBeEnabled();
    }
  }
});

test("a guided round can be won with readable cards and no runtime errors", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByText("Démonstration locale", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".hand-cards .playing-card")).toHaveCount(13);
  await expect(page.locator(".opponent")).toHaveCount(3);
  await page.getByRole("button", { name: "Essayer la main guidée" }).click();
  await page.getByRole("button", { name: "＋ Suite", exact: true }).click();
  await expect(page.locator('.feedback[role="alert"]')).toContainText(
    "exactement 3 ou 4 cartes",
  );
  await page
    .getByRole("button", { name: "Piocher une carte", exact: true })
    .click();
  await expect(page.locator(".hand-cards .playing-card")).toHaveCount(14);
  await page.getByRole("button", { name: "Préparer les combinaisons" }).click();
  await expect(page.locator(".meld-group")).toHaveCount(4);
  await expect(
    page.locator('.hand-cards button[aria-pressed="true"]'),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Tout désélectionner" }).click();
  await page.getByRole("button", { name: "Terminer à 13" }).click();
  await expect(
    page.getByText("Bien joué, la manche est terminée !"),
  ).toBeVisible();
  await expect(page.locator(".hand-cards .playing-card")).toHaveCount(13);
  await page.getByRole("button", { name: "Défausses devant Mialy" }).click();
  await expect(
    page.locator(".history-player").filter({ hasText: "Devant Mialy" }),
  ).toContainText("Défaussées par Vous");
  await expect(
    page
      .locator(".history-player")
      .filter({ hasText: "Devant Mialy" })
      .getByRole("img", { name: /Q de carreau/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Table de jeu" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect.poll(() =>
    page
      .locator(".playing-card img")
      .evaluateAll((images) =>
        images.every(
          (image) =>
            (image as HTMLImageElement).complete &&
            (image as HTMLImageElement).naturalWidth > 0,
        ),
      ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("guided-win.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("five-player rotation, manual organization, meld editing and ten-card exposure without ending the round", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.getByLabel("Nombre de joueurs").selectOption("5");
  await page.getByRole("button", { name: "Essayer la main guidée" }).click();
  await expect(page.locator(".opponent")).toHaveCount(4);
  const hand = page.locator(".hand-cards");
  await hand.getByRole("button", { name: /^5 de cœur,/ }).click();
  await page
    .getByRole("button", { name: "Déplacer la carte à droite" })
    .click();
  await expect(hand.locator("button").nth(1)).toHaveAttribute(
    "aria-label",
    /^5 de cœur,/,
  );
  await page.getByRole("button", { name: "Tout désélectionner" }).click();
  await page
    .getByRole("button", { name: "Piocher une carte", exact: true })
    .click();
  for (const rank of ["5", "6", "7", "8"])
    await hand
      .getByRole("button", { name: new RegExp(`^${rank} de cœur,`) })
      .click();
  await page.getByRole("button", { name: "＋ Suite", exact: true }).click();
  await expect(page.locator(".meld-group")).toHaveCount(1);
  await page.getByRole("button", { name: "Retirer la combinaison 1" }).click();
  await expect(page.locator(".meld-group")).toHaveCount(0);
  await page.getByRole("button", { name: "Préparer les combinaisons" }).click();
  await page.getByRole("button", { name: "Retirer la combinaison 4" }).click();
  await hand.getByRole("button", { name: /^Q de carreau,/ }).click();
  await page.getByRole("button", { name: "Afficher 10 cartes" }).click();
  await expect(
    page
      .getByRole("region", { name: "Cartes exposées par Vous" })
      .getByRole("img"),
  ).toHaveCount(10);
  await expect(page.locator(".result-banner")).toHaveCount(0);
  await expect(hand.locator("button")).toHaveCount(14);
  await expect(
    page.getByRole("button", { name: "Défausser", exact: false }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Défausser", exact: false }).click();
  await expect(
    page.getByRole("button", { name: "Piocher une carte", exact: true }),
  ).toBeEnabled({ timeout: 15000 });
  await expect(hand.locator("button")).toHaveCount(13);
  await expect(page.locator(".your-discard")).toContainText(
    "1 défausse(s) de Soa",
  );
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
    path: testInfo.outputPath("five-players.png"),
    fullPage: true,
  });
});
