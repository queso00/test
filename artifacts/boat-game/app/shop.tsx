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

import { ALL_BLOCK_TYPES, BLOCK_DEFS } from '@/constants/blocks';
import { useGame } from '@/contexts/GameContext';

function ShopItem({
  type,
  owned,
  canAfford,
  onBuy,
}: {
  type: string;
  owned: boolean;
  canAfford: boolean;
  onBuy: () => void;
}) {
  const def = BLOCK_DEFS[type as keyof typeof BLOCK_DEFS];
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (owned || !canAfford) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
    onBuy();
  };

  return (
    <Animated.View
      style={[
        styles.shopItem,
        owned && styles.shopItemOwned,
        !canAfford && !owned && styles.shopItemLocked,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <View style={[styles.shopBlockIcon, { backgroundColor: def.color, shadowColor: def.color }]}>
        {owned && (
          <View style={styles.ownedCheckmark}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
        )}
      </View>
      <View style={styles.shopItemInfo}>
        <Text style={styles.shopItemName}>{def.name}</Text>
        <Text style={styles.shopItemDesc}>{def.description}</Text>
        <View style={styles.shopItemStats}>
          <View style={styles.hpRow}>
            <Ionicons name="shield" size={12} color="#22C55E" />
            <Text style={styles.shopHpText}>{def.hp} HP</Text>
          </View>
        </View>
      </View>
      <Pressable
        onPress={handlePress}
        style={[
          styles.buyBtn,
          owned && styles.buyBtnOwned,
          !canAfford && !owned && styles.buyBtnLocked,
        ]}
      >
        {owned ? (
          <Text style={styles.buyBtnOwnedText}>Owned</Text>
        ) : (
          <View style={styles.buyBtnInner}>
            <Ionicons
              name="logo-bitcoin"
              size={13}
              color={canAfford ? '#0F172A' : '#6B7280'}
            />
            <Text
              style={[styles.buyBtnText, !canAfford && { color: '#6B7280' }]}
            >
              {def.unlockCost.toLocaleString()}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const { coins, unlockedBlocks, unlockBlock } = useGame();
  const [lastPurchase, setLastPurchase] = useState<string | null>(null);

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 16);

  const shopItems = ALL_BLOCK_TYPES.filter((t) => t !== 'wood');

  const handleBuy = (type: string) => {
    const def = BLOCK_DEFS[type as keyof typeof BLOCK_DEFS];
    if (coins < def.unlockCost) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Not Enough Coins', `You need ${def.unlockCost - coins} more coins.`);
      return;
    }
    const success = unlockBlock(type as any, def.unlockCost);
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLastPurchase(type);
      Alert.alert('Unlocked!', `${def.name} blocks are now available in the builder!`);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Background */}
      <LinearGradient
        colors={['#0F172A', '#0B1627']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color="#94A3B8" />
        </Pressable>
        <Text style={styles.headerTitle}>SHOP</Text>
        <View style={styles.coinBadge}>
          <Ionicons name="logo-bitcoin" size={16} color="#F59E0B" />
          <Text style={styles.coinText}>{coins.toLocaleString()}</Text>
        </View>
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        Unlock stronger materials to survive longer
      </Text>

      {/* How to earn */}
      <View style={styles.earningTip}>
        <Ionicons name="information-circle" size={16} color="#60A5FA" />
        <Text style={styles.earningText}>
          Earn coins by sailing further. The further you go, the more you earn!
        </Text>
      </View>

      {/* Items */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: botPad + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>MATERIALS</Text>
        {shopItems.map((type) => (
          <ShopItem
            key={type}
            type={type}
            owned={unlockedBlocks.includes(type)}
            canAfford={coins >= BLOCK_DEFS[type].unlockCost}
            onBuy={() => handleBuy(type)}
          />
        ))}
      </ScrollView>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: '#F8FAFC',
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    letterSpacing: 3,
    textAlign: 'center',
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 5,
    borderWidth: 1,
    borderColor: '#F59E0B44',
  },
  coinText: {
    color: '#F59E0B',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  subtitle: {
    color: '#64748B',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  earningTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F644',
    marginBottom: 12,
  },
  earningText: {
    flex: 1,
    color: '#94A3B8',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  sectionLabel: {
    color: '#475569',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 4,
    marginTop: 4,
  },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  shopItemOwned: {
    borderColor: '#22C55E44',
    backgroundColor: '#162218',
  },
  shopItemLocked: {
    opacity: 0.7,
  },
  shopBlockIcon: {
    width: 52,
    height: 52,
    borderRadius: 10,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  ownedCheckmark: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#22C55E',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopItemInfo: {
    flex: 1,
    gap: 3,
  },
  shopItemName: {
    color: '#F8FAFC',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  shopItemDesc: {
    color: '#64748B',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  shopItemStats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  hpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  shopHpText: {
    color: '#22C55E',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  buyBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 84,
    alignItems: 'center',
  },
  buyBtnOwned: {
    backgroundColor: '#1E3A28',
    borderWidth: 1,
    borderColor: '#22C55E44',
  },
  buyBtnLocked: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  buyBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  buyBtnText: {
    color: '#0F172A',
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  buyBtnOwnedText: {
    color: '#22C55E',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
});
