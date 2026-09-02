import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useAutomationStore } from '@store/automationStore';
import { GlassCard } from '@components/glass/GlassCard';
import { GlassToggle } from '@components/glass/GlassToggle';
import { StatusBadge } from '@components/shared/StatusBadge';
import { Colors, Typography, Spacing, Radius } from '@design/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AutomationDetailsModal } from '../../src/components/automation/AutomationDetailsModal';
import { AutomationBuilderModal } from '../../src/components/automation/AutomationBuilderModal';
import type { AutomationRule } from '@models/automation';

export default function AutomationsScreen() {
  const router = useRouter();
  const { automations, loadAutomations, toggleAutomation, isLoading } = useAutomationStore();

  // Modals Visibility State
  const [selectedAutomation, setSelectedAutomation] = useState<AutomationRule | null>(null);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [isBuilderVisible, setIsBuilderVisible] = useState(false);
  const [automationToEdit, setAutomationToEdit] = useState<AutomationRule | null>(null);

  useEffect(() => {
    loadAutomations();
  }, []);

  const handleCardPress = (rule: AutomationRule) => {
    // Look up latest rule state from store to ensure fresh logs/toggle fields are read
    const freshRule = automations.find(a => a.id === rule.id) || rule;
    setSelectedAutomation(freshRule);
    setIsDetailsVisible(true);
  };

  const handleEditPress = (rule: AutomationRule) => {
    setAutomationToEdit(rule);
    setIsBuilderVisible(true);
  };

  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'disabled'>('all');

  const filteredAutomations = automations.filter(rule => {
    if (activeFilter === 'active') return rule.enabled;
    if (activeFilter === 'disabled') return !rule.enabled;
    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header matching chart */}
      <View style={styles.header}>
        <View style={styles.headerLeftGroup}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="chevron-left" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Automations</Text>
        </View>
        <TouchableOpacity style={styles.headerActionBtn}>
          <MaterialCommunityIcons name="dots-vertical" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Segmented Filter Pills */}
      <View style={styles.filterRow}>
        {(['all', 'active', 'disabled'] as const).map(tab => {
          const isSelected = activeFilter === tab;
          const label = tab.charAt(0).toUpperCase() + tab.slice(1);
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.filterTab, isSelected && styles.filterTabActive]}
              onPress={() => setActiveFilter(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterTabText, isSelected && styles.filterTabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadAutomations}
            tintColor={Colors.primary}
          />
        }
      >
        {filteredAutomations.map(rule => (
          <GlassCard key={rule.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <TouchableOpacity
                style={styles.cardHeaderLeft}
                onPress={() => handleCardPress(rule)}
              >
                <View style={[styles.ruleIconWrap, rule.enabled && styles.ruleIconWrapActive]}>
                  <MaterialCommunityIcons
                    name={rule.enabled ? 'lightning-bolt' : 'lightning-bolt-outline'}
                    size={22}
                    color={rule.enabled ? Colors.primary : Colors.textMuted}
                  />
                </View>
                <View style={styles.textContainer}>
                  <View style={styles.titleRow}>
                    <Text style={styles.ruleName}>{rule.name}</Text>
                    {rule.isSafety && (
                      <MaterialCommunityIcons
                        name="shield-check"
                        size={16}
                        color={Colors.primary}
                        style={styles.safetyIcon}
                      />
                    )}
                  </View>
                  <Text style={styles.ruleDescription} numberOfLines={2}>
                    {rule.description}
                  </Text>
                  <View style={styles.badgeRow}>
                    <Text style={[styles.statusTag, rule.enabled ? styles.statusTagActive : styles.statusTagDisabled]}>
                      {rule.enabled ? 'Active' : 'Disabled'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              <GlassToggle
                value={rule.enabled}
                onValueChange={() => toggleAutomation(rule.id)}
              />
            </View>
          </GlassCard>
        ))}

        {/* Padding for tab bar & fab */}
        <View style={{ height: 160 }} />
      </ScrollView>

      {/* Floating New Automation Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.newAutomationBtn}
          onPress={() => {
            setAutomationToEdit(null);
            setIsBuilderVisible(true);
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.newAutomationBtnText}>+ New Automation</Text>
        </TouchableOpacity>
      </View>

      {/* Details Sheets / Builder Sheets */}
      <AutomationDetailsModal
        visible={isDetailsVisible}
        onClose={() => setIsDetailsVisible(false)}
        automation={selectedAutomation}
        onEdit={handleEditPress}
      />

      <AutomationBuilderModal
        visible={isBuilderVisible}
        onClose={() => setIsBuilderVisible(false)}
        automationToEdit={automationToEdit}
      />
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterTab: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTabActive: {
    borderColor: Colors.primary,
  },
  filterTabText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: Colors.primary,
    fontFamily: Typography.fontFamily.bold,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xs,
  },
  card: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.md,
  },
  ruleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  ruleIconWrapActive: {
    backgroundColor: 'rgba(255, 138, 80, 0.12)',
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ruleName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    marginRight: Spacing.xs,
  },
  safetyIcon: {
    marginLeft: Spacing.xs,
  },
  ruleDescription: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  badgeRow: {
    marginTop: Spacing.xs,
  },
  statusTag: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 11,
  },
  statusTagActive: {
    color: Colors.success,
  },
  statusTagDisabled: {
    color: Colors.textMuted,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 96,
    left: Spacing.base,
    right: Spacing.base,
  },
  newAutomationBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  newAutomationBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
});
