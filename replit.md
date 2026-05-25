# Build A Boat For Treasure

A mobile game where players build a customizable boat using blocks and materials, then launch it down a dangerous obstacle-filled river to earn coins and survive as long as possible.

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
  - `app/(tabs)/index.tsx` — Main menu
  - `app/build.tsx` — Boat builder screen
  - `app/game.tsx` — Sailing/game screen
  - `app/shop.tsx` — Materials shop
  - `app/garage.tsx` — Saved boat designs
  - `constants/blocks.ts` — Block type definitions (HP, colors, costs)
  - `constants/colors.ts` — Dark ocean theme palette
  - `contexts/GameContext.tsx` — Game state (coins, unlocks, saved designs)
- `artifacts/api-server/` — Express API server (health check only)

## Architecture decisions

- Frontend-only for all game logic — no backend needed. AsyncStorage handles all persistence.
- 2D top-down river view: simpler than 3D, works perfectly on mobile, still fun
- Game loop via `setInterval` + React refs to avoid stale closures, with `setTick` for re-renders
- Block HP displayed as colored bottom bar (green → yellow → red)
- Obstacles stored in refs and rendered as absolutely-positioned Views

## Product

- Players place blocks (wood, metal, titanium, etc.) on a 6x4 grid to build their boat
- Launch the boat down a scrolling river with obstacles (rocks, logs, spikes, cannonballs)
- Earn coins per distance survived — spend in the shop to unlock stronger materials
- Save up to 10 boat designs in the Garage for quick reuse

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Game loop uses refs for mutable state and only syncs to React state via `setTick` to avoid stale closures
- `useNativeDriver` falls back to JS on web (Expo web limitation) — animations work fine on device
- Shadow props show deprecation warnings on web — acceptable for a mobile-targeted game

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `expo` skill for Expo-specific patterns and pitfalls
