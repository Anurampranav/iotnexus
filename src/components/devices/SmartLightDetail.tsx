import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassCard } from '@components/glass/GlassCard';
import { Colors, Typography, Spacing, Radius } from '@design/tokens';
import type { Device } from '@models/device';

interface SmartLightDetailProps {
  device: Device;
  onTogglePower: () => void;
  onSetBrightness: (brightness: number) => void;
  onSetColor: (hex: string) => void;
  onSetColorTemp: (kelvin: number) => void;
  onSetScene: (sceneName: string) => void;
}

const COLOR_PALETTE = [
  '#FF3B30', // Crimson Red
  '#FF9500', // Warm Amber
  '#FFCC00', // Gold
  '#34C759', // Emerald
  '#00C7BE', // Aqua
  '#30B0C7', // Cyan
  '#007AFF', // Cobalt Blue
  '#5856D6', // Indigo
  '#AF52DE', // Violet
  '#FF2D55', // Magenta Pink
  '#FFF2E0', // 2700K Warm White
  '#F0F8FF', // 6500K Cool White
];

const PRESET_SCENES = [
  { id: 'reading', label: 'Reading', icon: 'book-open-variant', color: '#FFF2D6', desc: 'Warm 4000K Focus' },
  { id: 'cozy', label: 'Cozy', icon: 'candle', color: '#FFB870', desc: 'Relaxing 2700K Glow' },
  { id: 'night', label: 'Night Light', icon: 'weather-night', color: '#6A5ACD', desc: 'Soft 10% Amber' },
  { id: 'work', label: 'Energize', icon: 'laptop', color: '#E0F7FA', desc: 'Daylight 6500K' },
  { id: 'party', label: 'Party Flow', icon: 'music-note', color: '#FF007F', desc: 'Vibrant RGB Pulse' },
];

export const SmartLightDetail: React.FC<SmartLightDetailProps> = ({
  device,
  onTogglePower,
  onSetBrightness,
  onSetColor,
  onSetColorTemp,
  onSetScene,
}) => {
  const isOn = device.state['power']?.value === true;
  const isOffline = device.connectionStatus !== 'online';

  const [selectedColor, setSelectedColor] = useState('#FF9500');
  const [brightness, setBrightness] = useState(85);
  const [activeTab, setActiveTab] = useState<'rgb' | 'white' | 'scene'>('rgb');
  const [activeScene, setActiveScene] = useState<string>('cozy');

  const handleColorPress = (hex: string) => {
    setSelectedColor(hex);
    onSetColor(hex);
  };

  const handleBrightnessPress = (val: number) => {
    setBrightness(val);
    onSetBrightness(val);
  };

  const handleScenePress = (scene: typeof PRESET_SCENES[0]) => {
    setActiveScene(scene.id);
    setSelectedColor(scene.color);
    onSetScene(scene.id);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 1. Bulb Visualizer & Power Switch */}
      <View style={styles.bulbHeroContainer}>
        <View
          style={[
            styles.bulbGlowHalo,
            isOn && {
              backgroundColor: `${selectedColor}22`,
              shadowColor: selectedColor,
              shadowOpacity: 0.9,
              shadowRadius: 30,
              elevation: 15,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="lightbulb-on"
            size={88}
            color={isOn ? selectedColor : '#55514E'}
          />
        </View>

        <TouchableOpacity
          style={[styles.powerToggleBtn, isOn ? styles.powerBtnActive : styles.powerBtnInactive]}
          onPress={onTogglePower}
          disabled={isOffline}
        >
          <MaterialCommunityIcons
            name="power"
            size={22}
            color={isOn ? '#FFFFFF' : '#8A8580'}
          />
          <Text style={[styles.powerBtnText, isOn ? styles.textActive : styles.textInactive]}>
            {isOn ? 'LIGHT ON' : 'LIGHT OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Mode Tabs: RGB Color / White CCT / Scene */}
      <View style={styles.modeTabsRow}>
        <TouchableOpacity
          style={[styles.modeTab, activeTab === 'rgb' && styles.modeTabActive]}
          onPress={() => setActiveTab('rgb')}
        >
          <Text style={[styles.modeTabText, activeTab === 'rgb' && styles.modeTabTextActive]}>
            RGB Colors
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTab, activeTab === 'white' && styles.modeTabActive]}
          onPress={() => setActiveTab('white')}
        >
          <Text style={[styles.modeTabText, activeTab === 'white' && styles.modeTabTextActive]}>
            White CCT
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTab, activeTab === 'scene' && styles.modeTabActive]}
          onPress={() => setActiveTab('scene')}
        >
          <Text style={[styles.modeTabText, activeTab === 'scene' && styles.modeTabTextActive]}>
            Scenes
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Tab Content */}
      {activeTab === 'rgb' && (
        <GlassCard style={styles.tabCard}>
          <Text style={styles.subSectionTitle}>COLOR SPECTRUM PALETTE</Text>
          <View style={styles.paletteGrid}>
            {COLOR_PALETTE.map((hex) => {
              const isPicked = selectedColor === hex;
              return (
                <TouchableOpacity
                  key={hex}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: hex },
                    isPicked && styles.colorCirclePicked,
                  ]}
                  onPress={() => handleColorPress(hex)}
                >
                  {isPicked && <MaterialCommunityIcons name="check" size={18} color={hex === '#F0F8FF' || hex === '#FFF2E0' ? '#000' : '#FFF'} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassCard>
      )}

      {activeTab === 'white' && (
        <GlassCard style={styles.tabCard}>
          <Text style={styles.subSectionTitle}>COLOR TEMPERATURE (2700K - 6500K)</Text>
          <View style={styles.cctRow}>
            {[
              { kelvin: 2700, label: 'Warm (2700K)', color: '#FFB870' },
              { kelvin: 4000, label: 'Neutral (4000K)', color: '#FFF1D6' },
              { kelvin: 5000, label: 'Daylight (5000K)', color: '#F4FAFF' },
              { kelvin: 6500, label: 'Cool (6500K)', color: '#E0F2FE' },
            ].map((item) => (
              <TouchableOpacity
                key={item.kelvin}
                style={[styles.cctPill, { borderColor: item.color }]}
                onPress={() => {
                  setSelectedColor(item.color);
                  onSetColorTemp(item.kelvin);
                }}
              >
                <View style={[styles.cctDot, { backgroundColor: item.color }]} />
                <Text style={styles.cctLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>
      )}

      {activeTab === 'scene' && (
        <View style={styles.scenesGrid}>
          {PRESET_SCENES.map((scene) => {
            const isSelected = activeScene === scene.id;
            return (
              <GlassCard
                key={scene.id}
                style={[styles.sceneCard, isSelected && styles.sceneCardActive]}
              >
                <TouchableOpacity
                  style={styles.sceneTouch}
                  onPress={() => handleScenePress(scene)}
                >
                  <View style={[styles.sceneIconBox, { backgroundColor: `${scene.color}33` }]}>
                    <MaterialCommunityIcons name={scene.icon as any} size={26} color={scene.color} />
                  </View>
                  <Text style={styles.sceneName}>{scene.label}</Text>
                  <Text style={styles.sceneDesc}>{scene.desc}</Text>
                </TouchableOpacity>
              </GlassCard>
            );
          })}
        </View>
      )}

      {/* 4. Smooth Brightness Control */}
      <Text style={styles.sectionHeader}>BRIGHTNESS ({brightness}%)</Text>
      <GlassCard style={styles.brightnessCard}>
        <View style={styles.brightnessStepsRow}>
          {[20, 40, 60, 80, 100].map((step) => {
            const isSelected = brightness === step;
            return (
              <TouchableOpacity
                key={step}
                style={[styles.brightnessStepBtn, isSelected && styles.brightnessStepActive]}
                onPress={() => handleBrightnessPress(step)}
              >
                <Text style={[styles.brightnessStepText, isSelected && styles.brightnessStepTextActive]}>
                  {step}%
                </Text>
              </TouchableOpacity>
            );
          })}
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
  bulbHeroContainer: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  bulbGlowHalo: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#262220',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  powerToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  powerBtnActive: {
    backgroundColor: '#FF8A50',
    borderColor: '#FF8A50',
  },
  powerBtnInactive: {
    backgroundColor: '#262220',
    borderColor: '#383330',
  },
  powerBtnText: {
    fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.xs, fontWeight: 'bold',
    letterSpacing: 1,
  },
  textActive: {
    color: '#FFFFFF',
  },
  textInactive: {
    color: '#8A8580',
  },
  modeTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#262220',
    borderRadius: Radius.md,
    padding: 4,
    marginVertical: Spacing.md,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  modeTabActive: {
    backgroundColor: '#383330',
  },
  modeTabText: {
    fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  modeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  tabCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  subSectionTitle: {
    fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.xs, fontWeight: 'bold',
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
  },
  colorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCirclePicked: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  cctRow: {
    flexDirection: 'column',
    gap: 10,
  },
  cctPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: Radius.md,
    backgroundColor: '#1E1B19',
    borderWidth: 1,
  },
  cctDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  cctLabel: {
    fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  scenesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sceneCard: {
    width: '48%',
    padding: Spacing.sm,
  },
  sceneCardActive: {
    borderColor: '#FF8A50',
    borderWidth: 1.5,
  },
  sceneTouch: {
    alignItems: 'flex-start',
  },
  sceneIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  sceneName: {
    fontFamily: Typography.fontFamily.medium, fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  sceneDesc: {
    fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  sectionHeader: {
    fontFamily: Typography.fontFamily.bold, fontSize: Typography.fontSize.xs, fontWeight: 'bold',
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  brightnessCard: {
    padding: Spacing.md,
  },
  brightnessStepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  brightnessStepBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#262220',
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#383330',
  },
  brightnessStepActive: {
    backgroundColor: '#FF8A50',
    borderColor: '#FF8A50',
  },
  brightnessStepText: {
    fontFamily: Typography.fontFamily.regular, fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  brightnessStepTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
