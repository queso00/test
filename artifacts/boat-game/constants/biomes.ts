export interface BiomeDef {
  id: string;
  name: string;
  subtitle: string;
  emoji: string;
  startDistance: number;
  bgColors: [string, string, string];
  bankColor: string;
  waterColor: string;
  fogColor?: string;
  fogOpacity?: number;
  obstacleTypes: string[];
  obstacleSpeedMult: number;
  spawnRateMult: number;
  mapColor: string;
  hazardDesc: string;
}

export const BIOMES: BiomeDef[] = [
  {
    id: 'tropical',
    name: 'Tropical Sea',
    subtitle: 'Beginner Waters — calm winds and gentle tides',
    emoji: '🌴',
    startDistance: 0,
    bgColors: ['#071C3F', '#0B2D6B', '#071C3F'],
    bankColor: '#166534',
    waterColor: '#1E40AF',
    obstacleTypes: ['rock', 'log', 'debris'],
    obstacleSpeedMult: 1.0,
    spawnRateMult: 0.65,
    mapColor: '#22D3EE',
    hazardDesc: 'Rocks and drifting logs',
  },
  {
    id: 'swamp',
    name: 'Swamp Waters',
    subtitle: 'Foggy & Treacherous — watch for crocs',
    emoji: '🐊',
    startDistance: 900,
    bgColors: ['#1A2E0A', '#2D4A10', '#0F1D06'],
    bankColor: '#365314',
    waterColor: '#3F6212',
    fogColor: '#86EFAC',
    fogOpacity: 0.07,
    obstacleTypes: ['log', 'debris', 'crocodile', 'toxicPool'],
    obstacleSpeedMult: 1.1,
    spawnRateMult: 0.85,
    mapColor: '#4ADE80',
    hazardDesc: 'Crocs, toxic pools & mud',
  },
  {
    id: 'frozen',
    name: 'Frozen Ocean',
    subtitle: 'Ice & Blizzards — the cold that kills',
    emoji: '🧊',
    startDistance: 2000,
    bgColors: ['#0C2340', '#0E3A5C', '#071526'],
    bankColor: '#C7D2FE',
    waterColor: '#1E3A5F',
    fogColor: '#BFDBFE',
    fogOpacity: 0.06,
    obstacleTypes: ['iceberg', 'iceSpike', 'frozenSkull', 'snowStorm'],
    obstacleSpeedMult: 1.2,
    spawnRateMult: 1.05,
    mapColor: '#93C5FD',
    hazardDesc: 'Icebergs & blizzard spikes',
  },
  {
    id: 'lava',
    name: 'Lava Sea',
    subtitle: 'Volcanic Inferno — fire everywhere',
    emoji: '🌋',
    startDistance: 3500,
    bgColors: ['#2D0A00', '#5C1A00', '#1A0600'],
    bankColor: '#7C2D12',
    waterColor: '#9A3412',
    fogColor: '#FCA5A5',
    fogOpacity: 0.07,
    obstacleTypes: ['lavaRock', 'fireGeyser', 'burningDebris', 'lavaBurst'],
    obstacleSpeedMult: 1.35,
    spawnRateMult: 1.25,
    mapColor: '#F97316',
    hazardDesc: 'Lava geysers & burning rock',
  },
  {
    id: 'storm',
    name: 'Storm Ocean',
    subtitle: 'Chaos & Lightning — no shelter here',
    emoji: '⛈️',
    startDistance: 5500,
    bgColors: ['#0F0F1A', '#1A1A2E', '#070710'],
    bankColor: '#1E1B4B',
    waterColor: '#1E1B3A',
    fogColor: '#818CF8',
    fogOpacity: 0.09,
    obstacleTypes: ['lightning', 'whirlpool', 'tornado', 'ghostShip', 'wave'],
    obstacleSpeedMult: 1.6,
    spawnRateMult: 1.5,
    mapColor: '#818CF8',
    hazardDesc: 'Lightning, tornadoes & ghost ships',
  },
  {
    id: 'abyss',
    name: "Kraken's Domain",
    subtitle: 'The Final Horror — survive to claim treasure',
    emoji: '🦑',
    startDistance: 8000,
    bgColors: ['#000000', '#060B10', '#000000'],
    bankColor: '#042F2E',
    waterColor: '#022C22',
    fogColor: '#34D399',
    fogOpacity: 0.1,
    obstacleTypes: ['tentacle', 'seamonster', 'cursedRock', 'darkWave', 'krakenEye'],
    obstacleSpeedMult: 1.9,
    spawnRateMult: 1.85,
    mapColor: '#34D399',
    hazardDesc: 'Tentacles & sea monsters',
  },
];

export function getBiomeForDistance(distance: number): BiomeDef {
  for (let i = BIOMES.length - 1; i >= 0; i--) {
    if (distance >= BIOMES[i].startDistance) return BIOMES[i];
  }
  return BIOMES[0];
}

export function getBiomeProgress(distance: number): number {
  const biome = getBiomeForDistance(distance);
  const idx = BIOMES.findIndex((b) => b.id === biome.id);
  const nextBiome = BIOMES[idx + 1];
  if (!nextBiome) return 1;
  const range = nextBiome.startDistance - biome.startDistance;
  return Math.min(1, (distance - biome.startDistance) / range);
}
