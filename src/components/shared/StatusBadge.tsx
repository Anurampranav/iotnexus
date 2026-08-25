import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, IconSize } from '@design/tokens';

type BadgeStatus = 'online' | 'offline' | 'unknown' | 'pending' | 'low' | 'warning' | 'critical' | 'normal' | 'active' | 'disabled' | 'failed' | 'connecting';

interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<BadgeStatus, { color: string; bg: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; defaultLabel: string }> = {
  online:   { color: Colors.success,      bg: Colors.successSurface, icon: 'wifi',               defaultLabel: 'Online' },
  offline:  { color: Colors.textMuted,    bg: 'rgba(122,117,112,0.15)', icon: 'wifi-off',         defaultLabel: 'Offline' },
  unknown:  { color: Colors.textSecondary,bg: Colors.glass,           icon: 'help-circle-outline',defaultLabel: 'Unknown' },
  pending:  { color: Colors.warning,      bg: Colors.warningSurface,  icon: 'clock-outline',      defaultLabel: 'Pending' },
  low:      { color: Colors.primary,      bg: Colors.primarySurface,  icon: 'water-alert',        defaultLabel: 'Low' },
  warning:  { color: Colors.warning,      bg: Colors.warningSurface,  icon: 'alert',              defaultLabel: 'Warning' },
  critical: { color: Colors.error,        bg: Colors.errorSurface,    icon: 'alert-circle',       defaultLabel: 'Critical' },
  normal:   { color: Colors.success,      bg: Colors.successSurface,  icon: 'check-circle',       defaultLabel: 'Normal' },
  active:   { color: Colors.success,      bg: Colors.successSurface,  icon: 'check-circle-outline',defaultLabel: 'Active' },
  disabled: { color: Colors.textMuted,    bg: Colors.glass,           icon: 'pause-circle-outline',defaultLabel: 'Disabled' },
  failed:   { color: Colors.error,        bg: Colors.errorSurface,    icon: 'close-circle',       defaultLabel: 'Failed' },
  connecting: { color: Colors.warning,    bg: Colors.warningSurface,  icon: 'wifi-strength-outline', defaultLabel: 'Connecting' },
};

export function StatusBadge({ status, label, size = 'sm' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const displayLabel = label ?? config.defaultLabel;
  const iconSz = size === 'sm' ? IconSize.xs : IconSize.sm;
  const textSz = size === 'sm' ? Typography.fontSize.xs : Typography.fontSize.sm;
  const py = size === 'sm' ? 2 : Spacing.xs;
  const px = size === 'sm' ? Spacing.xs : Spacing.sm;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.bg, paddingVertical: py, paddingHorizontal: px },
      ]}
      accessibilityLabel={`Status: ${displayLabel}`}
    >
      <MaterialCommunityIcons
        name={config.icon}
        size={iconSz}
        color={config.color}
        style={styles.icon}
      />
      <Text style={[styles.label, { color: config.color, fontSize: textSz }]}>
        {displayLabel.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 3,
  },
  label: {
    fontFamily: Typography.fontFamily.semiBold,
    letterSpacing: Typography.letterSpacing.widest,
  },
});
