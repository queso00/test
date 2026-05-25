import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BLOCK_DEFS, GRID_COLS, GRID_ROWS, type BlockType } from '@/constants/blocks';
import { type SavedDesign, useGame } from '@/contexts/GameContext';

const MINI_SIZE = 22;

function MiniBoat({ grid }: { grid: (BlockType | null)[][] }) {
  return (
    <View style={miniStyles.wrap}>
      {Array.from({ length: GRID_ROWS }).map((_, r) => (
        <View key={r} style={miniStyles.row}>
          {Array.from({ length: GRID_COLS }).map((_, c) => {
            const cell = grid[r]?.[c] ?? null;
            const def = cell ? BLOCK_DEFS[cell] : null;
            return (
              <View
                key={c}
                style={[
                  miniStyles.cell,
                  {
                    backgroundColor: def ? def.color : '#1E293B',
                    borderColor: def ? def.borderColor + '66' : '#334155',
                  },
                ]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const miniStyles = StyleSheet.create({
  wrap: { gap: 2 },
  row: { flexDirection: 'row', gap: 2 },
  cell: {
    width: MINI_SIZE,
    height: MINI_SIZE,
    borderRadius: 3,
    borderWidth: 1,
  },
});

function DesignCard({
  design,
  onLoad,
  onDelete,
}: {
  design: SavedDesign;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const blockCount = design.grid.flat().filter(Boolean).length;
  const date = new Date(design.createdAt).toLocaleDateString();

  return (
    <View style={styles.card}>
      <View style={styles.cardPreview}>
        <MiniBoat grid={design.grid} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>
          {design.name}
        </Text>
        <Text style={styles.cardMeta}>{blockCount} blocks · {date}</Text>
        <View style={styles.cardActions}>
          <Pressable
            onPress={onLoad}
            style={({ pressed }) => [
              styles.loadBtn,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons name="create-outline" size={14} color="#0F172A" />
            <Text style={styles.loadBtnText}>Edit & Launch</Text>
          </Pressable>
          <Pressable
            onPress={onDelete}
            style={({ pressed }) => [
              styles.deleteBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function GarageScreen() {
  const insets = useSafeAreaInsets();
  const { savedDesigns, deleteDesign } = useGame();

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 16);

  const handleLoad = (design: SavedDesign) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/build',
      params: { grid: JSON.stringify(design.grid) },
    });
  };

  const handleDelete = (design: SavedDesign) => {
    Alert.alert('Delete Design', `Remove "${design.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteDesign(design.id);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
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
        <Text style={styles.headerTitle}>GARAGE</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{savedDesigns.length}/10</Text>
        </View>
      </View>

      {savedDesigns.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="boat-outline" size={64} color="#334155" />
          <Text style={styles.emptyTitle}>No Saved Designs</Text>
          <Text style={styles.emptyDesc}>
            Build a boat and save it to access it later!
          </Text>
          <Pressable
            onPress={() => router.push('/build')}
            style={({ pressed }) => [styles.emptyBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Ionicons name="hammer" size={18} color="#0F172A" />
            <Text style={styles.emptyBtnText}>Start Building</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: botPad + 16 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>SAVED BOATS</Text>
          {savedDesigns.map((design) => (
            <DesignCard
              key={design.id}
              design={design}
              onLoad={() => handleLoad(design)}
              onDelete={() => handleDelete(design)}
            />
          ))}
        </ScrollView>
      )}
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
  countBadge: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#334155',
  },
  countText: {
    color: '#64748B',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  sectionLabel: {
    color: '#475569',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 2,
    marginTop: 4,
    marginBottom: 2,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardPreview: {
    padding: 8,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  cardInfo: {
    flex: 1,
    gap: 6,
    justifyContent: 'center',
  },
  cardName: {
    color: '#F8FAFC',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  cardMeta: {
    color: '#64748B',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  loadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 5,
  },
  loadBtnText: {
    color: '#0F172A',
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EF444422',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EF444444',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
  },
  emptyDesc: {
    color: '#64748B',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
  },
  emptyBtnText: {
    color: '#0F172A',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
});
