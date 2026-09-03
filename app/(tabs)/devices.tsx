import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useDeviceStore } from '@store/deviceStore';
import { GlassInput } from '@components/glass/GlassInput';
import { DeviceCard } from '@components/device/DeviceCard';
import { Colors, Typography, Spacing, Radius } from '@design/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AddDeviceModal } from '../../src/components/devices/AddDeviceModal';
import type { DeviceType } from '@models/device';

type FilterType = 'all' | 'sensors' | 'pumps' | 'lights' | 'other';

export default function DevicesScreen() {
  const router = useRouter();
  const { devices, loadDevices, isLoading } = useDeviceStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  useEffect(() => {
    loadDevices();
  }, []);

  const filterChips: { type: FilterType; label: string }[] = [
    { type: 'all',     label: 'All' },
    { type: 'sensors', label: 'Sensors' },
    { type: 'pumps',   label: 'Pumps' },
    { type: 'lights',  label: 'Lights' },
    { type: 'other',   label: 'Other' },
  ];

  const getFilteredDevices = () => {
    return devices.filter(device => {
      const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (device.room?.toLowerCase() ?? '').includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      switch (activeFilter) {
        case 'sensors':
          return device.type === 'water_sensor' || device.type === 'soil_sensor' || device.type === 'temperature_sensor';
        case 'pumps':
          return device.type === 'pump';
        case 'lights':
          return device.type === 'light';
        case 'other':
          return device.type !== 'water_sensor' && device.type !== 'soil_sensor' && 
                 device.type !== 'temperature_sensor' && device.type !== 'pump' && 
                 device.type !== 'light';
        default:
          return true;
      }
    });
  };

  const filtered = getFilteredDevices();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn}>
          <MaterialCommunityIcons name="menu" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Devices</Text>
        <TouchableOpacity style={styles.headerIconBtn}>
          <MaterialCommunityIcons name="dots-vertical" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <GlassInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search devices..."
          icon="magnify"
        />
      </View>

      {/* Filters Horizontal Scroller */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filterChips.map(chip => {
            const isActive = activeFilter === chip.type;
            return (
              <TouchableOpacity
                key={chip.type}
                onPress={() => setActiveFilter(chip.type)}
                style={[styles.chip, isActive ? styles.chipActive : styles.chipInactive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipLabel, isActive ? styles.chipLabelActive : styles.chipLabelInactive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <DeviceCard
            device={item}
            onPress={() => router.push(`/device/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="devices" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Devices Connected</Text>
            <Text style={styles.emptyDesc}>Tap + Add Device below to discover and connect your hardware.</Text>
          </View>
        }
        refreshing={isLoading}
        onRefresh={loadDevices}
      />

      {/* Floating Add Device button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.addDeviceButton}
          onPress={() => setIsAddModalVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.addDeviceButtonText}>+ Add Device</Text>
        </TouchableOpacity>
      </View>

      {/* Effortless Device Adoption Modal */}
      <AddDeviceModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  headerIconBtn: {
    padding: Spacing.xs,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
  },
  searchSection: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  filterSection: {
    marginBottom: Spacing.md,
  },
  filterScroll: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipInactive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.glassBorder,
  },
  chipLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
  },
  chipLabelActive: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  chipLabelInactive: {
    color: Colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: 140,
    gap: Spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  emptyDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 96,
    left: Spacing.base,
    right: Spacing.base,
  },
  addDeviceButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addDeviceButtonText: {
    color: '#FFFFFF',
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    fontWeight: 'bold',
  },
});
