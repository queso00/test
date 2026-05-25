import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
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

const BLOCK_SIZE = 44;
const DECK_LABELS = ['Lower Deck', 'Mid Deck', 'Upper Deck'];
const DECK_EMOJIS = ['⚓', '🚢', '⛵'];

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
            backgroundColor: def ? def.color : '#0B1627',
            borderColor: def ? def.borderColor + '99' : '#1A2F47',
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {def && (
          <>
            <View style={[styles.cellShine, { backgroundColor: '#FFFFFF16' }]} />
            <View style={[styles.cellDark, { backgroundColor: def.darkColor + 'BB' }]} />
          </>
        )}
        {!def && <Ionicons name="add-outline" size={15} color="#1A2F47" />}
      </Animated.View>
    </Pressable>
  );
}

function BlockPicker({
  selected,
  onSelect,
  unlocked,
  playerLevel,
  inventory,
}: {
  selected: BlockType;
  onSelect: (t: BlockType) => void;
  unlocked: BlockType[];
  playerLevel: number;
  inventory: Partial<Record<BlockType, number>>;
}) {
  const available = ALL_BLOCK_TYPES.filter((t) => unlocked.includes(t));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.pickerRow}
    >
      {available.map((type) => {
        const def = BLOCK_DEFS[type];
        const isSel = type === selected;
        const count = inventory[type] ?? 0;
        const outOfStock = count === 0;
        return (
          <Pressable
            key={type}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(type);
            }}
            style={[
              styles.pickerItem,
              isSel && {
                borderColor: RARITY_COLORS[def.rarity],
                backgroundColor: RARITY_BG[def.rarity],
              },
              outOfStock && styles.pickerOutOfStock,
            ]}
          >
            <View
              style={[
                styles.pickerBlock,
                {
                  backgroundColor: outOfStock ? '#1E293B' : def.color,
                  opacity: outOfStock ? 0.4 : 1,
                },
              ]}
            />
            <Text
              style={[
                styles.pickerName,
                isSel && { color: '#F8FAFC' },
                outOfStock && { color: '#334155' },
              ]}
            >
              {def.name}
            </Text>
            <View
              style={[
                styles.countBadge,
                {
                  backgroundColor:
                    count > 10
                      ? '#22C55E22'
                      : count > 0
                        ? '#F59E0B22'
                        : '#EF444422',
                },
              ]}
            >
              <Text
                style={[
                  styles.countTxt,
                  {
                    color:
                      count > 10 ? '#22C55E' : count > 0 ? '#F59E0B' : '#EF4444',
                  },
                ]}
              >
                ×{count}
              </Text>
            </View>
          </Pressable>
        );
      })}
      {/* Tease locked blocks */}
      {ALL_BLOCK_TYPES.filter(
        (t) => !unlocked.includes(t) && BLOCK_DEFS[t].levelRequired <= playerLevel + 4
      )
        .slice(0, 2)
        .map((type) => {
          const def = BLOCK_DEFS[type];
          return (
            <Pressable
              key={type}
              onPress={() => router.push('/shop')}
              style={[styles.pickerItem, styles.pickerLocked]}
            >
              <View
                style={[styles.pickerBlock, { backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }]}
              >
                <Ionicons name="lock-closed" size={13} color="#334155" />
              </View>
              <Text style={[styles.pickerName, { color: '#334155' }]}>{def.name}</Text>
              <Text style={{ color: '#1E3A5F', fontFamily: 'Inter_400Regular', fontSize: 9 }}>
                Lv {def.levelRequired}
              </Text>
            </Pressable>
          );
        })}
    </ScrollView>
  );
}

export default function BuildScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ grid?: string }>();
  const { unlockedBlocks, saveDesign, playerLevel, blockInventory, placeBlock, returnBlock } =
    useGame();

  const [activeDeck, setActiveDeck] = useState(0);
  const [layers, setLayers] = useState<(BlockType | null)[][][]>(() =>
    [0, 1, 2].map(() => createEmptyGrid())
  );
  const [selected, setSelected] = useState<BlockType>('wood');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [designName, setDesignName] = useState('My Ship');

  // Track if we need to return blocks on back navigation
  const placedOnCurrentSessionRef = useRef<{ type: BlockType; layer: number; r: number; c: number }[]>([]);

  // Load saved design into layer 0 on mount
  useEffect(() => {
    if (!params.grid) return;
    try {
      const raw: (BlockType | null)[][] = JSON.parse(params.grid);
      const normalized = createEmptyGrid();
      raw.forEach((row, r) => {
        if (r < GRID_ROWS)
          row.forEach((cell, c) => {
            if (c < GRID_COLS && cell) normalized[r][c] = cell;
          });
      });
      // Attempt to reserve blocks from inventory for the loaded design
      const newLayer = normalized.map((row) => [...row]);
      normalized.forEach((row, r) =>
        row.forEach((cell, c) => {
          if (cell) {
            const ok = placeBlock(cell);
            if (!ok) newLayer[r][c] = null; // can't afford, clear it
          }
        })
      );
      setLayers((prev) => {
        const next = prev.map((l) => l.map((row) => [...row]));
        next[0] = newLayer;
        return next;
      });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalBlocks = layers.reduce(
    (sum, layer) => sum + layer.flat().filter(Boolean).length,
    0
  );
  const currentLayerBlocks = layers[activeDeck].flat().filter(Boolean).length;

  const place = useCallback(
    (r: number, c: number) => {
      const current = layers[activeDeck][r][c];
      if (current === selected) return; // already this type
      const count = blockInventory[selected] ?? 0;
      if (count <= 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          `Out of ${BLOCK_DEFS[selected].name}`,
          `You have no ${BLOCK_DEFS[selected].name} blocks left.\n\nBuy more in the Shop!`,
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Go to Shop', onPress: () => router.push('/shop') },
          ]
        );
        return;
      }
      // Return existing block if replacing
      if (current) returnBlock(current);
      const ok = placeBlock(selected);
      if (!ok) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setLayers((prev) => {
        const next = prev.map((l) => l.map((row) => [...row]));
        next[activeDeck][r][c] = selected;
        return next;
      });
    },
    [layers, activeDeck, selected, blockInventory, placeBlock, returnBlock]
  );

  const remove = useCallback(
    (r: number, c: number) => {
      const cell = layers[activeDeck][r][c];
      if (!cell) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      returnBlock(cell);
      setLayers((prev) => {
        const next = prev.map((l) => l.map((row) => [...row]));
        next[activeDeck][r][c] = null;
        return next;
      });
    },
    [layers, activeDeck, returnBlock]
  );

  const handleBack = () => {
    // Return all placed blocks to inventory
    layers.forEach((layer) =>
      layer.forEach((row) =>
        row.forEach((cell) => {
          if (cell) returnBlock(cell);
        })
      )
    );
    router.back();
  };

  const handleLaunch = () => {
    if (totalBlocks === 0) {
      Alert.alert('Empty Ship', 'Place at least one block before sailing!');
      return;
    }
    // Flatten all layers into a single grid for the game
    // Merge: layer 0 = bottom, layer 1 = mid, layer 2 = top
    // We just send layer 0 to the game (the main hull)
    // Blocks are already consumed from inventory
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const mergedGrid = mergeLayersForGame(layers);
    router.push({ pathname: '/game', params: { grid: JSON.stringify(mergedGrid) } });
  };

  const handleSave = () => {
    if (totalBlocks === 0) {
      Alert.alert('Empty Ship', 'Place some blocks first!');
      return;
    }
    setShowSaveModal(true);
  };

  const confirmSave = () => {
    // Save layer 0 as design
    saveDesign(designName || 'My Ship', layers[0]);
    setShowSaveModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('⚓ Saved!', `"${designName}" saved to your garage.`);
  };

  const handleClear = () => {
    Alert.alert('Clear Deck', `Remove all blocks on ${DECK_LABELS[activeDeck]}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          layers[activeDeck].forEach((row) =>
            row.forEach((cell) => {
              if (cell) returnBlock(cell);
            })
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setLayers((prev) => {
            const next = prev.map((l) => l.map((row) => [...row]));
            next[activeDeck] = createEmptyGrid();
            return next;
          });
        },
      },
    ]);
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0);
  const selDef = BLOCK_DEFS[selected];
  const selCount = blockInventory[selected] ?? 0;

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="chevron-back" size={22} color="#94A3B8" />
        </Pressable>
        <View style={styles.headerMid}>
          <Text style={styles.headerTitle}>⚓ SHIP BUILDER</Text>
          <Text style={styles.headerSub}>
            {totalBlocks} blocks  ·  {GRID_COLS}×{GRID_ROWS} per deck
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="save-outline" size={20} color="#60A5FA" />
          </Pressable>
          <Pressable
            onPress={handleClear}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </Pressable>
        </View>
      </View>

      {/* Deck tabs */}
      <View style={styles.deckTabs}>
        {DECK_LABELS.map((label, i) => {
          const count = layers[i].flat().filter(Boolean).length;
          const isActive = i === activeDeck;
          return (
            <Pressable
              key={i}
              onPress={() => { Haptics.selectionAsync(); setActiveDeck(i); }}
              style={[styles.deckTab, isActive && styles.deckTabActive]}
            >
              <Text style={styles.deckEmoji}>{DECK_EMOJIS[i]}</Text>
              <Text style={[styles.deckTabLabel, isActive && styles.deckTabLabelActive]}>
                {label}
              </Text>
              {count > 0 && (
                <View style={styles.deckCount}>
                  <Text style={styles.deckCountTxt}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Hint */}
      <View style={styles.hintRow}>
        <Ionicons name="finger-print" size={12} color="#1E3A5F" />
        <Text style={styles.hintTxt}>Tap to place</Text>
        <Text style={styles.hintDot}>·</Text>
        <Ionicons name="hand-left-outline" size={12} color="#1E3A5F" />
        <Text style={styles.hintTxt}>Hold to remove</Text>
        <Text style={styles.hintDot}>·</Text>
        <Ionicons name="swap-horizontal-outline" size={12} color="#1E3A5F" />
        <Text style={styles.hintTxt}>Scroll to pan</Text>
      </View>

      {/* Grid */}
      <View style={styles.gridOuter}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
            <View style={styles.gridInner}>
              {layers[activeDeck].map((row, r) => (
                <View key={r} style={styles.gridRow}>
                  {row.map((cell, c) => (
                    <GridCell
                      key={c}
                      type={cell}
                      onPress={() => place(r, c)}
                      onLongPress={() => remove(r, c)}
                    />
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
        <Text style={styles.gridLabel}>{DECK_EMOJIS[activeDeck]} {DECK_LABELS[activeDeck].toUpperCase()}</Text>
      </View>

      {/* Selected block info */}
      <View style={styles.selRow}>
        <View style={[styles.selDot, { backgroundColor: selDef.color }]} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.selName}>{selDef.name}</Text>
            <View
              style={[
                styles.rarityBadge,
                { backgroundColor: RARITY_COLORS[selDef.rarity] + '22' },
              ]}
            >
              <Text style={[styles.rarityTxt, { color: RARITY_COLORS[selDef.rarity] }]}>
                {RARITY_LABELS[selDef.rarity]}
              </Text>
            </View>
          </View>
          <Text style={styles.selDesc}>
            {selDef.description}
            {selDef.special ? `  ·  ✦ ${selDef.special}` : ''}
          </Text>
        </View>
        <View style={[styles.stockBadge, { backgroundColor: selCount > 0 ? '#162032' : '#2D0F0F' }]}>
          <Text
            style={[styles.stockTxt, { color: selCount > 10 ? '#22C55E' : selCount > 0 ? '#F59E0B' : '#EF4444' }]}
          >
            ×{selCount} left
          </Text>
        </View>
      </View>

      {/* Block picker */}
      <View style={styles.pickerSection}>
        <BlockPicker
          selected={selected}
          onSelect={setSelected}
          unlocked={unlockedBlocks}
          playerLevel={playerLevel}
          inventory={blockInventory}
        />
      </View>

      {/* Launch */}
      <View style={styles.launchWrap}>
        <Pressable
          onPress={handleLaunch}
          style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
        >
          <LinearGradient
            colors={totalBlocks > 0 ? ['#22C55E', '#16A34A'] : ['#1E293B', '#1E293B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.launchBtn}
          >
            <Ionicons
              name="rocket"
              size={21}
              color={totalBlocks > 0 ? '#fff' : '#334155'}
            />
            <Text
              style={[styles.launchTxt, { color: totalBlocks > 0 ? '#fff' : '#334155' }]}
            >
              LAUNCH! {totalBlocks > 0 ? `(${totalBlocks} blocks)` : ''}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Save Modal */}
      {showSaveModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>⚓ Name Your Ship</Text>
            <TextInput
              style={styles.modalInput}
              value={designName}
              onChangeText={setDesignName}
              placeholder="My Pirate Ship..."
              placeholderTextColor="#334155"
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

function mergeLayersForGame(layers: (BlockType | null)[][][]): (BlockType | null)[][] {
  const result = createEmptyGrid();
  // Layer 0 = lower deck → bottom rows of game grid
  // Layer 1 = mid deck → middle rows
  // Layer 2 = upper deck → top rows
  // For now just use layer 0 as primary hull (main deck for game)
  layers[0].forEach((row, r) => row.forEach((cell, c) => { if (cell) result[r][c] = cell; }));
  // Overlay layers 1+2 on top rows (if they have blocks, they override empty cells)
  layers[1].forEach((row, r) => row.forEach((cell, c) => { if (cell && !result[r][c]) result[r][c] = cell; }));
  layers[2].forEach((row, r) => row.forEach((cell, c) => { if (cell && !result[r][c]) result[r][c] = cell; }));
  return result;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#040D1A' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    paddingVertical: 10, gap: 8,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#1E293B',
    alignItems: 'center', justifyContent: 'center',
  },
  headerMid: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#F8FAFC', fontFamily: 'Inter_700Bold', fontSize: 14, letterSpacing: 1.5 },
  headerSub: { color: '#334155', fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  deckTabs: { flexDirection: 'row', paddingHorizontal: 14, gap: 8, marginBottom: 4 },
  deckTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 8, borderRadius: 10, backgroundColor: '#0B1627',
    borderWidth: 1.5, borderColor: '#1A2F47',
  },
  deckTabActive: { backgroundColor: '#1E293B', borderColor: '#3B82F6' },
  deckEmoji: { fontSize: 13 },
  deckTabLabel: { color: '#334155', fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  deckTabLabelActive: { color: '#60A5FA' },
  deckCount: {
    backgroundColor: '#3B82F633', borderRadius: 8, paddingHorizontal: 5,
    paddingVertical: 1, minWidth: 18, alignItems: 'center',
  },
  deckCountTxt: { color: '#60A5FA', fontFamily: 'Inter_700Bold', fontSize: 10 },
  hintRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingBottom: 4,
  },
  hintTxt: { color: '#1E3A5F', fontFamily: 'Inter_400Regular', fontSize: 10 },
  hintDot: { color: '#1E3A5F', fontSize: 12, lineHeight: 14 },
  gridOuter: { alignItems: 'center', flex: 1 },
  gridInner: {
    gap: 3, padding: 10, backgroundColor: '#060F1C',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#1A2F47',
  },
  gridRow: { flexDirection: 'row', gap: 3 },
  cell: {
    borderRadius: 6, borderWidth: 1.5, alignItems: 'center',
    justifyContent: 'center', overflow: 'hidden',
  },
  cellShine: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: '38%', borderTopLeftRadius: 5, borderTopRightRadius: 5,
  },
  cellDark: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: '28%', borderBottomLeftRadius: 5, borderBottomRightRadius: 5,
  },
  gridLabel: {
    color: '#1A2F47', fontFamily: 'Inter_600SemiBold', fontSize: 9,
    letterSpacing: 1.5, marginTop: 4,
  },
  selRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    paddingVertical: 5, gap: 8,
  },
  selDot: { width: 14, height: 14, borderRadius: 7 },
  selName: { color: '#F8FAFC', fontFamily: 'Inter_700Bold', fontSize: 13 },
  rarityBadge: { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  rarityTxt: { fontFamily: 'Inter_600SemiBold', fontSize: 9 },
  selDesc: { color: '#334155', fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 1 },
  stockBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: '#1E3A5F' },
  stockTxt: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  pickerSection: { borderTopWidth: 1, borderTopColor: '#0F1B2D', paddingVertical: 3 },
  pickerRow: { paddingHorizontal: 12, gap: 7, paddingVertical: 3 },
  pickerItem: {
    alignItems: 'center', gap: 2, padding: 7, borderRadius: 10,
    borderWidth: 2, borderColor: 'transparent', backgroundColor: '#1E293B',
    minWidth: 66,
  },
  pickerOutOfStock: { opacity: 0.55 },
  pickerLocked: { opacity: 0.35 },
  pickerBlock: { width: 32, height: 32, borderRadius: 7 },
  pickerName: { color: '#475569', fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  countBadge: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1, minWidth: 28, alignItems: 'center' },
  countTxt: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  launchWrap: { paddingHorizontal: 14, paddingTop: 5 },
  launchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, gap: 10,
  },
  launchTxt: { fontFamily: 'Inter_700Bold', fontSize: 17, letterSpacing: 0.5 },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: '#000000CC',
    alignItems: 'center', justifyContent: 'center', zIndex: 100,
  },
  modal: {
    backgroundColor: '#1E293B', borderRadius: 20, padding: 24,
    width: '80%', gap: 14, borderWidth: 1, borderColor: '#334155',
  },
  modalTitle: { color: '#F8FAFC', fontFamily: 'Inter_700Bold', fontSize: 17, textAlign: 'center' },
  modalInput: {
    backgroundColor: '#0F172A', borderRadius: 10, padding: 12, color: '#F8FAFC',
    fontFamily: 'Inter_400Regular', fontSize: 15, borderWidth: 1, borderColor: '#334155',
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1, padding: 12, backgroundColor: '#334155',
    borderRadius: 10, alignItems: 'center',
  },
  modalCancelTxt: { color: '#94A3B8', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  modalConfirm: {
    flex: 1, padding: 12, backgroundColor: '#3B82F6',
    borderRadius: 10, alignItems: 'center',
  },
  modalConfirmTxt: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 },
});
