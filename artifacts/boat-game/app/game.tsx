import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BLOCK_DEFS, GRID_COLS, GRID_ROWS, type BlockType } from '@/constants/blocks';
import { useGame } from '@/contexts/GameContext';

const { width: SW, height: SH } = Dimensions.get('window');
const BLOCK_SIZE = Math.min(Math.floor((SW * 0.72) / GRID_COLS), 44);
const BOAT_W = GRID_COLS * BLOCK_SIZE;
const BOAT_H = GRID_ROWS * BLOCK_SIZE;
const BOAT_LEFT = (SW - BOAT_W) / 2;
const BOAT_TOP = SH * 0.5 - BOAT_H / 2;

const TICK_MS = 50;
const SPAWN_BASE = 28;

type ObstacleType = 'rock' | 'log' | 'spike' | 'cannonball';
interface Obstacle {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  type: ObstacleType;
  damage: number;
  hit: boolean;
}

interface BlockCell {
  type: BlockType;
  hp: number;
  maxHp: number;
  flashAnim: Animated.Value;
}

const OBSTACLE_CONFIGS: Record<ObstacleType, { w: number; h: number; damage: number; color: string }> = {
  rock: { w: 52, h: 48, damage: 2, color: '#78716C' },
  log: { w: 90, h: 28, damage: 1, color: '#92400E' },
  spike: { w: 36, h: 42, damage: 4, color: '#EF4444' },
  cannonball: { w: 32, h: 32, damage: 5, color: '#1F2937' },
};

const STRIPE_HEIGHT = 300;

function RiverBackground({ scrollAnim }: { scrollAnim: Animated.Value }) {
  const stripes = Array.from({ length: 8 });
  return (
    <View style={[StyleSheet.absoluteFillObject, { pointerEvents: 'none' } as any]}>
      <LinearGradient
        colors={['#071428', '#0B1E3D', '#071428']}
        style={StyleSheet.absoluteFillObject}
      />
      {[0, STRIPE_HEIGHT, STRIPE_HEIGHT * 2].map((offset, idx) => (
        <Animated.View
          key={idx}
          style={[
            StyleSheet.absoluteFillObject,
            {
              transform: [
                { translateY: Animated.add(scrollAnim, new Animated.Value(offset)) },
              ],
            },
          ]}
        >
          {stripes.map((_, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                top: i * (STRIPE_HEIGHT / stripes.length),
                left: i % 2 === 0 ? 10 : 20,
                right: i % 2 === 0 ? 20 : 10,
                height: 18 + (i % 3) * 10,
                backgroundColor: i % 5 === 0 ? '#FFFFFF' : '#3B82F6',
                opacity: i % 5 === 0 ? 0.03 : 0.04 + (i % 4) * 0.01,
                borderRadius: 9,
              }}
            />
          ))}
        </Animated.View>
      ))}
      {/* River banks */}
      <LinearGradient
        colors={['#14532D', '#166534', '#14532D']}
        style={[styles.bank, styles.bankLeft]}
      />
      <LinearGradient
        colors={['#14532D', '#166534', '#14532D']}
        style={[styles.bank, styles.bankRight]}
      />
    </View>
  );
}

function ObstacleView({ obs }: { obs: Obstacle }) {
  const cfg = OBSTACLE_CONFIGS[obs.type];
  if (obs.type === 'rock') {
    return (
      <View
        style={[
          styles.obstacle,
          {
            left: obs.x - obs.w / 2,
            top: obs.y - obs.h / 2,
            width: obs.w,
            height: obs.h,
            backgroundColor: cfg.color,
            borderRadius: obs.w / 2,
            borderWidth: 3,
            borderColor: '#A8A29E',
          },
        ]}
      />
    );
  }
  if (obs.type === 'log') {
    return (
      <View
        style={[
          styles.obstacle,
          {
            left: obs.x - obs.w / 2,
            top: obs.y - obs.h / 2,
            width: obs.w,
            height: obs.h,
            backgroundColor: cfg.color,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: '#D97706',
          },
        ]}
      />
    );
  }
  if (obs.type === 'spike') {
    return (
      <View
        style={[
          styles.obstacle,
          {
            left: obs.x - obs.w / 2,
            top: obs.y - obs.h / 2,
            width: obs.w,
            height: obs.h,
            backgroundColor: cfg.color,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: '#FCA5A5',
            transform: [{ rotate: '45deg' }],
          },
        ]}
      />
    );
  }
  // cannonball
  return (
    <View
      style={[
        styles.obstacle,
        {
          left: obs.x - obs.w / 2,
          top: obs.y - obs.h / 2,
          width: obs.w,
          height: obs.h,
          backgroundColor: cfg.color,
          borderRadius: obs.w / 2,
          borderWidth: 3,
          borderColor: '#6B7280',
        },
      ]}
    />
  );
}

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ grid: string }>();
  const { addCoins, updateBestDistance, incrementRuns } = useGame();

  const [tick, setTick] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [paused, setPaused] = useState(false);

  const blocksRef = useRef<(BlockCell | null)[][]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const distanceRef = useRef(0);
  const coinsRef = useRef(0);
  const gameSpeedRef = useRef(3);
  const spawnCounterRef = useRef(0);
  const pausedRef = useRef(false);
  const gameOverRef = useRef(false);
  const runStartedRef = useRef(false);

  const scrollAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(scrollAnim, {
        toValue: -STRIPE_HEIGHT,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    if (gameStarted && !paused && !gameOver) anim.start();
    return () => anim.stop();
  }, [gameStarted, paused, gameOver]);

  // Initialize blocks from grid param
  useEffect(() => {
    if (!params.grid) return;
    try {
      const raw: (BlockType | null)[][] = JSON.parse(params.grid);
      blocksRef.current = raw.map((row) =>
        row.map((cell) => {
          if (!cell) return null;
          const def = BLOCK_DEFS[cell];
          return {
            type: cell,
            hp: def.hp,
            maxHp: def.hp,
            flashAnim: new Animated.Value(0),
          };
        })
      );
    } catch {}
  }, []);

  const spawnObstacle = useCallback(() => {
    const types: ObstacleType[] = ['rock', 'rock', 'log', 'spike', 'cannonball'];
    const type = types[Math.floor(Math.random() * (distanceRef.current > 300 ? 5 : 3))] as ObstacleType;
    const cfg = OBSTACLE_CONFIGS[type];
    const margin = 60;
    const x = margin + Math.random() * (SW - margin * 2);
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 6);
    obstaclesRef.current.push({
      id,
      x,
      y: -60,
      w: cfg.w,
      h: cfg.h,
      speed: gameSpeedRef.current * (1 + Math.random() * 0.5),
      type,
      damage: cfg.damage,
      hit: false,
    });
  }, []);

  const checkAllDestroyed = useCallback((): boolean => {
    for (const row of blocksRef.current) {
      for (const cell of row) {
        if (cell !== null) return false;
      }
    }
    return true;
  }, []);

  const triggerGameOver = useCallback(() => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    const dist = Math.floor(distanceRef.current);
    const coins = coinsRef.current;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setGameOver(true);
    setEarnedCoins(coins);
    addCoins(coins);
    updateBestDistance(dist);
    incrementRuns();
  }, [addCoins, updateBestDistance, incrementRuns]);

  // Main game loop
  useEffect(() => {
    if (!gameStarted || gameOver) return;
    const interval = setInterval(() => {
      if (pausedRef.current) return;
      if (gameOverRef.current) return;

      distanceRef.current += gameSpeedRef.current * 0.4;
      gameSpeedRef.current = Math.min(10, 3 + distanceRef.current / 200);
      coinsRef.current = Math.floor(distanceRef.current / 8);

      // Move obstacles
      obstaclesRef.current = obstaclesRef.current.map((o) => ({
        ...o,
        y: o.y + o.speed * 1.2,
      }));

      // Remove off-screen obstacles
      obstaclesRef.current = obstaclesRef.current.filter((o) => o.y < SH + 80);

      // Spawn check
      spawnCounterRef.current++;
      const spawnInterval = Math.max(8, SPAWN_BASE - distanceRef.current / 40);
      if (spawnCounterRef.current >= spawnInterval) {
        spawnCounterRef.current = 0;
        spawnObstacle();
      }

      // Collision detection
      const toRemove: string[] = [];
      for (const obs of obstaclesRef.current) {
        const obsLeft = obs.x - obs.w / 2;
        const obsRight = obs.x + obs.w / 2;
        const obsTop = obs.y - obs.h / 2;
        const obsBottom = obs.y + obs.h / 2;

        let collided = false;
        for (let r = 0; r < GRID_ROWS; r++) {
          for (let c = 0; c < GRID_COLS; c++) {
            const block = blocksRef.current[r]?.[c];
            if (!block) continue;
            const bLeft = BOAT_LEFT + c * BLOCK_SIZE;
            const bRight = bLeft + BLOCK_SIZE;
            const bTop = BOAT_TOP + r * BLOCK_SIZE;
            const bBottom = bTop + BLOCK_SIZE;

            if (
              obsRight > bLeft &&
              obsLeft < bRight &&
              obsBottom > bTop &&
              obsTop < bBottom
            ) {
              block.hp -= obs.damage;
              Animated.sequence([
                Animated.timing(block.flashAnim, {
                  toValue: 1,
                  duration: 60,
                  useNativeDriver: false,
                }),
                Animated.timing(block.flashAnim, {
                  toValue: 0,
                  duration: 60,
                  useNativeDriver: false,
                }),
              ]).start();
              if (block.hp <= 0) {
                blocksRef.current[r][c] = null;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              } else {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              collided = true;
              break;
            }
          }
          if (collided) break;
        }
        if (collided) toRemove.push(obs.id);
      }
      obstaclesRef.current = obstaclesRef.current.filter(
        (o) => !toRemove.includes(o.id)
      );

      if (checkAllDestroyed()) {
        triggerGameOver();
        return;
      }

      setTick((t) => t + 1);
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [gameStarted, gameOver, spawnObstacle, checkAllDestroyed, triggerGameOver]);

  const handlePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  const handleStart = () => {
    if (runStartedRef.current) return;
    runStartedRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setGameStarted(true);
  };

  const distance = Math.floor(distanceRef.current);
  const coins = coinsRef.current;

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  return (
    <View style={styles.container}>
      <RiverBackground scrollAnim={scrollAnim} />

      {/* HUD */}
      <View style={[styles.hud, { top: topPad + 4 }]}>
        <View style={styles.hudLeft}>
          <View style={styles.hudBadge}>
            <Ionicons name="navigate" size={14} color="#60A5FA" />
            <Text style={styles.hudDist}>{distance}m</Text>
          </View>
        </View>
        <View style={styles.hudCenter}>
          <View style={styles.hudCoinBadge}>
            <Ionicons name="logo-bitcoin" size={14} color="#F59E0B" />
            <Text style={styles.hudCoins}>{coins}</Text>
          </View>
        </View>
        <View style={styles.hudRight}>
          {gameStarted && !gameOver && (
            <Pressable onPress={handlePause} style={styles.pauseBtn}>
              <Ionicons
                name={paused ? 'play' : 'pause'}
                size={18}
                color="#F8FAFC"
              />
            </Pressable>
          )}
        </View>
      </View>

      {/* Boat */}
      <View
        style={{
          position: 'absolute',
          left: BOAT_LEFT,
          top: BOAT_TOP,
          width: BOAT_W,
          height: BOAT_H,
        }}
      >
        {blocksRef.current.map((row, r) =>
          row.map((cell, c) => {
            if (!cell) return null;
            const def = BLOCK_DEFS[cell.type];
            const hpRatio = Math.max(0, cell.hp / cell.maxHp);
            const alpha = Math.round(180 + hpRatio * 75)
              .toString(16)
              .padStart(2, '0');
            return (
              <Animated.View
                key={`${r}-${c}`}
                style={{
                  position: 'absolute',
                  left: c * BLOCK_SIZE,
                  top: r * BLOCK_SIZE,
                  width: BLOCK_SIZE,
                  height: BLOCK_SIZE,
                  backgroundColor: cell.flashAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [def.color + alpha, '#FFFFFF'],
                  }),
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: def.borderColor + '88',
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    backgroundColor: hpRatio > 0.5 ? '#22C55E' : hpRatio > 0.25 ? '#F59E0B' : '#EF4444',
                    opacity: 0.9,
                  }}
                />
              </Animated.View>
            );
          })
        )}
      </View>

      {/* Obstacles */}
      {obstaclesRef.current.map((obs) => (
        <ObstacleView key={obs.id} obs={obs} />
      ))}

      {/* Speed indicator */}
      {gameStarted && !gameOver && (
        <View style={[styles.speedBar, { bottom: botPad + 12 }]}>
          <Text style={styles.speedLabel}>SPEED</Text>
          <View style={styles.speedTrack}>
            <View
              style={[
                styles.speedFill,
                { width: `${Math.min(100, (gameSpeedRef.current / 10) * 100)}%` },
              ]}
            />
          </View>
        </View>
      )}

      {/* Pre-launch overlay */}
      {!gameStarted && !gameOver && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayTitle}>READY TO SAIL?</Text>
            <Text style={styles.overlayDesc}>
              Your boat has been placed. Watch out for rocks, logs, and cannonballs!
            </Text>
            <Pressable
              onPress={handleStart}
              style={({ pressed }) => [
                styles.startBtn,
                { transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={['#22C55E', '#16A34A']}
                style={styles.startBtnGrad}
              >
                <Ionicons name="rocket" size={22} color="#fff" />
                <Text style={styles.startBtnText}>LAUNCH!</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      )}

      {/* Pause overlay */}
      {paused && !gameOver && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayTitle}>PAUSED</Text>
            <Text style={styles.overlayDesc}>{distance}m sailed so far</Text>
            <View style={styles.pauseButtons}>
              <Pressable
                style={styles.pauseResume}
                onPress={handlePause}
              >
                <Ionicons name="play" size={20} color="#F8FAFC" />
                <Text style={styles.pauseResumeText}>Resume</Text>
              </Pressable>
              <Pressable
                style={styles.pauseQuit}
                onPress={() => {
                  addCoins(coins);
                  updateBestDistance(distance);
                  incrementRuns();
                  router.replace('/');
                }}
              >
                <Text style={styles.pauseQuitText}>Quit (+{coins} coins)</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Game Over */}
      {gameOver && (
        <View style={styles.overlay}>
          <LinearGradient
            colors={['#0F172A', '#1E293B']}
            style={styles.gameOverCard}
          >
            <Text style={styles.gameOverTitle}>BOAT DESTROYED!</Text>
            <View style={styles.goStats}>
              <View style={styles.goStat}>
                <Ionicons name="navigate" size={20} color="#60A5FA" />
                <Text style={styles.goStatNum}>{distance}m</Text>
                <Text style={styles.goStatLabel}>Distance</Text>
              </View>
              <View style={[styles.goStat, styles.goStatMain]}>
                <Ionicons name="logo-bitcoin" size={24} color="#F59E0B" />
                <Text style={[styles.goStatNum, { color: '#F59E0B', fontSize: 32 }]}>
                  +{earnedCoins}
                </Text>
                <Text style={styles.goStatLabel}>Coins Earned</Text>
              </View>
              <View style={styles.goStat}>
                <Ionicons name="speedometer" size={20} color="#A78BFA" />
                <Text style={styles.goStatNum}>x{gameSpeedRef.current.toFixed(1)}</Text>
                <Text style={styles.goStatLabel}>Max Speed</Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                router.replace('/build');
              }}
              style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.goBtn}
              >
                <Ionicons name="hammer" size={20} color="#0F172A" />
                <Text style={styles.goBtnText}>BUILD AGAIN</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => router.replace('/')}
              style={({ pressed }) => [styles.goHome, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={styles.goHomeText}>Back to Menu</Text>
            </Pressable>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071428',
    overflow: 'hidden',
  },
  bank: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 44,
  },
  bankLeft: {
    left: 0,
  },
  bankRight: {
    right: 0,
  },
  obstacle: {
    position: 'absolute',
  },
  hud: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 10,
  },
  hudLeft: { flex: 1, alignItems: 'flex-start' },
  hudCenter: { flex: 1, alignItems: 'center' },
  hudRight: { flex: 1, alignItems: 'flex-end' },
  hudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0F172ACC',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#1E40AF66',
  },
  hudDist: {
    color: '#F8FAFC',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  hudCoinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0F172ACC',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#F59E0B44',
  },
  hudCoins: {
    color: '#F59E0B',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  pauseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E293BCC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  speedBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 10,
  },
  speedLabel: {
    color: '#475569',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 1,
    width: 44,
  },
  speedTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  speedFill: {
    height: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 3,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000088',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  overlayCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 28,
    marginHorizontal: 32,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  overlayTitle: {
    color: '#F8FAFC',
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    letterSpacing: 2,
  },
  overlayDesc: {
    color: '#94A3B8',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  startBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  startBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    letterSpacing: 1.5,
  },
  pauseButtons: {
    width: '100%',
    gap: 10,
  },
  pauseResume: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  pauseResumeText: {
    color: '#F8FAFC',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  pauseQuit: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  pauseQuitText: {
    color: '#EF4444',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  gameOverCard: {
    width: SW - 48,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  gameOverTitle: {
    color: '#EF4444',
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    letterSpacing: 2,
  },
  goStats: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  goStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 12,
  },
  goStatMain: {
    flex: 1.4,
    borderWidth: 1,
    borderColor: '#F59E0B44',
  },
  goStatNum: {
    color: '#F8FAFC',
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
  },
  goStatLabel: {
    color: '#64748B',
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  goBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: SW - 48 - 56,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  goBtnText: {
    color: '#0F172A',
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  goHome: {
    paddingVertical: 8,
  },
  goHomeText: {
    color: '#64748B',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
});
