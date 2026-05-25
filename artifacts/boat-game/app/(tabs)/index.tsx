import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
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

import { RARITY_COLORS } from '@/constants/blocks';
import { BIOMES } from '@/constants/biomes';
import { xpForLevel } from '@/constants/progression';
import { useGame } from '@/contexts/GameContext';

const { width: SW } = Dimensions.get('window');
const STRIPE_H = 180;

function OceanBackground() {
  const scroll = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(scroll, { toValue: STRIPE_H, duration: 2200, useNativeDriver: true })
    ).start();
  }, []);
  return (
    <View style={[StyleSheet.absoluteFillObject, { pointerEvents: 'none' } as any]}>
      <LinearGradient colors={['#040D1A', '#071C40', '#040D1A']} style={StyleSheet.absoluteFillObject} />
      {[0, STRIPE_H].map((offset, i) => (
        <Animated.View
          key={i}
          style={[StyleSheet.absoluteFillObject, { transform: [{ translateY: Animated.add(scroll, new Animated.Value(offset)) }] }]}
        >
          {Array.from({ length: 9 }).map((_, j) => (
            <View
              key={j}
              style={{
                position: 'absolute',
                top: j * (STRIPE_H / 9),
                left: j % 2 === 0 ? 0 : 24,
                right: j % 2 === 0 ? 24 : 0,
                height: 14 + (j % 3) * 8,
                backgroundColor: j % 7 === 0 ? '#FFFFFF' : '#1D4ED8',
                opacity: j % 7 === 0 ? 0.015 : 0.04,
                borderRadius: 7,
              }}
            />
          ))}
        </Animated.View>
      ))}
    </View>
  );
}

function BoatPreview() {
  const float = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -7, duration: 1000, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const rows = [
    ['T', 'T', '#FEF3C7', '#FEF3C7', 'T', 'T'],
    ['#B45309', '#B45309', '#B45309', '#B45309', '#B45309', '#B45309'],
    ['#6B7280', '#6B7280', '#EC4899', '#EC4899', '#6B7280', '#6B7280'],
    ['#A78BFA', '#A97706', '#A97706', '#A97706', '#A97706', '#A78BFA'],
    ['#A78BFA', '#6B7280', '#6B7280', '#6B7280', '#6B7280', '#A78BFA'],
  ];

  return (
    <Animated.View style={{ alignItems: 'center', transform: [{ translateY: float }] }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 3, marginBottom: 3 }}>
          {row.map((c, i) => (
            <View
              key={i}
              style={{
                width: 38,
                height: 38,
                borderRadius: 7,
                backgroundColor: c === 'T' ? 'transparent' : c,
                borderWidth: c === 'T' ? 0 : 1.5,
                borderColor: c === 'T' ? 'transparent' : c + 'CC',
              }}
            />
          ))}
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 5 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <View key={i} style={{ width: 26, height: 7, backgroundColor: '#2563EB', borderRadius: 3, opacity: 0.5 + (i % 2) * 0.3 }} />
        ))}
      </View>
    </Animated.View>
  );
}

function XpBar({ level, xpInLevel, xpNeeded }: { level: number; xpInLevel: number; xpNeeded: number }) {
  const pct = Math.min(1, xpInLevel / xpNeeded);
  return (
    <View style={styles.xpBarWrap}>
      <View style={styles.xpBarTrack}>
        <LinearGradient
          colors={['#818CF8', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.xpBarFill, { width: `${pct * 100}%` }]}
        />
      </View>
      <Text style={styles.xpBarLabel}>{xpInLevel}/{xpNeeded} XP</Text>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { coins, bestDistance, totalRuns, unlockedBlocks, playerLevel, xpInLevel, xpNeeded } = useGame();
  const titleAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(titleAnim, { toValue: 1, useNativeDriver: true, tension: 55, friction: 8 }),
      Animated.spring(contentAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
    ]).start();
  }, []);

  const nav = (path: '/build' | '/shop' | '/garage') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(path);
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 12);

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>
      <OceanBackground />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.levelBadge}>
          <LinearGradient colors={['#4338CA', '#6D28D9']} style={styles.levelGrad}>
            <Text style={styles.levelNum}>{playerLevel}</Text>
          </LinearGradient>
          <View>
            <Text style={styles.levelLabel}>LEVEL</Text>
            <XpBar level={playerLevel} xpInLevel={xpInLevel} xpNeeded={xpNeeded} />
          </View>
        </View>
        <View style={styles.coinBadge}>
          <Ionicons name="logo-bitcoin" size={17} color="#F59E0B" />
          <Text style={styles.coinText}>{coins.toLocaleString()}</Text>
        </View>
      </View>

      {/* Title */}
      <Animated.View style={[styles.titleSection, { opacity: titleAnim, transform: [{ translateY: titleAnim.interpolate({ inputRange: [0,1], outputRange: [-30,0] }) }] }]}>
        <Text style={styles.pirateTitle}>⚓ PIRATE SEAS ⚓</Text>
        <Text style={styles.pirateSubtitle}>BUILD A BOAT FOR TREASURE</Text>
      </Animated.View>

      {/* Boat */}
      <Animated.View style={{ opacity: titleAnim, transform: [{ scale: titleAnim }], alignItems: 'center', paddingVertical: 6 }}>
        <BoatPreview />
      </Animated.View>

      {/* Biome preview */}
      <Animated.View style={[styles.biomeRow, { opacity: contentAnim }]}>
        {BIOMES.map((b) => (
          <View key={b.id} style={[styles.biomeChip, { borderColor: b.mapColor + '55' }]}>
            <Text style={styles.biomeEmoji}>{b.emoji}</Text>
          </View>
        ))}
        <View style={styles.biomeArrow}>
          <Ionicons name="chevron-forward" size={12} color="#475569" />
        </View>
        <View style={styles.biomeChip}>
          <Text style={styles.biomeEmoji}>💰</Text>
        </View>
      </Animated.View>

      {/* Stats */}
      <Animated.View style={[styles.statsRow, { opacity: contentAnim }]}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{unlockedBlocks.length}</Text>
          <Text style={styles.statLbl}>Materials</Text>
        </View>
        <View style={[styles.statCard, { borderColor: '#F59E0B44' }]}>
          <Text style={[styles.statNum, { color: '#F59E0B' }]}>{bestDistance}m</Text>
          <Text style={styles.statLbl}>Best Run</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{totalRuns}</Text>
          <Text style={styles.statLbl}>Launches</Text>
        </View>
      </Animated.View>

      {/* Buttons */}
      <Animated.View style={[styles.btns, { opacity: contentAnim, transform: [{ translateY: contentAnim.interpolate({ inputRange: [0,1], outputRange: [24,0] }) }] }]}>
        <Pressable onPress={() => nav('/build')} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
          <LinearGradient colors={['#F59E0B', '#D97706']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnPlay}>
            <Ionicons name="hammer" size={22} color="#0F172A" />
            <Text style={styles.btnPlayTxt}>BUILD & SAIL</Text>
            <Ionicons name="chevron-forward" size={20} color="#0F172A" />
          </LinearGradient>
        </Pressable>
        <View style={styles.row}>
          <Pressable onPress={() => nav('/garage')} style={({ pressed }) => [styles.btnSec, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
            <Ionicons name="boat-outline" size={24} color="#60A5FA" />
            <Text style={styles.btnSecTxt}>Garage</Text>
          </Pressable>
          <Pressable onPress={() => nav('/shop')} style={({ pressed }) => [styles.btnSec, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
            <Ionicons name="storefront-outline" size={24} color="#34D399" />
            <Text style={styles.btnSecTxt}>Shop</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#040D1A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelGrad: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  levelNum: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 18 },
  levelLabel: { color: '#94A3B8', fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1 },
  xpBarWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  xpBarTrack: { width: 100, height: 5, backgroundColor: '#1E293B', borderRadius: 3, overflow: 'hidden' },
  xpBarFill: { height: '100%', borderRadius: 3 },
  xpBarLabel: { color: '#475569', fontFamily: 'Inter_400Regular', fontSize: 9 },
  coinBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, gap: 5, borderWidth: 1, borderColor: '#F59E0B44' },
  coinText: { color: '#F59E0B', fontFamily: 'Inter_700Bold', fontSize: 15 },
  titleSection: { alignItems: 'center', paddingVertical: 4 },
  pirateTitle: { color: '#F8FAFC', fontFamily: 'Inter_700Bold', fontSize: 26, letterSpacing: 2 },
  pirateSubtitle: { color: '#F59E0B', fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 4, marginTop: 2 },
  biomeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6 },
  biomeChip: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  biomeEmoji: { fontSize: 16 },
  biomeArrow: { paddingHorizontal: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingHorizontal: 16 },
  statCard: { flex: 1, backgroundColor: '#1E293B', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  statNum: { color: '#F8FAFC', fontFamily: 'Inter_700Bold', fontSize: 20 },
  statLbl: { color: '#64748B', fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  btns: { paddingHorizontal: 16, gap: 10, marginTop: 10 },
  btnPlay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, borderRadius: 15, gap: 10 },
  btnPlayTxt: { color: '#0F172A', fontFamily: 'Inter_700Bold', fontSize: 19, letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 10 },
  btnSec: { flex: 1, backgroundColor: '#1E293B', borderRadius: 13, paddingVertical: 15, alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#334155' },
  btnSecTxt: { color: '#CBD5E1', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
});
