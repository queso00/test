# Pirate Seas: Build A Boat For Treasure

A mobile pirate adventure game where players construct ships from blocks (15 material types across 4 rarities) and sail through 6 progressively harder ocean biomes to claim treasure.

## Run & Operate

- `pnpm --filter @workspace/boat-game run dev` — run the Expo mobile app
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo 54, React Native, Expo Router
- Persistence: AsyncStorage (no backend DB needed)
- Animations: Animated API (React Native), expo-linear-gradient
- State: React Context + AsyncStorage

## Where things live

- `artifacts/boat-game/` — Expo mobile game
  - `app/(tabs)/index.tsx` — Main menu with level/XP bar
  - `app/build.tsx` — Ship builder (8×10 scrollable grid)
  - `app/game.tsx` — Sailing game with biomes, treasure map, XP
  - `app/shop.tsx` — Material shop with rarity tabs
  - `app/garage.tsx` — Saved ship designs
  - `constants/blocks.ts` — 15 block types, rarities, level requirements
  - `constants/biomes.ts` — 6 biome definitions (Tropical → Kraken's Domain)
  - `constants/progression.ts` — XP/level formulas (level 1–50)
  - `contexts/GameContext.tsx` — Game state (coins, XP, level, unlocks, designs)
- `artifacts/api-server/` — Express API server (health check only)

## Architecture decisions

- Frontend-only for all game logic — no backend needed. AsyncStorage handles all persistence.
- 2D top-down river view: simpler than 3D, works perfectly on mobile
- Ship builder grid: 8×10 with fixed 44px block size, scrollable in both axes
- Game loop via `setInterval` + React refs to avoid stale closures, `setTick` for re-renders
- Block HP displayed as colored bottom bar (green → yellow → red)
- Obstacles stored in refs and rendered as absolutely-positioned Views
- Biome system: distance-based transitions (0 → 350 → 750 → 1300 → 2000 → 2800m)

## Product Features

- **Ship Builder**: 8×10 scrollable grid, 15 material types, tap/hold gestures
- **6 Biomes**: Tropical Sea → Swamp Waters → Frozen Ocean → Lava Sea → Storm Ocean → Kraken's Domain
- **Biome obstacles**: 24 unique obstacle types themed per biome (crocs, icebergs, lava bursts, tentacles...)
- **Progression**: Player level 1–50, XP from distance + surviving blocks, level-up modal with rewards
- **Material rarities**: Common / Rare / Epic / Legendary with level unlock requirements
- **Treasure Map**: Parchment-style pirate map showing biome progress, toggled in-game
- **Shop**: Tabbed by rarity, shows level requirements and special properties
- **Garage**: Save up to 15 ship designs with mini preview, reload into builder

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Game loop uses refs for mutable state and only syncs to React state via `setTick` to avoid stale closures
- `useNativeDriver` falls back to JS on web (Expo web limitation) — animations work fine on device
- Shadow props show deprecation warnings on web — acceptable for a mobile-targeted game
- Biome transition overlay uses its own Animated.Value (not game loop), safe to trigger via state
- XP and level are derived from `totalXp` in GameContext using `getLevelFromXp()` — never stored separately

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `expo` skill for Expo-specific patterns and pitfalls
