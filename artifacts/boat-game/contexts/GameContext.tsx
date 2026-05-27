import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import type { BlockType } from '@/constants/blocks';
import type { CrewRole } from '@/constants/crew';
import { getLevelFromXp, getLevelReward, MAX_LEVEL, xpForRun } from '@/constants/progression';

const STORAGE_KEY = 'boat_game_v4';

export interface SavedDesign {
  id: string;
  name: string;
  grid: (BlockType | null)[][];
  createdAt: number;
}

export type BlockInventory = Partial<Record<BlockType, number>>;

interface GameState {
  coins: number;
  totalXp: number;
  unlockedBlocks: BlockType[];
  blockInventory: BlockInventory;
  ownedCrew: CrewRole[];
  bestDistance: number;
  savedDesigns: SavedDesign[];
  totalRuns: number;
}

interface GameContextValue extends GameState {
  playerLevel: number;
  xpInLevel: number;
  xpNeeded: number;
  addCoins: (amount: number) => void;
  unlockBlock: (type: BlockType, cost: number) => boolean;
  placeBlock: (type: BlockType) => boolean;
  returnBlock: (type: BlockType) => void;
  buyBlockPack: (type: BlockType, qty: number, cost: number) => boolean;
  hireCrew: (role: CrewRole, cost: number) => boolean;
  updateBestDistance: (distance: number) => void;
  saveDesign: (name: string, grid: (BlockType | null)[][]) => void;
  deleteDesign: (id: string) => void;
  finishRun: (
    distance: number,
    survivingBlocks: number,
    hasMerchant: boolean
  ) => { coinsEarned: number; xpEarned: number; leveledUp: boolean; newLevel: number; levelReward: string };
}

const DEFAULT_STATE: GameState = {
  coins: 200,
  totalXp: 0,
  unlockedBlocks: ['wood'],
  blockInventory: { wood: 20 },
  ownedCrew: [],
  bestDistance: 0,
  savedDesigns: [],
  totalRuns: 0,
};

const GameContext = createContext<GameContextValue | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<GameState>;
          setState((prev) => ({ ...prev, ...parsed }));
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, loaded]);

  const addCoins = useCallback((amount: number) => {
    setState((prev) => ({ ...prev, coins: prev.coins + amount }));
  }, []);

  const unlockBlock = useCallback((type: BlockType, cost: number): boolean => {
    let success = false;
    setState((prev) => {
      if (prev.coins >= cost && !prev.unlockedBlocks.includes(type)) {
        success = true;
        return { ...prev, coins: prev.coins - cost, unlockedBlocks: [...prev.unlockedBlocks, type] };
      }
      return prev;
    });
    return success;
  }, []);

  const placeBlock = useCallback((type: BlockType): boolean => {
    let success = false;
    setState((prev) => {
      const current = prev.blockInventory[type] ?? 0;
      if (current > 0) {
        success = true;
        return { ...prev, blockInventory: { ...prev.blockInventory, [type]: current - 1 } };
      }
      return prev;
    });
    return success;
  }, []);

  const returnBlock = useCallback((type: BlockType) => {
    setState((prev) => ({
      ...prev,
      blockInventory: { ...prev.blockInventory, [type]: (prev.blockInventory[type] ?? 0) + 1 },
    }));
  }, []);

  const buyBlockPack = useCallback((type: BlockType, qty: number, cost: number): boolean => {
    let success = false;
    setState((prev) => {
      if (prev.coins >= cost) {
        success = true;
        return {
          ...prev,
          coins: prev.coins - cost,
          blockInventory: { ...prev.blockInventory, [type]: (prev.blockInventory[type] ?? 0) + qty },
        };
      }
      return prev;
    });
    return success;
  }, []);

  const hireCrew = useCallback((role: CrewRole, cost: number): boolean => {
    let success = false;
    setState((prev) => {
      if (prev.coins >= cost && !prev.ownedCrew.includes(role)) {
        success = true;
        return { ...prev, coins: prev.coins - cost, ownedCrew: [...prev.ownedCrew, role] };
      }
      return prev;
    });
    return success;
  }, []);

  const updateBestDistance = useCallback((distance: number) => {
    setState((prev) => ({ ...prev, bestDistance: Math.max(prev.bestDistance, Math.floor(distance)) }));
  }, []);

  const saveDesign = useCallback((name: string, grid: (BlockType | null)[][]) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setState((prev) => ({
      ...prev,
      savedDesigns: [{ id, name, grid, createdAt: Date.now() }, ...prev.savedDesigns].slice(0, 15),
    }));
  }, []);

  const deleteDesign = useCallback((id: string) => {
    setState((prev) => ({ ...prev, savedDesigns: prev.savedDesigns.filter((d) => d.id !== id) }));
  }, []);

  const finishRun = useCallback(
    (distance: number, survivingBlocks: number, hasMerchant: boolean) => {
      const baseCoinRate = hasMerchant ? 1.6 : 1.0;
      const coinsEarned = Math.floor((distance / 6) * baseCoinRate);
      const xpEarned = xpForRun(distance, survivingBlocks);
      let leveledUp = false;
      let newLevel = 1;
      let levelReward = '';

      setState((prev) => {
        const oldLvl = getLevelFromXp(prev.totalXp).level;
        const newXp = prev.totalXp + xpEarned;
        const { level } = getLevelFromXp(newXp);
        if (level > oldLvl && level <= MAX_LEVEL) {
          leveledUp = true;
          newLevel = level;
          const reward = getLevelReward(level);
          levelReward = reward.message;
          const bonusWood = Math.floor(level / 2) + 5;
          return {
            ...prev,
            coins: prev.coins + coinsEarned + (reward.coins ?? 0),
            totalXp: newXp,
            totalRuns: prev.totalRuns + 1,
            bestDistance: Math.max(prev.bestDistance, Math.floor(distance)),
            blockInventory: { ...prev.blockInventory, wood: (prev.blockInventory.wood ?? 0) + bonusWood },
          };
        }
        return {
          ...prev,
          coins: prev.coins + coinsEarned,
          totalXp: newXp,
          totalRuns: prev.totalRuns + 1,
          bestDistance: Math.max(prev.bestDistance, Math.floor(distance)),
        };
      });

      return { coinsEarned, xpEarned, leveledUp, newLevel, levelReward };
    },
    []
  );

  if (!loaded) return null;

  const { level, xpInLevel, xpNeeded } = getLevelFromXp(state.totalXp);

  return (
    <GameContext.Provider
      value={{
        ...state,
        playerLevel: level,
        xpInLevel,
        xpNeeded,
        addCoins,
        unlockBlock,
        placeBlock,
        returnBlock,
        buyBlockPack,
        hireCrew,
        updateBestDistance,
        saveDesign,
        deleteDesign,
        finishRun,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
