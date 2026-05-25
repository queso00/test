import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import type { BlockType } from '@/constants/blocks';
import { getLevelFromXp, getLevelReward, MAX_LEVEL, xpForRun } from '@/constants/progression';

const STORAGE_KEY = 'boat_game_v2';

export interface SavedDesign {
  id: string;
  name: string;
  grid: (BlockType | null)[][];
  createdAt: number;
}

interface GameState {
  coins: number;
  totalXp: number;
  unlockedBlocks: BlockType[];
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
  updateBestDistance: (distance: number) => void;
  saveDesign: (name: string, grid: (BlockType | null)[][]) => void;
  deleteDesign: (id: string) => void;
  finishRun: (distance: number, survivingBlocks: number) => { coinsEarned: number; xpEarned: number; leveledUp: boolean; newLevel: number; levelReward: string };
}

const DEFAULT_STATE: GameState = {
  coins: 150,
  totalXp: 0,
  unlockedBlocks: ['wood'],
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
        return {
          ...prev,
          coins: prev.coins - cost,
          unlockedBlocks: [...prev.unlockedBlocks, type],
        };
      }
      return prev;
    });
    return success;
  }, []);

  const updateBestDistance = useCallback((distance: number) => {
    setState((prev) => ({
      ...prev,
      bestDistance: Math.max(prev.bestDistance, Math.floor(distance)),
    }));
  }, []);

  const saveDesign = useCallback((name: string, grid: (BlockType | null)[][]) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setState((prev) => ({
      ...prev,
      savedDesigns: [
        { id, name, grid, createdAt: Date.now() },
        ...prev.savedDesigns,
      ].slice(0, 15),
    }));
  }, []);

  const deleteDesign = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      savedDesigns: prev.savedDesigns.filter((d) => d.id !== id),
    }));
  }, []);

  const finishRun = useCallback(
    (distance: number, survivingBlocks: number) => {
      const coinsEarned = Math.floor(distance / 6);
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
          return {
            ...prev,
            coins: prev.coins + coinsEarned + (reward.coins ?? 0),
            totalXp: newXp,
            totalRuns: prev.totalRuns + 1,
            bestDistance: Math.max(prev.bestDistance, Math.floor(distance)),
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
