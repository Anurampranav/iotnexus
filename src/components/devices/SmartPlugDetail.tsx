import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassCard } from '@components/glass/GlassCard';
import { GlassButton } from '@components/glass/GlassButton';
import { Colors, Typography, Spacing, Radius } from '@design/tokens';
import type { Device } from '@models/device';

interface SmartPlugDetailProps {
  device: Device;
  onTogglePower: () => void;
  onSetTimer: (minutes: number) => void;
}

export const SmartPlugDetail: React.FC<SmartPlugDetailProps> = ({
  device,
  onTogglePower,
  onSetTimer,
}) => {
  const isOn = device.state['power']?.value === true;
  const isOffline = device.connectionStatus !== 'online';

  // Live Electrical Telemetry
  const powerWatts = isOn ? (typeof device.state['power_draw']?.value === 'number' ? device.state['power_draw'].value : 185) : 0;
  const voltage = isOn ? 234.2 : 0;
  const currentMa = isOn ? Math.round((powerWatts / 234.2) * 1000) : 0;
  const todayKwh = 1.42;

  // Selected Countdown Timer
  const [activeTimer, setActiveTimer] = useState<number | null>(null);
  const [countdownRemaining, setCountdownRemaining] = useState<string>('');

  // Pulse animation for active neon ring
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (isOn) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 1200, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOn]);

  const handleSelectTimer = (minutes: number) => {
    if (activeTimer === minutes) {
      setActiveTimer(null);
      setCountdownRemaining('');
    } else {
      setActiveTimer(minutes);
      setCountdownRemaining(`${minutes}m 00s remaining`);
      onSetTimer(minutes);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 1. Big Interactive Neon Power Ring */}
      <View style={styles.ringSection}>
        <Animated.View
          style={[
            styles.outerGlowRing,
            isOn && styles.outerGlowActive,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <TouchableOpacity
            style={[styles.mainPowerButton, isOn ? styles.powerButtonOn : styles.powerButtonOff]}
            onPress={onTogglePower}
            disabled={isOffline}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name="power"
              size={54}
              color={isOn ? '#FFFFFF' : '#8A8580'}
            />
            <Text style={[styles.powerStateLabel, isOn ? styles.labelOn : styles.labelOff]}>
              {isOn ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
        <Text style={styles.deviceStatusText}>
          {isOffline ? 'Socket Offline' : isOn ? '⚡ Delivering Power' : 'Standby Mode'}
        </Text>
      </View>

      {/* 2. Real-Time Energy Monitoring Suite */}
      <Text style={styles.sectionHeader}>REAL-TIME ENERGY METRICS</Text>
      <View style={styles.metricsGrid}>
        <GlassCard style={styles.metricCard}>
          <View style={styles.metricIconRow}>
            <MaterialCommunityIcons name="flash" size={20} color="#FF8A50" />
            <Text style={styles.metricTitle}>Active Power</Text>
          </View>
          <Text style={styles.metricBigValue}>{powerWatts}</Text>
          <Text style={styles.metricUnit}>Watts (W)</Text>
        </GlassCard>

        <GlassCard style={styles.metricCard}>
          <View style={styles.metricIconRow}>
            <MaterialCommunityIcons name="sine-wave" size={20} color="#64B5F6" />
            <Text style={styles.metricTitle}>Line Voltage</Text>
          </View>
          <Text style={styles.metricBigValue}>{voltage.toFixed(1)}</Text>
          <Text style={styles.metricUnit}>Volts (V)</Text>
        </GlassCard>

        <GlassCard style={styles.metricCard}>
          <View style={styles.metricIconRow}>
            <MaterialCommunityIcons name="current-ac" size={20} color="#81C784" />
            <Text style={styles.metricTitle}>Load Current</Text>
          </View>
          <Text style={styles.metricBigValue}>{currentMa}</Text>
          <Text style={styles.metricUnit}>mA</Text>
        </GlassCard>

        <GlassCard style={styles.metricCard}>
          <View style={styles.metricIconRow}>
            <MaterialCommunityIcons name="chart-bell-curve" size={20} color="#BA68C8" />
            <Text style={styles.metricTitle}>Today's Energy</Text>
          </View>
          <Text style={styles.metricBigValue}>{todayKwh}</Text>
          <Text style={styles.metricUnit}>kWh</Text>
        </GlassCard>
      </View>

      {/* 3. Auto-Off Countdown Timers */}
      <Text style={styles.sectionHeader}>AUTO-OFF COUNTDOWN</Text>
      <GlassCard style={styles.timerCard}>
        <View style={styles.timerRow}>
          {[15, 30, 60, 120].map((mins) => {
            const isSelected = activeTimer === mins;
            const label = mins >= 60 ? `${mins / 60}h` : `${mins}m`;
            return (
              <TouchableOpacity
                key={mins}
                style={[styles.timerPill, isSelected && styles.timerPillActive]}
                onPress={() => handleSelectTimer(mins)}
              >
                <Text style={[styles.timerText, isSelected && styles.timerTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {activeTimer && (
          <View style={styles.timerFeedbackRow}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#FF8A50" />
            <Text style={styles.timerFeedbackText}>Auto-off in {countdownRemaining}</Text>
          </View>
        )}
      </GlassCard>

      {/* 4. Socket Protection & Safety Info */}
      <Text style={styles.sectionHeader}>SOCKET SETTINGS</Text>
      <GlassCard style={styles.settingsCard}>
        <View style={styles.settingItem}>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingName}>Overload Protection (16A)</Text>
            <Text style={styles.settingDesc}>Auto trip if power exceeds 3500W</Text>
          </View>
          <MaterialCommunityIcons name="shield-check" size={24} color="#6BCB8C" />
        </View>
        <View style={styles.settingDivider} />
        <View style={styles.settingItem}>
          <View style={styles.settingTextCol}>
            <Text style={styles.settingName}>Power-On State Memory</Text>
            <Text style={styles.settingDesc}>Restore last state after power outage</Text>
          </View>
          <Text style={styles.settingValBadge}>RESTORE</Text>
        </View>
      </GlassCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  ringSection: {
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  outerGlowRing: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#262220',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#383330',
  },
  outerGlowActive: {
    borderColor: '#FF8A50',
    shadowColor: '#FF8A50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 18,
    elevation: 12,
  },
  mainPowerButton: {
    width: 136,
    height: 136,
    borderRadius: 68,
    justifyContent: 'center',
    alignItems: 'center',
  },
  powerButtonOn: {
    backgroundColor: '#FF8A50',
  },
  powerButtonOff: {
    backgroundColor: '#1C1918',
  },
  powerStateLabel: {
    fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.xs, fontWeight: 'bold',
    marginTop: 4,
    letterSpacing: 1,
  },
  labelOn: {
    color: '#FFFFFF',
  },
  labelOff: {
    color: '#7A7570',
  },
  deviceStatusText: {
    fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  sectionHeader: {
    fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.xs, fontWeight: 'bold',
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    padding: Spacing.md,
  },
  metricIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metricTitle: {
    fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  metricBigValue: {
    fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.xl, fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 4,
  },
  metricUnit: {
    fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  timerCard: {
    padding: Spacing.md,
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  timerPill: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#262220',
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#383330',
  },
  timerPillActive: {
    backgroundColor: '#FF8A50',
    borderColor: '#FF8A50',
  },
  timerText: {
    fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  timerTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  timerFeedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#383330',
  },
  timerFeedbackText: {
    fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm,
    color: '#FF8A50',
  },
  settingsCard: {
    padding: Spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingTextCol: {
    flex: 1,
  },
  settingName: {
    fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  settingDesc: {
    fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#383330',
    marginVertical: Spacing.md,
  },
  settingValBadge: {
    fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.xs, fontWeight: 'bold',
    color: '#FF8A50',
    backgroundColor: '#2E221C',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
});
