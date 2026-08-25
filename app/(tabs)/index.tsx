import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useDeviceStore } from '@store/deviceStore';
import { useAutomationStore } from '@store/automationStore';
import { useNotificationStore } from '@store/notificationStore';
import { useAppStore } from '@store/appStore';
import { MetricCard } from '@components/shared/MetricCard';
import { SectionHeader } from '@components/shared/SectionHeader';
import { DeviceCard } from '@components/device/DeviceCard';
import { Colors, Typography, Spacing, Radius } from '@design/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function HomeDashboardScreen() {
  const router = useRouter();
  const userName = useAppStore(s => s.userName);

  const { devices, loadDevices, getOnlineCount, getOfflineCount, getFavorites, isLoading: devicesLoading } = useDeviceStore();
  const { automations, loadAutomations, getActiveCount } = useAutomationStore();
  const { notifications, loadNotifications, getUnreadCount } = useNotificationStore();

  useEffect(() => {
    loadDevices();
    loadAutomations();
    loadNotifications();
  }, []);

  const onRefresh = async () => {
    await Promise.all([
      loadDevices(),
      loadAutomations(),
      loadNotifications(),
    ]);
  };

  const favorites = getFavorites();
  const onlineCount = getOnlineCount();
  const offlineCount = getOfflineCount();
  const activeAutomationsCount = getActiveCount();

  const handleDevicePress = (id: string) => {
    router.push(`/device/${id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={devicesLoading}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Header Block */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => router.push('/(tabs)/more')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="account-circle-outline" size={28} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Hi, {userName}</Text>
            <Text style={styles.statusText}>Everything looks good.</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <MetricCard value={devices.length} label="All Devices" />
          <MetricCard value={onlineCount} label="Online" />
          <MetricCard value={offlineCount} label="Offline" />
          <MetricCard value={automations.length} label="Automations" />
        </View>

        {/* Favorite Devices */}
        <View style={styles.section}>
          <SectionHeader
            title="Favorite Devices"
            onPressAction={() => router.push('/devices')}
          />
          {favorites.length === 0 ? (
            <Text style={styles.emptyText}>No favorite devices selected.</Text>
          ) : (
            favorites.map(device => (
              <DeviceCard
                key={device.id}
                device={device}
                onPress={() => handleDevicePress(device.id)}
              />
            ))
          )}
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <SectionHeader title="Recent Activity" />
          {notifications.slice(0, 3).map(notif => (
            <View key={notif.id} style={styles.activityItem}>
              <View style={[styles.activityDot, { backgroundColor: notif.severity === 'critical' ? Colors.error : notif.severity === 'warning' ? Colors.warning : Colors.success }]} />
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{notif.title}</Text>
                <Text style={styles.activityBody}>{notif.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xs,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
  },
  statusText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  emptyText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.md,
    marginTop: 5,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  activityBody: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
