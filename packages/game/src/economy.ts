export const INITIAL_CREDITS = 10_000;
export const MAX_STAKE = 100_000;
export const isValidStake = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_STAKE;
export const formatAriary = (amount: number) => `${amount.toLocaleString('fr-FR')} Ar`;
export function roundPrizes(count: number, stake: number, carryover = 0, finishCarryover = 0) {
  return { exposurePrize: stake * 2 + carryover, finishPrize: stake * (count - 2) + finishCarryover };
}
/** Unclaimed prizes carry independently, including when the round is drawn. */
export function settlePot(playerIds: string[], stake: number, winnerId?: string, exposureWinnerId?: string, carryover = 0, finishCarryover = 0, jackpotWinnerId?: string) {
  const prizes = roundPrizes(playerIds.length, stake, carryover, finishCarryover);
  if (jackpotWinnerId) return { payments: [{ playerId: jackpotWinnerId, amount: prizes.exposurePrize + prizes.finishPrize }], carryover: 0, finishCarryover: 0 };
  return {
    payments: [
      ...(exposureWinnerId ? [{ playerId: exposureWinnerId, amount: prizes.exposurePrize }] : []),
      ...(winnerId ? [{ playerId: winnerId, amount: prizes.finishPrize }] : []),
    ],
    carryover: exposureWinnerId ? 0 : prizes.exposurePrize,
    finishCarryover: winnerId ? 0 : prizes.finishPrize,
  };
}
