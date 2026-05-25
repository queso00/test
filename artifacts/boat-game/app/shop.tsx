import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ALL_BLOCK_TYPES,
  BLOCK_DEFS,
  RARITY_BG,
  RARITY_COLORS,
  RARITY_LABELS,
  type BlockRarity,
  type BlockType,
} from '@/constants/blocks';
import { useGame } from '@/contexts/GameContext';

type ShopTab = 'all' | BlockRarity | 'packs';

const CATEGORIES: { id: ShopTab; label: string; icon: string }[] = [
  { id: 'packs', label: 'Stock Up', icon: 'bag-outline' },
  { id: 'all', label: 'Unlock All', icon: 'grid-outline' },
  { id: 'common', label: 'Common', icon: 'cube-outline' },
  { id: 'rare', label: 'Rare', icon: 'diamond-outline' },
  { id: 'epic', label: 'Epic', icon: 'flash-outline' },
  { id: 'legendary', label: 'Legendary', icon: 'star-outline' },
];

interface BlockPack {
  type: BlockType;
  qty: number;
  cost: number;
  label: string;
  desc: string;
}

function buildPacks(unlocked: BlockType[]): BlockPack[] {
  return unlocked.map((type) => {
    const def = BLOCK_DEFS[type];
    const baseQty = type === 'wood' ? 20 : type === 'reinforced_wood' || type === 'glass' ? 15 : type === 'metal' || type === 'stone' ? 12 : type === 'iron' || type === 'obsidian' ? 8 : type === 'ice_block' || type === 'lava_stone' ? 6 : 4;
    const cost = Math.max(50, Math.floor(def.unlockCost * 0.18) * baseQty);
    return {
      type,
      qty: baseQty,
      cost,
      label: `${def.name} Pack`,
      desc: `${baseQty}× ${def.name} blocks · ${def.hp} HP each`,
    };
  });
}

function PackItem({
  pack,
  canAfford,
  currentCount,
  onBuy,
}: {
  pack: BlockPack;
  canAfford: boolean;
  currentCount: number;
  onBuy: () => void;
}) {
  const def = BLOCK_DEFS[pack.type];
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const rarityColor = RARITY_COLORS[def.rarity];

  const handlePress = () => {
    if (!canAfford) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 70, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
    onBuy();
  };

  return (
    <Animated.View
      style={[
        styles.packItem,
        { borderColor: rarityColor + '33', transform: [{ scale: scaleAnim }] },
      ]}
    >
      <LinearGradient
        colors={[RARITY_BG[def.rarity], '#111827']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.packIcon, { backgroundColor: def.color }]}>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 11, color: '#fff' }}>×{pack.qty}</Text>
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.packName}>{pack.label}</Text>
          <View style={[styles.rarityTag, { backgroundColor: rarityColor + '22' }]}>
            <Text style={[styles.rarityTagTxt, { color: rarityColor }]}>
              {RARITY_LABELS[def.rarity]}
            </Text>
          </View>
        </View>
        <Text style={styles.packDesc}>{pack.desc}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={styles.stockPill}>
            <Text style={styles.stockPillTxt}>In stock: {currentCount}</Text>
          </View>
          <View style={styles.hpPill}>
            <Text style={styles.hpPillTxt}>⚔ {def.hp} HP each</Text>
          </View>
          {def.special && (
            <View style={styles.specialPill}>
              <Text style={styles.specialPillTxt}>✦ {def.special}</Text>
            </View>
          )}
        </View>
      </View>

      <Pressable
        onPress={handlePress}
        style={[
          styles.packBuyBtn,
          !canAfford && { backgroundColor: '#2D1B00' },
        ]}
      >
        <Ionicons name="logo-bitcoin" size={12} color={canAfford ? '#0F172A' : '#F97316'} />
        <Text style={[styles.packBuyTxt, { color: canAfford ? '#0F172A' : '#F97316' }]}>
          {pack.cost}
        </Text>
        {!canAfford && (
          <Text style={{ color: '#7C2D12', fontFamily: 'Inter_400Regular', fontSize: 9 }}>
            low
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

function ShopItem({
  type,
  owned,
  canAfford,
  levelLocked,
  playerLevel,
  onBuy,
}: {
  type: string;
  owned: boolean;
  canAfford: boolean;
  levelLocked: boolean;
  playerLevel: number;
  onBuy: () => void;
}) {
  const def = BLOCK_DEFS[type as keyof typeof BLOCK_DEFS];
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const rarityColor = RARITY_COLORS[def.rarity];

  const handlePress = () => {
    if (owned || !canAfford || levelLocked) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 70, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
    onBuy();
  };

  return (
    <Animated.View
      style={[
        styles.item,
        {
          borderColor: owned ? rarityColor + '44' : '#1E293B',
          backgroundColor: owned ? RARITY_BG[def.rarity] : '#111827',
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={[styles.rarityStripe, { backgroundColor: rarityColor }]} />

      <View
        style={[
          styles.blockIcon,
          {
            backgroundColor: def.color,
            shadowColor: def.color,
            shadowOpacity: owned ? 0.5 : 0.2,
            shadowRadius: 8,
            elevation: owned ? 6 : 2,
          },
        ]}
      >
        {owned && (
          <View style={styles.ownedCheck}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
        )}
        {levelLocked && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={16} color="#94A3B8" />
          </View>
        )}
      </View>

      <View style={styles.itemInfo}>
        <View style={styles.itemNameRow}>
          <Text style={styles.itemName}>{def.name}</Text>
          <View style={[styles.rarityTag, { backgroundColor: rarityColor + '22' }]}>
            <Text style={[styles.rarityTagTxt, { color: rarityColor }]}>
              {RARITY_LABELS[def.rarity]}
            </Text>
          </View>
        </View>
        <Text style={styles.itemDesc}>{def.description}</Text>
        <View style={styles.itemStats}>
          <View style={styles.statPill}>
            <Text style={styles.statPillTxt}>⚔ {def.hp} HP</Text>
          </View>
          {def.special && (
            <View style={[styles.statPill, { backgroundColor: '#1E293B' }]}>
              <Text style={[styles.statPillTxt, { color: '#818CF8' }]}>✦ {def.special}</Text>
            </View>
          )}
          {levelLocked && (
            <View style={[styles.statPill, { backgroundColor: '#EF444422' }]}>
              <Text style={[styles.statPillTxt, { color: '#EF4444' }]}>
                Lv {def.levelRequired} req.
              </Text>
            </View>
          )}
        </View>
      </View>

      <Pressable
        onPress={handlePress}
        style={[
          styles.buyBtn,
          owned && { backgroundColor: '#162018', borderWidth: 1, borderColor: '#22C55E44' },
          levelLocked && { backgroundColor: '#1E293B' },
          !canAfford && !owned && !levelLocked && { backgroundColor: '#2D1B00' },
        ]}
      >
        {owned ? (
          <Text style={[styles.buyTxt, { color: '#22C55E', fontSize: 12 }]}>Owned</Text>
        ) : levelLocked ? (
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Ionicons name="lock-closed" size={14} color="#475569" />
            <Text style={[styles.buyTxt, { color: '#475569', fontSize: 10 }]}>
              Lv {def.levelRequired}
            </Text>
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Ionicons
                name="logo-bitcoin"
                size={12}
                color={canAfford ? '#0F172A' : '#F97316'}
              />
              <Text style={[styles.buyTxt, { color: canAfford ? '#0F172A' : '#F97316' }]}>
                {def.unlockCost.toLocaleString()}
              </Text>
            </View>
            {!canAfford && (
              <Text style={{ color: '#7C2D12', fontFamily: 'Inter_400Regular', fontSize: 9 }}>
                Not enough
              </Text>
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { coins, unlockedBlocks, unlockBlock, playerLevel, blockInventory, buyBlockPack } =
    useGame();
  const [tab, setTab] = useState<ShopTab>('packs');

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 16);

  const filtered = ALL_BLOCK_TYPES.filter(
    (t) => t !== 'wood' && (tab === 'all' || (tab !== 'packs' && BLOCK_DEFS[t].rarity === tab))
  );
  const packs = buildPacks(unlockedBlocks);

  const handleUnlock = (type: string) => {
    const def = BLOCK_DEFS[type as keyof typeof BLOCK_DEFS];
    if (playerLevel < def.levelRequired) {
      Alert.alert(
        'Level Required',
        `You need to be Level ${def.levelRequired} to unlock ${def.name}.`
      );
      return;
    }
    if (coins < def.unlockCost) {
      Alert.alert(
        'Not Enough Coins',
        `You need ${(def.unlockCost - coins).toLocaleString()} more coins.\n\nSail further to earn more!`
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const success = unlockBlock(type as any, def.unlockCost);
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '⚓ Unlocked!',
        `${def.name} blocks are now available in the Ship Builder!\n\nBuy packs in the "Stock Up" tab to start using them.`
      );
    }
  };

  const handleBuyPack = (pack: BlockPack) => {
    if (coins < pack.cost) {
      Alert.alert(
        'Not Enough Coins',
        `You need ${pack.cost - coins} more coins.\n\nSail further to earn more!`
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const success = buyBlockPack(pack.type, pack.qty, pack.cost);
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const def = BLOCK_DEFS[pack.type];
      Alert.alert(
        '⚓ Stocked Up!',
        `Added ${pack.qty}× ${def.name} to your inventory!\n\nUse them in the Ship Builder.`
      );
    }
  };

  const totalUnlockable = ALL_BLOCK_TYPES.filter((t) => t !== 'wood').length;
  const ownedCount = unlockedBlocks.filter((t) => t !== 'wood').length;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <LinearGradient
        colors={['#040D1A', '#060F1C']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="chevron-back" size={22} color="#94A3B8" />
        </Pressable>
        <View style={styles.headerMid}>
          <Text style={styles.title}>⚔ PIRATE SHOP</Text>
          <Text style={styles.subtitle}>{ownedCount}/{totalUnlockable} unlocked</Text>
        </View>
        <View style={styles.coinBadge}>
          <Ionicons name="logo-bitcoin" size={15} color="#F59E0B" />
          <Text style={styles.coinTxt}>{coins.toLocaleString()}</Text>
        </View>
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {CATEGORIES.map((cat) => {
          const isActive = tab === cat.id;
          const color =
            cat.id === 'packs'
              ? '#22C55E'
              : cat.id === 'all'
                ? '#60A5FA'
                : RARITY_COLORS[cat.id as BlockRarity] ?? '#60A5FA';
          return (
            <Pressable
              key={cat.id}
              onPress={() => {
                Haptics.selectionAsync();
                setTab(cat.id);
              }}
              style={[
                styles.tab,
                isActive && { backgroundColor: color + '22', borderColor: color },
                cat.id === 'packs' && styles.packsTab,
              ]}
            >
              <Ionicons name={cat.icon as any} size={14} color={isActive ? color : '#475569'} />
              <Text style={[styles.tabTxt, isActive && { color }]}>{cat.label}</Text>
              {cat.id === 'packs' && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeTxt}>!</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Content */}
      {tab === 'packs' ? (
        <>
          {/* Inventory banner */}
          <View style={styles.invBanner}>
            <Ionicons name="cube-outline" size={14} color="#60A5FA" />
            <Text style={styles.invBannerTxt}>Your inventory: </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {unlockedBlocks.map((t) => {
                  const cnt = blockInventory[t] ?? 0;
                  return (
                    <View key={t} style={[styles.invChip, { backgroundColor: cnt > 0 ? '#162032' : '#1A0505' }]}>
                      <View style={[styles.invDot, { backgroundColor: BLOCK_DEFS[t].color }]} />
                      <Text style={[styles.invChipTxt, { color: cnt > 0 ? '#60A5FA' : '#EF4444' }]}>
                        {cnt}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>BLOCK PACKS</Text>
            <Text style={styles.sectionSub}>Refill your builder inventory</Text>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.packList, { paddingBottom: botPad + 12 }]}
            showsVerticalScrollIndicator={false}
          >
            {packs.map((pack) => (
              <PackItem
                key={pack.type}
                pack={pack}
                canAfford={coins >= pack.cost}
                currentCount={blockInventory[pack.type] ?? 0}
                onBuy={() => handleBuyPack(pack)}
              />
            ))}
            {packs.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📦</Text>
                <Text style={styles.emptyTxt}>Unlock materials first to buy packs.</Text>
                <Pressable onPress={() => setTab('all')} style={styles.emptyBtn}>
                  <Text style={styles.emptyBtnTxt}>Browse Materials →</Text>
                </Pressable>
              </View>
            )}

            {/* Tip */}
            <View style={styles.packTip}>
              <Ionicons name="information-circle-outline" size={14} color="#475569" />
              <Text style={styles.packTipTxt}>
                Blocks are consumed when you sail. Level up to unlock new material types above.
              </Text>
            </View>
          </ScrollView>
        </>
      ) : (
        <>
          <View style={styles.tip}>
            <Ionicons name="navigate" size={14} color="#60A5FA" />
            <Text style={styles.tipTxt}>
              Unlock block types here · Buy packs to stock up in "Stock Up" tab
            </Text>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.list, { paddingBottom: botPad + 12 }]}
            showsVerticalScrollIndicator={false}
          >
            {filtered.map((type) => (
              <ShopItem
                key={type}
                type={type}
                owned={unlockedBlocks.includes(type)}
                canAfford={coins >= BLOCK_DEFS[type].unlockCost}
                levelLocked={playerLevel < BLOCK_DEFS[type].levelRequired}
                playerLevel={playerLevel}
                onBuy={() => handleUnlock(type)}
              />
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#040D1A' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 8,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#1E293B',
    alignItems: 'center', justifyContent: 'center',
  },
  headerMid: { flex: 1, alignItems: 'center' },
  title: { color: '#F8FAFC', fontFamily: 'Inter_700Bold', fontSize: 16, letterSpacing: 1 },
  subtitle: { color: '#475569', fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B',
    borderRadius: 18, paddingHorizontal: 10, paddingVertical: 6, gap: 4,
    borderWidth: 1, borderColor: '#F59E0B44',
  },
  coinTxt: { color: '#F59E0B', fontFamily: 'Inter_700Bold', fontSize: 14 },
  tabs: { paddingHorizontal: 14, gap: 8, paddingVertical: 4 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12,
    paddingVertical: 7, borderRadius: 20, backgroundColor: '#1E293B',
    borderWidth: 1.5, borderColor: '#334155',
  },
  packsTab: { borderColor: '#22C55E44' },
  tabTxt: { color: '#475569', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  newBadge: {
    backgroundColor: '#22C55E', borderRadius: 6, width: 14, height: 14,
    alignItems: 'center', justifyContent: 'center', marginLeft: -2,
  },
  newBadgeTxt: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 9 },
  tip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0B1A2E',
    marginHorizontal: 14, padding: 10, borderRadius: 10, marginTop: 6,
    borderWidth: 1, borderColor: '#1E3A5F',
  },
  tipTxt: { flex: 1, color: '#475569', fontFamily: 'Inter_400Regular', fontSize: 12 },
  list: { paddingHorizontal: 14, paddingTop: 8, gap: 10 },
  item: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12,
    gap: 10, borderWidth: 1.5, overflow: 'hidden',
  },
  rarityStripe: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
    borderTopLeftRadius: 14, borderBottomLeftRadius: 14,
  },
  blockIcon: { width: 52, height: 52, borderRadius: 10 },
  ownedCheck: {
    position: 'absolute', top: -4, right: -4, backgroundColor: '#22C55E',
    borderRadius: 10, width: 18, height: 18, alignItems: 'center', justifyContent: 'center',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject, borderRadius: 10,
    backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center',
  },
  itemInfo: { flex: 1, gap: 3 },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  itemName: { color: '#F8FAFC', fontFamily: 'Inter_700Bold', fontSize: 14 },
  rarityTag: { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  rarityTagTxt: { fontFamily: 'Inter_600SemiBold', fontSize: 9 },
  itemDesc: { color: '#475569', fontFamily: 'Inter_400Regular', fontSize: 11 },
  itemStats: { flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginTop: 2 },
  statPill: {
    backgroundColor: '#22C55E22', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  statPillTxt: { color: '#22C55E', fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  buyBtn: {
    backgroundColor: '#F59E0B', borderRadius: 10, paddingHorizontal: 10,
    paddingVertical: 10, minWidth: 72, alignItems: 'center', justifyContent: 'center',
  },
  buyTxt: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  invBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 14, marginTop: 8, backgroundColor: '#0B1627',
    borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#1E3A5F',
  },
  invBannerTxt: { color: '#334155', fontFamily: 'Inter_400Regular', fontSize: 11 },
  invChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  invDot: { width: 8, height: 8, borderRadius: 4 },
  invChipTxt: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  sectionHeader: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 2 },
  sectionTitle: { color: '#F8FAFC', fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 1 },
  sectionSub: { color: '#334155', fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  packList: { paddingHorizontal: 14, paddingTop: 8, gap: 10 },
  packItem: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12,
    gap: 10, borderWidth: 1.5, overflow: 'hidden',
  },
  packIcon: {
    width: 52, height: 52, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  packName: { color: '#F8FAFC', fontFamily: 'Inter_700Bold', fontSize: 13 },
  packDesc: { color: '#475569', fontFamily: 'Inter_400Regular', fontSize: 11 },
  stockPill: { backgroundColor: '#1E3A5F', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  stockPillTxt: { color: '#60A5FA', fontFamily: 'Inter_600SemiBold', fontSize: 9 },
  hpPill: { backgroundColor: '#22C55E22', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  hpPillTxt: { color: '#22C55E', fontFamily: 'Inter_600SemiBold', fontSize: 9 },
  specialPill: { backgroundColor: '#4338CA22', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  specialPillTxt: { color: '#818CF8', fontFamily: 'Inter_600SemiBold', fontSize: 9 },
  packBuyBtn: {
    backgroundColor: '#F59E0B', borderRadius: 10, paddingHorizontal: 10,
    paddingVertical: 10, minWidth: 68, alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  packBuyTxt: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  packTip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#0B1627', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#1E3A5F', marginTop: 8,
  },
  packTipTxt: { flex: 1, color: '#475569', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyEmoji: { fontSize: 40 },
  emptyTxt: { color: '#475569', fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center' },
  emptyBtn: {
    backgroundColor: '#1E3A5F', borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  emptyBtnTxt: { color: '#60A5FA', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
});
