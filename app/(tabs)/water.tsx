import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useDeviceStore } from '@store/deviceStore';
import { Colors, Typography, Spacing, Radius } from '@design/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function WaterManagementScreen() {
  const router = useRouter();
  const { devices, loadDevices, sendCommand, isLoading } = useDeviceStore();

  useEffect(() => {
    loadDevices();
  }, []);

  const findDevice = (id: string) => devices.find(d => d.id === id);

  const tankSensor = findDevice('dev-tank-sensor');
  const sumpSensor = findDevice('dev-sump-sensor');
  const tankPump = findDevice('dev-tank-pump');
  const borewellPump = findDevice('dev-borewell-pump');
  const irrigationPump = findDevice('dev-irrigation-pump');

  const tankLevel = (tankSensor?.state['level']?.value as number) ?? 18;
  const sumpLevel = (sumpSensor?.state['level']?.value as number) ?? 65;

  const isBorewellOn = borewellPump?.state['power']?.value === true;
  const isTankPumpOn = tankPump?.state['power']?.value === true;
  const isIrrigationOn = irrigationPump?.state['power']?.value === true;

  const [systemStatusFilter, setSystemStatusFilter] = useState<'normal' | 'low' | 'critical'>('low');

  const togglePump = async (deviceId: string, currentVal: boolean) => {
    await sendCommand(deviceId, 'power', !currentVal);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header matching chart */}
      <View style={styles.header}>
        <View style={styles.headerLeftGroup}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="chevron-left" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Water Management</Text>
        </View>
        <TouchableOpacity style={styles.headerActionBtn}>
          <MaterialCommunityIcons name="dots-vertical" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadDevices}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Schematic System Diagram matching chart */}
        <View style={styles.diagramContainer}>
          {/* Top Row: Borewell & Tank */}
          <View style={styles.diagramTopRow}>
            <View style={styles.diagramNodeCard}>
              <View style={styles.nodeIconCircle}>
                <MaterialCommunityIcons name="pump" size={22} color={Colors.textPrimary} />
              </View>
              <Text style={styles.nodeTitle}>Borewell</Text>
              <Text style={styles.nodeSub}>Pump</Text>
            </View>

            <View style={styles.tankNodeCard}>
              <View style={styles.tankLevelVisual}>
                <View style={[styles.tankLiquidFill, { height: `${tankLevel}%` }]} />
              </View>
              <Text style={styles.nodeTitle}>Tank</Text>
              <Text style={[styles.nodeValue, { color: Colors.primary }]}>{tankLevel}%</Text>
              <Text style={styles.nodeTag}>Low</Text>
            </View>
          </View>

          {/* Bottom Row: Sump, Tank Pump, Irrigation Pump */}
          <View style={styles.diagramBottomRow}>
            <View style={styles.diagramNodeCard}>
              <View style={styles.nodeIconCircle}>
                <MaterialCommunityIcons name="waves" size={22} color={Colors.info} />
              </View>
              <Text style={styles.nodeTitle}>Sump</Text>
              <Text style={styles.nodeValue}>{sumpLevel}%</Text>
            </View>

            <View style={styles.diagramNodeCard}>
              <View style={[styles.nodeIconCircle, styles.nodeIconCircleActive]}>
                <MaterialCommunityIcons name="pump" size={22} color={Colors.primary} />
              </View>
              <Text style={styles.nodeTitle}>Tank Pump</Text>
              <Text style={[styles.nodeTag, { color: isTankPumpOn ? Colors.success : Colors.textMuted }]}>
                {isTankPumpOn ? '● ON' : '● OFF'}
              </Text>
            </View>

            <View style={styles.diagramNodeCard}>
              <View style={styles.nodeIconCircle}>
                <MaterialCommunityIcons name="sprinkler" size={22} color={Colors.textMuted} />
              </View>
              <Text style={styles.nodeTitle}>Irrigation</Text>
              <Text style={styles.nodeSub}>Pump</Text>
              <Text style={[styles.nodeTag, { color: isIrrigationOn ? Colors.success : Colors.textMuted }]}>
                {isIrrigationOn ? '● ON' : '● OFF'}
              </Text>
            </View>
          </View>
        </View>

        {/* System Status Row matching chart */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderTitle}>System Status</Text>
          <View style={styles.statusPillsRow}>
            {(['normal', 'low', 'critical'] as const).map(st => {
              const isSelected = systemStatusFilter === st;
              const label = st.charAt(0).toUpperCase() + st.slice(1);
              return (
                <TouchableOpacity
                  key={st}
                  style={[styles.statusPill, isSelected && styles.statusPillActive]}
                  onPress={() => setSystemStatusFilter(st)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.statusPillText, isSelected && styles.statusPillTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Recent Activity Timeline matching chart */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionHeaderTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityRow}>
              <View style={[styles.activityIconWrap, { backgroundColor: 'rgba(255, 138, 80, 0.15)' }]}>
                <MaterialCommunityIcons name="alert-circle" size={20} color={Colors.primary} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityHead}>Tank level is low</Text>
                <Text style={styles.activityTime}>2 min ago</Text>
              </View>
            </View>
            <View style={styles.activityRow}>
              <View style={styles.activityIconWrap}>
                <MaterialCommunityIcons name="pump" size={20} color={Colors.textMuted} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityHead}>Irrigation pump turned off</Text>
                <Text style={styles.activityTime}>15 min ago</Text>
              </View>
            </View>
            <View style={styles.activityRow}>
              <View style={[styles.activityIconWrap, { backgroundColor: 'rgba(107, 203, 140, 0.15)' }]}>
                <MaterialCommunityIcons name="pump" size={20} color={Colors.success} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityHead}>Sump pump turned on</Text>
                <Text style={styles.activityTime}>1 hour ago</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    marginRight: Spacing.xs,
    padding: Spacing.xs,
  },
  headerActionBtn: {
    padding: Spacing.xs,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xs,
  },
  diagramContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  diagramTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  diagramBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  diagramNodeCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tankNodeCard: {
    flex: 1.2,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tankLevelVisual: {
    width: 32,
    height: 48,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tankLiquidFill: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.xs,
  },
  nodeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  nodeIconCircleActive: {
    backgroundColor: 'rgba(255, 138, 80, 0.15)',
  },
  nodeTitle: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  nodeSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  nodeValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  nodeTag: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    marginTop: 2,
    color: Colors.primary,
  },
  sectionBlock: {
    marginBottom: Spacing.lg,
  },
  sectionHeaderTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  statusPillsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statusPill: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusPillActive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
  },
  statusPillText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  statusPillTextActive: {
    color: Colors.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  activityCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  activityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  activityInfo: {
    flex: 1,
  },
  activityHead: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  activityTime: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
