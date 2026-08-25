import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@store/settingsStore';
import { GlassCard } from '@components/glass/GlassCard';
import { Colors, Typography, Spacing, Radius } from '@design/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Section = {
  title: string;
  items: SettingItem[];
};

type SettingItem = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  sublabel?: string;
  control?: React.ReactNode;
  onPress?: () => void;
};

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useSettingsStore();

  const sections: Section[] = [
    {
      title: 'Notifications',
      items: [
        {
          icon: 'bell-ring-outline',
          label: 'Push Notifications',
          sublabel: 'Receive push alerts',
          control: (
            <Switch
              value={settings.pushNotificationsEnabled}
              onValueChange={settings.setPushNotificationsEnabled}
              trackColor={{ false: Colors.surface, true: Colors.primary }}
              thumbColor={Colors.textPrimary}
            />
          ),
        },
        {
          icon: 'alert-circle-outline',
          label: 'Critical Alerts',
          sublabel: 'Safety-critical rule alerts',
          control: (
            <Switch
              value={settings.criticalAlertsEnabled}
              onValueChange={settings.setCriticalAlertsEnabled}
              trackColor={{ false: Colors.surface, true: Colors.primary }}
              thumbColor={Colors.textPrimary}
            />
          ),
        },
        {
          icon: 'robot-outline',
          label: 'Automation Alerts',
          sublabel: 'Rule trigger notifications',
          control: (
            <Switch
              value={settings.automationAlertsEnabled}
              onValueChange={settings.setAutomationAlertsEnabled}
              trackColor={{ false: Colors.surface, true: Colors.primary }}
              thumbColor={Colors.textPrimary}
            />
          ),
        },
      ],
    },
    {
      title: 'Automation',
      items: [
        {
          icon: 'play-circle-outline',
          label: 'Auto-Evaluate Rules',
          sublabel: 'Evaluate rules on sensor update',
          control: (
            <Switch
              value={settings.autoEvaluateEnabled}
              onValueChange={settings.setAutoEvaluateEnabled}
              trackColor={{ false: Colors.surface, true: Colors.primary }}
              thumbColor={Colors.textPrimary}
            />
          ),
        },
        {
          icon: 'timer-outline',
          label: 'Rule Cooldown',
          sublabel: `${settings.cooldownMs}ms between evaluations`,
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Units',
      items: [
        {
          icon: 'thermometer',
          label: 'Temperature',
          sublabel: settings.temperatureUnit === 'celsius' ? '°C — Celsius' : '°F — Fahrenheit',
          onPress: () =>
            settings.setTemperatureUnit(
              settings.temperatureUnit === 'celsius' ? 'fahrenheit' : 'celsius'
            ),
        },
        {
          icon: 'water-outline',
          label: 'Volume',
          sublabel: settings.volumeUnit === 'liters' ? 'Litres (L)' : 'Gallons (gal)',
          onPress: () =>
            settings.setVolumeUnit(
              settings.volumeUnit === 'liters' ? 'gallons' : 'liters'
            ),
        },
      ],
    },
    {
      title: 'Security',
      items: [
        {
          icon: 'fingerprint',
          label: 'Biometric Login',
          sublabel: 'Use fingerprint or face unlock',
          control: (
            <Switch
              value={settings.biometricEnabled}
              onValueChange={settings.setBiometricEnabled}
              trackColor={{ false: Colors.surface, true: Colors.primary }}
              thumbColor={Colors.textPrimary}
            />
          ),
        },
      ],
    },
    {
      title: 'Connectivity',
      items: [
        {
          icon: 'wifi-cog',
          label: 'MQTT Auto-Reconnect',
          sublabel: 'Reconnect on network restore',
          control: (
            <Switch
              value={settings.mqttAutoReconnect}
              onValueChange={settings.setMqttAutoReconnect}
              trackColor={{ false: Colors.surface, true: Colors.primary }}
              thumbColor={Colors.textPrimary}
            />
          ),
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          icon: 'information-outline',
          label: 'App Version',
          sublabel: 'Smart CodeFlurry · Expo SDK 57',
        },
        {
          icon: 'shield-check-outline',
          label: 'Privacy Policy',
          onPress: () => {},
        },
        {
          icon: 'file-document-outline',
          label: 'Terms of Service',
          onPress: () => {},
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <GlassCard style={styles.card}>
              {section.items.map((item, i) => {
                const isLast = i === section.items.length - 1;
                return (
                  <TouchableOpacity
                    key={item.label}
                    onPress={item.onPress}
                    disabled={!item.onPress && !item.control}
                    activeOpacity={item.onPress ? 0.8 : 1}
                    style={[styles.row, !isLast && styles.rowBorder]}
                  >
                    <View style={styles.rowLeft}>
                      <View style={styles.iconCircle}>
                        <MaterialCommunityIcons
                          name={item.icon}
                          size={18}
                          color={Colors.textSecondary}
                        />
                      </View>
                      <View>
                        <Text style={styles.rowLabel}>{item.label}</Text>
                        {item.sublabel && (
                          <Text style={styles.rowSublabel}>{item.sublabel}</Text>
                        )}
                      </View>
                    </View>

                    {item.control ?? (
                      item.onPress ? (
                        <MaterialCommunityIcons
                          name="chevron-right"
                          size={20}
                          color={Colors.textMuted}
                        />
                      ) : null
                    )}
                  </TouchableOpacity>
                );
              })}
            </GlassCard>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
  },
  scrollContent: {
    padding: Spacing.base,
  },
  section: {
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  card: {
    padding: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    flexShrink: 0,
  },
  rowLabel: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  rowSublabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
});
