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

import { BLOCK_DEFS } from '@/constants/blocks';
import { useGame } from '@/contexts/GameContext';

const { width, height } = Dimensions.get('window');
const STRIPE_H = 200;

function RiverBackground() {
  const scrollAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(scrollAnim, {
        toValue: STRIPE_H,
        duration: 1800,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const stripes = Array.from({ length: 10 });

  return (
    <View style={[StyleSheet.absoluteFillObject, { pointerEvents: 'none' } as any]}>
      <LinearGradient
        colors={['#0F172A', '#0B1E3D', '#071428']}
        style={StyleSheet.absoluteFillObject}
      />
      {[0, STRIPE_H].map((offset, idx) => (
        <Animated.View
          key={idx}
          style={[
            StyleSheet.absoluteFillObject,
            { transform: [{ translateY: Animated.add(scrollAnim, new Animated.Value(offset)) }] },
          ]}
        >
          {stripes.map((_, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                top: i * (STRIPE_H / stripes.length),
                left: 0,
                right: 0,
                height: 12 + (i % 3) * 6,
                backgroundColor: '#1D4ED8',
                opacity: 0.05 + (i % 4) * 0.015,
                borderRadius: 6,
                marginHorizontal: (i % 3) * 20,
              }}
            />
          ))}
        </Animated.View>
      ))}
    </View>
  );
}

function BoatPreview() {
  const floatAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 900, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const rows: string[][] = [
    ['transparent', '#34D399', '#6B7280', '#6B7280', '#34D399', 'transparent'],
    ['#D97706', '#D97706', '#D97706', '#D97706', '#D97706', '#D97706'],
    ['#D97706', '#6B7280', '#FDE68A', '#FDE68A', '#6B7280', '#D97706'],
    ['#8B5CF6', '#8B5CF6', '#D97706', '#D97706', '#8B5CF6', '#8B5CF6'],
  ];

  return (
    <Animated.View style={[styles.boatWrap, { transform: [{ translateY: floatAnim }] }]}>
      {rows.map((row, r) => (
        <View key={r} style={styles.boatRow}>
          {row.map((color, c) => (
            <View
              key={c}
              style={[
                styles.previewBlock,
                color === 'transparent'
                  ? { backgroundColor: 'transparent' }
                  : {
                      backgroundColor: color,
                      borderColor: color + 'BB',
                      borderWidth: 1.5,
                      shadowColor: color,
                      shadowOpacity: 0.5,
                      shadowRadius: 4,
                      elevation: 3,
                    },
              ]}
            />
          ))}
        </View>
      ))}
      <View style={styles.waterRow}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={[styles.waterDot, { opacity: 0.4 + (i % 2) * 0.3 }]} />
        ))}
      </View>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { coins, bestDistance, totalRuns, unlockedBlocks } = useGame();

  const titleAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;
  const btnAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(titleAnim, { toValue: 1, useNativeDriver: true, tension: 60 }),
      Animated.parallel([
        Animated.spring(cardsAnim, { toValue: 1, useNativeDriver: true, tension: 50 }),
        Animated.spring(btnAnim, { toValue: 1, useNativeDriver: true, tension: 50 }),
      ]),
    ]).start();
  }, []);

  const nav = (path: '/build' | '/shop' | '/garage') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(path);
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 16);

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>
      <RiverBackground />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.coinBadge}>
          <Ionicons name="logo-bitcoin" size={18} color="#F59E0B" />
          <Text style={styles.coinText}>{coins.toLocaleString()}</Text>
        </View>
        <View style={styles.statsGroup}>
          <View style={styles.statBadge}>
            <Ionicons name="navigate" size={12} color="#94A3B8" />
            <Text style={styles.statText}>{bestDistance}m best</Text>
          </View>
          <View style={styles.statBadge}>
            <Ionicons name="boat" size={12} color="#94A3B8" />
            <Text style={styles.statText}>{totalRuns} runs</Text>
          </View>
        </View>
      </View>

      {/* Title */}
      <Animated.View
        style={[
          styles.titleSection,
          {
            opacity: titleAnim,
            transform: [
              {
                translateY: titleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-40, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.titleTop}>BUILD A BOAT</Text>
        <Text style={styles.titleSub}>FOR TREASURE</Text>
      </Animated.View>

      {/* Boat preview */}
      <Animated.View style={{ opacity: titleAnim, transform: [{ scale: titleAnim }] }}>
        <BoatPreview />
      </Animated.View>

      {/* Quick stats */}
      <Animated.View
        style={[
          styles.statsRow,
          {
            opacity: cardsAnim,
            transform: [
              {
                translateY: cardsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.statCard}>
          <Text style={styles.statCardNum}>{unlockedBlocks.length}</Text>
          <Text style={styles.statCardLabel}>Materials</Text>
        </View>
        <View style={[styles.statCard, styles.statCardHighlight]}>
          <Text style={[styles.statCardNum, { color: '#F59E0B' }]}>{bestDistance}m</Text>
          <Text style={styles.statCardLabel}>Best Run</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardNum}>{totalRuns}</Text>
          <Text style={styles.statCardLabel}>Launches</Text>
        </View>
      </Animated.View>

      {/* Buttons */}
      <Animated.View
        style={[
          styles.buttonsSection,
          {
            opacity: btnAnim,
            transform: [
              {
                translateY: btnAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [40, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Pressable
          onPress={() => nav('/build')}
          style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
        >
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnPlay}
          >
            <Ionicons name="hammer" size={24} color="#0F172A" />
            <Text style={styles.btnPlayText}>BUILD & SAIL</Text>
            <Ionicons name="chevron-forward" size={22} color="#0F172A" />
          </LinearGradient>
        </Pressable>

        <View style={styles.secondaryRow}>
          <Pressable
            onPress={() => nav('/garage')}
            style={({ pressed }) => [
              styles.btnSecondary,
              { transform: [{ scale: pressed ? 0.95 : 1 }] },
            ]}
          >
            <Ionicons name="boat-outline" size={26} color="#60A5FA" />
            <Text style={styles.btnSecondaryText}>Garage</Text>
          </Pressable>
          <Pressable
            onPress={() => nav('/shop')}
            style={({ pressed }) => [
              styles.btnSecondary,
              { transform: [{ scale: pressed ? 0.95 : 1 }] },
            ]}
          >
            <Ionicons name="storefront-outline" size={26} color="#34D399" />
            <Text style={styles.btnSecondaryText}>Shop</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: '#F59E0B44',
  },
  coinText: {
    color: '#F59E0B',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  statsGroup: {
    gap: 6,
    alignItems: 'flex-end',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: '#94A3B8',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  titleSection: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  titleTop: {
    color: '#F8FAFC',
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    letterSpacing: 3,
  },
  titleSub: {
    color: '#F59E0B',
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    letterSpacing: 6,
    marginTop: -4,
  },
  boatWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  boatRow: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 3,
  },
  previewBlock: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  waterRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    opacity: 0.7,
  },
  waterDot: {
    width: 28,
    height: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statCardHighlight: {
    borderColor: '#F59E0B44',
    backgroundColor: '#1E293B',
  },
  statCardNum: {
    color: '#F8FAFC',
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
  },
  statCardLabel: {
    color: '#64748B',
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
  buttonsSection: {
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 16,
  },
  btnPlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
  },
  btnPlayText: {
    color: '#0F172A',
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    letterSpacing: 1,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  btnSecondaryText: {
    color: '#CBD5E1',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
});
