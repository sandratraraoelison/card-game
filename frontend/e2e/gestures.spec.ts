import { expect, test, type Page } from "@playwright/test";

async function dragCard(
  page: Page,
  cardId: string,
  target: { x: number; y: number },
  touch: boolean,
) {
  const source = await page
    .locator(`.hand-cards [data-card-id="${cardId}"]`)
    .boundingBox();
  if (!source) throw new Error("Missing card");
  const start = {
    x: source.x + source.width / 2,
    y: source.y + source.height / 2,
  };
  if (touch) {
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...start, id: 0 }],
    });
    await expect(page.locator(".drag-preview")).toBeVisible();
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ ...target, id: 0 }],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await session.detach();
  } else {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.mouse.up();
  }
}

test("valid selection halo, drag reorder, and double-click discard guards", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Essayer la main guidée" }).click();
  const hand = page.locator(".hand-cards");
  for (const rank of [5, 6, 7])
    await hand.locator(`[data-card-id="0-hearts-${rank}"]`).click();
  await expect(hand.locator(".valid-combination.selected")).toHaveCount(3);
  await expect(
    page.getByText("✓ Combinaison valide : vous pouvez la préparer."),
  ).toBeVisible();
  await hand.locator('[data-card-id="0-spades-9"]').click();
  await expect(hand.locator(".valid-combination")).toHaveCount(10);
  await page.getByRole("button", { name: "Tout désélectionner" }).click();
  await hand.locator('[data-card-id="0-hearts-5"]').dblclick();
  await expect(page.locator(".feedback.error")).toContainText("Piochez avant");
  await expect(hand.locator("button")).toHaveCount(13);
  await page
    .getByRole("button", { name: "Piocher une carte", exact: true })
    .click();
  await hand.locator('[data-card-id="0-hearts-5"]').dblclick();
  await expect(hand.locator("button")).toHaveCount(13);
  await expect(hand.locator('[data-card-id="0-hearts-5"]')).toHaveCount(0);
  await expect(
    page
      .getByRole("region", { name: "Cartes défaussées devant Mialy" })
      .getByRole("img"),
  ).toHaveAttribute("src", "/cards/hearts-5.svg");
});

test("mouse and touch hold reorder, cancel, then drop on the table", async ({
  page,
  isMobile,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Essayer la main guidée" }).click();
  const hand = page.locator(".hand-cards");
  await hand.scrollIntoViewIfNeeded();
  const third = await hand.locator('[data-card-id="0-hearts-7"]').boundingBox();
  if (!third) throw new Error("Missing target");
  await dragCard(
    page,
    "0-hearts-5",
    { x: third.x + third.width * 0.8, y: third.y + third.height / 2 },
    isMobile,
  );
  await expect(hand.locator("button").nth(2)).toHaveAttribute(
    "data-card-id",
    "0-hearts-5",
  );
  await expect(hand.locator('[aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator(".drag-preview")).toHaveCount(0);
  // Drop outside both destinations cancels, with no loss of card.
  await dragCard(page, "0-hearts-6", { x: 5, y: 400 }, isMobile);
  await expect(hand.locator("button")).toHaveCount(13);
  await page
    .getByRole("button", { name: "Piocher une carte", exact: true })
    .click();
  await hand.scrollIntoViewIfNeeded();
  const table = await page.locator(".game-board").boundingBox();
  if (!table) throw new Error("Missing table");
  await dragCard(
    page,
    "0-hearts-6",
    {
      x: table.x + table.width / 2,
      y: Math.max(90, table.y + table.height - 40),
    },
    isMobile,
  );
  await expect(hand.locator("button")).toHaveCount(13);
  await expect(hand.locator('[data-card-id="0-hearts-6"]')).toHaveCount(0);
  await expect(
    page
      .getByRole("region", { name: "Cartes défaussées devant Mialy" })
      .getByRole("img"),
  ).toHaveAttribute("src", "/cards/hearts-6.svg");
  expect(errors).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("gestures.png"),
    fullPage: true,
  });
});

test('mobile full hand shows every card and supports reordering across rows', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile layout');
  await page.goto('/');
  await page.getByRole('button', { name: 'Essayer la main guidée' }).click();
  await page.getByRole('button', { name: 'Piocher une carte', exact: true }).click();
  await page.getByRole('button', { name: 'Voir toute la main' }).click();
  const hand = page.locator('.hand-cards');
  await expect(hand.locator('button')).toHaveCount(14);
  expect(await hand.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  const cards = await hand.locator('button').evaluateAll(elements => elements.map(el => {
    const rect = el.getBoundingClientRect();
    return { id: el.getAttribute('data-card-id')!, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }));
  expect(new Set(cards.map(card => Math.round(card.y))).size).toBe(3);
  for (const card of cards) {
    expect(card.x).toBeGreaterThanOrEqual(0);
    expect(card.x + card.width).toBeLessThanOrEqual(390);
  }
  await hand.scrollIntoViewIfNeeded();
  const target = (await hand.locator('button').nth(6).boundingBox())!;
  await dragCard(page, cards[0].id, { x: target.x + 5, y: target.y + target.height / 2 }, true);
  await expect(hand.locator('button').nth(5)).toHaveAttribute('data-card-id', cards[0].id);
  await hand.locator('button').nth(5).click();
  await expect(hand.locator('button').nth(5)).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Réorganiser les cartes', exact: true }).click();
  const movedId = await hand.locator('button').nth(10).getAttribute('data-card-id');
  await hand.locator('button').nth(10).click();
  await hand.locator('button').first().click();
  await expect(hand.locator('button').first()).toHaveAttribute('data-card-id', movedId!);
  await expect(hand.locator('[aria-pressed="true"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Terminer le rangement' }).click();
  await page.getByRole('button', { name: 'Vue normale' }).click();
  await expect(page.getByRole('button', { name: 'Voir toute la main' })).toBeVisible();
  await expect(hand).not.toHaveClass(/hand-cards-all/);
});

test('mobile upward swipe discards without a long press while a horizontal swipe only scrolls', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Touch-only gesture');
  await page.goto('/');
  await page.getByRole('button', { name: 'Essayer la main guidée' }).click();
  await page.getByRole('button', { name: 'Piocher une carte', exact: true }).click();
  const hand = page.locator('.hand-cards');
  await hand.scrollIntoViewIfNeeded();
  const session = await page.context().newCDPSession(page);
  const card = hand.locator('[data-card-id="0-hearts-5"]');
  const rect = (await card.boundingBox())!;
  const start = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, id: 0 };
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...start, x: start.x + 40 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(hand.locator('button')).toHaveCount(14);
  await expect(page.locator('.drag-preview')).toHaveCount(0);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...start, y: start.y - 30 }] });
  await expect(page.locator('.mobile-discard-target')).toBeVisible();
  const target = (await page.locator('.mobile-discard-target').boundingBox())!;
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: target.x + target.width / 2, y: target.y + target.height / 2, id: 0 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(card).toHaveCount(0);
  await expect(hand.locator('button')).toHaveCount(13);
  await expect(page.locator('.mobile-discard-target')).toHaveCount(0);
  await session.detach();
});
