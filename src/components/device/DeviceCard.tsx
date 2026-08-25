import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassCard } from '@components/glass/GlassCard';
import { GlassToggle } from '@components/glass/GlassToggle';
import { StatusBadge } from '@components/shared/StatusBadge';
import { Colors, Typography, Spacing, IconSize } from '@design/tokens';
import { useDeviceStore } from '@store/deviceStore';
import type { Device } from '@models/device';
import { getDeviceIcon, getDevicePrimaryValue } from '@utils/deviceUtils';

interface DeviceCardProps {
  device: Device;
  onPress?: () => void;
  compact?: boolean;
}

export function DeviceCard({ device, onPress, compact = false }: DeviceCardProps) {
  const sendCommand = useDeviceStore(s => s.sendCommand);
  const isPowerCapability = 'power' in device.capabilities;
  const powerState = device.state['power'];
  const isOn = powerState?.value === true;
  const commandStatus = (powerState?.commandStatus ?? 'idle') as 'idle' | 'pending' | 'confirmed' | 'failed' | 'unknown';
  const isOffline = device.connectionStatus !== 'online';

  const { label: primaryLabel, value: primaryValue, unit } = getDevicePrimaryValue(device);
  const icon = getDeviceIcon(device.type);

  const handleToggle = async (newVal: boolean) => {
    await sendCommand(device.id, 'power', newVal);
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${device.name}, ${isOffline ? 'offline' : isOn ? 'on' : 'off'}`}
    >
      <GlassCard
        style={compact ? styles.cardCompact : styles.card}
        accentBorder={isOn && !isOffline}
      >
        <View style={styles.row}>
          {/* Icon */}
          <View style={[
            styles.iconWrap,
            isOn && !isOffline ? styles.iconWrapActive : styles.iconWrapInactive,
          ]}>
            <MaterialCommunityIcons
              name={icon}
              size={IconSize.md}
              color={isOn && !isOffline ? Colors.primary : Colors.textSecondary}
            />
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.name} numberOfLines={1}>{device.name}</Text>
            <Text style={styles.room} numberOfLines={1}>{device.room ?? 'No room'}</Text>

            {/* Primary value */}
            {primaryValue !== null && !isPowerCapability && (
              <View style={styles.valueRow}>
                <Text style={styles.bigValue}>{String(primaryValue)}</Text>
                {unit && <Text style={styles.unit}>{unit}</Text>}
              </View>
            )}
          </View>

          {/* Right: toggle or value + status */}
          <View style={styles.right}>
            {isPowerCapability ? (
              <GlassToggle
                value={isOn}
                onValueChange={handleToggle}
                disabled={isOffline}
                status={commandStatus}
                size="md"
              />
            ) : (
              <StatusBadge
                status={isOffline ? 'offline' : 'online'}
                label={isOffline ? 'Offline' : 'Live'}
              />
            )}
          </View>
        </View>

        {/* Offline overlay indicator */}
        {isOffline && (
          <View style={styles.offlineBar}>
            <MaterialCommunityIcons name="wifi-off" size={10} color={Colors.textMuted} />
            <Text style={styles.offlineText}>Device offline</Text>
          </View>
        )}
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.base,
    marginBottom: Spacing.sm,
  },
  cardCompact: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  iconWrapActive: {
    backgroundColor: Colors.primarySurface,
    borderWidth: 1,
    borderColor: 'rgba(255,138,80,0.25)',
  },
  iconWrapInactive: {
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  content: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  name: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  room: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: Spacing.xs,
  },
  bigValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
  },
  unit: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginLeft: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  offlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.separator,
    paddingTop: Spacing.xs,
    gap: 4,
  },
  offlineText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
});
