import { expect, test } from '@playwright/test';

for (const count of [4, 5]) {
  test(`${count} independent browsers play online, reload and recover after a network interruption`, async ({ browser }, testInfo) => {
    test.setTimeout(90000);
    const contexts = await Promise.all(Array.from({ length: count }, () => browser.newContext({
      viewport: testInfo.project.use.viewport,
      isMobile: testInfo.project.use.isMobile,
      hasTouch: testInfo.project.use.hasTouch,
    })));
    try {
      const pages = await Promise.all(contexts.map(context => context.newPage()));
      const errors: string[] = [];
      pages.forEach(page => page.on('pageerror', error => errors.push(error.message)));
      await Promise.all(pages.map(async (page, i) => {
        await page.goto('/online');
        await page.getByLabel('Pseudo', { exact: true }).fill(`Ami ${i + 1}`);
        await page.getByRole('button', { name: 'Se connecter en invité' }).click();
        await expect(page.getByRole('button', { name: 'Créer le salon', exact: true })).toBeVisible();
      }));
      const host = pages[0];
      await host.getByLabel('Nom du salon', { exact: true }).fill(`Table ${count}`);
      await host.getByLabel('Nombre de joueurs').selectOption(String(count));
      await host.getByRole('button', { name: 'Créer le salon', exact: true }).click();
      await expect(host.getByRole('region', { name: 'Salle d’attente' })).toBeVisible();
      const code = await host.getByLabel('Code du salon', { exact: true }).inputValue();
      await expect(host.getByRole('button', { name: 'Démarrer la partie' })).toBeDisabled();
      for (const page of pages.slice(1)) {
        await page.getByLabel('Code du salon', { exact: true }).fill(code);
        await page.getByRole('button', { name: 'Rejoindre avec le code' }).click();
        await expect(page.getByRole('region', { name: 'Salle d’attente' })).toBeVisible();
      }
      await expect(host.getByRole('button', { name: 'Démarrer la partie' })).toBeEnabled();
      await host.getByRole('button', { name: 'Démarrer la partie' }).click();
      for (const page of pages) {
        await expect(page.locator('.hand-cards .playing-card')).toHaveCount(13);
        await expect(page.locator('.opponent')).toHaveCount(count - 1);
        await expect(page.getByText('Mode distant', { exact: true })).toBeVisible();
        await expect(page.getByLabel('Nombre de joueurs')).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Nouvelle manche', exact: false })).toBeDisabled();
      }
      await expect(pages[1].getByRole('button', { name: 'Piocher une carte', exact: true })).toBeDisabled();
      await host.getByRole('button', { name: 'Piocher une carte', exact: true }).click();
      await expect(host.locator('.hand-cards .playing-card')).toHaveCount(14);
      await host.locator('.hand-cards .playing-card').first().click();
      await host.getByRole('button', { name: 'Défausser', exact: false }).click();
      const next = pages[count - 1];
      await expect(next.getByRole('button', { name: 'Piocher une carte', exact: true })).toBeEnabled();
      await next.getByRole('button', { name: 'Prendre la dernière défausse' }).click();
      await expect(next.locator('.hand-cards .playing-card')).toHaveCount(14);
      const before = await next.locator('.hand-cards [data-card-id]').evaluateAll(cards => cards.map(c => c.getAttribute('data-card-id')));
      await next.reload();
      await expect(next.locator('.hand-cards .playing-card')).toHaveCount(14);
      expect(await next.locator('.hand-cards [data-card-id]').evaluateAll(cards => cards.map(c => c.getAttribute('data-card-id')))).toEqual(before);
      await contexts[count - 1].setOffline(true);
      await expect(next.getByText('Reconnexion en cours…', { exact: true })).toBeVisible({ timeout: 15000 });
      await contexts[count - 1].setOffline(false);
      await expect(next.getByText('Connecté au serveur', { exact: true })).toBeVisible({ timeout: 15000 });
      await expect(next.locator('.hand-cards .playing-card')).toHaveCount(14);
      expect(await next.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await next.screenshot({ path: testInfo.outputPath(`online-${count}.png`), fullPage: true });
      expect(errors).toEqual([]);
    } finally { await Promise.all(contexts.map(context => context.close())); }
  });
}
