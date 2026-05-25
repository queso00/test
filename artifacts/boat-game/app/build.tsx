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
  type BlockType,
} from '@/constants/blocks';
import { useGame } from '@/contexts/GameContext';

const { width } = Dimensions.get('window');
const BLOCK_SIZE = Math.min(Math.floor((width - 48) / GRID_COLS), 56);

function createEmptyGrid(): (BlockType | null)[][] {
  return Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
}

function BlockCell({
  type,
  onPress,
  onLongPress,
}: {
  type: BlockType | null;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200 }),
    ]).start();
    onPress();
  };

  const def = type ? BLOCK_DEFS[type] : null;

  return (
    <Pressable onPress={handlePress} onLongPress={onLongPress} style={styles.cellOuter}>
      <Animated.View
        style={[
          styles.cell,
          {
            width: BLOCK_SIZE,
            height: BLOCK_SIZE,
            backgroundColor: def ? def.color : '#1E293B',
            borderColor: def ? def.borderColor : '#334155',
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {def && (
          <>
            <View
              style={[
                styles.cellShine,
                { backgroundColor: def.borderColor + '44' },
              ]}
            />
            <View
              style={[
                styles.cellDark,
                { backgroundColor: def.darkColor + 'BB' },
              ]}
            />
          </>
        )}
        {!def && <Ionicons name="add" size={18} color="#334155" />}
      </Animated.View>
    </Pressable>
  );
}

function BlockPicker({
  selected,
  onSelect,
  unlocked,
}: {
  selected: BlockType;
  onSelect: (t: BlockType) => void;
  unlocked: BlockType[];
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.pickerRow}
    >
      {ALL_BLOCK_TYPES.filter((t) => unlocked.includes(t)).map((type) => {
        const def = BLOCK_DEFS[type];
        const isSelected = type === selected;
        return (
          <Pressable
            key={type}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(type);
            }}
            style={[
              styles.pickerItem,
              isSelected && styles.pickerItemSelected,
              isSelected && { borderColor: def.borderColor },
            ]}
          >
            <View
              style={[
                styles.pickerBlock,
                {
                  backgroundColor: def.color,
                  shadowColor: isSelected ? def.color : 'transparent',
                  shadowOpacity: 0.8,
                  shadowRadius: 8,
                  elevation: isSelected ? 6 : 0,
                },
              ]}
            />
            <Text style={[styles.pickerLabel, isSelected && { color: '#F8FAFC' }]}>
              {def.name}
            </Text>
            <Text style={styles.pickerHp}>HP {def.hp}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function BuildScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ grid?: string }>();
  const { unlockedBlocks, saveDesign } = useGame();

  const [grid, setGrid] = useState<(BlockType | null)[][]>(() => {
    if (params.grid) {
      try {
        return JSON.parse(params.grid);
      } catch {}
    }
    return createEmptyGrid();
  });
  const [selected, setSelected] = useState<BlockType>('wood');
  const [blockCount, setBlockCount] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [designName, setDesignName] = useState('My Boat');

  useEffect(() => {
    let count = 0;
    grid.forEach((row) => row.forEach((cell) => { if (cell) count++; }));
    setBlockCount(count);
  }, [grid]);

  const placeBlock = useCallback(
    (row: number, col: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setGrid((prev) => {
        const next = prev.map((r) => [...r]);
        next[row][col] = selected;
        return next;
      });
    },
    [selected]
  );

  const removeBlock = useCallback((row: number, col: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGrid((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = null;
      return next;
    });
  }, []);

  const clearAll = () => {
    Alert.alert('Clear Boat', 'Remove all blocks?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setGrid(createEmptyGrid());
        },
      },
    ]);
  };

  const handleLaunch = () => {
    if (blockCount === 0) {
      Alert.alert('Empty Boat', 'Place at least one block before launching!');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({ pathname: '/game', params: { grid: JSON.stringify(grid) } });
  };

  const handleSave = () => {
    if (blockCount === 0) {
      Alert.alert('Empty Boat', 'Place some blocks before saving!');
      return;
    }
    setShowSaveModal(true);
  };

  const confirmSave = () => {
    saveDesign(designName || 'My Boat', grid);
    setShowSaveModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Saved!', `"${designName}" saved to your garage.`);
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color="#94A3B8" />
        </Pressable>
        <View style={styles.headerMid}>
          <Text style={styles.headerTitle}>BOAT BUILDER</Text>
          <Text style={styles.headerSub}>{blockCount} blocks placed</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="save-outline" size={22} color="#60A5FA" />
          </Pressable>
          <Pressable
            onPress={clearAll}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
          </Pressable>
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructRow}>
        <View style={styles.instructItem}>
          <Ionicons name="finger-print" size={14} color="#64748B" />
          <Text style={styles.instructText}>Tap to place</Text>
        </View>
        <View style={styles.instructItem}>
          <Ionicons name="hand-left-outline" size={14} color="#64748B" />
          <Text style={styles.instructText}>Hold to remove</Text>
        </View>
      </View>

      {/* Grid */}
      <View style={styles.gridContainer}>
        <View style={styles.gridWrap}>
          {grid.map((row, r) => (
            <View key={r} style={styles.gridRow}>
              {row.map((cell, c) => (
                <BlockCell
                  key={c}
                  type={cell}
                  onPress={() => placeBlock(r, c)}
                  onLongPress={() => removeBlock(r, c)}
                />
              ))}
            </View>
          ))}
        </View>
        <Text style={styles.gridLabel}>BOAT DECK</Text>
      </View>

      {/* Selected block info */}
      <View style={styles.selectedInfo}>
        <View
          style={[
            styles.selectedDot,
            { backgroundColor: BLOCK_DEFS[selected].color },
          ]}
        />
        <Text style={styles.selectedName}>{BLOCK_DEFS[selected].name}</Text>
        <Text style={styles.selectedDesc}>{BLOCK_DEFS[selected].description}</Text>
        <View style={styles.hpBadge}>
          <Text style={styles.hpText}>HP {BLOCK_DEFS[selected].hp}</Text>
        </View>
      </View>

      {/* Block picker */}
      <View style={styles.pickerSection}>
        <BlockPicker
          selected={selected}
          onSelect={setSelected}
          unlocked={unlockedBlocks}
        />
      </View>

      {/* Launch */}
      <View style={styles.launchSection}>
        <Pressable
          onPress={handleLaunch}
          style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
        >
          <LinearGradient
            colors={blockCount > 0 ? ['#22C55E', '#16A34A'] : ['#374151', '#1F2937']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.launchBtn}
          >
            <Ionicons
              name="rocket"
              size={22}
              color={blockCount > 0 ? '#FFFFFF' : '#6B7280'}
            />
            <Text
              style={[styles.launchText, { color: blockCount > 0 ? '#FFFFFF' : '#6B7280' }]}
            >
              LAUNCH!
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Save Modal */}
      {showSaveModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Save Design</Text>
            <TextInput
              style={styles.modalInput}
              value={designName}
              onChangeText={setDesignName}
              placeholder="Name your boat..."
              placeholderTextColor="#475569"
              maxLength={24}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => setShowSaveModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalConfirm} onPress={confirmSave}>
                <Text style={styles.modalConfirmText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
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
  headerMid: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    letterSpacing: 2,
  },
  headerSub: {
    color: '#64748B',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingBottom: 8,
  },
  instructItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  instructText: {
    color: '#64748B',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  gridContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  gridWrap: {
    gap: 4,
    padding: 12,
    backgroundColor: '#162032',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1E40AF44',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 4,
  },
  cellOuter: {},
  cell: {
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cellShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  cellDark: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  gridLabel: {
    color: '#334155',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 6,
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  selectedDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  selectedName: {
    color: '#F8FAFC',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  selectedDesc: {
    flex: 1,
    color: '#64748B',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  hpBadge: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  hpText: {
    color: '#22C55E',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  pickerSection: {
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingVertical: 6,
  },
  pickerRow: {
    paddingHorizontal: 16,
    gap: 10,
    paddingVertical: 4,
  },
  pickerItem: {
    alignItems: 'center',
    gap: 4,
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#1E293B',
    minWidth: 72,
  },
  pickerItemSelected: {
    backgroundColor: '#0F1B2D',
  },
  pickerBlock: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  pickerLabel: {
    color: '#64748B',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  pickerHp: {
    color: '#22C55E',
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
  },
  launchSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  launchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  launchText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    letterSpacing: 1.5,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000BB',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    gap: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    color: '#F8FAFC',
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    color: '#F8FAFC',
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancel: {
    flex: 1,
    padding: 12,
    backgroundColor: '#334155',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#94A3B8',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  modalConfirm: {
    flex: 1,
    padding: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
});
