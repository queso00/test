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
const BOAT_LEFT_BASE = (SW - BOAT_W) / 2;
const BOAT_TOP = SH * 0.48 - BOAT_H / 2;
const MAX_STEER_OFFSET = Math.max(0, BOAT_LEFT_BASE - 18);

const TICK_MS = 48;
const SPAWN_BASE = 28;
const STRIPE_H = 240;
const ENGINEER_INTERVAL_TICKS = 104; // ~5 seconds

type ObstacleKind =
  | 'rock' | 'log' | 'debris'
  | 'crocodile' | 'toxicPool'
  | 'iceberg' | 'iceSpike' | 'frozenSkull' | 'snowStorm'
  | 'lavaRock' | 'fireGeyser' | 'burningDebris' | 'lavaBurst'
  | 'lightning' | 'whirlpool' | 'tornado' | 'ghostShip' | 'wave'
  | 'tentacle' | 'seamonster' | 'cursedRock' | 'darkWave' | 'krakenEye'
  | 'tsunami' | 'boulderRain' | 'phantomFleet';

type OceanEventType = 'tsunami' | 'pirateAmbush' | 'treasureStorm' | 'seaSerpent' | 'ghostFleet' | 'meteorShower';

interface OceanEventDef {
  name: string;
  emoji: string;
  color: string;
  desc: string;
  obstacleKinds: string[];
  burstCount: number;
}

const OCEAN_EVENTS: Record<OceanEventType, OceanEventDef> = {
  tsunami: {
    name: 'TSUNAMI!',
    emoji: '🌊',
    color: '#0EA5E9',
    desc: 'Massive waves sweep across the ocean!',
    obstacleKinds: ['wave', 'wave', 'darkWave', 'whirlpool'],
    burstCount: 5,
  },
  pirateAmbush: {
    name: 'PIRATE AMBUSH!',
    emoji: '🏴‍☠️',
    color: '#EF4444',
    desc: 'Enemy fleet attacks from all sides!',
    obstacleKinds: ['ghostShip', 'ghostShip', 'log', 'debris', 'rock'],
    burstCount: 6,
  },
  treasureStorm: {
    name: 'TREASURE STORM!',
    emoji: '💰',
    color: '#F59E0B',
    desc: 'Riches fall — but so do dangers!',
    obstacleKinds: ['debris', 'rock', 'log', 'boulderRain'],
    burstCount: 4,
  },
  seaSerpent: {
    name: 'SEA SERPENT!',
    emoji: '🐉',
    color: '#10B981',
    desc: 'A legendary beast rises from the deep!',
    obstacleKinds: ['tentacle', 'seamonster', 'darkWave', 'tentacle'],
    burstCount: 5,
  },
  ghostFleet: {
    name: 'GHOST FLEET!',
    emoji: '👻',
    color: '#818CF8',
    desc: 'Spectral armada appears through the mist!',
    obstacleKinds: ['ghostShip', 'phantomFleet', 'cursedRock', 'ghostShip'],
    burstCount: 6,
  },
  meteorShower: {
    name: 'METEOR SHOWER!',
    emoji: '☄️',
    color: '#F97316',
    desc: 'The sky rains fire — nowhere is safe!',
    obstacleKinds: ['lavaRock', 'lavaBurst', 'boulderRain', 'fireGeyser'],
    burstCount: 7,
  },
};

interface BossDef {
  name: string;
  fullName: string;
  emoji: string;
  color: string;
  reward: number;
}

const BOSSES: BossDef[] = [
  { name: 'SWAMP COLOSSUS', fullName: 'The Swamp Colossus', emoji: '🐊', color: '#4ADE80', reward: 300 },
  { name: 'ICE LEVIATHAN', fullName: 'The Ice Leviathan', emoji: '🧊', color: '#93C5FD', reward: 400 },
  { name: 'VOLCANIC TITAN', fullName: 'The Volcanic Titan', emoji: '🌋', color: '#F97316', reward: 500 },
  { name: 'GHOST GALLEON', fullName: 'Captain Darkwater\'s Galleon', emoji: '💀', color: '#818CF8', reward: 600 },
  { name: 'KRAKEN KING', fullName: 'The Ancient Kraken King', emoji: '🦑', color: '#34D399', reward: 800 },
];

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
  rock:          { w: 46, h: 42, damage: 2,  color: '#78716C', border: '#A8A29E', shape: 'circle' },
  log:           { w: 80, h: 24, damage: 1,  color: '#92400E', border: '#D97706', shape: 'wide' },
  debris:        { w: 34, h: 34, damage: 1,  color: '#6B5A3E', border: '#9B8A6A', shape: 'rect' },
  crocodile:     { w: 60, h: 28, damage: 3,  color: '#166534', border: '#4ADE80', shape: 'wide' },
  toxicPool:     { w: 52, h: 52, damage: 2,  color: '#365314', border: '#84CC16', shape: 'circle' },
  iceberg:       { w: 56, h: 52, damage: 4,  color: '#BAE6FD', border: '#E0F2FE', shape: 'circle' },
  iceSpike:      { w: 28, h: 50, damage: 3,  color: '#93C5FD', border: '#BFDBFE', shape: 'diamond' },
  frozenSkull:   { w: 36, h: 36, damage: 3,  color: '#1E3A5F', border: '#93C5FD', shape: 'rect' },
  snowStorm:     { w: 64, h: 20, damage: 2,  color: '#DBEAFE', border: '#EFF6FF', shape: 'wide' },
  lavaRock:      { w: 50, h: 44, damage: 4,  color: '#DC2626', border: '#FCA5A5', shape: 'circle' },
  fireGeyser:    { w: 32, h: 58, damage: 5,  color: '#EF4444', border: '#FEF08A', shape: 'diamond' },
  burningDebris: { w: 42, h: 38, damage: 3,  color: '#C2410C', border: '#FB923C', shape: 'rect' },
  lavaBurst:     { w: 44, h: 44, damage: 6,  color: '#F97316', border: '#FEF3C7', shape: 'circle' },
  lightning:     { w: 18, h: 70, damage: 7,  color: '#FDE047', border: '#FEF9C3', shape: 'diamond' },
  whirlpool:     { w: 58, h: 58, damage: 4,  color: '#312E81', border: '#818CF8', shape: 'circle' },
  tornado:       { w: 44, h: 64, damage: 5,  color: '#4338CA', border: '#A5B4FC', shape: 'diamond' },
  ghostShip:     { w: 74, h: 44, damage: 6,  color: '#1E1B4B', border: '#6366F1', shape: 'wide' },
  wave:          { w: 90, h: 22, damage: 3,  color: '#1D4ED8', border: '#60A5FA', shape: 'wide' },
  tentacle:      { w: 32, h: 70, damage: 7,  color: '#064E3B', border: '#34D399', shape: 'diamond' },
  seamonster:    { w: 68, h: 54, damage: 8,  color: '#022C22', border: '#10B981', shape: 'circle' },
  cursedRock:    { w: 50, h: 46, damage: 5,  color: '#0F172A', border: '#7C3AED', shape: 'circle' },
  darkWave:      { w: 88, h: 20, damage: 4,  color: '#030712', border: '#34D399', shape: 'wide' },
  krakenEye:     { w: 40, h: 40, damage: 10, color: '#000000', border: '#EF4444', shape: 'circle' },
  tsunami:       { w: 120, h: 28, damage: 5, color: '#0369A1', border: '#38BDF8', shape: 'wide' },
  boulderRain:   { w: 42, h: 42, damage: 4,  color: '#57534E', border: '#D6D3D1', shape: 'circle' },
  phantomFleet:  { w: 90, h: 40, damage: 7,  color: '#1E1B4B', border: '#A5B4FC', shape: 'wide' },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function ObstacleView({ obs }: { obs: Obstacle }) {
  const isDiamond = obs.shape === 'diamond';
  const isCircle = obs.shape === 'circle';
  const isWide = obs.shape === 'wide';
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

function OceanEventBanner({ event, visible }: { event: OceanEventDef | null; visible: boolean }) {
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible && event) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 100, friction: 8 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -120, duration: 400, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!event) return null;
  return (
    <Animated.View
      style={[styles.eventBanner, { transform: [{ translateY: slideAnim }], opacity: fadeAnim }]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={[event.color + 'EE', event.color + '88']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.eventBannerGrad}
      >
        <Text style={styles.eventEmoji}>{event.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.eventName}>{event.name}</Text>
          <Text style={styles.eventDesc}>{event.desc}</Text>
        </View>
        <Text style={{ fontSize: 22 }}>⚠️</Text>
      </LinearGradient>
    </Animated.View>
  );
}

function BossIntroOverlay({ boss, visible }: { boss: BossDef | null; visible: boolean }) {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && boss) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
          ])
        ),
      ]).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      scaleAnim.setValue(0.5);
      glowAnim.setValue(0);
    }
  }, [visible]);

  if (!boss) return null;
  return (
    <Animated.View style={[styles.bossOverlay, { opacity: fadeAnim }]} pointerEvents="none">
      <Animated.View style={[styles.bossCard, { transform: [{ scale: scaleAnim }], borderColor: boss.color }]}>
        <Animated.View style={[styles.bossGlow, { backgroundColor: boss.color, opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.4] }) }]} />
        <Text style={[styles.bossWarning, { color: boss.color }]}>⚠ BOSS ENCOUNTER ⚠</Text>
        <Text style={styles.bossEmoji}>{boss.emoji}</Text>
        <Text style={[styles.bossName, { color: boss.color }]}>{boss.name}</Text>
        <Text style={styles.bossSubtitle}>{boss.fullName} has appeared!</Text>
        <Text style={styles.bossReward}>+{boss.reward} coins to survive</Text>
      </Animated.View>
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
        <Text style={styles.mapDist}>{Math.floor(distance)}m sailed · Treasure at 10,000m</Text>
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
            <Text style={[styles.mapDist2, { color: '#92400E' }]}>10,000m</Text>
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
      Animated.loop(Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])),
    ]).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);
  return (
    <View style={styles.levelUpOverlay}>
      <Animated.View style={[styles.levelUpCard, { transform: [{ scale: scaleAnim }] }]}>
        <Animated.View style={[styles.levelUpGlow, { opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] }) }]} />
        <Text style={styles.levelUpBadge}>LEVEL UP!</Text>
        <LinearGradient colors={['#4338CA', '#7C3AED']} style={styles.levelUpNum}>
          <Text style={styles.levelUpNumTxt}>{level}</Text>
        </LinearGradient>
        <Text style={styles.levelUpMsg}>New materials may be available in the Shop!</Text>
        <Pressable onPress={onClose} style={styles.levelUpBtn}>
          <Text style={styles.levelUpBtnTxt}>AWESOME!</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function PirateCharacter({
  triggerHitRef,
  isAlive,
  xOffset,
}: {
  triggerHitRef: React.MutableRefObject<(() => void) | null>;
  isAlive: boolean;
  xOffset: number;
}) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 900, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    triggerHitRef.current = () => {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 45, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.4, duration: 70, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 180 }),
      ]).start();
    };
  }, []);

  const shadowOpacity = floatAnim.interpolate({ inputRange: [-6, 0], outputRange: [0.1, 0.35] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: BOAT_LEFT_BASE + xOffset + BOAT_W / 2 - 22,
        top: BOAT_TOP - 52,
        alignItems: 'center',
        zIndex: 6,
        transform: [{ translateY: floatAnim }, { translateX: shakeAnim }, { scale: scaleAnim }],
      }}
    >
      <Text style={{ fontSize: 30 }}>{isAlive ? '🏴‍☠️' : '💀'}</Text>
      <Animated.View style={{ width: 28, height: 5, backgroundColor: '#000', borderRadius: 14, marginTop: -2, opacity: shadowOpacity }} />
    </Animated.View>
  );
}

function CornerMinimap({
  distance,
  biome,
  onExpand,
  bottom,
}: {
  distance: number;
  biome: BiomeDef;
  onExpand: () => void;
  bottom: number;
}) {
  const currentIdx = BIOMES.findIndex((b) => b.id === biome.id);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.35, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const nextBiome = BIOMES[currentIdx + 1];
  const progressPct = nextBiome
    ? Math.min(100, Math.floor(((distance - biome.startDistance) / (nextBiome.startDistance - biome.startDistance)) * 100))
    : 100;

  return (
    <Pressable onPress={onExpand} style={[styles.minimapWrap, { bottom }]}>
      <LinearGradient colors={['#C4933A', '#D9A84B', '#B5782A']} style={styles.minimapCard}>
        <View style={styles.minimapTexture} />
        <Text style={styles.minimapTitle}>⚓ CHART</Text>
        <View style={styles.minimapPath}>
          {BIOMES.map((b, idx) => {
            const isPast = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Animated.View style={[styles.minimapDot, {
                  backgroundColor: isPast ? b.mapColor : isCurrent ? '#FFF' : '#5C3310',
                  borderColor: isCurrent ? '#FFF' : b.mapColor,
                  transform: isCurrent ? [{ scale: pulseAnim }] : [],
                }]}>
                  {isCurrent && <Text style={{ fontSize: 7 }}>⛵</Text>}
                  {isPast && <Text style={{ fontSize: 6 }}>✓</Text>}
                </Animated.View>
                {idx < BIOMES.length - 1 && (
                  <View style={[styles.minimapLine, { backgroundColor: isPast ? '#8B5E1E' : '#4A2E0A' }]} />
                )}
              </View>
            );
          })}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.minimapLine} />
            <View style={[styles.minimapDot, { backgroundColor: '#F59E0B', borderColor: '#D97706' }]}>
              <Text style={{ fontSize: 7, color: '#7C2D12', fontFamily: 'Inter_700Bold' }}>X</Text>
            </View>
          </View>
        </View>
        <View style={styles.minimapProgTrack}>
          <View style={[styles.minimapProgFill, { width: `${progressPct}%`, backgroundColor: biome.mapColor }]} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.minimapDist}>{Math.floor(distance)}m</Text>
          <Text style={styles.minimapTapHint}>tap ›</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function BiomeBackground({ biome, scrollAnim }: { biome: BiomeDef; scrollAnim: Animated.Value }) {
  return (
    <View style={[StyleSheet.absoluteFillObject, { pointerEvents: 'none' } as any]}>
      <LinearGradient colors={biome.bgColors} style={StyleSheet.absoluteFillObject} />
      {[0, STRIPE_H, STRIPE_H * 2].map((offset, i) => (
        <Animated.View key={i} style={[StyleSheet.absoluteFillObject, { transform: [{ translateY: Animated.add(scrollAnim, new Animated.Value(offset)) }] }]}>
          {Array.from({ length: 7 }).map((_, j) => (
            <View key={j} style={{
              position: 'absolute',
              top: j * (STRIPE_H / 7),
              left: j % 2 === 0 ? 44 : 60,
              right: j % 2 === 0 ? 60 : 44,
              height: 18 + (j % 3) * 10,
              backgroundColor: biome.waterColor,
              opacity: 0.06 + (j % 3) * 0.02,
              borderRadius: 9,
            }} />
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

// ─── Main GameScreen ──────────────────────────────────────────────────────────

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ grid: string }>();
  const { finishRun, ownedCrew, addCoins } = useGame();

  // Crew bonuses
  const hasNavigator = ownedCrew.includes('navigator');
  const hasEngineer = ownedCrew.includes('engineer');
  const hasGunner = ownedCrew.includes('gunner');
  const hasMerchant = ownedCrew.includes('merchant');
  const hasCaptain = ownedCrew.includes('captain');

  // State
  const [tick, setTick] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showBiomeTransition, setShowBiomeTransition] = useState(false);
  const [currentBiome, setCurrentBiome] = useState<BiomeDef>(BIOMES[0]);
  const [runResult, setRunResult] = useState<{ coins: number; xp: number; leveledUp: boolean; newLevel: number } | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [pirateAlive, setPirateAlive] = useState(true);
  const [boatXOffset, setBoatXOffset] = useState(0);
  const [oceanEvent, setOceanEvent] = useState<OceanEventType | null>(null);
  const [activeBoss, setActiveBoss] = useState<BossDef | null>(null);
  const [showBossIntro, setShowBossIntro] = useState(false);
  const [bossPhaseActive, setBossPhaseActive] = useState(false);

  // Refs
  const blocksRef = useRef<(BlockCell | null)[][]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const distanceRef = useRef(0);
  const gameSpeedRef = useRef(2.8);
  const spawnCounterRef = useRef(0);
  const pausedRef = useRef(false);
  const gameOverRef = useRef(false);
  const runStartedRef = useRef(false);
  const prevBiomeIdRef = useRef('tropical');
  const pirateHitTrigger = useRef<(() => void) | null>(null);
  const boatXOffsetRef = useRef(0);
  const steerDirRef = useRef(0);
  const nextEventDistRef = useRef(400 + Math.random() * 200);
  const nextBossDistRef = useRef(1200);
  const bossPhaseEndDistRef = useRef(0);
  const engineerTickRef = useRef(0);
  const currentBossRef = useRef<BossDef | null>(null);

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
      const captainMult = hasCaptain ? 1.15 : 1.0;
      blocksRef.current = raw.map((row) =>
        row.map((cell) => {
          if (!cell) return null;
          const def = BLOCK_DEFS[cell];
          const maxHp = Math.round(def.hp * captainMult);
          return { type: cell, hp: maxHp, maxHp, flash: new Animated.Value(0) };
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
    const result = finishRun(dist, surviving, hasMerchant);
    setRunResult({ coins: result.coinsEarned, xp: result.xpEarned, leveledUp: result.leveledUp, newLevel: result.newLevel });
    setGameOver(true);
    setPirateAlive(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [finishRun, countSurviving, hasMerchant]);

  const spawnObstacle = useCallback((biome: BiomeDef, forceKind?: string) => {
    const kind = (forceKind ?? biome.obstacleTypes[Math.floor(Math.random() * biome.obstacleTypes.length)]) as ObstacleKind;
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

  const triggerOceanEvent = useCallback(() => {
    const types: OceanEventType[] = ['tsunami', 'pirateAmbush', 'treasureStorm', 'seaSerpent', 'ghostFleet', 'meteorShower'];
    const type = types[Math.floor(Math.random() * types.length)];
    const def = OCEAN_EVENTS[type];
    setOceanEvent(type);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const biome = getBiomeForDistance(distanceRef.current);
    for (let i = 0; i < def.burstCount; i++) {
      setTimeout(() => {
        if (gameOverRef.current) return;
        const kind = def.obstacleKinds[Math.floor(Math.random() * def.obstacleKinds.length)];
        spawnObstacle(biome, kind);
      }, 300 + i * 280);
    }
    setTimeout(() => setOceanEvent(null), 3000);
  }, [spawnObstacle]);

  const triggerBossPhase = useCallback((boss: BossDef) => {
    currentBossRef.current = boss;
    setActiveBoss(boss);
    setShowBossIntro(true);
    setBossPhaseActive(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setTimeout(() => setShowBossIntro(false), 3500);
    const biome = getBiomeForDistance(distanceRef.current);
    for (let wave = 0; wave < 6; wave++) {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          if (gameOverRef.current) return;
          spawnObstacle(biome);
          if (i === 1) spawnObstacle(biome);
        }, wave * 900 + i * 200);
      }
    }
  }, [spawnObstacle]);

  // Game loop
  useEffect(() => {
    if (!gameStarted || gameOver) return;
    const interval = setInterval(() => {
      if (pausedRef.current || gameOverRef.current) return;

      // Distance + speed
      const captainSpeedBonus = hasCaptain ? 1.15 : 1.0;
      distanceRef.current += gameSpeedRef.current * 0.38;
      gameSpeedRef.current = Math.min(14, (2.8 + distanceRef.current / 600) * captainSpeedBonus);

      // Steering
      if (steerDirRef.current !== 0) {
        const steerSpeed = hasNavigator ? 8.5 : 5.5;
        boatXOffsetRef.current = Math.max(
          -MAX_STEER_OFFSET,
          Math.min(MAX_STEER_OFFSET, boatXOffsetRef.current + steerDirRef.current * steerSpeed)
        );
      }

      // Biome check
      const biome = getBiomeForDistance(distanceRef.current);
      if (biome.id !== prevBiomeIdRef.current) {
        prevBiomeIdRef.current = biome.id;
        setCurrentBiome(biome);
        setShowBiomeTransition(true);
        setTimeout(() => setShowBiomeTransition(false), 3200);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Engineer: heal damaged blocks
      if (hasEngineer) {
        engineerTickRef.current++;
        if (engineerTickRef.current >= ENGINEER_INTERVAL_TICKS) {
          engineerTickRef.current = 0;
          let healed = 0;
          outer: for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
              const block = blocksRef.current[r]?.[c];
              if (block && block.hp < block.maxHp) {
                block.hp = Math.min(block.maxHp, block.hp + 3);
                healed++;
                if (healed >= 3) break outer;
              }
            }
          }
        }
      }

      // Ocean events
      if (distanceRef.current >= nextEventDistRef.current && bossPhaseEndDistRef.current === 0) {
        nextEventDistRef.current += 450 + Math.random() * 350;
        triggerOceanEvent();
      }

      // Boss encounters
      if (distanceRef.current >= nextBossDistRef.current && bossPhaseEndDistRef.current === 0) {
        nextBossDistRef.current += 2200 + Math.random() * 500;
        bossPhaseEndDistRef.current = distanceRef.current + 600;
        const bossIdx = Math.floor(Math.random() * BOSSES.length);
        triggerBossPhase(BOSSES[bossIdx]);
      }

      // Clear boss phase
      if (bossPhaseEndDistRef.current > 0 && distanceRef.current >= bossPhaseEndDistRef.current) {
        bossPhaseEndDistRef.current = 0;
        const boss = currentBossRef.current;
        if (boss) {
          addCoins(boss.reward);
          setBossPhaseActive(false);
          setActiveBoss(null);
        }
      }

      // Move obstacles
      obstaclesRef.current = obstaclesRef.current.map((o) => ({ ...o, y: o.y + o.speed * 1.15 }));
      obstaclesRef.current = obstaclesRef.current.filter((o) => o.y < SH + 90);

      // Spawn
      spawnCounterRef.current++;
      const spawnInterval = Math.max(7, SPAWN_BASE / biome.spawnRateMult - distanceRef.current / 800);
      if (spawnCounterRef.current >= spawnInterval) {
        spawnCounterRef.current = 0;
        spawnObstacle(biome);
        if (distanceRef.current > 1500 && Math.random() < 0.25) spawnObstacle(biome);
        if (distanceRef.current > 4000 && Math.random() < 0.2) spawnObstacle(biome);
      }

      // Collision detection
      const damageMult = Math.min(1.0, 0.22 + distanceRef.current / 5500);
      const toRemove: string[] = [];
      const boatLeft = BOAT_LEFT_BASE + boatXOffsetRef.current;

      for (const obs of obstaclesRef.current) {
        const oL = obs.x - obs.w / 2, oR = obs.x + obs.w / 2;
        const oT = obs.y - obs.h / 2, oB = obs.y + obs.h / 2;
        let hit = false;
        for (let r = 0; r < GRID_ROWS && !hit; r++) {
          for (let c = 0; c < GRID_COLS && !hit; c++) {
            const block = blocksRef.current[r]?.[c];
            if (!block) continue;
            const bL = boatLeft + c * BLOCK_SIZE, bR = bL + BLOCK_SIZE;
            const bT = BOAT_TOP + r * BLOCK_SIZE, bB = bT + BLOCK_SIZE;
            if (oR > bL && oL < bR && oB > bT && oT < bB) {
              // Gunner: chance to deflect
              if (hasGunner && Math.random() < 0.30) {
                hit = true;
                break;
              }
              block.hp -= Math.max(1, Math.ceil(obs.damage * damageMult));
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
              pirateHitTrigger.current?.();
              hit = true;
            }
          }
        }
        if (hit) toRemove.push(obs.id);
      }
      obstaclesRef.current = obstaclesRef.current.filter((o) => !toRemove.includes(o.id));

      if (allDestroyed()) { triggerGameOver(); return; }

      setBoatXOffset(boatXOffsetRef.current);
      setTick((t) => t + 1);
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [gameStarted, gameOver, spawnObstacle, allDestroyed, triggerGameOver, triggerOceanEvent, triggerBossPhase, hasCaptain, hasEngineer, hasGunner, hasNavigator, addCoins]);

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
    finishRun(dist, surviving, hasMerchant);
    router.replace('/');
  };

  const dist = Math.floor(distanceRef.current);
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0);
  const boatLeft = BOAT_LEFT_BASE + boatXOffset;

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
          {bossPhaseActive && activeBoss && (
            <View style={[styles.bossHudBadge, { borderColor: activeBoss.color }]}>
              <Text style={{ fontSize: 11 }}>{activeBoss.emoji}</Text>
              <Text style={[styles.bossHudTxt, { color: activeBoss.color }]}>BOSS</Text>
            </View>
          )}
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

      {/* Crew indicators */}
      {gameStarted && !gameOver && (ownedCrew.length > 0) && (
        <View style={[styles.crewBar, { top: topPad + 80 }]}>
          {ownedCrew.map((role) => {
            const emoji = role === 'navigator' ? '🧭' : role === 'engineer' ? '🔧' : role === 'gunner' ? '💣' : role === 'merchant' ? '💰' : '👑';
            return (
              <View key={role} style={styles.crewChip}>
                <Text style={{ fontSize: 11 }}>{emoji}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Boat */}
      <View style={{ position: 'absolute', left: boatLeft, top: BOAT_TOP, width: BOAT_W, height: BOAT_H }}>
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

      {/* Pirate character */}
      <PirateCharacter triggerHitRef={pirateHitTrigger} isAlive={pirateAlive} xOffset={boatXOffset} />

      {/* Obstacles */}
      {obstaclesRef.current.map((obs) => <ObstacleView key={obs.id} obs={obs} />)}

      {/* Corner minimap */}
      {gameStarted && !gameOver && (
        <CornerMinimap distance={dist} biome={currentBiome} onExpand={() => setShowMap(true)} bottom={botPad + 40} />
      )}

      {/* Steering controls */}
      {gameStarted && !gameOver && !paused && (
        <>
          <Pressable
            onPressIn={() => { steerDirRef.current = -1; }}
            onPressOut={() => { steerDirRef.current = 0; }}
            style={[styles.steerBtn, styles.steerLeft, { bottom: botPad + 80 }]}
          >
            <Ionicons name="arrow-back" size={28} color="#F8FAFC" />
            <Text style={styles.steerLabel}>STEER</Text>
          </Pressable>
          <Pressable
            onPressIn={() => { steerDirRef.current = 1; }}
            onPressOut={() => { steerDirRef.current = 0; }}
            style={[styles.steerBtn, styles.steerRight, { bottom: botPad + 80 }]}
          >
            <Ionicons name="arrow-forward" size={28} color="#F8FAFC" />
            <Text style={styles.steerLabel}>STEER</Text>
          </Pressable>
        </>
      )}

      {/* Speed bar */}
      {gameStarted && !gameOver && (
        <View style={[styles.speedBar, { bottom: botPad + 10 }]}>
          <Text style={styles.speedLabel}>SPEED</Text>
          <View style={styles.speedTrack}>
            <View style={[styles.speedFill, { width: `${Math.min(100, (gameSpeedRef.current / 14) * 100)}%`, backgroundColor: currentBiome.mapColor }]} />
          </View>
        </View>
      )}

      {/* Ocean event banner */}
      <OceanEventBanner event={oceanEvent ? OCEAN_EVENTS[oceanEvent] : null} visible={oceanEvent !== null} />

      {/* Boss intro overlay */}
      <BossIntroOverlay boss={activeBoss} visible={showBossIntro} />

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
            <Text style={styles.overlayDesc}>Navigate 6 deadly biomes to claim the treasure at 10,000m!</Text>
            {ownedCrew.length > 0 && (
              <View style={styles.prelaunchCrew}>
                <Text style={styles.prelaunchCrewLbl}>⚓ Crew aboard: </Text>
                {ownedCrew.map(r => <Text key={r} style={{ fontSize: 18 }}>{r === 'navigator' ? '🧭' : r === 'engineer' ? '🔧' : r === 'gunner' ? '💣' : r === 'merchant' ? '💰' : '👑'}</Text>)}
              </View>
            )}
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
              <Ionicons name="play" size={18} color="#fff" />
              <Text style={styles.resumeTxt}>Resume</Text>
            </Pressable>
            <Pressable style={styles.mapBtnPause} onPress={() => setShowMap(true)}>
              <Ionicons name="map-outline" size={16} color="#D97706" />
              <Text style={styles.mapBtnTxt}>Treasure Map</Text>
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
                <Text style={styles.goStatLbl}>{hasMerchant ? '💰 Coins (×1.6)' : 'Coins'}</Text>
              </View>
              <View style={styles.goStat}>
                <Ionicons name="star" size={18} color="#818CF8" />
                <Text style={[styles.goStatNum, { color: '#818CF8' }]}>+{runResult.xp}</Text>
                <Text style={styles.goStatLbl}>XP</Text>
              </View>
            </View>
            {runResult.leveledUp && (
              <Pressable style={styles.levelUpPrompt} onPress={() => setShowLevelUp(true)}>
                <Text style={styles.levelUpPromptTxt}>🎉 Level {runResult.newLevel} reached! Tap to celebrate</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => router.replace('/build')}
              style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }], borderRadius: 13, overflow: 'hidden', width: SW - 48 - 56, alignSelf: 'center' }]}
            >
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
  bossHudBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0F172ACC', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1.5 },
  bossHudTxt: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1 },
  hudRight: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  hudBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0F172ACC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },

  crewBar: { position: 'absolute', right: 14, flexDirection: 'column', gap: 4, zIndex: 10 },
  crewChip: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#0F172ACC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },

  steerBtn: { position: 'absolute', width: 72, height: 72, borderRadius: 36, backgroundColor: '#0F172ACC', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1E3A5F', zIndex: 15 },
  steerLeft: { left: 14 },
  steerRight: { right: 14 },
  steerLabel: { color: '#475569', fontFamily: 'Inter_600SemiBold', fontSize: 8, letterSpacing: 1, marginTop: 1 },

  speedBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 10 },
  speedLabel: { color: '#334155', fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 1, width: 40 },
  speedTrack: { flex: 1, height: 5, backgroundColor: '#1E293B', borderRadius: 3, overflow: 'hidden' },
  speedFill: { height: '100%', borderRadius: 3 },

  biomeOverlay: { position: 'absolute', top: '28%', left: 0, right: 0, alignItems: 'center', gap: 6, zIndex: 20 },
  biomeEmoji: { fontSize: 44 },
  biomeName: { color: '#F8FAFC', fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: 1 },
  biomeSubt: { color: '#94A3B8', fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
  biomeHazardChip: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  biomeHazardTxt: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },

  eventBanner: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30 },
  eventBannerGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  eventEmoji: { fontSize: 28 },
  eventName: { color: '#0F172A', fontFamily: 'Inter_700Bold', fontSize: 16, letterSpacing: 1 },
  eventDesc: { color: '#0F172A', fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2, opacity: 0.85 },

  bossOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000BB', alignItems: 'center', justifyContent: 'center', zIndex: 40 },
  bossCard: { backgroundColor: '#0F172A', borderRadius: 24, padding: 28, alignItems: 'center', gap: 10, borderWidth: 2, width: SW - 60, overflow: 'hidden' },
  bossGlow: { ...StyleSheet.absoluteFillObject },
  bossWarning: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 2 },
  bossEmoji: { fontSize: 56 },
  bossName: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: 1 },
  bossSubtitle: { color: '#94A3B8', fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center' },
  bossReward: { color: '#F59E0B', fontFamily: 'Inter_600SemiBold', fontSize: 13, marginTop: 4 },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  overlayCard: { backgroundColor: '#1E293B', borderRadius: 22, padding: 24, marginHorizontal: 28, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#334155', width: SW - 56 },
  overlayEmoji: { fontSize: 36 },
  overlayTitle: { color: '#F8FAFC', fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: 2 },
  overlayDesc: { color: '#94A3B8', fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', lineHeight: 19 },
  prelaunchCrew: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0F172A', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#334155' },
  prelaunchCrewLbl: { color: '#475569', fontFamily: 'Inter_400Regular', fontSize: 11 },
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
  mapDist: { color: '#92400E', fontFamily: 'Inter_400Regular', fontSize: 12 },
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

  minimapWrap: { position: 'absolute', right: 12, zIndex: 15 },
  minimapCard: { borderRadius: 11, padding: 2, borderWidth: 2, borderColor: '#7C4E18', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 6 },
  minimapTexture: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 9, backgroundColor: '#00000008' },
  minimapTitle: { color: '#3D1A00', fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 1.5, textAlign: 'center', marginBottom: 3 },
  minimapPath: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 2 },
  minimapDot: { width: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  minimapLine: { width: 8, height: 2, borderRadius: 1, backgroundColor: '#4A2E0A' },
  minimapProgTrack: { height: 3, backgroundColor: '#5C3310', borderRadius: 2, marginHorizontal: 4, marginBottom: 3, overflow: 'hidden' },
  minimapProgFill: { height: '100%', borderRadius: 2 },
  minimapDist: { color: '#3D1A00', fontFamily: 'Inter_700Bold', fontSize: 9, paddingHorizontal: 4 },
  minimapTapHint: { color: '#6B3A10', fontFamily: 'Inter_400Regular', fontSize: 8, paddingHorizontal: 4 },
});
