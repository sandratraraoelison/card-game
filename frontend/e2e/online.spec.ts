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
      const offlineContexts = new Set<number>();
      if (process.env.ONLINE_TEST_API_URL) {
        await Promise.all(pages.map((page, index) => page.route('**/api/**', async route => {
          if (offlineContexts.has(index)) { await route.abort('internetdisconnected'); return; }
          const url = new URL(route.request().url());
          const response = await route.fetch({ url: `${process.env.ONLINE_TEST_API_URL}${url.pathname}${url.search}` });
          await route.fulfill({ response });
        })));
      }
      // LAN HTTP does not expose randomUUID, even though getRandomValues works.
      await Promise.all(contexts.map(context => context.addInitScript(() => {
        Object.defineProperty(window.crypto, 'randomUUID', { value: undefined, configurable: true });
      })));
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
      await host.getByLabel('Mise par joueur (Ar)').fill('2000');
      await host.getByRole('button', { name: 'Créer le salon', exact: true }).click();
      await expect(host.getByRole('region', { name: 'Salle d’attente' })).toBeVisible();
      await expect(host.getByText('Mise par joueur :', { exact: false })).toContainText('2');
      const code = await host.getByLabel('Code du salon', { exact: true }).inputValue();
      expect(code).toMatch(/^[0-9]{6}$/);
      await expect(host.getByRole('button', { name: 'Démarrer la partie' })).toBeDisabled();
      for (const page of pages.slice(1)) {
        await page.getByRole('button', { name: 'Rejoindre un salon', exact: true }).click();
        await expect(page.getByLabel('Nom du salon', { exact: true })).toHaveCount(0);
        await page.getByLabel('Code du salon', { exact: true }).fill(code);
        await page.getByRole('button', { name: 'Rejoindre avec le code' }).click();
        await expect(page.getByRole('region', { name: 'Salle d’attente' })).toBeVisible();
      }
      await expect(host.getByRole('button', { name: 'Démarrer la partie' })).toBeEnabled();
      await host.getByRole('button', { name: 'Démarrer la partie' }).click();
      for (const page of pages) {
        const sidebar = await page.locator('.sidebar').boundingBox();
        const toolbarLink = await page.getByRole('link', { name: '← Simulation locale' }).boundingBox();
        if (!testInfo.project.use.isMobile) expect(toolbarLink!.x).toBeGreaterThanOrEqual(sidebar!.x + sidebar!.width);
        await expect(page.getByText('Solde fictif :', { exact: false })).toContainText('8');
        await expect(page.locator('.hand-cards .playing-card')).toHaveCount(13);
        await expect(page.locator('.opponent')).toHaveCount(count - 1);
        await expect(page.getByText('Mode distant', { exact: true })).toBeVisible();
        await expect(page.getByLabel('Nombre de joueurs')).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Nouvelle manche', exact: false })).toBeDisabled();
      }
      await expect(pages[1].getByRole('button', { name: 'Piocher une carte', exact: true })).toBeDisabled();
      const waitingHand = pages[1].locator('.hand-cards [data-card-id]');
      const beforeArrange = await waitingHand.evaluateAll(cards => cards.map(card => card.getAttribute('data-card-id')));
      await waitingHand.first().click();
      await expect(pages[1].getByRole('button', { name: 'Déplacer la carte à droite' })).toBeEnabled();
      await pages[1].getByRole('button', { name: 'Déplacer la carte à droite' }).click();
      await expect(waitingHand.nth(1)).toHaveAttribute('data-card-id', beforeArrange[0]!);
      await expect(pages[1].getByRole('button', { name: 'Piocher une carte', exact: true })).toBeDisabled();
      await host.getByRole('button', { name: 'Piocher une carte', exact: true }).click();
      await expect(host.locator('.hand-cards .playing-card')).toHaveCount(14);
      await host.locator('.hand-cards .playing-card').first().click();
      await host.getByRole('button', { name: 'Défausser', exact: false }).click();
      const next = pages[count - 1];
      await expect(next.getByRole('button', { name: 'Piocher une carte', exact: true })).toBeEnabled();
      await expect(next.getByRole('button', { name: 'Prendre la dernière défausse' })).toBeEnabled();
      await next.getByRole('region', { name: 'Cartes défaussées devant Vous' }).locator('button.playing-card').click();
      await expect(next.locator('.hand-cards .playing-card')).toHaveCount(14);
      const before = await next.locator('.hand-cards [data-card-id]').evaluateAll(cards => cards.map(c => c.getAttribute('data-card-id')));
      await next.reload();
      await expect(next.locator('.hand-cards .playing-card')).toHaveCount(14);
      expect(await next.locator('.hand-cards [data-card-id]').evaluateAll(cards => cards.map(c => c.getAttribute('data-card-id')))).toEqual(before);
      offlineContexts.add(count - 1);
      await contexts[count - 1].setOffline(true);
      await expect(next.getByText('Reconnexion en cours…', { exact: true })).toBeVisible({ timeout: 15000 });
      await contexts[count - 1].setOffline(false);
      offlineContexts.delete(count - 1);
      await expect(next.getByText('Connecté au serveur', { exact: true })).toBeVisible({ timeout: 15000 });
      await expect(next.locator('.hand-cards .playing-card')).toHaveCount(14);
      expect(await next.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await next.screenshot({ path: testInfo.outputPath(`online-${count}.png`), fullPage: true });
      expect(errors).toEqual([]);
    } finally { await Promise.all(contexts.map(context => context.close())); }
  });
}
