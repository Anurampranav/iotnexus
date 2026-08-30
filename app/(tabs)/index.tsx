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
          <View style={styles.headerProfileRow}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                <MaterialCommunityIcons name="account" size={24} color={Colors.primary} />
              </View>
              <View style={styles.onlineBadge} />
            </View>
            <View style={styles.headerTextGroup}>
              <Text style={styles.greeting}>Hi, {userName || 'Nicole'}</Text>
              <Text style={styles.statusText}>Good morning! Everything looks good.</Text>
            </View>
            <TouchableOpacity style={styles.headerActionBtn}>
              <MaterialCommunityIcons name="dots-vertical" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{devices.length}</Text>
            <Text style={styles.statLabel}>All Devices</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: Colors.success }]}>{onlineCount}</Text>
            <Text style={styles.statLabel}>Online</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: Colors.textMuted }]}>{offlineCount}</Text>
            <Text style={styles.statLabel}>Offline</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: Colors.primary }]}>{automations.length}</Text>
            <Text style={styles.statLabel}>Automations</Text>
          </View>
        </View>

        {/* Favorite Devices Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Favorite Devices</Text>
            <TouchableOpacity onPress={() => router.push('/devices')}>
              <Text style={styles.seeAllText}>See all ›</Text>
            </TouchableOpacity>
          </View>
          {favorites.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="devices" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No devices paired yet</Text>
              <Text style={styles.emptySubtitle}>Tap Add Device in the Devices tab to connect your Tuya smart devices.</Text>
            </View>
          ) : (
            <View style={styles.favoritesGrid}>
              {favorites.map(device => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onPress={() => handleDevicePress(device.id)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Recent Activity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
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
    paddingBottom: 120,
  },
  header: {
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  headerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.success,
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  headerTextGroup: {
    flex: 1,
  },
  greeting: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
  },
  statusText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerActionBtn: {
    padding: Spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
    gap: Spacing.xs,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNumber: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
  seeAllText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
  },
  favoritesGrid: {
    gap: Spacing.sm,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.xs,
  },
  emptyTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    marginRight: Spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontFamily: Typography.fontFamily.medium,
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
