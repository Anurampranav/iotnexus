import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useDeviceStore } from '@store/deviceStore';
import { GlassCard } from '@components/glass/GlassCard';
import { GlassToggle } from '@components/glass/GlassToggle';
import { StatusBadge } from '@components/shared/StatusBadge';
import { Colors, Typography, Spacing, Radius } from '@design/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function WaterManagementScreen() {
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

  const tankLevel = tankSensor?.state['level']?.value as number ?? 0;
  const sumpLevel = sumpSensor?.state['level']?.value as number ?? 0;

  const isBorewellOn = borewellPump?.state['power']?.value === true;
  const isTankPumpOn = tankPump?.state['power']?.value === true;
  const isIrrigationOn = irrigationPump?.state['power']?.value === true;

  const togglePump = async (deviceId: string, currentVal: boolean) => {
    await sendCommand(deviceId, 'power', !currentVal);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Water Management</Text>
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
        {/* Schematic System Diagram */}
        <GlassCard style={styles.schematicCard}>
          <Text style={styles.sectionTitle}>System Flow</Text>

          {/* Node 1: Borewell */}
          <View style={styles.flowNode}>
            <View style={styles.nodeLeft}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="image-filter-hdr" size={20} color={Colors.textSecondary} />
              </View>
              <View>
                <Text style={styles.nodeName}>Borewell Water Source</Text>
                <Text style={styles.nodeState}>Active availability</Text>
              </View>
            </View>
            <StatusBadge status="normal" label="Source OK" />
          </View>

          <View style={styles.flowLine} />

          {/* Node 2: Borewell Pump */}
          <View style={styles.flowNode}>
            <View style={styles.nodeLeft}>
              <View style={[styles.iconCircle, isBorewellOn && styles.iconCircleActive]}>
                <MaterialCommunityIcons name="pump" size={20} color={isBorewellOn ? Colors.primary : Colors.textSecondary} />
              </View>
              <View>
                <Text style={styles.nodeName}>Borewell Pump</Text>
                <Text style={styles.nodeState}>{isBorewellOn ? 'Pumping to Sump' : 'Stopped'}</Text>
              </View>
            </View>
            <GlassToggle
              value={isBorewellOn}
              onValueChange={() => togglePump('dev-borewell-pump', isBorewellOn)}
              status={borewellPump?.state['power']?.commandStatus as any}
            />
          </View>

          <View style={styles.flowLine} />

          {/* Node 3: Sump */}
          <View style={styles.flowNode}>
            <View style={styles.nodeLeft}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="pool" size={20} color={Colors.info} />
              </View>
              <View>
                <Text style={styles.nodeName}>Underground Sump</Text>
                <Text style={styles.nodeState}>Storage reserve</Text>
              </View>
            </View>
            <View style={styles.levelWrap}>
              <Text style={styles.levelPercent}>{sumpLevel}%</Text>
              <StatusBadge status="normal" label="Normal" />
            </View>
          </View>

          <View style={styles.flowLine} />

          {/* Node 4: Tank Pump */}
          <View style={styles.flowNode}>
            <View style={styles.nodeLeft}>
              <View style={[styles.iconCircle, isTankPumpOn && styles.iconCircleActive]}>
                <MaterialCommunityIcons name="pump" size={20} color={isTankPumpOn ? Colors.primary : Colors.textSecondary} />
              </View>
              <View>
                <Text style={styles.nodeName}>Tank Lift Pump</Text>
                <Text style={styles.nodeState}>{isTankPumpOn ? 'Lifting to Tank' : 'Stopped'}</Text>
              </View>
            </View>
            <GlassToggle
              value={isTankPumpOn}
              onValueChange={() => togglePump('dev-tank-pump', isTankPumpOn)}
              status={tankPump?.state['power']?.commandStatus as any}
            />
          </View>

          <View style={styles.flowLine} />

          {/* Node 5: Overhead Tank */}
          <View style={styles.flowNode}>
            <View style={styles.nodeLeft}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="water" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.nodeName}>Overhead Tank</Text>
                <Text style={styles.nodeState}>Primary distribution tank</Text>
              </View>
            </View>
            <View style={styles.levelWrap}>
              <Text style={styles.levelPercent}>{tankLevel}%</Text>
              <StatusBadge status="low" label="LOW" />
            </View>
          </View>

          <View style={styles.flowLine} />

          {/* Node 6: Irrigation */}
          <View style={styles.flowNode}>
            <View style={styles.nodeLeft}>
              <View style={[styles.iconCircle, isIrrigationOn && styles.iconCircleActive]}>
                <MaterialCommunityIcons name="sprinkler-variant" size={20} color={isIrrigationOn ? Colors.primary : Colors.textSecondary} />
              </View>
              <View>
                <Text style={styles.nodeName}>Garden Irrigation</Text>
                <Text style={styles.nodeState}>{isIrrigationOn ? 'Irrigating Garden' : 'Idle'}</Text>
              </View>
            </View>
            <GlassToggle
              value={isIrrigationOn}
              onValueChange={() => togglePump('dev-irrigation-pump', isIrrigationOn)}
              status={irrigationPump?.state['power']?.commandStatus as any}
            />
          </View>
        </GlassCard>

        {/* Padding for tab bar */}
        <View style={{ height: 100 }} />
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
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xs,
    paddingBottom: 120,
  },
  schematicCard: {
    padding: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
  },
  flowNode: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  nodeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  iconCircleActive: {
    backgroundColor: Colors.primarySurface,
    borderColor: Colors.primary,
  },
  nodeName: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  nodeState: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  flowLine: {
    width: 2,
    height: 18,
    backgroundColor: Colors.glassBorder,
    alignSelf: 'center',
    marginVertical: 2,
  },
  levelWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  levelPercent: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
});
