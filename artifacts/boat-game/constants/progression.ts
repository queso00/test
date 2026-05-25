export const MAX_LEVEL = 50;

export function xpForLevel(level: number): number {
  return Math.floor(level * 400 + level * level * 20);
}

export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) total += xpForLevel(i);
  return total;
}

export function getLevelFromXp(totalXp: number): { level: number; xpInLevel: number; xpNeeded: number } {
  let level = 1;
  let remaining = totalXp;
  while (level < MAX_LEVEL) {
    const needed = xpForLevel(level);
    if (remaining < needed) break;
    remaining -= needed;
    level++;
  }
  return { level, xpInLevel: remaining, xpNeeded: xpForLevel(level) };
}

export interface LevelReward {
  coins?: number;
  message: string;
}

export function getLevelReward(level: number): LevelReward {
  if (level % 10 === 0) return { coins: level * 200, message: `MILESTONE! Level ${level}` };
  if (level % 5 === 0) return { coins: level * 80, message: `Level ${level} reached!` };
  return { coins: level * 30, message: `Level ${level} reached!` };
}

export function xpForRun(distanceM: number, survivingBlocks: number): number {
  const distXp = Math.floor(distanceM / 3);
  const blockXp = survivingBlocks * 5;
  return distXp + blockXp;
}
