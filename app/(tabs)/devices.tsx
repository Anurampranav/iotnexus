import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useDeviceStore } from '@store/deviceStore';
import { GlassInput } from '@components/glass/GlassInput';
import { DeviceCard } from '@components/device/DeviceCard';
import { GlassButton } from '@components/glass/GlassButton';
import { EmptyState } from '@components/shared/EmptyState';
import { Colors, Typography, Spacing, Radius } from '@design/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DeviceType } from '@models/device';
import { Tuya } from '../../src/native/Tuya';

type FilterType = 'all' | 'sensors' | 'pumps' | 'lights' | 'other';

export default function DevicesScreen() {
  const router = useRouter();
  const { devices, loadDevices, isLoading } = useDeviceStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

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
      // 1. Search Query filter
      const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (device.room?.toLowerCase() ?? '').includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Chip filter
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

  const handleAddDevice = async () => {
    try {
      await Tuya.startDevicePairing();
    } catch (err: any) {
      Alert.alert('Add Device Error', err?.message || 'Failed to open device pairing screen.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Devices</Text>
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
          <EmptyState
            title="No devices found"
            description="Try modifying your search or filter options"
          />
        }
        refreshing={isLoading}
        onRefresh={loadDevices}
      />

      {/* Floating Add Device button */}
      <View style={styles.fabContainer}>
        <GlassButton
          label="+ ADD DEVICE"
          onPress={handleAddDevice}
          variant="primary"
          style={styles.fab}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
  },
  searchSection: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  filterSection: {
    marginBottom: Spacing.md,
  },
  filterScroll: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryLight,
  },
  chipInactive: {
    backgroundColor: Colors.glassMedium,
    borderColor: Colors.glassBorder,
  },
  chipLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
  },
  chipLabelActive: {
    color: Colors.textInverse,
  },
  chipLabelInactive: {
    color: Colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: 160,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 90,
    left: Spacing.base,
    right: Spacing.base,
    alignItems: 'center',
  },
  fab: {
    width: '100%',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});
