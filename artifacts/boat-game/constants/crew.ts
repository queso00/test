export type CrewRole = 'navigator' | 'engineer' | 'gunner' | 'merchant' | 'captain';

export interface CrewDef {
  role: CrewRole;
  name: string;
  emoji: string;
  description: string;
  bonus: string;
  bonusDetail: string;
  cost: number;
  levelRequired: number;
  color: string;
}

export const CREW_DEFS: Record<CrewRole, CrewDef> = {
  navigator: {
    role: 'navigator',
    name: 'Navigator',
    emoji: '🧭',
    description: 'Expert helmsman with years at sea.',
    bonus: '+60% steering speed',
    bonusDetail: 'Your ship steers faster left & right during runs.',
    cost: 450,
    levelRequired: 3,
    color: '#22D3EE',
  },
  engineer: {
    role: 'engineer',
    name: 'Engineer',
    emoji: '🔧',
    description: 'Keeps the hull patched while sailing.',
    bonus: 'Repairs 3 HP every 5s',
    bonusDetail: 'Slowly repairs your most damaged blocks mid-run.',
    cost: 700,
    levelRequired: 5,
    color: '#22C55E',
  },
  gunner: {
    role: 'gunner',
    name: 'Gunner',
    emoji: '💣',
    description: 'Blasts obstacles before they hit.',
    bonus: '30% obstacle deflect',
    bonusDetail: '30% chance to deflect an obstacle without taking damage.',
    cost: 900,
    levelRequired: 8,
    color: '#F97316',
  },
  merchant: {
    role: 'merchant',
    name: 'Merchant',
    emoji: '💰',
    description: 'Haggles for better treasure splits.',
    bonus: '+60% coin rewards',
    bonusDetail: 'All coins earned after runs are multiplied by 1.6.',
    cost: 1200,
    levelRequired: 6,
    color: '#F59E0B',
  },
  captain: {
    role: 'captain',
    name: 'Captain',
    emoji: '👑',
    description: 'Commands with authority and courage.',
    bonus: '+15% speed & +15% block HP',
    bonusDetail: 'All blocks start with 15% more HP. Boat moves 15% faster.',
    cost: 2000,
    levelRequired: 12,
    color: '#A78BFA',
  },
};

export const ALL_CREW_ROLES: CrewRole[] = ['navigator', 'engineer', 'gunner', 'merchant', 'captain'];
