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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Automations</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setAutomationToEdit(null);
            setIsBuilderVisible(true);
          }}
        >
          <MaterialCommunityIcons name="plus" size={24} color={Colors.primary} />
          <Text style={styles.addButtonText}>NEW</Text>
        </TouchableOpacity>
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
        {automations.map(rule => (
          <GlassCard key={rule.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <TouchableOpacity
                style={styles.cardHeaderLeft}
                onPress={() => handleCardPress(rule)}
              >
                <MaterialCommunityIcons
                  name={rule.enabled ? 'play-circle-outline' : 'pause-circle-outline'}
                  size={24}
                  color={rule.enabled ? Colors.primary : Colors.textMuted}
                  style={styles.ruleIcon}
                />
                <View style={styles.textContainer}>
                  <View style={styles.titleRow}>
                    <Text style={styles.ruleName}>{rule.name}</Text>
                    {rule.isSafety && (
                      <MaterialCommunityIcons
                        name="shield-alert-outline"
                        size={16}
                        color={Colors.warning}
                        style={styles.safetyIcon}
                      />
                    )}
                  </View>
                  <Text style={styles.ruleDescription} numberOfLines={2}>
                    {rule.description}
                  </Text>
                </View>
              </TouchableOpacity>

              <GlassToggle
                value={rule.enabled}
                onValueChange={() => toggleAutomation(rule.id)}
              />
            </View>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.detailsRow}
              onPress={() => handleCardPress(rule)}
            >
              <StatusBadge
                status={rule.enabled ? 'active' : 'disabled'}
                label={rule.enabled ? 'Active' : 'Disabled'}
              />
              {rule.lastTriggered && (
                <Text style={styles.triggeredText}>
                  Last run: {new Date(rule.lastTriggered).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </TouchableOpacity>
          </GlassCard>
        ))}

        {/* Padding for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

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
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,138,80,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,138,80,0.35)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    gap: 4,
    marginRight: 48,
  },
  addButtonText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xs,
    paddingBottom: 120,
  },
  card: {
    padding: Spacing.base,
    marginBottom: Spacing.md,
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
    marginRight: Spacing.sm,
  },
  ruleIcon: {
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ruleName: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  safetyIcon: {
    marginLeft: Spacing.xs,
  },
  ruleDescription: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.separator,
    marginVertical: Spacing.md,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggeredText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
});
