import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
// Original, self-contained classic card artwork; no third-party image dependency.
const output = fileURLToPath(new URL("../public/cards/", import.meta.url));
mkdirSync(output, { recursive: true });
const paths = {
  hearts:
    "M0 10 C-4 5 -13 0 -13 -7 C-13 -17 -2 -18 0 -10 C2 -18 13 -17 13 -7 C13 0 4 5 0 10Z",
  diamonds: "M0 -17 L12 -3 L0 12 L-12 -3Z",
  spades:
    "M0 -18 C-4 -12 -14 -6 -14 1 C-14 10 -4 12 -1 5 L-4 15 L4 15 L1 5 C4 12 14 10 14 1 C14 -6 4 -12 0 -18Z",
  clubs:
    "M-3 2 C-18 13 -20 -8 -7 -6 C-18 -22 18 -22 7 -6 C20 -8 18 13 3 2 L5 15 L-5 15Z",
};
const patterns = {
  1: [[50, 74]],
  2: [
    [50, 40],
    [50, 108],
  ],
  3: [
    [50, 36],
    [50, 72],
    [50, 108],
  ],
  4: [
    [32, 38],
    [68, 38],
    [32, 106],
    [68, 106],
  ],
  5: [
    [32, 38],
    [68, 38],
    [50, 72],
    [32, 106],
    [68, 106],
  ],
  6: [
    [32, 36],
    [68, 36],
    [32, 72],
    [68, 72],
    [32, 108],
    [68, 108],
  ],
  7: [
    [32, 36],
    [68, 36],
    [50, 54],
    [32, 72],
    [68, 72],
    [32, 108],
    [68, 108],
  ],
  8: [
    [32, 34],
    [68, 34],
    [50, 52],
    [32, 72],
    [68, 72],
    [50, 92],
    [32, 110],
    [68, 110],
  ],
  9: [
    [32, 30],
    [68, 30],
    [32, 58],
    [68, 58],
    [50, 72],
    [32, 86],
    [68, 86],
    [32, 114],
    [68, 114],
  ],
  10: [
    [32, 30],
    [68, 30],
    [50, 44],
    [32, 58],
    [68, 58],
    [32, 86],
    [68, 86],
    [50, 100],
    [32, 114],
    [68, 114],
  ],
};
for (const [suit, path] of Object.entries(paths))
  for (let rank = 1; rank <= 13; rank++) {
    const color = ["hearts", "diamonds"].includes(suit) ? "#b93f40" : "#26382f";
    const label = { 1: "A", 11: "J", 12: "Q", 13: "K" }[rank] ?? rank;
    const pip = (x, y, scale = 0.52, rotate = 0) =>
      `<path d="${path}" transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})" fill="${color}"/>`;
    const corner = `<text x="12" y="20" text-anchor="middle" font-family="Georgia,serif" font-size="17" font-weight="bold" fill="${color}">${label}</text>${pip(12, 31, 0.36)}`;
    let center;
    if (rank <= 10)
      center = patterns[rank]
        .map(([x, y]) => pip(x, y, rank === 1 ? 1.15 : 0.57, y > 80 ? 180 : 0))
        .join("");
    else {
      const portrait = `<path d="M32 56 L32 43 L40 49 L50 37 L60 49 L68 43 L68 56Z" fill="#c1a262" stroke="${color}" stroke-width="1.2"/><path d="M38 59 Q50 51 62 59 L60 74 Q50 86 40 74Z" fill="#edd8b2" stroke="${color}" stroke-width="1.5"/><path d="M25 99 L34 81 L43 77 L50 87 L57 77 L66 81 L75 99Z" fill="${color}"/><path d="M36 85 L50 100 L64 85 M50 86 V104" fill="none" stroke="#d4b574" stroke-width="3"/><path d="M44 64 H46 M54 64 H56 M47 73 Q50 75 53 73" stroke="${color}" stroke-width="1.5"/>`;
      center = `<rect x="24" y="29" width="52" height="86" rx="2" fill="#f1eddf" stroke="#d7cfb6"/>${portrait}${pip(50, 108, 0.25)}`;
    }
    writeFileSync(
      `${output}/${suit}-${rank}.svg`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 144" width="100" height="144"><rect x=".7" y=".7" width="98.6" height="142.6" rx="7" fill="#fffdf7" stroke="#dfdfd5" stroke-width="1.4"/>${corner}<g transform="rotate(180 50 72)">${corner}</g>${center}</svg>`,
    );
  }
