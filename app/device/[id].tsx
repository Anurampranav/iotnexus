import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDeviceStore } from '@store/deviceStore';
import { GlassCard } from '@components/glass/GlassCard';
import { GlassButton } from '@components/glass/GlassButton';
import { GlassToggle } from '@components/glass/GlassToggle';
import { StatusBadge } from '@components/shared/StatusBadge';
import { Colors, Typography, Spacing, Radius, IconSize } from '@design/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function DeviceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getDeviceById, sendCommand } = useDeviceStore();

  const device = getDeviceById(id);

  if (!device) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Device not found</Text>
        <GlassButton label="Go Back" onPress={() => router.back()} variant="secondary" />
      </SafeAreaView>
    );
  }

  const isOffline = device.connectionStatus !== 'online';
  const isPump = device.type === 'pump';
  const isWaterSensor = device.type === 'water_sensor';
  const isSoilSensor = device.type === 'soil_sensor';

  // State values
  const powerState = device.state['power'];
  const isOn = powerState?.value === true;
  const commandStatus = (powerState?.commandStatus ?? 'idle') as 'idle' | 'pending' | 'confirmed' | 'failed' | 'unknown';

  const handleTogglePower = async () => {
    await sendCommand(device.id, 'power', !isOn);
  };

  const handleEmergencyOff = async () => {
    if (isOn) {
      await sendCommand(device.id, 'power', false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{device.name}</Text>
        <View style={styles.headerRight}>
          <MaterialCommunityIcons name="dots-vertical" size={24} color={Colors.textPrimary} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Connection status badge */}
        <View style={styles.badgeRow}>
          <StatusBadge status={device.connectionStatus} />
          <Text style={styles.roomText}>{device.room ?? 'No Room'}</Text>
        </View>

        {/* Pump Details view */}
        {isPump && (
          <View style={styles.section}>
            <GlassCard style={styles.mainCard} accentBorder={isOn && !isOffline}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="pump" size={32} color={isOn ? Colors.primary : Colors.textSecondary} />
                <Text style={styles.cardTitle}>{device.name}</Text>
                <Text style={styles.cardSubtitle}>Utility Room</Text>
              </View>

              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>{isOn ? 'Pump is Active' : 'Pump is Stopped'}</Text>
                <GlassToggle value={isOn} onValueChange={handleTogglePower} disabled={isOffline} status={commandStatus} />
              </View>

              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Runtime Today</Text>
                  <Text style={styles.metricVal}>1h 25m</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Mode</Text>
                  <Text style={styles.metricVal}>Manual</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Power Draw</Text>
                  <Text style={styles.metricVal}>215 W</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Safety Status</Text>
                  <Text style={[styles.metricVal, { color: Colors.success }]}>Normal</Text>
                </View>
              </View>

              {isOn && (
                <GlassButton
                  label="EMERGENCY OFF"
                  onPress={handleEmergencyOff}
                  variant="danger"
                  style={styles.emergencyButton}
                />
              )}
            </GlassCard>
          </View>
        )}

        {/* Water Sensor Details */}
        {isWaterSensor && (
          <View style={styles.section}>
            <GlassCard style={styles.mainCard}>
              <View style={styles.sensorHeader}>
                <Text style={styles.sensorLabel}>Tank Level</Text>
                <View style={styles.largeValueContainer}>
                  <Text style={styles.largeValue}>{device.state['level']?.value ?? '--'}</Text>
                  <Text style={styles.largeUnit}>%</Text>
                </View>
                <StatusBadge status="low" label="LOW" />
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Threshold Limit</Text>
                <Text style={styles.infoValue}>20% (Low)</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Connected Pump</Text>
                <Text style={styles.infoValue}>Tank Pump</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Battery Level</Text>
                <Text style={styles.infoValue}>{device.state['battery']?.value ?? '--'}%</Text>
              </View>
            </GlassCard>
          </View>
        )}

        {/* Soil Moisture Sensor Details */}
        {isSoilSensor && (
          <View style={styles.section}>
            <GlassCard style={styles.mainCard}>
              <View style={styles.sensorHeader}>
                <Text style={styles.sensorLabel}>Soil Moisture</Text>
                <View style={styles.largeValueContainer}>
                  <Text style={styles.largeValue}>{device.state['moisture']?.value ?? '--'}</Text>
                  <Text style={styles.largeUnit}>%</Text>
                </View>
                <StatusBadge status="warning" label="DRY" />
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Temperature</Text>
                <Text style={styles.infoValue}>{device.state['temperature']?.value ?? '--'}°C</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Battery Level</Text>
                <Text style={styles.infoValue}>{device.state['battery']?.value ?? '--'}%</Text>
              </View>
            </GlassCard>
          </View>
        )}

        {/* Generic Device Controls */}
        {!isPump && !isWaterSensor && !isSoilSensor && (
          <View style={styles.section}>
            <GlassCard style={styles.mainCard}>
              <Text style={styles.genericTitle}>Status & Controls</Text>
              {Object.keys(device.capabilities).map(capKey => {
                const cap = device.capabilities[capKey];
                const stateVal = device.state[capKey];

                if (cap.type === 'boolean' && cap.writable) {
                  return (
                    <View key={capKey} style={styles.controlRow}>
                      <Text style={styles.controlLabel}>{cap.label}</Text>
                      <GlassToggle
                        value={stateVal?.value === true}
                        onValueChange={async (val) => await sendCommand(device.id, capKey, val)}
                        disabled={isOffline}
                      />
                    </View>
                  );
                }

                return (
                  <View key={capKey} style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{cap.label}</Text>
                    <Text style={styles.infoValue}>
                      {stateVal?.value !== null ? String(stateVal?.value) : '--'} {cap.unit ?? ''}
                    </Text>
                  </View>
                );
              })}
            </GlassCard>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.md,
    color: Colors.error,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    padding: Spacing.xs,
  },
  scrollContent: {
    padding: Spacing.base,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  roomText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  mainCard: {
    padding: Spacing.xl,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  cardTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  cardSubtitle: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
    marginBottom: Spacing.lg,
  },
  controlLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  metricItem: {
    width: '45%',
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  metricLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  metricVal: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  emergencyButton: {
    marginTop: Spacing.xl,
  },
  sensorHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  sensorLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  largeValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: Spacing.sm,
  },
  largeValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 54,
    color: Colors.textPrimary,
  },
  largeUnit: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.separator,
    marginVertical: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  infoLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  genericTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
});
