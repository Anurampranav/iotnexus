import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { GlassCard } from '@components/glass/GlassCard';
import { Colors, Typography, Spacing } from '@design/tokens';

interface MetricCardProps {
  value: string | number;
  label: string;
  style?: StyleProp<ViewStyle>;
}

export function MetricCard({ value, label, style }: MetricCardProps) {
  return (
    <GlassCard style={[styles.container, style]} intensity="subtle">
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 70,
  },
  value: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
  },
  label: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});
