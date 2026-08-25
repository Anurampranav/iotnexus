import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, IconSize } from '@design/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function GlassTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  const getTabIcon = (routeName: string): keyof typeof MaterialCommunityIcons.glyphMap => {
    switch (routeName) {
      case 'index':
        return 'home-variant-outline';
      case 'devices':
        return 'devices';
      case 'automations':
        return 'eye-outline';
      case 'water':
        return 'water-outline';
      case 'more':
        return 'account-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const getTabLabel = (routeName: string): string => {
    switch (routeName) {
      case 'index':
        return 'Home';
      case 'devices':
        return 'Devices';
      case 'automations':
        return 'Automations';
      case 'water':
        return 'Water';
      case 'more':
        return 'Profile';
      default:
        return routeName;
    }
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + Spacing.xs }]}>
      <BlurView intensity={24} style={styles.blurContainer} tint="dark">
        <View style={styles.tabBar}>
          {state.routes.map((route: { key: string; name: string }, index: number) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            const iconName = getTabIcon(route.name);
            const label = getTabLabel(route.name);

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel || `Navigate to ${label}`}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tabItem}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={iconName}
                  size={IconSize.lg}
                  color={isFocused ? Colors.primary : Colors.textSecondary}
                />
                <Text style={[styles.label, isFocused ? styles.labelActive : styles.labelInactive]}>
                  {label}
                </Text>
                {isFocused && <View style={styles.activeDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: Spacing.base,
  },
  blurContainer: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: 'rgba(42, 39, 37, 0.45)', // fallback surface color with alpha
  },
  tabBar: {
    flexDirection: 'row',
    height: 64,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    paddingTop: Spacing.xs,
    position: 'relative',
  },
  label: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    marginTop: 2,
    letterSpacing: Typography.letterSpacing.wide,
  },
  labelActive: {
    color: Colors.primary,
  },
  labelInactive: {
    color: Colors.textSecondary,
  },
  activeDot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
});
