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
import { BIOMES, getBiomeForDistance, type BiomeDef } from '@/constants/biomes';
import { useGame } from '@/contexts/GameContext';

const { width: SW, height: SH } = Dimensions.get('window');
const BLOCK_SIZE = Math.max(24, Math.min(30, Math.floor((SW * 0.80) / GRID_COLS)));
const BOAT_W = GRID_COLS * BLOCK_SIZE;
const BOAT_H = GRID_ROWS * BLOCK_SIZE;
const BOAT_LEFT = (SW - BOAT_W) / 2;
const BOAT_TOP = SH * 0.48 - BOAT_H / 2;

const TICK_MS = 48;
const SPAWN_BASE = 26;

type ObstacleKind =
  | 'rock' | 'log' | 'debris'
  | 'crocodile' | 'toxicPool'
  | 'iceberg' | 'iceSpike' | 'frozenSkull' | 'snowStorm'
  | 'lavaRock' | 'fireGeyser' | 'burningDebris' | 'lavaBurst'
  | 'lightning' | 'whirlpool' | 'tornado' | 'ghostShip' | 'wave'
  | 'tentacle' | 'seamonster' | 'cursedRock' | 'darkWave' | 'krakenEye';

interface Obstacle {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  kind: ObstacleKind;
  damage: number;
  color: string;
  borderColor: string;
  shape: 'circle' | 'rect' | 'diamond' | 'wide';
}

interface BlockCell {
  type: BlockType;
  hp: number;
  maxHp: number;
  flash: Animated.Value;
}

const OBSTACLE_DEFS: Record<string, { w: number; h: number; damage: number; color: string; border: string; shape: Obstacle['shape'] }> = {
  rock:         { w: 46, h: 42, damage: 2, color: '#78716C', border: '#A8A29E', shape: 'circle' },
  log:          { w: 80, h: 24, damage: 1, color: '#92400E', border: '#D97706', shape: 'wide' },
  debris:       { w: 34, h: 34, damage: 1, color: '#6B5A3E', border: '#9B8A6A', shape: 'rect' },
  crocodile:    { w: 60, h: 28, damage: 3, color: '#166534', border: '#4ADE80', shape: 'wide' },
  toxicPool:    { w: 52, h: 52, damage: 2, color: '#365314', border: '#84CC16', shape: 'circle' },
  iceberg:      { w: 56, h: 52, damage: 4, color: '#BAE6FD', border: '#E0F2FE', shape: 'circle' },
  iceSpike:     { w: 28, h: 50, damage: 3, color: '#93C5FD', border: '#BFDBFE', shape: 'diamond' },
  frozenSkull:  { w: 36, h: 36, damage: 3, color: '#1E3A5F', border: '#93C5FD', shape: 'rect' },
  snowStorm:    { w: 64, h: 20, damage: 2, color: '#DBEAFE', border: '#EFF6FF', shape: 'wide' },
  lavaRock:     { w: 50, h: 44, damage: 4, color: '#DC2626', border: '#FCA5A5', shape: 'circle' },
  fireGeyser:   { w: 32, h: 58, damage: 5, color: '#EF4444', border: '#FEF08A', shape: 'diamond' },
  burningDebris:{ w: 42, h: 38, damage: 3, color: '#C2410C', border: '#FB923C', shape: 'rect' },
  lavaBurst:    { w: 44, h: 44, damage: 6, color: '#F97316', border: '#FEF3C7', shape: 'circle' },
  lightning:    { w: 18, h: 70, damage: 7, color: '#FDE047', border: '#FEF9C3', shape: 'diamond' },
  whirlpool:    { w: 58, h: 58, damage: 4, color: '#312E81', border: '#818CF8', shape: 'circle' },
  tornado:      { w: 44, h: 64, damage: 5, color: '#4338CA', border: '#A5B4FC', shape: 'diamond' },
  ghostShip:    { w: 74, h: 44, damage: 6, color: '#1E1B4B', border: '#6366F1', shape: 'wide' },
  wave:         { w: 90, h: 22, damage: 3, color: '#1D4ED8', border: '#60A5FA', shape: 'wide' },
  tentacle:     { w: 32, h: 70, damage: 7, color: '#064E3B', border: '#34D399', shape: 'diamond' },
  seamonster:   { w: 68, h: 54, damage: 8, color: '#022C22', border: '#10B981', shape: 'circle' },
  cursedRock:   { w: 50, h: 46, damage: 5, color: '#0F172A', border: '#7C3AED', shape: 'circle' },
  darkWave:     { w: 88, h: 20, damage: 4, color: '#030712', border: '#34D399', shape: 'wide' },
  krakenEye:    { w: 40, h: 40, damage: 10, color: '#000000', border: '#EF4444', shape: 'circle' },
};

function ObstacleView({ obs }: { obs: Obstacle }) {
  const isWide = obs.shape === 'wide';
  const isDiamond = obs.shape === 'diamond';
  const isCircle = obs.shape === 'circle';

  return (
    <View
      style={{
        position: 'absolute',
        left: obs.x - obs.w / 2,
        top: obs.y - obs.h / 2,
        width: obs.w,
        height: obs.h,
        backgroundColor: obs.color,
        borderRadius: isCircle ? obs.w / 2 : isDiamond ? 4 : isWide ? 6 : 8,
        borderWidth: 2,
        borderColor: obs.borderColor,
        transform: isDiamond ? [{ rotate: '45deg' }] : [],
        opacity: 0.92,
      }}
    />
  );
}

function BiomeTransitionOverlay({ biome, visible }: { biome: BiomeDef; visible: boolean }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.delay(1600),
        Animated.timing(fadeAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, biome.id]);

  return (
    <Animated.View style={[styles.biomeOverlay, { opacity: fadeAnim }]} pointerEvents="none">
      <Text style={styles.biomeEmoji}>{biome.emoji}</Text>
      <Text style={styles.biomeName}>{biome.name}</Text>
      <Text style={styles.biomeSubt}>{biome.subtitle}</Text>
      <View style={[styles.biomeHazardChip, { borderColor: biome.mapColor + '88' }]}>
        <Text style={[styles.biomeHazardTxt, { color: biome.mapColor }]}>{biome.hazardDesc}</Text>
      </View>
    </Animated.View>
  );
}

function TreasureMap({ distance, onClose }: { distance: number; onClose: () => void }) {
  const currentBiome = getBiomeForDistance(distance);
  const currentIdx = BIOMES.findIndex((b) => b.id === currentBiome.id);

  return (
    <View style={styles.mapOverlay}>
      <LinearGradient colors={['#2D1B06', '#3D2510', '#2D1B06']} style={styles.mapCard}>
        <View style={styles.mapHeader}>
          <Text style={styles.mapTitle}>⚓ TREASURE MAP ⚓</Text>
          <Pressable onPress={onClose} style={styles.mapClose}>
            <Ionicons name="close" size={20} color="#92400E" />
          </Pressable>
        </View>
        <Text style={styles.mapDist}>{Math.floor(distance)}m sailed</Text>

        <View style={styles.mapPath}>
          {BIOMES.map((biome, idx) => {
            const isPast = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const isFuture = idx > currentIdx;
            return (
              <View key={biome.id} style={styles.mapStop}>
                <View style={[styles.mapNode, {
                  backgroundColor: isPast ? biome.mapColor : isCurrent ? '#FFFFFF' : '#2D1B06',
                  borderColor: isFuture ? '#4B2E10' : biome.mapColor,
                  borderWidth: isCurrent ? 3 : 2,
                  transform: [{ scale: isCurrent ? 1.25 : 1 }],
                }]}>
                  <Text style={{ fontSize: isCurrent ? 16 : 13 }}>{biome.emoji}</Text>
                </View>
                <Text style={[styles.mapLabel, { color: isFuture ? '#4B2E10' : biome.mapColor, fontFamily: isCurrent ? 'Inter_700Bold' : 'Inter_400Regular' }]}>
                  {biome.name}
                </Text>
                <Text style={[styles.mapDist2, { color: isFuture ? '#3D2510' : '#92400E' }]}>{biome.startDistance}m</Text>
                {idx < BIOMES.length - 1 && (
                  <View style={[styles.mapLine, { backgroundColor: isPast ? '#92400E' : '#3D2510' }]} />
                )}
              </View>
            );
          })}
          <View style={styles.mapStop}>
            <View style={[styles.mapNode, { backgroundColor: '#F59E0B', borderColor: '#D97706', borderWidth: 2 }]}>
              <Text style={{ fontSize: 16 }}>💰</Text>
            </View>
            <Text style={[styles.mapLabel, { color: '#F59E0B', fontFamily: 'Inter_700Bold' }]}>TREASURE</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

function LevelUpModal({ level, onClose }: { level: number; onClose: () => void }) {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 6 }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
        ])
      ),
    ]).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <View style={styles.levelUpOverlay}>
      <Animated.View style={[styles.levelUpCard, { transform: [{ scale: scaleAnim }] }]}>
        <Animated.View style={[styles.levelUpGlow, { opacity: glowAnim.interpolate({ inputRange: [0,1], outputRange: [0.3,0.8] }) }]} />
        <Text style={styles.levelUpBadge}>LEVEL UP!</Text>
        <LinearGradient colors={['#4338CA', '#7C3AED']} style={styles.levelUpNum}>
          <Text style={styles.levelUpNumTxt}>{level}</Text>
        </LinearGradient>
        <Text style={styles.levelUpMsg}>New materials may now be available in the shop!</Text>
        <Pressable onPress={onClose} style={styles.levelUpBtn}>
          <Text style={styles.levelUpBtnTxt}>AWESOME!</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const STRIPE_H = 240;

function BiomeBackground({ biome, scrollAnim }: { biome: BiomeDef; scrollAnim: Animated.Value }) {
  return (
    <View style={[StyleSheet.absoluteFillObject, { pointerEvents: 'none' } as any]}>
      <LinearGradient colors={biome.bgColors} style={StyleSheet.absoluteFillObject} />
      {[0, STRIPE_H, STRIPE_H * 2].map((offset, i) => (
        <Animated.View
          key={i}
          style={[StyleSheet.absoluteFillObject, { transform: [{ translateY: Animated.add(scrollAnim, new Animated.Value(offset)) }] }]}
        >
          {Array.from({ length: 7 }).map((_, j) => (
            <View
              key={j}
              style={{
                position: 'absolute',
                top: j * (STRIPE_H / 7),
                left: j % 2 === 0 ? 44 : 60,
                right: j % 2 === 0 ? 60 : 44,
                height: 18 + (j % 3) * 10,
                backgroundColor: biome.waterColor,
                opacity: 0.06 + (j % 3) * 0.02,
                borderRadius: 9,
              }}
            />
          ))}
        </Animated.View>
      ))}
      {biome.fogColor && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: biome.fogColor, opacity: biome.fogOpacity }]} />
      )}
      <LinearGradient colors={[biome.bankColor, biome.bankColor + 'CC', biome.bankColor]} style={[styles.bank, styles.bankLeft]} />
      <LinearGradient colors={[biome.bankColor, biome.bankColor + 'CC', biome.bankColor]} style={[styles.bank, styles.bankRight]} />
    </View>
  );
}

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ grid: string }>();
  const { finishRun } = useGame();

  const [tick, setTick] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showBiomeTransition, setShowBiomeTransition] = useState(false);
  const [currentBiome, setCurrentBiome] = useState<BiomeDef>(BIOMES[0]);
  const [runResult, setRunResult] = useState<{ coins: number; xp: number; leveledUp: boolean; newLevel: number } | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);

  const blocksRef = useRef<(BlockCell | null)[][]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const distanceRef = useRef(0);
  const gameSpeedRef = useRef(3.2);
  const spawnCounterRef = useRef(0);
  const pausedRef = useRef(false);
  const gameOverRef = useRef(false);
  const runStartedRef = useRef(false);
  const prevBiomeIdRef = useRef('tropical');

  const scrollAnim = useRef(new Animated.Value(0)).current;
  const scrollAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const startScroll = useCallback((biome: BiomeDef) => {
    if (scrollAnimRef.current) scrollAnimRef.current.stop();
    const speed = 1200 / biome.obstacleSpeedMult;
    const anim = Animated.loop(
      Animated.timing(scrollAnim, { toValue: -STRIPE_H, duration: speed, useNativeDriver: true })
    );
    scrollAnimRef.current = anim;
    anim.start();
  }, []);

  useEffect(() => {
    if (gameStarted && !paused && !gameOver) {
      startScroll(currentBiome);
    } else {
      scrollAnimRef.current?.stop();
    }
    return () => scrollAnimRef.current?.stop();
  }, [gameStarted, paused, gameOver, currentBiome]);

  // Initialize blocks
  useEffect(() => {
    if (!params.grid) return;
    try {
      const raw: (BlockType | null)[][] = JSON.parse(params.grid);
      blocksRef.current = raw.map((row) =>
        row.map((cell) => {
          if (!cell) return null;
          const def = BLOCK_DEFS[cell];
          return { type: cell, hp: def.hp, maxHp: def.hp, flash: new Animated.Value(0) };
        })
      );
    } catch {}
  }, []);

  const countSurviving = useCallback((): number => {
    let count = 0;
    blocksRef.current.forEach((row) => row.forEach((c) => { if (c) count++; }));
    return count;
  }, []);

  const allDestroyed = useCallback((): boolean => countSurviving() === 0, [countSurviving]);

  const triggerGameOver = useCallback(() => {
    if (gameOverRef.current) return;
    gameOverRef.current = true;
    const dist = Math.floor(distanceRef.current);
    const surviving = countSurviving();
    const result = finishRun(dist, surviving);
    setRunResult({ coins: result.coinsEarned, xp: result.xpEarned, leveledUp: result.leveledUp, newLevel: result.newLevel });
    setGameOver(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [finishRun, countSurviving]);

  const spawnObstacle = useCallback((biome: BiomeDef) => {
    const types = biome.obstacleTypes;
    const kind = types[Math.floor(Math.random() * types.length)] as ObstacleKind;
    const cfg = OBSTACLE_DEFS[kind] ?? OBSTACLE_DEFS['rock'];
    const margin = 52;
    const x = margin + Math.random() * (SW - margin * 2);
    obstaclesRef.current.push({
      id: Math.random().toString(36).substr(2, 10),
      x, y: -70,
      w: cfg.w, h: cfg.h,
      speed: gameSpeedRef.current * biome.obstacleSpeedMult * (0.9 + Math.random() * 0.4),
      kind,
      damage: cfg.damage,
      color: cfg.color,
      borderColor: cfg.border,
      shape: cfg.shape,
    });
  }, []);

  // Game loop
  useEffect(() => {
    if (!gameStarted || gameOver) return;
    const interval = setInterval(() => {
      if (pausedRef.current || gameOverRef.current) return;

      distanceRef.current += gameSpeedRef.current * 0.35;
      gameSpeedRef.current = Math.min(12, 3.2 + distanceRef.current / 180);

      const biome = getBiomeForDistance(distanceRef.current);
      if (biome.id !== prevBiomeIdRef.current) {
        prevBiomeIdRef.current = biome.id;
        setCurrentBiome(biome);
        setShowBiomeTransition(true);
        setTimeout(() => setShowBiomeTransition(false), 3200);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      obstaclesRef.current = obstaclesRef.current.map((o) => ({ ...o, y: o.y + o.speed * 1.15 }));
      obstaclesRef.current = obstaclesRef.current.filter((o) => o.y < SH + 90);

      spawnCounterRef.current++;
      const spawnInterval = Math.max(6, SPAWN_BASE / biome.spawnRateMult - distanceRef.current / 50);
      if (spawnCounterRef.current >= spawnInterval) {
        spawnCounterRef.current = 0;
        spawnObstacle(biome);
        if (distanceRef.current > 600 && Math.random() < 0.3) spawnObstacle(biome);
      }

      // Collision
      const toRemove: string[] = [];
      for (const obs of obstaclesRef.current) {
        const oL = obs.x - obs.w / 2, oR = obs.x + obs.w / 2;
        const oT = obs.y - obs.h / 2, oB = obs.y + obs.h / 2;
        let hit = false;
        for (let r = 0; r < GRID_ROWS && !hit; r++) {
          for (let c = 0; c < GRID_COLS && !hit; c++) {
            const block = blocksRef.current[r]?.[c];
            if (!block) continue;
            const bL = BOAT_LEFT + c * BLOCK_SIZE, bR = bL + BLOCK_SIZE;
            const bT = BOAT_TOP + r * BLOCK_SIZE, bB = bT + BLOCK_SIZE;
            if (oR > bL && oL < bR && oB > bT && oT < bB) {
              block.hp -= obs.damage;
              Animated.sequence([
                Animated.timing(block.flash, { toValue: 1, duration: 55, useNativeDriver: false }),
                Animated.timing(block.flash, { toValue: 0, duration: 55, useNativeDriver: false }),
              ]).start();
              if (block.hp <= 0) {
                blocksRef.current[r][c] = null;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              } else {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              hit = true;
            }
          }
        }
        if (hit) toRemove.push(obs.id);
      }
      obstaclesRef.current = obstaclesRef.current.filter((o) => !toRemove.includes(o.id));

      if (allDestroyed()) { triggerGameOver(); return; }
      setTick((t) => t + 1);
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [gameStarted, gameOver, spawnObstacle, allDestroyed, triggerGameOver]);

  const handlePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  const handleStart = () => {
    if (runStartedRef.current) return;
    runStartedRef.current = true;
    setGameStarted(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleQuit = () => {
    const dist = Math.floor(distanceRef.current);
    const surviving = countSurviving();
    finishRun(dist, surviving);
    router.replace('/');
  };

  const dist = Math.floor(distanceRef.current);
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  return (
    <View style={styles.container}>
      <BiomeBackground biome={currentBiome} scrollAnim={scrollAnim} />

      {/* HUD */}
      <View style={[styles.hud, { top: topPad + 4 }]}>
        <View style={styles.hudLeft}>
          <View style={styles.hudBadge}>
            <Ionicons name="navigate" size={13} color={currentBiome.mapColor} />
            <Text style={styles.hudDistTxt}>{dist}m</Text>
          </View>
          <View style={[styles.hudBiomeBadge, { borderColor: currentBiome.mapColor + '55' }]}>
            <Text style={{ fontSize: 11 }}>{currentBiome.emoji}</Text>
            <Text style={[styles.hudBiomeTxt, { color: currentBiome.mapColor }]}>{currentBiome.name}</Text>
          </View>
        </View>
        <View style={styles.hudRight}>
          <Pressable onPress={() => setShowMap(true)} style={styles.hudBtn}>
            <Ionicons name="map-outline" size={16} color="#D97706" />
          </Pressable>
          {gameStarted && !gameOver && (
            <Pressable onPress={handlePause} style={styles.hudBtn}>
              <Ionicons name={paused ? 'play' : 'pause'} size={16} color="#F8FAFC" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Boat */}
      <View style={{ position: 'absolute', left: BOAT_LEFT, top: BOAT_TOP, width: BOAT_W, height: BOAT_H }}>
        {blocksRef.current.map((row, r) =>
          row.map((cell, c) => {
            if (!cell) return null;
            const def = BLOCK_DEFS[cell.type];
            const hpRatio = Math.max(0, cell.hp / cell.maxHp);
            return (
              <Animated.View
                key={`${r}-${c}`}
                style={{
                  position: 'absolute',
                  left: c * BLOCK_SIZE, top: r * BLOCK_SIZE,
                  width: BLOCK_SIZE, height: BLOCK_SIZE,
                  backgroundColor: cell.flash.interpolate({ inputRange: [0, 1], outputRange: [def.color, '#FFFFFF'] }),
                  borderRadius: 5,
                  borderWidth: 1.5,
                  borderColor: def.borderColor + '88',
                  overflow: 'hidden',
                }}
              >
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: hpRatio > 0.5 ? '#22C55E' : hpRatio > 0.25 ? '#F59E0B' : '#EF4444' }} />
              </Animated.View>
            );
          })
        )}
      </View>

      {/* Obstacles */}
      {obstaclesRef.current.map((obs) => <ObstacleView key={obs.id} obs={obs} />)}

      {/* Speed bar */}
      {gameStarted && !gameOver && (
        <View style={[styles.speedBar, { bottom: botPad + 10 }]}>
          <Text style={styles.speedLabel}>SPEED</Text>
          <View style={styles.speedTrack}>
            <View style={[styles.speedFill, { width: `${Math.min(100, (gameSpeedRef.current / 12) * 100)}%`, backgroundColor: currentBiome.mapColor }]} />
          </View>
        </View>
      )}

      {/* Biome transition */}
      <BiomeTransitionOverlay biome={currentBiome} visible={showBiomeTransition} />

      {/* Treasure map */}
      {showMap && <TreasureMap distance={dist} onClose={() => setShowMap(false)} />}

      {/* Pre-launch */}
      {!gameStarted && !gameOver && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayEmoji}>{currentBiome.emoji}</Text>
            <Text style={styles.overlayTitle}>SET SAIL!</Text>
            <Text style={styles.overlayDesc}>Your ship is ready. Navigate through 6 deadly biomes to claim the treasure!</Text>
            <Pressable onPress={() => setShowMap(true)} style={styles.viewMapBtn}>
              <Ionicons name="map-outline" size={15} color="#D97706" />
              <Text style={styles.viewMapTxt}>View Treasure Map</Text>
            </Pressable>
            <Pressable onPress={handleStart} style={({ pressed }) => [{ width: '100%', borderRadius: 13, overflow: 'hidden', transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
              <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.startBtnGrad}>
                <Ionicons name="rocket" size={21} color="#fff" />
                <Text style={styles.startBtnTxt}>LAUNCH!</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      )}

      {/* Paused */}
      {paused && !gameOver && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayTitle}>PAUSED</Text>
            <Text style={styles.overlayDesc}>{dist}m sailed · {currentBiome.emoji} {currentBiome.name}</Text>
            <Pressable style={styles.resumeBtn} onPress={handlePause}>
              <Ionicons name="play" size={18} color="#fff" /><Text style={styles.resumeTxt}>Resume</Text>
            </Pressable>
            <Pressable style={styles.mapBtnPause} onPress={() => setShowMap(true)}>
              <Ionicons name="map-outline" size={16} color="#D97706" /><Text style={styles.mapBtnTxt}>Treasure Map</Text>
            </Pressable>
            <Pressable onPress={handleQuit} style={{ alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ color: '#EF4444', fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>Quit Run</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Game Over */}
      {gameOver && runResult && !showLevelUp && (
        <View style={styles.overlay}>
          <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.gameOverCard}>
            <Text style={styles.gameOverBiome}>{currentBiome.emoji} SUNK IN {currentBiome.name.toUpperCase()}</Text>
            <Text style={styles.gameOverTitle}>SHIP DESTROYED!</Text>

            <View style={styles.goStats}>
              <View style={styles.goStat}>
                <Ionicons name="navigate" size={18} color="#60A5FA" />
                <Text style={styles.goStatNum}>{dist}m</Text>
                <Text style={styles.goStatLbl}>Distance</Text>
              </View>
              <View style={[styles.goStat, styles.goStatMain]}>
                <Ionicons name="logo-bitcoin" size={22} color="#F59E0B" />
                <Text style={[styles.goStatNum, { color: '#F59E0B', fontSize: 28 }]}>+{runResult.coins}</Text>
                <Text style={styles.goStatLbl}>Coins</Text>
              </View>
              <View style={styles.goStat}>
                <Ionicons name="star" size={18} color="#818CF8" />
                <Text style={[styles.goStatNum, { color: '#818CF8' }]}>+{runResult.xp}</Text>
                <Text style={styles.goStatLbl}>XP</Text>
              </View>
            </View>

            {runResult.leveledUp && (
              <Pressable
                style={styles.levelUpPrompt}
                onPress={() => setShowLevelUp(true)}
              >
                <Text style={styles.levelUpPromptTxt}>🎉 Level {runResult.newLevel} reached! Tap to celebrate</Text>
              </Pressable>
            )}

            <Pressable onPress={() => router.replace('/build')} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }], borderRadius: 13, overflow: 'hidden', width: SW - 48 - 56, alignSelf: 'center' }]}>
              <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.goBtn}>
                <Ionicons name="hammer" size={19} color="#0F172A" />
                <Text style={styles.goBtnTxt}>BUILD AGAIN</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => router.replace('/')} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, alignItems: 'center', paddingVertical: 10 }]}>
              <Text style={{ color: '#64748B', fontFamily: 'Inter_400Regular', fontSize: 13 }}>Back to Menu</Text>
            </Pressable>
          </LinearGradient>
        </View>
      )}

      {/* Level up modal */}
      {showLevelUp && runResult && (
        <LevelUpModal level={runResult.newLevel} onClose={() => setShowLevelUp(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#040D1A', overflow: 'hidden' },
  bank: { position: 'absolute', top: 0, bottom: 0, width: 40 },
  bankLeft: { left: 0 },
  bankRight: { right: 0 },
  hud: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, zIndex: 10 },
  hudLeft: { gap: 5 },
  hudBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#0F172ACC', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#1E3A5F66' },
  hudDistTxt: { color: '#F8FAFC', fontFamily: 'Inter_700Bold', fontSize: 15 },
  hudBiomeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0F172ACC', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  hudBiomeTxt: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  hudRight: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  hudBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0F172ACC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  speedBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 10 },
  speedLabel: { color: '#334155', fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 1, width: 40 },
  speedTrack: { flex: 1, height: 5, backgroundColor: '#1E293B', borderRadius: 3, overflow: 'hidden' },
  speedFill: { height: '100%', borderRadius: 3 },
  biomeOverlay: { position: 'absolute', top: '28%', left: 0, right: 0, alignItems: 'center', gap: 6, zIndex: 20 },
  biomeEmoji: { fontSize: 44 },
  biomeName: { color: '#F8FAFC', fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: 1 },
  biomeSubt: { color: '#94A3B8', fontFamily: 'Inter_400Regular', fontSize: 13 },
  biomeHazardChip: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  biomeHazardTxt: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  overlayCard: { backgroundColor: '#1E293B', borderRadius: 22, padding: 24, marginHorizontal: 28, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#334155', width: SW - 56 },
  overlayEmoji: { fontSize: 36 },
  overlayTitle: { color: '#F8FAFC', fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: 2 },
  overlayDesc: { color: '#94A3B8', fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  viewMapBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#2D1B0688', borderRadius: 10, borderWidth: 1, borderColor: '#D97706AA' },
  viewMapTxt: { color: '#D97706', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  startBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, gap: 10 },
  startBtnTxt: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: 1 },
  resumeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 13, gap: 8, width: '100%' },
  resumeTxt: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 16 },
  mapBtnPause: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2D1B0688', borderRadius: 10, paddingVertical: 10, gap: 6, width: '100%', borderWidth: 1, borderColor: '#D97706AA' },
  mapBtnTxt: { color: '#D97706', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  gameOverCard: { width: SW - 40, borderRadius: 22, padding: 24, alignItems: 'center', gap: 16, borderWidth: 1, borderColor: '#334155' },
  gameOverBiome: { color: '#64748B', fontFamily: 'Inter_400Regular', fontSize: 11, letterSpacing: 1 },
  gameOverTitle: { color: '#EF4444', fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: 1 },
  goStats: { flexDirection: 'row', gap: 10, width: '100%' },
  goStat: { flex: 1, alignItems: 'center', gap: 3, backgroundColor: '#0F172A', borderRadius: 12, paddingVertical: 12 },
  goStatMain: { flex: 1.4, borderWidth: 1, borderColor: '#F59E0B44' },
  goStatNum: { color: '#F8FAFC', fontFamily: 'Inter_700Bold', fontSize: 19 },
  goStatLbl: { color: '#475569', fontFamily: 'Inter_400Regular', fontSize: 10 },
  levelUpPrompt: { backgroundColor: '#4338CA44', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#6366F1' },
  levelUpPromptTxt: { color: '#A5B4FC', fontFamily: 'Inter_600SemiBold', fontSize: 13, textAlign: 'center' },
  goBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 13, gap: 8 },
  goBtnTxt: { color: '#0F172A', fontFamily: 'Inter_700Bold', fontSize: 17 },
  mapOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000CC', alignItems: 'center', justifyContent: 'center', zIndex: 80 },
  mapCard: { width: SW - 48, borderRadius: 20, padding: 20, gap: 12, borderWidth: 2, borderColor: '#4B2E10' },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mapTitle: { color: '#D97706', fontFamily: 'Inter_700Bold', fontSize: 16, letterSpacing: 1 },
  mapClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#4B2E1088', alignItems: 'center', justifyContent: 'center' },
  mapDist: { color: '#92400E', fontFamily: 'Inter_400Regular', fontSize: 13 },
  mapPath: { flexDirection: 'row', alignItems: 'flex-start', gap: 0, flexWrap: 'nowrap', justifyContent: 'space-between' },
  mapStop: { alignItems: 'center', gap: 4, flex: 1 },
  mapNode: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  mapLabel: { fontFamily: 'Inter_400Regular', fontSize: 8, textAlign: 'center' },
  mapDist2: { fontFamily: 'Inter_400Regular', fontSize: 8 },
  mapLine: { position: 'absolute', top: 20, right: -20, width: 20, height: 2 },
  levelUpOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000BB', alignItems: 'center', justifyContent: 'center', zIndex: 90 },
  levelUpCard: { backgroundColor: '#1E293B', borderRadius: 24, padding: 28, alignItems: 'center', gap: 16, borderWidth: 2, borderColor: '#6366F1', width: SW - 80, overflow: 'hidden' },
  levelUpGlow: { ...StyleSheet.absoluteFillObject, backgroundColor: '#6366F1' },
  levelUpBadge: { color: '#818CF8', fontFamily: 'Inter_700Bold', fontSize: 14, letterSpacing: 4 },
  levelUpNum: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  levelUpNumTxt: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 38 },
  levelUpMsg: { color: '#94A3B8', fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center' },
  levelUpBtn: { backgroundColor: '#4338CA', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14 },
  levelUpBtnTxt: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 16, letterSpacing: 1 },
});
