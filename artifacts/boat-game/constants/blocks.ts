export type BlockType =
  | 'wood'
  | 'reinforced_wood'
  | 'metal'
  | 'titanium'
  | 'glass'
  | 'balloon'
  | 'shield';

export interface BlockDef {
  type: BlockType;
  name: string;
  hp: number;
  color: string;
  darkColor: string;
  borderColor: string;
  unlockCost: number;
  description: string;
}

export const BLOCK_DEFS: Record<BlockType, BlockDef> = {
  wood: {
    type: 'wood',
    name: 'Wood',
    hp: 3,
    color: '#D97706',
    darkColor: '#92400E',
    borderColor: '#F59E0B',
    unlockCost: 0,
    description: 'Basic building block. Free to use.',
  },
  reinforced_wood: {
    type: 'reinforced_wood',
    name: 'Reinforced',
    hp: 6,
    color: '#B45309',
    darkColor: '#78350F',
    borderColor: '#D97706',
    unlockCost: 100,
    description: 'Stronger wood with metal reinforcement.',
  },
  metal: {
    type: 'metal',
    name: 'Metal',
    hp: 12,
    color: '#6B7280',
    darkColor: '#374151',
    borderColor: '#9CA3AF',
    unlockCost: 300,
    description: 'Heavy steel plating, very durable.',
  },
  titanium: {
    type: 'titanium',
    name: 'Titanium',
    hp: 24,
    color: '#8B5CF6',
    darkColor: '#5B21B6',
    borderColor: '#A78BFA',
    unlockCost: 1000,
    description: 'The strongest material. Nearly unbreakable.',
  },
  glass: {
    type: 'glass',
    name: 'Glass',
    hp: 1,
    color: '#BAE6FD',
    darkColor: '#0EA5E9',
    borderColor: '#E0F2FE',
    unlockCost: 150,
    description: 'Fragile but beautiful. Be careful!',
  },
  balloon: {
    type: 'balloon',
    name: 'Balloon',
    hp: 2,
    color: '#FDE68A',
    darkColor: '#F59E0B',
    borderColor: '#FEF08A',
    unlockCost: 200,
    description: 'Floats! Bounces obstacles away.',
  },
  shield: {
    type: 'shield',
    name: 'Shield',
    hp: 15,
    color: '#34D399',
    darkColor: '#059669',
    borderColor: '#6EE7B7',
    unlockCost: 500,
    description: 'Energy shield absorbs massive hits.',
  },
};

export const ALL_BLOCK_TYPES: BlockType[] = [
  'wood',
  'reinforced_wood',
  'metal',
  'titanium',
  'glass',
  'balloon',
  'shield',
];

export const GRID_ROWS = 4;
export const GRID_COLS = 6;
