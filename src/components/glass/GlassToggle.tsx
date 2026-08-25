import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  View,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Animation } from '@design/tokens';

interface GlassToggleProps {
  value: boolean;
  onValueChange: (newValue: boolean) => void;
  disabled?: boolean;
  /** 'pending' shows loading indicator instead of thumb */
  status?: 'idle' | 'pending' | 'confirmed' | 'failed' | 'unknown';
  size?: 'sm' | 'md';
}

const TRACK_WIDTH_MD = 52;
const TRACK_HEIGHT_MD = 30;
const THUMB_SIZE_MD = 22;
const THUMB_TRAVEL_MD = TRACK_WIDTH_MD - THUMB_SIZE_MD - 6;

const TRACK_WIDTH_SM = 40;
const TRACK_HEIGHT_SM = 24;
const THUMB_SIZE_SM = 18;
const THUMB_TRAVEL_SM = TRACK_WIDTH_SM - THUMB_SIZE_SM - 4;

export function GlassToggle({
  value,
  onValueChange,
  disabled = false,
  status = 'idle',
  size = 'md',
}: GlassToggleProps) {
  const thumbAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const trackW = size === 'md' ? TRACK_WIDTH_MD : TRACK_WIDTH_SM;
  const trackH = size === 'md' ? TRACK_HEIGHT_MD : TRACK_HEIGHT_SM;
  const thumbSz = size === 'md' ? THUMB_SIZE_MD : THUMB_SIZE_SM;
  const travel  = size === 'md' ? THUMB_TRAVEL_MD : THUMB_TRAVEL_SM;
  const padding  = size === 'md' ? 4 : 3;

  useEffect(() => {
    Animated.spring(thumbAnim, {
      toValue: value ? 1 : 0,
      useNativeDriver: true,
      tension: 200,
      friction: 12,
    }).start();
  }, [value]);

  const handlePress = async () => {
    if (disabled || status === 'pending') return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Bounce animation
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 100, useNativeDriver: true }),
    ]).start();

    onValueChange(!value);
  };

  const trackColor = thumbAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [Colors.surfaceHigh, Colors.primary],
  });

  const thumbX = thumbAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [padding, travel],
  });

  const isPending = status === 'pending';
  const isFailed  = status === 'failed';

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.9}
        disabled={disabled || isPending}
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled }}
      >
        <Animated.View
          style={[
            styles.track,
            {
              width: trackW,
              height: trackH,
              borderRadius: Radius.full,
              backgroundColor: trackColor,
              borderColor: isFailed ? Colors.error : Colors.glassBorder,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.thumb,
              {
                width: thumbSz,
                height: thumbSz,
                borderRadius: Radius.full,
                top: padding,
                transform: [{ translateX: thumbX }],
              },
              isPending && styles.thumbPending,
            ]}
          >
            {isPending && (
              <ActivityIndicator size="small" color={Colors.primary} />
            )}
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderWidth: 1,
    justifyContent: 'center',
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  thumbPending: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
});
