/** Seat order stays stable; play moves toward the preceding seat. */
export const nextPlayerIndex = (index: number, count: number) =>
  (index - 1 + count) % count;

export const previousPlayerIndex = (index: number, count: number) =>
  (index + 1) % count;
