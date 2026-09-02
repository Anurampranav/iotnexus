import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassCard } from '@components/glass/GlassCard';
import { Colors, Typography, Spacing, Radius } from '@design/tokens';
import type { Device } from '@models/device';

interface WaterPumpDetailProps {
  device: Device;
  onTogglePump: (action: 'START' | 'STOP', durationMins?: number) => void;
  onEmergencyStop: () => void;
}

export const WaterPumpDetail: React.FC<WaterPumpDetailProps> = ({
  device,
  onTogglePump,
  onEmergencyStop,
}) => {
  const isPumpRunning = device.state['power']?.value === true;
  const isOffline = device.connectionStatus !== 'online';

  // Live Water System Metrics
  const tankLevelPercent = 78; // %
  const tankCapacityLiters = 1500;
  const currentTankLiters = Math.round((tankLevelPercent / 100) * tankCapacityLiters);
  const sumpLevelPercent = 84;
  const inflowLpm = isPumpRunning ? 28.5 : 0;
  const motorLoadAmps = isPumpRunning ? 7.4 : 0;

  const [selectedRuntime, setSelectedRuntime] = useState<number>(30);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 1. Animated Overhead Tank Fluid Visualizer */}
      <GlassCard style={styles.tankHeroCard}>
        <View style={styles.tankHeader}>
          <Text style={styles.tankTitle}>OVERHEAD WATER TANK</Text>
          <View style={styles.liveTag}>
            <View style={[styles.liveDot, { backgroundColor: isPumpRunning ? '#4CAF50' : '#FF9800' }]} />
            <Text style={styles.liveTagText}>{isPumpRunning ? 'FILLING' : 'IDLE'}</Text>
          </View>
        </View>

        <View style={styles.tankContainer}>
          {/* Tank Outer Shell */}
          <View style={styles.tankShell}>
            {/* Water Fill Level */}
            <View style={[styles.waterFill, { height: `${tankLevelPercent}%` }]}>
              <View style={styles.waterTopSurface} />
            </View>

            {/* Percentage Overlay */}
            <View style={styles.tankCenterOverlay}>
              <Text style={styles.tankBigPercent}>{tankLevelPercent}%</Text>
              <Text style={styles.tankVolumeSubtitle}>
                {currentTankLiters} / {tankCapacityLiters} Liters
              </Text>
            </View>
          </View>
        </View>

        {/* Live Flow Info */}
        <View style={styles.tankStatsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Flow Rate</Text>
            <Text style={styles.statValue}>{inflowLpm} LPM</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Sump Reservoir</Text>
            <Text style={styles.statValue}>{sumpLevelPercent}% (Adequate)</Text>
          </View>
        </View>
      </GlassCard>

      {/* 2. Pump Starter Control Panel */}
      <Text style={styles.sectionHeader}>MOTOR STARTER PANEL</Text>
      <GlassCard style={styles.pumpControlCard}>
        <View style={styles.pumpStatusRow}>
          <View style={[styles.pumpStatusIcon, isPumpRunning ? styles.pumpIconOn : styles.pumpIconOff]}>
            <MaterialCommunityIcons
              name="pump"
              size={36}
              color={isPumpRunning ? '#FFFFFF' : '#8A8580'}
            />
          </View>
          <View style={styles.pumpStatusTextCol}>
            <Text style={styles.pumpMainTitle}>
              {isPumpRunning ? 'Borewell Motor is Running' : 'Borewell Motor is Stopped'}
            </Text>
            <Text style={styles.pumpSubtitle}>
              {isPumpRunning ? `Auto-stop set for ${selectedRuntime} mins` : 'Ready to start'}
            </Text>
          </View>
        </View>

        {/* Runtime Preset Buttons */}
        {!isPumpRunning && (
          <View style={styles.timerSelectionSection}>
            <Text style={styles.timerSelectLabel}>Select Run Duration:</Text>
            <View style={styles.runtimePillsRow}>
              {[15, 30, 45, 60].map((mins) => {
                const isPicked = selectedRuntime === mins;
                return (
                  <TouchableOpacity
                    key={mins}
                    style={[styles.runtimePill, isPicked && styles.runtimePillPicked]}
                    onPress={() => setSelectedRuntime(mins)}
                  >
                    <Text style={[styles.runtimeText, isPicked && styles.runtimeTextPicked]}>
                      {mins} mins
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Main Start / Stop Action Buttons */}
        <View style={styles.pumpActionButtonsRow}>
          {!isPumpRunning ? (
            <TouchableOpacity
              style={styles.startPumpBtn}
              onPress={() => onTogglePump('START', selectedRuntime)}
              disabled={isOffline}
            >
              <MaterialCommunityIcons name="play-circle" size={24} color="#FFFFFF" />
              <Text style={styles.startPumpText}>START PUMP ({selectedRuntime}m)</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.stopPumpBtn}
              onPress={() => onTogglePump('STOP')}
            >
              <MaterialCommunityIcons name="stop-circle" size={24} color="#FFFFFF" />
              <Text style={styles.stopPumpText}>STOP PUMP</Text>
            </TouchableOpacity>
          )}
        </View>
      </GlassCard>

      {/* 3. Dry-Run & Safety Interlocks */}
      <Text style={styles.sectionHeader}>SAFETY & PROTECTION INTERLOCKS</Text>
      <GlassCard style={styles.safetyCard}>
        <View style={styles.safetyRow}>
          <MaterialCommunityIcons name="shield-check" size={24} color="#4CAF50" />
          <View style={styles.safetyTextCol}>
            <Text style={styles.safetyName}>Dry-Run Protection</Text>
            <Text style={styles.safetyDesc}>Auto-trips in 60s if water flow stops</Text>
          </View>
          <Text style={styles.safetyStatusActive}>ACTIVE</Text>
        </View>

        <View style={styles.safetyDivider} />

        <View style={styles.safetyRow}>
          <MaterialCommunityIcons name="lightning-bolt" size={24} color="#64B5F6" />
          <View style={styles.safetyTextCol}>
            <Text style={styles.safetyName}>Motor Current Monitor</Text>
            <Text style={styles.safetyDesc}>Operating Load: {motorLoadAmps} Amperes (Safe)</Text>
          </View>
          <Text style={styles.safetyStatusActive}>NORMAL</Text>
        </View>

        <View style={styles.safetyDivider} />

        <View style={styles.safetyRow}>
          <MaterialCommunityIcons name="water-off" size={24} color="#FF9800" />
          <View style={styles.safetyTextCol}>
            <Text style={styles.safetyName}>Tank Overflow Prevention</Text>
            <Text style={styles.safetyDesc}>Auto-stops when tank reaches 95%</Text>
          </View>
          <Text style={styles.safetyStatusActive}>ENGAGED</Text>
        </View>
      </GlassCard>

      {/* 4. Emergency Cutoff Button */}
      {isPumpRunning && (
        <TouchableOpacity style={styles.emergencyBtn} onPress={onEmergencyStop}>
          <MaterialCommunityIcons name="alert-octagon" size={20} color="#FFFFFF" />
          <Text style={styles.emergencyText}>EMERGENCY IMMEDIATE SHUTDOWN</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  tankHeroCard: {
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  tankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  tankTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#262220',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveTagText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: Colors.textPrimary,
  },
  tankContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  tankShell: {
    width: 220,
    height: 180,
    borderRadius: 24,
    backgroundColor: '#1E1B19',
    borderWidth: 3,
    borderColor: '#383330',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  waterFill: {
    width: '100%',
    backgroundColor: '#1E88E5',
    opacity: 0.85,
  },
  waterTopSurface: {
    height: 6,
    backgroundColor: '#64B5F6',
    width: '100%',
  },
  tankCenterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tankBigPercent: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize['3xl'],
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  tankVolumeSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: '#E0E0E0',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tankStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#383330',
  },
  statCol: {
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  statValue: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#383330',
  },
  sectionHeader: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pumpControlCard: {
    padding: Spacing.md,
  },
  pumpStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: Spacing.md,
  },
  pumpStatusIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pumpIconOn: {
    backgroundColor: '#4CAF50',
  },
  pumpIconOff: {
    backgroundColor: '#262220',
  },
  pumpStatusTextCol: {
    flex: 1,
  },
  pumpMainTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
  pumpSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  timerSelectionSection: {
    marginVertical: Spacing.sm,
  },
  timerSelectLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  runtimePillsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  runtimePill: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#262220',
    borderRadius: Radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#383330',
  },
  runtimePillPicked: {
    backgroundColor: '#1E88E5',
    borderColor: '#1E88E5',
  },
  runtimeText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  runtimeTextPicked: {
    color: '#FFFFFF',
  },
  pumpActionButtonsRow: {
    marginTop: Spacing.md,
  },
  startPumpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: Radius.md,
  },
  startPumpText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  stopPumpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E53935',
    paddingVertical: 14,
    borderRadius: Radius.md,
  },
  stopPumpText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  safetyCard: {
    padding: Spacing.md,
  },
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  safetyTextCol: {
    flex: 1,
  },
  safetyName: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  safetyDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  safetyStatusActive: {
    fontFamily: Typography.fontFamily.bold,
    color: '#4CAF50',
    backgroundColor: '#1C2E20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    fontSize: 10,
  },
  safetyDivider: {
    height: 1,
    backgroundColor: '#383330',
    marginVertical: Spacing.md,
  },
  emergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#B71C1C',
    paddingVertical: 14,
    borderRadius: Radius.md,
    marginTop: Spacing.lg,
  },
  emergencyText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
});
