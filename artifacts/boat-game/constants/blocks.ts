export type BlockRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type BlockType =
  | 'wood'
  | 'reinforced_wood'
  | 'glass'
  | 'balloon'
  | 'metal'
  | 'shield'
  | 'titanium'
  | 'cannon'
  | 'anchor'
  | 'sail'
  | 'obsidian'
  | 'ice'
  | 'lava_stone'
  | 'kraken_shell'
  | 'dragon_scale';

export interface BlockDef {
  name: string;
  description: string;
  color: string;
  borderColor: string;
  darkColor: string;
  hp: number;
  unlockCost: number;
  rarity: BlockRarity;
  levelRequired: number;
  weight: number;
  special?: string;
}

export const BLOCK_DEFS: Record<BlockType, BlockDef> = {
  wood: {
    name: 'Wood',
    description: 'Basic planks. Cheap and cheerful.',
    color: '#D97706',
    borderColor: '#F59E0B',
    darkColor: '#92400E',
    hp: 18,
    unlockCost: 0,
    rarity: 'common',
    levelRequired: 1,
    weight: 1,
  },
  reinforced_wood: {
    name: 'Oak Plank',
    description: 'Dense oak, much sturdier.',
    color: '#B45309',
    borderColor: '#D97706',
    darkColor: '#78350F',
    hp: 35,
    unlockCost: 100,
    rarity: 'common',
    levelRequired: 2,
    weight: 1.5,
  },
  glass: {
    name: 'Glass',
    description: 'Light but shatters on impact.',
    color: '#7DD3FC',
    borderColor: '#BAE6FD',
    darkColor: '#0284C7',
    hp: 10,
    unlockCost: 150,
    rarity: 'common',
    levelRequired: 3,
    weight: 0.5,
    special: 'Ultra light',
  },
  balloon: {
    name: 'Balloon',
    description: 'Keeps the boat afloat longer.',
    color: '#EC4899',
    borderColor: '#F9A8D4',
    darkColor: '#BE185D',
    hp: 12,
    unlockCost: 200,
    rarity: 'common',
    levelRequired: 4,
    weight: 0.2,
    special: 'Extreme buoyancy',
  },
  metal: {
    name: 'Iron Plate',
    description: 'Heavy but takes a beating.',
    color: '#6B7280',
    borderColor: '#9CA3AF',
    darkColor: '#374151',
    hp: 50,
    unlockCost: 300,
    rarity: 'rare',
    levelRequired: 5,
    weight: 3,
  },
  shield: {
    name: 'Shield Wall',
    description: 'Absorbs massive impacts.',
    color: '#3B82F6',
    borderColor: '#93C5FD',
    darkColor: '#1D4ED8',
    hp: 70,
    unlockCost: 500,
    rarity: 'rare',
    levelRequired: 8,
    weight: 2,
    special: 'Double absorb',
  },
  titanium: {
    name: 'Titanium',
    description: 'Nigh-indestructible alloy.',
    color: '#A78BFA',
    borderColor: '#C4B5FD',
    darkColor: '#6D28D9',
    hp: 110,
    unlockCost: 1000,
    rarity: 'epic',
    levelRequired: 12,
    weight: 2.5,
  },
  cannon: {
    name: 'Cannon',
    description: 'Blasts incoming obstacles.',
    color: '#374151',
    borderColor: '#6B7280',
    darkColor: '#111827',
    hp: 40,
    unlockCost: 750,
    rarity: 'rare',
    levelRequired: 10,
    weight: 4,
    special: 'Destroys obstacles',
  },
  anchor: {
    name: 'Anchor',
    description: 'Stabilizes the boat.',
    color: '#475569',
    borderColor: '#94A3B8',
    darkColor: '#1E293B',
    hp: 65,
    unlockCost: 400,
    rarity: 'rare',
    levelRequired: 7,
    weight: 5,
    special: 'Reduces impact',
  },
  sail: {
    name: 'Sail',
    description: 'Harness the wind for speed.',
    color: '#FEF3C7',
    borderColor: '#FDE68A',
    darkColor: '#D97706',
    hp: 22,
    unlockCost: 600,
    rarity: 'rare',
    levelRequired: 9,
    weight: 0.5,
    special: '+25% speed',
  },
  obsidian: {
    name: 'Obsidian',
    description: 'Volcanic glass. Epic durability.',
    color: '#312E81',
    borderColor: '#6366F1',
    darkColor: '#1E1B4B',
    hp: 150,
    unlockCost: 2000,
    rarity: 'epic',
    levelRequired: 18,
    weight: 3,
  },
  ice: {
    name: 'Ice Block',
    description: 'Reflects projectiles.',
    color: '#BAE6FD',
    borderColor: '#E0F2FE',
    darkColor: '#0284C7',
    hp: 45,
    unlockCost: 800,
    rarity: 'epic',
    levelRequired: 15,
    weight: 1.5,
    special: 'Reflects shots',
  },
  lava_stone: {
    name: 'Lava Stone',
    description: 'Forged in volcanoes. Ignores fire.',
    color: '#DC2626',
    borderColor: '#FCA5A5',
    darkColor: '#991B1B',
    hp: 120,
    unlockCost: 2500,
    rarity: 'epic',
    levelRequired: 22,
    weight: 4,
    special: 'Fire immune',
  },
  kraken_shell: {
    name: 'Kraken Shell',
    description: 'Torn from the deep beast itself.',
    color: '#065F46',
    borderColor: '#34D399',
    darkColor: '#022C22',
    hp: 200,
    unlockCost: 5000,
    rarity: 'legendary',
    levelRequired: 30,
    weight: 2,
    special: 'Kraken repellent',
  },
  dragon_scale: {
    name: 'Dragon Scale',
    description: 'Mythic. Immune to fire and ice.',
    color: '#7C3AED',
    borderColor: '#A78BFA',
    darkColor: '#4C1D95',
    hp: 320,
    unlockCost: 10000,
    rarity: 'legendary',
    levelRequired: 40,
    weight: 1.5,
    special: 'Fire & ice immune',
  },
};

export const ALL_BLOCK_TYPES: BlockType[] = [
  'wood',
  'reinforced_wood',
  'glass',
  'balloon',
  'metal',
  'anchor',
  'shield',
  'cannon',
  'sail',
  'titanium',
  'ice',
  'obsidian',
  'lava_stone',
  'kraken_shell',
  'dragon_scale',
];

export const RARITY_COLORS: Record<BlockRarity, string> = {
  common: '#94A3B8',
  rare: '#60A5FA',
  epic: '#A78BFA',
  legendary: '#F59E0B',
};

export const RARITY_BG: Record<BlockRarity, string> = {
  common: '#1E293B',
  rare: '#1E2D47',
  epic: '#1E1B3A',
  legendary: '#2A1F0A',
};

export const RARITY_LABELS: Record<BlockRarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export const GRID_ROWS = 8;
export const GRID_COLS = 10;
