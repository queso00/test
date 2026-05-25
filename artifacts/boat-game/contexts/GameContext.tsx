import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { BlockType } from '@/constants/blocks';

const STORAGE_KEY = 'boat_game_v1';

export interface SavedDesign {
  id: string;
  name: string;
  grid: (BlockType | null)[][];
  createdAt: number;
}

interface GameState {
  coins: number;
  unlockedBlocks: BlockType[];
  bestDistance: number;
  savedDesigns: SavedDesign[];
  totalRuns: number;
}

interface GameContextValue extends GameState {
  addCoins: (amount: number) => void;
  unlockBlock: (type: BlockType, cost: number) => boolean;
  updateBestDistance: (distance: number) => void;
  saveDesign: (name: string, grid: (BlockType | null)[][]) => void;
  deleteDesign: (id: string) => void;
  incrementRuns: () => void;
}

const DEFAULT_STATE: GameState = {
  coins: 50,
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
      ].slice(0, 10),
    }));
  }, []);

  const deleteDesign = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      savedDesigns: prev.savedDesigns.filter((d) => d.id !== id),
    }));
  }, []);

  const incrementRuns = useCallback(() => {
    setState((prev) => ({ ...prev, totalRuns: prev.totalRuns + 1 }));
  }, []);

  if (!loaded) return null;

  return (
    <GameContext.Provider
      value={{
        ...state,
        addCoins,
        unlockBlock,
        updateBestDistance,
        saveDesign,
        deleteDesign,
        incrementRuns,
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
