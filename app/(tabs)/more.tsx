import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '@store/appStore';
import { GlassCard } from '@components/glass/GlassCard';
import { Colors, Typography, Spacing, Radius } from '@design/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function ProfileScreen() {
  const router = useRouter();
  const { userName, userEmail, userHomeName, setAuthenticated } = useAppStore();

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAuthenticated(false);
  };

  const profileRows: {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    label: string;
    value: string;
  }[] = [
    { icon: 'account-outline',   label: 'Name',       value: userName },
    { icon: 'email-outline',     label: 'Email',      value: userEmail },
    { icon: 'home-outline',      label: 'Home',       value: userHomeName },
  ];

  const accountActions: {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    danger?: boolean;
  }[] = [
    {
      icon: 'pencil-outline',
      title: 'Edit Profile',
      subtitle: 'Update your name and email',
      onPress: () => Alert.alert('Edit Profile', 'Profile editing will be available in a future update.'),
    },
    {
      icon: 'shield-lock-outline',
      title: 'Change Password',
      subtitle: 'Update account credentials',
      onPress: () => Alert.alert('Change Password', 'Password management coming soon.'),
    },
    {
      icon: 'cog-outline',
      title: 'App Settings',
      subtitle: 'Notifications, units, connectivity',
      onPress: () => router.push('/settings'),
    },
    {
      icon: 'logout',
      title: 'Sign Out',
      danger: true,
      onPress: handleSignOut,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Avatar Block */}
        <View style={styles.avatarBlock}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.displayName}>{userName}</Text>
          <Text style={styles.displayEmail}>{userEmail}</Text>
        </View>

        {/* Profile Info Card */}
        <GlassCard style={styles.infoCard}>
          {profileRows.map((row, i) => (
            <View
              key={row.label}
              style={[
                styles.infoRow,
                i < profileRows.length - 1 && styles.infoRowBorder,
              ]}
            >
              <View style={styles.infoRowLeft}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons
                    name={row.icon}
                    size={18}
                    color={Colors.primary}
                  />
                </View>
                <Text style={styles.infoLabel}>{row.label}</Text>
              </View>
              <Text style={styles.infoValue} numberOfLines={1}>{row.value}</Text>
            </View>
          ))}
        </GlassCard>

        {/* Account Actions */}
        <GlassCard style={styles.actionsCard}>
          {accountActions.map((action, i) => {
            const isLast = i === accountActions.length - 1;
            return (
              <TouchableOpacity
                key={action.title}
                onPress={action.onPress}
                activeOpacity={0.8}
                style={[styles.actionRow, !isLast && styles.actionRowBorder]}
              >
                <View style={styles.actionLeft}>
                  <View style={[styles.iconCircle, action.danger && styles.iconCircleDanger]}>
                    <MaterialCommunityIcons
                      name={action.icon}
                      size={18}
                      color={action.danger ? Colors.error : Colors.textSecondary}
                    />
                  </View>
                  <View>
                    <Text style={[styles.actionTitle, action.danger && styles.titleDanger]}>
                      {action.title}
                    </Text>
                    {action.subtitle && (
                      <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
                    )}
                  </View>
                </View>
                {!action.danger && (
                  <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textMuted} />
                )}
              </TouchableOpacity>
            );
          })}
        </GlassCard>

        {/* Footer version */}
        <Text style={styles.version}>Smart CodeFlurry · Expo SDK 57</Text>

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
    padding: Spacing.base,
  },
  // Avatar
  avatarBlock: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 28,
    color: Colors.background,
  },
  displayName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  displayEmail: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  // Info Card
  infoCard: {
    padding: Spacing.md,
    marginBottom: Spacing.base,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  infoValue: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    maxWidth: '55%',
    textAlign: 'right',
  },
  // Action Card
  actionsCard: {
    padding: Spacing.md,
    marginBottom: Spacing.base,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  actionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  titleDanger: {
    color: Colors.error,
  },
  actionSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // Shared
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  iconCircleDanger: {
    backgroundColor: Colors.errorSurface,
    borderColor: Colors.error,
  },
  version: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
