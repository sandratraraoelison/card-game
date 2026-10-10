import { expect, test } from '@playwright/test';
import { createGame, toGameView } from '@rami/game';

for (const reported of [false, true]) test(`end screen ${reported ? 'with' : 'without'} reports waits for every player`, async ({ browser }, testInfo) => {
  const contexts = await Promise.all(Array.from({ length: 4 }, () => browser.newContext({ viewport: testInfo.project.use.viewport, isMobile: testInfo.project.use.isMobile, hasTouch: testInfo.project.use.hasTouch })));
  let game = createGame(4, true);
  game.mode = 'remote'; game.phase = 'finished';
  game.result = reported ? { reason: 'Pioche épuisée : manche nulle.' } : { playerId: 'p0', reason: 'Ami 1 termine à 13 cartes.' };
  const finishedId = game.id;
  let readyIds: string[] = [];
  let revision = 1;
  const members = game.players.map((player, index) => ({ id: player.id, displayName: `Ami ${index + 1}`, balance: 9000 }));
  try {
    const pages = await Promise.all(contexts.map(context => context.newPage()));
    for (let index = 0; index < pages.length; index++) {
      await pages[index].route('**/api/**', async route => {
        const pathname = new URL(route.request().url()).pathname;
        const room = () => ({ id: '123456', revision, name: 'Table test', capacity: 4, playerCount: 4, status: 'playing', hostId: 'p0', members, readyPlayerIds: readyIds, stake: 1000, pot: 4000, exposurePrize: 2000, finishPrize: 2000, carryover: reported ? 2000 : 0, finishCarryover: reported ? 2000 : 0, exposureWinnerId: reported ? undefined : 'p0', game: toGameView(game, `p${index}`) });
        let response: unknown;
        if (pathname.endsWith('/sessions/me')) response = members[index];
        else if (pathname.endsWith('/sessions')) response = { token: `token-${index}`, player: members[index] };
        else if (pathname.endsWith('/game/ready')) {
          const body = route.request().postDataJSON();
          expect(body.gameId).toBe(finishedId);
          readyIds = [...new Set([...readyIds, `p${index}`])];
          revision++;
          if (readyIds.length === 4) { game = createGame(4, true); game.mode = 'remote'; readyIds = []; }
          response = room();
        } else if (pathname === '/api/rooms') response = [room()];
        else response = room();
        await route.fulfill({ json: response });
      });
      await pages[index].goto('/online');
      await pages[index].getByLabel('Pseudo', { exact: true }).fill(`Ami ${index + 1}`);
      await pages[index].getByRole('button', { name: 'Se connecter en invité' }).click();
      await pages[index].getByRole('button', { name: 'Rejoindre un salon', exact: true }).click();
      await pages[index].getByLabel('Code du salon', { exact: true }).fill('123456');
      await pages[index].getByRole('button', { name: 'Rejoindre avec le code' }).click();
      await expect(pages[index].getByRole('region', { name: 'Résultat de la manche' })).toBeVisible();
      await expect(pages[index].getByRole('heading', { name: reported ? 'Avec report de prime' : 'Sans report de prime' })).toBeVisible();
      const result = pages[index].getByRole('region', { name: 'Résultat de la manche' });
      await expect(result.getByText('Solde :', { exact: false })).toHaveCount(0);
      await expect(result.getByText('Perte :', { exact: false })).toHaveCount(reported ? 4 : 3);
      if (!reported) await expect(result.getByText('Gain :', { exact: false })).toContainText('3');
    }
    await pages[0].screenshot({ path: testInfo.outputPath('round-result.png'), fullPage: true });
    for (const page of pages.slice(0, 3)) {
      await page.getByRole('button', { name: 'Prêt', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Vous êtes prêt' })).toBeDisabled();
      await expect(page.getByRole('region', { name: 'Résultat de la manche' })).toBeVisible();
    }
    await pages[0].reload();
    await expect(pages[0].getByRole('button', { name: 'Vous êtes prêt' })).toBeDisabled();
    await pages[3].getByRole('button', { name: 'Prêt', exact: true }).click();
    for (const page of pages) {
      await expect(page.getByRole('region', { name: 'Résultat de la manche' })).toHaveCount(0);
      await expect(page.locator('.hand-cards .playing-card')).toHaveCount(13);
    }
  } finally { await Promise.all(contexts.map(context => context.close())); }
});
