import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, Radius, Shadows } from '@design/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface GlassButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function GlassButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  fullWidth = false,
}: GlassButtonProps) {
  const handlePress = async () => {
    if (disabled || loading) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const containerStyle = [
    styles.base,
    styles[`size_${size}`],
    styles[`variant_${variant}`],
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    style,
  ];

  const labelStyle = [
    styles.label,
    styles[`label_${size}`],
    styles[`labelColor_${variant}`],
    (disabled || loading) && styles.labelDisabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={handlePress}
      activeOpacity={0.75}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? Colors.textInverse : Colors.primary}
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <Text style={labelStyle}>{label}</Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft:  { marginRight: Spacing.sm },
  iconRight: { marginLeft: Spacing.sm },

  // Sizes
  size_sm: { paddingHorizontal: Spacing.md,  paddingVertical: Spacing.sm, borderRadius: Radius.sm },
  size_md: { paddingHorizontal: Spacing.xl,  paddingVertical: Spacing.md },
  size_lg: { paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.base, borderRadius: Radius.xl },

  // Variants
  variant_primary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryLight,
    ...Shadows.glow,
  },
  variant_secondary: {
    backgroundColor: Colors.glassMedium,
    borderColor: Colors.glassBorder,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
    borderColor: Colors.glassBorder,
  },
  variant_danger: {
    backgroundColor: Colors.errorSurface,
    borderColor: Colors.error,
  },

  // Labels
  label: {
    fontFamily: Typography.fontFamily.semiBold,
    letterSpacing: Typography.letterSpacing.wide,
  },
  label_sm:   { fontSize: Typography.fontSize.sm },
  label_md:   { fontSize: Typography.fontSize.base },
  label_lg:   { fontSize: Typography.fontSize.md },

  labelColor_primary:   { color: Colors.textInverse },
  labelColor_secondary: { color: Colors.textPrimary },
  labelColor_ghost:     { color: Colors.primary },
  labelColor_danger:    { color: Colors.error },

  disabled:       { opacity: 0.45 },
  labelDisabled:  {},
});
