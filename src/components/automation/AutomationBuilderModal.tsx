import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Alert } from 'react-native';
import { GlassBottomSheet } from '../glass/GlassBottomSheet';
import { GlassButton } from '../glass/GlassButton';
import { GlassInput } from '../glass/GlassInput';
import { StatusBadge } from '../shared/StatusBadge';
import { Colors, Typography, Spacing, Radius } from '@design/tokens';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAutomationStore } from '@store/automationStore';
import { useDeviceStore } from '@store/deviceStore';
import type { AutomationRule, Trigger, Condition, AutomationAction, ConditionOperator, LogicOperator } from '@models/automation';
import type { Device, CapabilityDefinition } from '@models/device';

interface AutomationBuilderModalProps {
  visible: boolean;
  onClose: () => void;
  automationToEdit?: AutomationRule | null;
}

export function AutomationBuilderModal({
  visible,
  onClose,
  automationToEdit,
}: AutomationBuilderModalProps) {
  const { createAutomation, updateAutomation } = useAutomationStore();
  const { devices } = useDeviceStore();

  // Basic Rule Metadata
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSafety, setIsSafety] = useState(false);

  // WHEN (Trigger) Config
  const [triggerType, setTriggerType] = useState<'sensor_value' | 'device_state' | 'time'>('sensor_value');
  const [triggerDeviceId, setTriggerDeviceId] = useState('');
  const [triggerCapability, setTriggerCapability] = useState('');
  const [triggerOperator, setTriggerOperator] = useState<ConditionOperator>('lt');
  const [triggerValue, setTriggerValue] = useState<string>('');
  const [triggerTimeValue, setTriggerTimeValue] = useState<string>('06:00');

  // CONDITIONS (Optional additional checks)
  const [logic, setLogic] = useState<LogicOperator>('AND');
  const [conditions, setConditions] = useState<Condition[]>([]);

  // THEN (Actions)
  const [actions, setActions] = useState<AutomationAction[]>([]);

  // Active Selection States for dropdown lists
  const [activePicker, setActivePicker] = useState<{
    type: 'trigger_device' | 'trigger_cap' | 'cond_device' | 'cond_cap' | 'act_device' | 'act_cap';
    index?: number;
  } | null>(null);

  // Load editing state if applicable
  useEffect(() => {
    if (automationToEdit) {
      setName(automationToEdit.name);
      setDescription(automationToEdit.description || '');
      setIsSafety(automationToEdit.isSafety || false);

      const trigger = automationToEdit.trigger;
      if (trigger.type === 'time') {
        setTriggerType('time');
        setTriggerTimeValue(trigger.timeValue || '06:00');
      } else {
        setTriggerType(trigger.type === 'device_state' ? 'device_state' : 'sensor_value');
        setTriggerDeviceId(trigger.deviceId || '');
        setTriggerCapability(trigger.capability || '');
        setTriggerOperator(trigger.operator || 'eq');
        setTriggerValue(String(trigger.value ?? ''));
      }

      setLogic(automationToEdit.conditionGroup?.logic || 'AND');
      const condList: Condition[] = [];
      if (automationToEdit.conditionGroup?.conditions) {
        automationToEdit.conditionGroup.conditions.forEach(c => {
          if (!('logic' in c)) {
            condList.push(c as Condition);
          }
        });
      }
      setConditions(condList);
      setActions(automationToEdit.actions);
    } else {
      // Reset to defaults
      setName('');
      setDescription('');
      setIsSafety(false);
      setTriggerType('sensor_value');
      setTriggerDeviceId(devices[0]?.id || '');
      setTriggerCapability('');
      setTriggerOperator('lt');
      setTriggerValue('');
      setTriggerTimeValue('06:00');
      setLogic('AND');
      setConditions([]);
      setActions([]);
    }
  }, [automationToEdit, visible]);

  // Set default trigger capability when device changes
  useEffect(() => {
    if (triggerDeviceId) {
      const dev = devices.find(d => d.id === triggerDeviceId);
      if (dev) {
        const caps = Object.keys(dev.capabilities);
        if (caps.length > 0 && !caps.includes(triggerCapability)) {
          setTriggerCapability(caps[0]);
        }
      }
    }
  }, [triggerDeviceId]);

  // Helper operators list based on capability type
  const getOperatorsForCap = (capType?: string) => {
    if (capType === 'boolean') {
      return [{ value: 'eq', label: 'is' }, { value: 'neq', label: 'is not' }];
    }
    return [
      { value: 'eq', label: 'equals' },
      { value: 'neq', label: 'not equals' },
      { value: 'gt', label: 'greater than' },
      { value: 'gte', label: 'greater or equal' },
      { value: 'lt', label: 'less than' },
      { value: 'lte', label: 'less or equal' },
    ];
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

  const handleAddCondition = () => {
    const firstDev = devices[0];
    if (!firstDev) return;
    const firstCap = Object.keys(firstDev.capabilities)[0] || '';
    setConditions([
      ...conditions,
      { deviceId: firstDev.id, capability: firstCap, operator: 'lt', value: '50' }
    ]);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleUpdateCondition = (index: number, fields: Partial<Condition>) => {
    setConditions(conditions.map((c, i) => i === index ? { ...c, ...fields } as Condition : c));
  };

  const handleAddAction = () => {
    const firstDev = devices.find(d => d.capabilities && Object.values(d.capabilities).some(c => c.writable));
    const targetDevId = firstDev ? firstDev.id : devices[0]?.id || '';
    const devObj = devices.find(d => d.id === targetDevId);
    const targetCap = devObj ? Object.keys(devObj.capabilities).find(k => devObj.capabilities[k].writable) || Object.keys(devObj.capabilities)[0] || '' : '';

    setActions([
      ...actions,
      { type: 'set_capability', deviceId: targetDevId, capability: targetCap, value: true }
    ]);
  };

  const handleAddNotificationAction = () => {
    setActions([
      ...actions,
      { type: 'send_notification', notificationTitle: 'System Alert', notificationBody: 'Alert triggered' }
    ]);
  };

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const handleUpdateAction = (index: number, fields: Partial<AutomationAction>) => {
    setActions(actions.map((a, i) => i === index ? { ...a, ...fields } as AutomationAction : a));
  };

  // Human Readable Summary Preview Generator
  const getRulePreviewText = () => {
    let whenStr = '';
    if (triggerType === 'time') {
      whenStr = `⏰ WHEN Time is ${triggerTimeValue}`;
    } else {
      const dev = devices.find(d => d.id === triggerDeviceId);
      const cap = dev?.capabilities[triggerCapability];
      const opLabel = getOperatorsForCap(cap?.type).find(o => o.value === triggerOperator)?.label || '';
      whenStr = `🌱 WHEN ${dev?.name || 'Device'} (${cap?.label || triggerCapability}) ${opLabel} ${triggerValue}${cap?.unit || ''}`;
    }

    let condsStr = '';
    if (conditions.length > 0) {
      condsStr = `\n${logic} ` + conditions.map(c => {
        const dev = devices.find(d => d.id === c.deviceId);
        const cap = dev?.capabilities[c.capability];
        const opLabel = getOperatorsForCap(cap?.type).find(o => o.value === c.operator)?.label || '';
        return `• ${dev?.name || 'Device'} (${cap?.label || c.capability}) ${opLabel} ${c.value}${cap?.unit || ''}`;
      }).join(`\n${logic} `);
    }

    const thenStr = '\n➔ THEN:\n' + actions.map(act => {
      if (act.type === 'send_notification') {
        return `🔔 Send notification: "${act.notificationTitle}"`;
      }
      const dev = devices.find(d => d.id === act.deviceId);
      const cap = dev?.capabilities[act.capability || ''];
      return `⚙️ Set ${dev?.name || 'Device'} (${cap?.label || act.capability}) to ${act.value === true ? 'ON' : act.value === false ? 'OFF' : String(act.value)}${cap?.unit || ''}`;
    }).join('\n');

    return `${whenStr}${condsStr}${thenStr}`;
  };

  const validateRule = (): string | null => {
    if (!name.trim()) return 'Please enter an automation name.';

    if (triggerType !== 'time') {
      if (!triggerDeviceId) return 'Please select a trigger device.';
      if (!triggerCapability) return 'Please select a trigger capability.';
      if (triggerValue === '') return 'Please enter a trigger value.';
    }

    if (actions.length === 0) return 'Please add at least one action.';

    for (let i = 0; i < actions.length; i++) {
      const act = actions[i];
      if (act.type === 'set_capability') {
        if (!act.deviceId) return `Action #${i + 1} has no target device selected.`;
        if (!act.capability) return `Action #${i + 1} has no capability selected.`;
        if (act.value === undefined || act.value === '') return `Action #${i + 1} has no value configured.`;
      } else if (act.type === 'send_notification') {
        if (!act.notificationTitle?.trim()) return `Action #${i + 1} requires a notification title.`;
      }
    }

    return null;
  };

  const handleSave = () => {
    const errorMsg = validateRule();
    if (errorMsg) {
      Alert.alert('Validation Error', errorMsg);
      return;
    }

    // Build the trigger payload
    const triggerPayload: Trigger = triggerType === 'time'
      ? { type: 'time', timeValue: triggerTimeValue }
      : {
          type: triggerType === 'device_state' ? 'device_state' : 'sensor_value',
          deviceId: triggerDeviceId,
          capability: triggerCapability,
          operator: triggerOperator,
          value: triggerValue === 'true' ? true : triggerValue === 'false' ? false : isNaN(Number(triggerValue)) ? triggerValue : Number(triggerValue)
        };

    const conditionGroup = conditions.length > 0 ? {
      logic,
      conditions: conditions.map(c => ({
        ...c,
        value: c.value === 'true' ? true : c.value === 'false' ? false : isNaN(Number(c.value)) ? c.value : Number(c.value)
      }))
    } : undefined;

    const formattedActions = actions.map(act => {
      if (act.type === 'send_notification') return act;
      return {
        ...act,
        value: act.value === 'true' ? true : act.value === 'false' ? false : isNaN(Number(act.value)) ? act.value : Number(act.value)
      };
    });

    const ruleData = {
      name,
      description: description || `Automatically runs ${name}`,
      enabled: true,
      status: 'active' as const,
      isSafety,
      trigger: triggerPayload,
      conditionGroup,
      actions: formattedActions,
    };

    if (automationToEdit) {
      updateAutomation(automationToEdit.id, ruleData);
    } else {
      createAutomation(ruleData);
    }

    onClose();
  };

  // Helper check for offline device warnings
  const getOfflineWarnings = (): string[] => {
    const warnings: string[] = [];
    if (triggerType !== 'time') {
      const triggerDev = devices.find(d => d.id === triggerDeviceId);
      if (triggerDev && triggerDev.connectionStatus !== 'online') {
        warnings.push(`Warning: Trigger device "${triggerDev.name}" is currently OFFLINE.`);
      }
    }
    conditions.forEach(c => {
      const dev = devices.find(d => d.id === c.deviceId);
      if (dev && dev.connectionStatus !== 'online') {
        warnings.push(`Warning: Condition device "${dev.name}" is currently OFFLINE.`);
      }
    });
    actions.forEach(a => {
      if (a.type === 'set_capability') {
        const dev = devices.find(d => d.id === a.deviceId);
        if (dev && dev.connectionStatus !== 'online') {
          warnings.push(`Warning: Action device "${dev.name}" is currently OFFLINE.`);
        }
      }
    });
    return warnings;
  };

  const offlineWarnings = getOfflineWarnings();

  return (
    <GlassBottomSheet visible={visible} onClose={onClose} snapHeight={0.88}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{automationToEdit ? 'Edit Automation' : 'New Automation'}</Text>

        {/* Input Details */}
        <View style={styles.card}>
          <Text style={styles.label}>Automation Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Garden Watering"
            placeholderTextColor={Colors.textMuted}
            style={styles.textInput}
          />

          <Text style={[styles.label, { marginTop: Spacing.sm }]}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Auto shutoff pump when low"
            placeholderTextColor={Colors.textMuted}
            style={styles.textInput}
          />

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.label}>Safety-Critical Override</Text>
              <Text style={styles.toggleSub}>Protects pumps and triggers notifications over ordinary rules</Text>
            </View>
            <Switch
              value={isSafety}
              onValueChange={setIsSafety}
              trackColor={{ false: '#3A3735', true: Colors.primary }}
              thumbColor={isSafety ? '#FFF' : '#B4B0AD'}
            />
          </View>
        </View>

        {/* WHEN Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>WHEN (Trigger)</Text>
          <View style={styles.triggerTypeRow}>
            <TouchableOpacity
              style={[styles.typeBtn, triggerType === 'sensor_value' && styles.typeBtnActive]}
              onPress={() => setTriggerType('sensor_value')}
            >
              <Text style={[styles.typeBtnText, triggerType === 'sensor_value' && styles.typeBtnTextActive]}>Sensor</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, triggerType === 'time' && styles.typeBtnActive]}
              onPress={() => setTriggerType('time')}
            >
              <Text style={[styles.typeBtnText, triggerType === 'time' && styles.typeBtnTextActive]}>Time</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          {triggerType === 'time' ? (
            <View>
              <Text style={styles.label}>Time Value (24-hour)</Text>
              <TextInput
                value={triggerTimeValue}
                onChangeText={setTriggerTimeValue}
                placeholder="e.g. 06:00"
                placeholderTextColor={Colors.textMuted}
                style={styles.textInput}
              />
            </View>
          ) : (
            <View style={styles.formRow}>
              {/* Trigger Device Dropdown */}
              <Text style={styles.label}>Select Trigger Device</Text>
              <View style={styles.dropdown}>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setActivePicker({ type: 'trigger_device' })}
                >
                  <Text style={styles.dropdownBtnText}>
                    {devices.find(d => d.id === triggerDeviceId)?.name || 'Select Device...'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {triggerDeviceId !== '' && (
                <>
                  <Text style={[styles.label, { marginTop: Spacing.sm }]}>Capability</Text>
                  <View style={styles.dropdown}>
                    <TouchableOpacity
                      style={styles.dropdownBtn}
                      onPress={() => setActivePicker({ type: 'trigger_cap' })}
                    >
                      <Text style={styles.dropdownBtnText}>
                        {devices.find(d => d.id === triggerDeviceId)?.capabilities[triggerCapability]?.label || 'Select Capability...'}
                      </Text>
                      <MaterialCommunityIcons name="chevron-down" size={20} color={Colors.textPrimary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.compareRow}>
                    <View style={styles.flexHalf}>
                      <Text style={styles.label}>Operator</Text>
                      <View style={styles.dropdown}>
                        <TouchableOpacity
                          style={styles.dropdownBtn}
                          onPress={() => {
                            const dev = devices.find(d => d.id === triggerDeviceId);
                            const cap = dev?.capabilities[triggerCapability];
                            Alert.alert(
                              'Select Operator',
                              'Choose operator symbol',
                              getOperatorsForCap(cap?.type).map(o => ({
                                text: `${o.label} (${getOpSymbol(o.value)})`,
                                onPress: () => setTriggerOperator(o.value as ConditionOperator)
                              }))
                            );
                          }}
                        >
                          <Text style={styles.dropdownBtnText}>
                            {getOpSymbol(triggerOperator)}
                          </Text>
                          <MaterialCommunityIcons name="chevron-down" size={20} color={Colors.textPrimary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.flexHalf}>
                      <Text style={styles.label}>Value</Text>
                      <TextInput
                        value={triggerValue}
                        onChangeText={setTriggerValue}
                        placeholder="e.g. 30"
                        placeholderTextColor={Colors.textMuted}
                        style={styles.textInput}
                      />
                    </View>
                  </View>
                </>
              )}
            </View>
          )}
        </View>

        {/* CONDITIONS Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>AND Conditions</Text>
          {conditions.length > 0 && (
            <View style={styles.triggerTypeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, logic === 'AND' && styles.typeBtnActive]}
                onPress={() => setLogic('AND')}
              >
                <Text style={[styles.typeBtnText, logic === 'AND' && styles.typeBtnTextActive]}>AND</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, logic === 'OR' && styles.typeBtnActive]}
                onPress={() => setLogic('OR')}
              >
                <Text style={[styles.typeBtnText, logic === 'OR' && styles.typeBtnTextActive]}>OR</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {conditions.map((cond, idx) => {
          const condDev = devices.find(d => d.id === cond.deviceId);
          const condCap = condDev?.capabilities[cond.capability];
          return (
            <View key={idx} style={[styles.card, { paddingBottom: Spacing.sm }]}>
              <View style={styles.cardCloseHeader}>
                <Text style={styles.smallTitle}>Condition #{idx + 1}</Text>
                <TouchableOpacity onPress={() => handleRemoveCondition(idx)}>
                  <MaterialCommunityIcons name="close-circle" size={22} color={Colors.error} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Select Device</Text>
              <View style={styles.dropdown}>
                <TouchableOpacity
                  style={styles.dropdownBtn}
                  onPress={() => setActivePicker({ type: 'cond_device', index: idx })}
                >
                  <Text style={styles.dropdownBtnText}>
                    {condDev?.name || 'Select Device...'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {cond.deviceId !== '' && (
                <>
                  <Text style={[styles.label, { marginTop: Spacing.xs }]}>Capability</Text>
                  <View style={styles.dropdown}>
                    <TouchableOpacity
                      style={styles.dropdownBtn}
                      onPress={() => setActivePicker({ type: 'cond_cap', index: idx })}
                    >
                      <Text style={styles.dropdownBtnText}>
                        {condCap?.label || 'Select Capability...'}
                      </Text>
                      <MaterialCommunityIcons name="chevron-down" size={20} color={Colors.textPrimary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.compareRow}>
                    <View style={styles.flexHalf}>
                      <Text style={styles.label}>Operator</Text>
                      <View style={styles.dropdown}>
                        <TouchableOpacity
                          style={styles.dropdownBtn}
                          onPress={() => {
                            Alert.alert(
                              'Select Operator',
                              'Choose operator symbol',
                              getOperatorsForCap(condCap?.type).map(o => ({
                                text: `${o.label} (${getOpSymbol(o.value)})`,
                                onPress: () => handleUpdateCondition(idx, { operator: o.value as ConditionOperator })
                              }))
                            );
                          }}
                        >
                          <Text style={styles.dropdownBtnText}>
                            {getOpSymbol(cond.operator)}
                          </Text>
                          <MaterialCommunityIcons name="chevron-down" size={20} color={Colors.textPrimary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.flexHalf}>
                      <Text style={styles.label}>Value</Text>
                      <TextInput
                        value={cond.value as string}
                        onChangeText={(val) => handleUpdateCondition(idx, { value: val })}
                        placeholder="e.g. 50"
                        placeholderTextColor={Colors.textMuted}
                        style={styles.textInput}
                      />
                    </View>
                  </View>
                </>
              )}
            </View>
          );
        })}

        <TouchableOpacity style={styles.addBtn} onPress={handleAddCondition}>
          <MaterialCommunityIcons name="plus-circle" size={20} color={Colors.primary} />
          <Text style={styles.addBtnText}>Add Condition</Text>
        </TouchableOpacity>

        {/* THEN Section */}
        <Text style={styles.sectionTitle}>THEN (Actions)</Text>
        {actions.map((act, idx) => {
          const actDev = devices.find(d => d.id === act.deviceId);
          const actCap = actDev?.capabilities[act.capability || ''];
          return (
            <View key={idx} style={[styles.card, { paddingBottom: Spacing.sm }]}>
              <View style={styles.cardCloseHeader}>
                <Text style={styles.smallTitle}>Action #{idx + 1}</Text>
                <TouchableOpacity onPress={() => handleRemoveAction(idx)}>
                  <MaterialCommunityIcons name="close-circle" size={22} color={Colors.error} />
                </TouchableOpacity>
              </View>

              {act.type === 'send_notification' ? (
                <View>
                  <Text style={styles.label}>Notification Title</Text>
                  <TextInput
                    value={act.notificationTitle}
                    onChangeText={(val) => handleUpdateAction(idx, { notificationTitle: val })}
                    placeholder="e.g. Tank is Low"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.textInput}
                  />

                  <Text style={[styles.label, { marginTop: Spacing.xs }]}>Body Message</Text>
                  <TextInput
                    value={act.notificationBody}
                    onChangeText={(val) => handleUpdateAction(idx, { notificationBody: val })}
                    placeholder="e.g. Please check sump level..."
                    placeholderTextColor={Colors.textMuted}
                    style={styles.textInput}
                  />
                </View>
              ) : (
                <View>
                  <Text style={styles.label}>Select Device</Text>
                  <View style={styles.dropdown}>
                    <TouchableOpacity
                      style={styles.dropdownBtn}
                      onPress={() => setActivePicker({ type: 'act_device', index: idx })}
                    >
                      <Text style={styles.dropdownBtnText}>
                        {actDev?.name || 'Select Device...'}
                      </Text>
                      <MaterialCommunityIcons name="chevron-down" size={20} color={Colors.textPrimary} />
                    </TouchableOpacity>
                  </View>

                  {act.deviceId !== '' && (
                    <>
                      <Text style={[styles.label, { marginTop: Spacing.xs }]}>Capability Action</Text>
                      <View style={styles.dropdown}>
                        <TouchableOpacity
                          style={styles.dropdownBtn}
                          onPress={() => setActivePicker({ type: 'act_cap', index: idx })}
                        >
                          <Text style={styles.dropdownBtnText}>
                            {actCap?.label || 'Select Action...'}
                          </Text>
                          <MaterialCommunityIcons name="chevron-down" size={20} color={Colors.textPrimary} />
                        </TouchableOpacity>
                      </View>

                      <Text style={[styles.label, { marginTop: Spacing.xs }]}>Set Value</Text>
                      <TextInput
                        value={String(act.value ?? '')}
                        onChangeText={(val) => handleUpdateAction(idx, { value: val })}
                        placeholder="e.g. true (for ON) or false (for OFF)"
                        placeholderTextColor={Colors.textMuted}
                        style={styles.textInput}
                      />
                    </>
                  )}
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.actionBtnRow}>
          <TouchableOpacity style={[styles.addBtn, { flex: 1 }]} onPress={handleAddAction}>
            <MaterialCommunityIcons name="plus-circle" size={20} color={Colors.primary} />
            <Text style={styles.addBtnText}>Device Action</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.addBtn, { flex: 1 }]} onPress={handleAddNotificationAction}>
            <MaterialCommunityIcons name="bell-ring" size={20} color={Colors.primary} />
            <Text style={styles.addBtnText}>Notification</Text>
          </TouchableOpacity>
        </View>

        {/* Offline warnings display */}
        {offlineWarnings.length > 0 && (
          <View style={styles.warningBox}>
            {offlineWarnings.map((warning, idx) => (
              <Text key={idx} style={styles.warningText}>⚠️ {warning}</Text>
            ))}
          </View>
        )}

        {/* Dynamic Human-readable Preview */}
        <Text style={styles.sectionTitle}>Rule Summary Preview</Text>
        <View style={styles.previewCard}>
          <Text style={styles.previewText}>{getRulePreviewText()}</Text>
        </View>

        {/* Save button */}
        <GlassButton
          label={automationToEdit ? 'SAVE CHANGES' : 'CREATE AUTOMATION'}
          onPress={handleSave}
          variant="primary"
          style={styles.saveBtn}
        />
      </ScrollView>

      {/* Internal Selection Bottom Sheet Picker overlay */}
      <GlassBottomSheet
        visible={activePicker !== null}
        onClose={() => setActivePicker(null)}
        snapHeight={0.5}
      >
        <ScrollView contentContainerStyle={styles.pickerScroll}>
          <Text style={styles.pickerTitle}>Select Option</Text>

          {activePicker?.type === 'trigger_device' && devices.map(d => (
            <TouchableOpacity
              key={d.id}
              style={styles.pickerItem}
              onPress={() => {
                setTriggerDeviceId(d.id);
                setActivePicker(null);
              }}
            >
              <Text style={styles.pickerItemText}>{d.name}</Text>
              <Text style={styles.pickerItemSub}>{d.room} • {d.connectionStatus.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}

          {activePicker?.type === 'trigger_cap' && triggerDeviceId && Object.values(devices.find(d => d.id === triggerDeviceId)?.capabilities || {}).map(cap => (
            <TouchableOpacity
              key={cap.name}
              style={styles.pickerItem}
              onPress={() => {
                setTriggerCapability(cap.name);
                setActivePicker(null);
              }}
            >
              <Text style={styles.pickerItemText}>{cap.label}</Text>
            </TouchableOpacity>
          ))}

          {activePicker?.type === 'cond_device' && activePicker.index !== undefined && devices.map(d => (
            <TouchableOpacity
              key={d.id}
              style={styles.pickerItem}
              onPress={() => {
                handleUpdateCondition(activePicker.index!, { deviceId: d.id, capability: Object.keys(d.capabilities)[0] || '' });
                setActivePicker(null);
              }}
            >
              <Text style={styles.pickerItemText}>{d.name}</Text>
              <Text style={styles.pickerItemSub}>{d.room} • {d.connectionStatus.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}

          {activePicker?.type === 'cond_cap' && activePicker.index !== undefined && Object.values(devices.find(d => d.id === conditions[activePicker.index!].deviceId)?.capabilities || {}).map(cap => (
            <TouchableOpacity
              key={cap.name}
              style={styles.pickerItem}
              onPress={() => {
                handleUpdateCondition(activePicker.index!, { capability: cap.name });
                setActivePicker(null);
              }}
            >
              <Text style={styles.pickerItemText}>{cap.label}</Text>
            </TouchableOpacity>
          ))}

          {activePicker?.type === 'act_device' && activePicker.index !== undefined && devices.map(d => (
            <TouchableOpacity
              key={d.id}
              style={styles.pickerItem}
              onPress={() => {
                const writableCap = Object.keys(d.capabilities).find(k => d.capabilities[k].writable) || Object.keys(d.capabilities)[0] || '';
                handleUpdateAction(activePicker.index!, { deviceId: d.id, capability: writableCap });
                setActivePicker(null);
              }}
            >
              <Text style={styles.pickerItemText}>{d.name}</Text>
              <Text style={styles.pickerItemSub}>{d.room} • {d.connectionStatus.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}

          {activePicker?.type === 'act_cap' && activePicker.index !== undefined && Object.values(devices.find(d => d.id === actions[activePicker.index!].deviceId)?.capabilities || {}).map(cap => (
            <TouchableOpacity
              key={cap.name}
              style={styles.pickerItem}
              onPress={() => {
                handleUpdateAction(activePicker.index!, { capability: cap.name });
                setActivePicker(null);
              }}
            >
              <Text style={styles.pickerItemText}>{cap.label}</Text>
              {!cap.writable && <Text style={styles.pickerItemSubError}>Read-only capability</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </GlassBottomSheet>
    </GlassBottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.base,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.lg,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  label: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  textInput: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  toggleSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
    maxWidth: 220,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
  },
  triggerTypeRow: {
    flexDirection: 'row',
    backgroundColor: Colors.glass,
    borderRadius: Radius.sm,
    padding: 2,
  },
  typeBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm - 2,
  },
  typeBtnActive: {
    backgroundColor: Colors.primary,
  },
  typeBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: Colors.textMuted,
  },
  typeBtnTextActive: {
    color: Colors.textPrimary,
  },
  card: {
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardCloseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  smallTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.textPrimary,
  },
  formRow: {
    gap: Spacing.xs,
  },
  dropdown: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: Radius.sm,
    marginBottom: Spacing.xs,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
  },
  dropdownBtnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  compareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  flexHalf: {
    flex: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,138,80,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,138,80,0.2)',
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  addBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  warningBox: {
    backgroundColor: 'rgba(255,193,102,0.1)',
    borderColor: Colors.warning,
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  warningText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: Colors.warning,
  },
  previewCard: {
    backgroundColor: '#161413',
    borderWidth: 1,
    borderColor: '#2A2725',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  previewText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.fontSize.xs,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  saveBtn: {
    marginBottom: Spacing.xl,
  },
  pickerScroll: {
    padding: Spacing.base,
  },
  pickerTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.fontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  pickerItem: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  pickerItemText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  pickerItemSub: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  pickerItemSubError: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: Colors.error,
    marginTop: 2,
  },
});
