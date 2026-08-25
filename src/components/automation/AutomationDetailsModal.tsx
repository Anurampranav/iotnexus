import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { GlassBottomSheet } from '../glass/GlassBottomSheet';
import { GlassButton } from '../glass/GlassButton';
import { GlassToggle } from '../glass/GlassToggle';
import { StatusBadge } from '../shared/StatusBadge';
import { Colors, Typography, Spacing, Radius } from '@design/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAutomationStore } from '@store/automationStore';
import { useDeviceStore } from '@store/deviceStore';
import type { AutomationRule } from '@models/automation';

interface AutomationDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  automation: AutomationRule | null;
  onEdit: (rule: AutomationRule) => void;
}

export function AutomationDetailsModal({
  visible,
  onClose,
  automation,
  onEdit,
}: AutomationDetailsModalProps) {
  const { toggleAutomation, duplicateAutomation, deleteAutomation } = useAutomationStore();
  const { devices } = useDeviceStore();

  if (!automation) return null;

  const handleToggle = () => {
    toggleAutomation(automation.id);
  };

  const handleDuplicate = () => {
    duplicateAutomation(automation.id);
    onClose();
  };

  const handleDelete = () => {
    deleteAutomation(automation.id);
    onClose();
  };

  const handleEdit = () => {
    onEdit(automation);
    onClose();
  };

  // Helper to format human-readable trigger
  const getTriggerText = () => {
    const trigger = automation.trigger;
    if (trigger.type === 'time') {
      return `⏰ Scheduled at ${trigger.timeValue}`;
    }
    const dev = devices.find(d => d.id === trigger.deviceId);
    if (!dev) return 'Unknown Trigger';
    const cap = dev.capabilities[trigger.capability || ''];
    const capLabel = cap ? cap.label : trigger.capability;
    const opSym = getOpSymbol(trigger.operator);
    return `${dev.name} (${capLabel}) ${opSym} ${trigger.value}${cap?.unit || ''}`;
  };

  const getOpSymbol = (op?: string) => {
    switch (op) {
      case 'eq': return '=';
      case 'neq': return '≠';
      case 'gt': return '>';
      case 'gte': return '≥';
      case 'lt': return '<';
      case 'lte': return '≤';
      default: return '';
    }
  };

  return (
    <GlassBottomSheet visible={visible} onClose={onClose} snapHeight={0.75}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header Block */}
        <View style={styles.header}>
          <View style={styles.titleCol}>
            <Text style={styles.ruleName}>{automation.name}</Text>
            <Text style={styles.ruleDesc}>{automation.description || 'No description provided'}</Text>
          </View>
          <GlassToggle value={automation.enabled} onValueChange={handleToggle} />
        </View>

        <View style={styles.badgeRow}>
          <StatusBadge status={automation.enabled ? 'active' : 'disabled'} label={automation.enabled ? 'Active' : 'Disabled'} />
          {automation.isSafety && (
            <StatusBadge status="warning" label="SAFETY CRITICAL" />
          )}
        </View>

        <View style={styles.divider} />

        {/* Rule Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rule Configuration</Text>
          <View style={styles.ruleBlock}>
            <Text style={styles.blockLabel}>WHEN</Text>
            <Text style={styles.blockText}>{getTriggerText()}</Text>

            {automation.conditionGroup && automation.conditionGroup.conditions.length > 0 && (
              <>
                <Text style={[styles.blockLabel, { marginTop: Spacing.sm }]}>CONDITIONS ({automation.conditionGroup.logic})</Text>
                {automation.conditionGroup.conditions.map((cond, idx) => {
                  if ('logic' in cond) return null; // Simple representation
                  const dev = devices.find(d => d.id === cond.deviceId);
                  const cap = dev?.capabilities[cond.capability];
                  const capLabel = cap ? cap.label : cond.capability;
                  return (
                    <Text key={idx} style={styles.blockText}>
                      • {dev?.name || 'Unknown Device'} ({capLabel}) {getOpSymbol(cond.operator)} {cond.value}{cap?.unit || ''}
                    </Text>
                  );
                })}
              </>
            )}

            <Text style={[styles.blockLabel, { marginTop: Spacing.sm }]}>THEN</Text>
            {automation.actions.map((act, idx) => {
              if (act.type === 'send_notification') {
                return (
                  <Text key={idx} style={styles.blockText}>
                    • 🔔 Send Notification: "{act.notificationTitle}"
                  </Text>
                );
              }
              const dev = devices.find(d => d.id === act.deviceId);
              const cap = dev?.capabilities[act.capability || ''];
              const capLabel = cap ? cap.label : act.capability;
              return (
                <Text key={idx} style={styles.blockText}>
                  • {dev?.name || 'Unknown Device'} ({capLabel}) ➔ {act.value === true ? 'ON' : act.value === false ? 'OFF' : String(act.value)}{cap?.unit || ''}
                </Text>
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Execution History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Execution History</Text>
          {!automation.executionHistory || automation.executionHistory.length === 0 ? (
            <Text style={styles.emptyText}>No recent executions recorded.</Text>
          ) : (
            automation.executionHistory.map((item, idx) => (
              <View key={idx} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <Text style={styles.logTime}>
                    {new Date(item.triggeredAt).toLocaleDateString()} {new Date(item.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </Text>
                  <StatusBadge
                    status={item.result === 'success' ? 'active' : item.result === 'aborted' ? 'warning' : 'offline'}
                    label={item.result.toUpperCase()}
                  />
                </View>
                {item.description && (
                  <Text style={styles.logDesc}>{item.description}</Text>
                )}
              </View>
            ))
          )}
        </View>

        <View style={styles.divider} />

        {/* Action Controls */}
        <View style={styles.actionButtons}>
          <GlassButton label="Edit Automation" onPress={handleEdit} variant="primary" style={styles.actionBtn} />
          <View style={styles.rowBtn}>
            <GlassButton label="Duplicate" onPress={handleDuplicate} variant="secondary" style={styles.halfBtn} />
            <GlassButton label="Delete" onPress={handleDelete} variant="danger" style={styles.halfBtn} />
          </View>
        </View>
      </ScrollView>
    </GlassBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  titleCol: {
    flex: 1,
    marginRight: Spacing.md,
  },
  ruleName: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
  },
  ruleDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.separator,
    marginVertical: Spacing.md,
  },
  section: {
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  ruleBlock: {
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  blockLabel: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  blockText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  emptyText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  logCard: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logTime: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  logDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.xs,
    color: Colors.textPrimary,
  },
  actionButtons: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  actionBtn: {
    width: '100%',
  },
  rowBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  halfBtn: {
    flex: 1,
  },
});
