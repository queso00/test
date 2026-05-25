import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ALL_BLOCK_TYPES,
  BLOCK_DEFS,
  GRID_COLS,
  GRID_ROWS,
  RARITY_BG,
  RARITY_COLORS,
  RARITY_LABELS,
  type BlockType,
} from '@/constants/blocks';
import { useGame } from '@/contexts/GameContext';

const { width: SW } = Dimensions.get('window');
const BLOCK_SIZE = 44;

function createEmptyGrid(): (BlockType | null)[][] {
  return Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
}

function GridCell({
  type,
  onPress,
  onLongPress,
}: {
  type: BlockType | null;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const def = type ? BLOCK_DEFS[type] : null;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.82, duration: 70, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 220 }),
    ]).start();
    onPress();
  };

  return (
    <Pressable onPress={handlePress} onLongPress={onLongPress}>
      <Animated.View
        style={[
          styles.cell,
          {
            width: BLOCK_SIZE,
            height: BLOCK_SIZE,
            backgroundColor: def ? def.color : '#162032',
            borderColor: def ? def.borderColor + '99' : '#1E3A5F',
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {def && (
          <>
            <View style={[styles.cellShine, { backgroundColor: '#FFFFFF18' }]} />
            <View style={[styles.cellDark, { backgroundColor: def.darkColor + 'BB' }]} />
          </>
        )}
        {!def && <Ionicons name="add-outline" size={16} color="#1E3A5F" />}
      </Animated.View>
    </Pressable>
  );
}

function BlockPicker({
  selected,
  onSelect,
  unlocked,
  playerLevel,
}: {
  selected: BlockType;
  onSelect: (t: BlockType) => void;
  unlocked: BlockType[];
  playerLevel: number;
}) {
  const available = ALL_BLOCK_TYPES.filter((t) => unlocked.includes(t));
  const locked = ALL_BLOCK_TYPES.filter(
    (t) => !unlocked.includes(t) && BLOCK_DEFS[t].levelRequired <= playerLevel + 3
  );

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
      {available.map((type) => {
        const def = BLOCK_DEFS[type];
        const isSel = type === selected;
        return (
          <Pressable
            key={type}
            onPress={() => { Haptics.selectionAsync(); onSelect(type); }}
            style={[styles.pickerItem, isSel && { borderColor: RARITY_COLORS[def.rarity], backgroundColor: RARITY_BG[def.rarity] }]}
          >
            <View style={[styles.pickerBlock, { backgroundColor: def.color, shadowColor: isSel ? def.color : 'transparent', shadowOpacity: 0.8, shadowRadius: 6, elevation: isSel ? 5 : 0 }]} />
            <Text style={[styles.pickerName, isSel && { color: '#F8FAFC' }]}>{def.name}</Text>
            <Text style={[styles.pickerRarity, { color: RARITY_COLORS[def.rarity] }]}>{RARITY_LABELS[def.rarity]}</Text>
          </Pressable>
        );
      })}
      {locked.slice(0, 3).map((type) => {
        const def = BLOCK_DEFS[type];
        return (
          <Pressable key={type} style={[styles.pickerItem, styles.pickerLocked]} onPress={() => router.push('/shop')}>
            <View style={[styles.pickerBlock, { backgroundColor: '#1E293B' }]}>
              <Ionicons name="lock-closed" size={14} color="#475569" />
            </View>
            <Text style={[styles.pickerName, { color: '#475569' }]}>{def.name}</Text>
            <Text style={{ color: '#334155', fontFamily: 'Inter_400Regular', fontSize: 9 }}>Lv {def.levelRequired}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function BuildScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ grid?: string }>();
  const { unlockedBlocks, saveDesign, playerLevel } = useGame();

  const [grid, setGrid] = useState<(BlockType | null)[][]>(() => {
    if (params.grid) {
      try {
        const parsed = JSON.parse(params.grid) as (BlockType | null)[][];
        const normalized = createEmptyGrid();
        parsed.forEach((row, r) => {
          if (r < GRID_ROWS) row.forEach((cell, c) => { if (c < GRID_COLS) normalized[r][c] = cell; });
        });
        return normalized;
      } catch {}
    }
    return createEmptyGrid();
  });
  const [selected, setSelected] = useState<BlockType>('wood');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [designName, setDesignName] = useState('My Ship');

  const blockCount = grid.flat().filter(Boolean).length;

  const place = useCallback((r: number, c: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGrid((prev) => { const n = prev.map((row) => [...row]); n[r][c] = selected; return n; });
  }, [selected]);

  const remove = useCallback((r: number, c: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGrid((prev) => { const n = prev.map((row) => [...row]); n[r][c] = null; return n; });
  }, []);

  const handleLaunch = () => {
    if (blockCount === 0) { Alert.alert('Empty Ship', 'Place at least one block before sailing!'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({ pathname: '/game', params: { grid: JSON.stringify(grid) } });
  };

  const handleSave = () => {
    if (blockCount === 0) { Alert.alert('Empty Ship', 'Place some blocks first!'); return; }
    setShowSaveModal(true);
  };

  const confirmSave = () => {
    saveDesign(designName || 'My Ship', grid);
    setShowSaveModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Saved!', `"${designName}" saved to your garage.`);
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  const selDef = BLOCK_DEFS[selected];

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons name="chevron-back" size={22} color="#94A3B8" />
        </Pressable>
        <View style={styles.headerMid}>
          <Text style={styles.headerTitle}>SHIP BUILDER</Text>
          <Text style={styles.headerSub}>{blockCount} / {GRID_ROWS * GRID_COLS} blocks  ·  {GRID_COLS}×{GRID_ROWS} grid</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable onPress={handleSave} style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]}>
            <Ionicons name="save-outline" size={20} color="#60A5FA" />
          </Pressable>
          <Pressable
            onPress={() => Alert.alert('Clear Ship', 'Remove all blocks?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); setGrid(createEmptyGrid()); } },
            ])}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </Pressable>
        </View>
      </View>

      {/* Hint */}
      <View style={styles.hintRow}>
        <Ionicons name="finger-print" size={13} color="#334155" />
        <Text style={styles.hintTxt}>Tap to place</Text>
        <Text style={styles.hintDot}>·</Text>
        <Ionicons name="hand-left-outline" size={13} color="#334155" />
        <Text style={styles.hintTxt}>Hold to erase</Text>
        <Text style={styles.hintDot}>·</Text>
        <Ionicons name="swap-horizontal-outline" size={13} color="#334155" />
        <Text style={styles.hintTxt}>Scroll to pan</Text>
      </View>

      {/* Grid — scrollable in both axes */}
      <View style={styles.gridOuter}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
            <View style={styles.gridInner}>
              {grid.map((row, r) => (
                <View key={r} style={styles.gridRow}>
                  {row.map((cell, c) => (
                    <GridCell key={c} type={cell} onPress={() => place(r, c)} onLongPress={() => remove(r, c)} />
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
        <Text style={styles.gridLabel}>{GRID_COLS}×{GRID_ROWS} SHIP DECK</Text>
      </View>

      {/* Selected block info */}
      <View style={styles.selRow}>
        <View style={[styles.selDot, { backgroundColor: selDef.color }]} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.selName}>{selDef.name}</Text>
            <View style={[styles.rarityBadge, { backgroundColor: RARITY_COLORS[selDef.rarity] + '22' }]}>
              <Text style={[styles.rarityTxt, { color: RARITY_COLORS[selDef.rarity] }]}>{RARITY_LABELS[selDef.rarity]}</Text>
            </View>
          </View>
          <Text style={styles.selDesc}>{selDef.description}{selDef.special ? ` · ${selDef.special}` : ''}</Text>
        </View>
        <View style={styles.hpBadge}><Text style={styles.hpTxt}>⚔ {selDef.hp} HP</Text></View>
      </View>

      {/* Block picker */}
      <View style={styles.pickerSection}>
        <BlockPicker selected={selected} onSelect={setSelected} unlocked={unlockedBlocks} playerLevel={playerLevel} />
      </View>

      {/* Launch */}
      <View style={styles.launchWrap}>
        <Pressable onPress={handleLaunch} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
          <LinearGradient
            colors={blockCount > 0 ? ['#22C55E', '#16A34A'] : ['#1E293B', '#1E293B']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.launchBtn}
          >
            <Ionicons name="rocket" size={21} color={blockCount > 0 ? '#fff' : '#475569'} />
            <Text style={[styles.launchTxt, { color: blockCount > 0 ? '#fff' : '#475569' }]}>LAUNCH!</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Save modal */}
      {showSaveModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Name Your Ship</Text>
            <TextInput
              style={styles.modalInput}
              value={designName}
              onChangeText={setDesignName}
              placeholder="My Pirate Ship..."
              placeholderTextColor="#475569"
              maxLength={28}
            />
            <View style={styles.modalBtns}>
              <Pressable style={styles.modalCancel} onPress={() => setShowSaveModal(false)}>
                <Text style={styles.modalCancelTxt}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalConfirm} onPress={confirmSave}>
                <Text style={styles.modalConfirmTxt}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#040D1A' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' },
  headerMid: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#F8FAFC', fontFamily: 'Inter_700Bold', fontSize: 15, letterSpacing: 2 },
  headerSub: { color: '#475569', fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingBottom: 6 },
  hintTxt: { color: '#334155', fontFamily: 'Inter_400Regular', fontSize: 11 },
  hintDot: { color: '#334155', fontSize: 14, lineHeight: 16 },
  gridOuter: { alignItems: 'center', flex: 1 },
  gridInner: { gap: 3, padding: 12, backgroundColor: '#0B1A2E', borderRadius: 14, borderWidth: 1.5, borderColor: '#1E3A5F' },
  gridRow: { flexDirection: 'row', gap: 3 },
  cell: { borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cellShine: { position: 'absolute', top: 0, left: 0, right: 0, height: '38%', borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  cellDark: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '28%', borderBottomLeftRadius: 5, borderBottomRightRadius: 5 },
  gridLabel: { color: '#1E3A5F', fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 2, marginTop: 5 },
  selRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, gap: 8 },
  selDot: { width: 16, height: 16, borderRadius: 8 },
  selName: { color: '#F8FAFC', fontFamily: 'Inter_700Bold', fontSize: 14 },
  rarityBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  rarityTxt: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  selDesc: { color: '#475569', fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 1 },
  hpBadge: { backgroundColor: '#162032', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#22C55E44' },
  hpTxt: { color: '#22C55E', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  pickerSection: { borderTopWidth: 1, borderTopColor: '#1E293B', paddingVertical: 4 },
  pickerRow: { paddingHorizontal: 14, gap: 8, paddingVertical: 4 },
  pickerItem: { alignItems: 'center', gap: 3, padding: 8, borderRadius: 11, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#1E293B', minWidth: 70 },
  pickerLocked: { opacity: 0.5 },
  pickerBlock: { width: 34, height: 34, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  pickerName: { color: '#475569', fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  pickerRarity: { fontFamily: 'Inter_400Regular', fontSize: 9 },
  launchWrap: { paddingHorizontal: 16, paddingTop: 6 },
  launchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 13, gap: 10 },
  launchTxt: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: 1 },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000CC', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { backgroundColor: '#1E293B', borderRadius: 20, padding: 24, width: '80%', gap: 14, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { color: '#F8FAFC', fontFamily: 'Inter_700Bold', fontSize: 17, textAlign: 'center' },
  modalInput: { backgroundColor: '#0F172A', borderRadius: 10, padding: 12, color: '#F8FAFC', fontFamily: 'Inter_400Regular', fontSize: 15, borderWidth: 1, borderColor: '#334155' },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, padding: 12, backgroundColor: '#334155', borderRadius: 10, alignItems: 'center' },
  modalCancelTxt: { color: '#94A3B8', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  modalConfirm: { flex: 1, padding: 12, backgroundColor: '#3B82F6', borderRadius: 10, alignItems: 'center' },
  modalConfirmTxt: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 },
});
