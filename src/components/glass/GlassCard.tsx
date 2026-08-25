import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Colors, Radius, Shadows } from '@design/tokens';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Intensity of glass effect: 'subtle' | 'medium' | 'strong' */
  intensity?: 'subtle' | 'medium' | 'strong';
  /** Show orange accent glow border */
  accentBorder?: boolean;
  /** Custom border radius */
  radius?: number;
  /** Disable shadow */
  noShadow?: boolean;
}

export function GlassCard({
  children,
  style,
  intensity = 'medium',
  accentBorder = false,
  radius = Radius.lg,
  noShadow = false,
}: GlassCardProps) {
  const glassColor = {
    subtle: Colors.glass,
    medium: Colors.glassMedium,
    strong: Colors.glassStrong,
  }[intensity];

  return (
    <View
      style={[
        styles.base,
        { borderRadius: radius, backgroundColor: glassColor },
        accentBorder && styles.accentBorder,
        !noShadow && Shadows.md,
        style,
      ]}
    >
      {/* Top highlight line */}
      <View style={[styles.highlight, { borderRadius: radius }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
    position: 'relative',
  },
  accentBorder: {
    borderColor: Colors.borderFocus,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.glassHighlight,
    zIndex: 1,
  },
});
