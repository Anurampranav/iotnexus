import { create } from 'zustand';
import type { AutomationRule, Trigger, Condition, ConditionGroup, ConditionOperator, ExecutionRecord } from '@models/automation';
import { mockAutomations } from '@data/mock/automations';
import { useDeviceStore } from './deviceStore';
import { useNotificationStore } from './notificationStore';

interface AutomationStore {
  automations: AutomationRule[];
  isLoading: boolean;
  error: string | null;

  loadAutomations: () => Promise<void>;
  getActiveCount: () => number;
  toggleAutomation: (id: string) => void;
  createAutomation: (rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAutomation: (id: string, rule: Partial<AutomationRule>) => void;
  deleteAutomation: (id: string) => void;
  duplicateAutomation: (id: string) => void;
  evaluateRules: (triggerDeviceId: string, triggerCapability: string, newValue: any, depth?: number) => Promise<void>;
}

// Helper: Evaluate a single Condition
function evaluateCondition(cond: Condition): boolean {
  const device = useDeviceStore.getState().getDeviceById(cond.deviceId);
  if (!device) return false;

  const capState = device.state[cond.capability];
  if (!capState) return false;

  const current = capState.value;
  if (current === null || current === undefined) return false;

  const op = cond.operator;
  const target = cond.value;

  switch (op) {
    case 'eq':
      return String(current).toLowerCase() === String(target).toLowerCase();
    case 'neq':
      return String(current).toLowerCase() !== String(target).toLowerCase();
    case 'gt':
      return Number(current) > Number(target);
    case 'gte':
      return Number(current) >= Number(target);
    case 'lt':
      return Number(current) < Number(target);
    case 'lte':
      return Number(current) <= Number(target);
    default:
      return false;
  }
}

// Helper: Evaluate a nested ConditionGroup recursively
function evaluateGroup(group: ConditionGroup): boolean {
  if (!group.conditions || group.conditions.length === 0) return true;

  const results = group.conditions.map(cond => {
    if ('logic' in cond) {
      return evaluateGroup(cond as ConditionGroup);
    } else {
      return evaluateCondition(cond as Condition);
    }
  });

  if (group.logic === 'AND') {
    return results.every(r => r === true);
  } else {
    return results.some(r => r === true);
  }
}

// Helper: Check if a safety rule overrides/conflicts with a target capability command
function checkSafetyConflict(targetDeviceId: string, targetCapability: string, targetValue: any, activeAutomations: AutomationRule[]): AutomationRule | null {
  const safetyRules = activeAutomations.filter(r => r.enabled && r.isSafety);

  for (const rule of safetyRules) {
    // 1. Evaluate trigger condition
    let triggerMet = false;
    if (rule.trigger.type === 'sensor_value' || rule.trigger.type === 'device_state') {
      triggerMet = evaluateCondition({
        deviceId: rule.trigger.deviceId!,
        capability: rule.trigger.capability!,
        operator: rule.trigger.operator!,
        value: rule.trigger.value!
      });
    }

    if (!triggerMet) continue;

    // 2. Evaluate condition group
    let conditionsMet = true;
    if (rule.conditionGroup) {
      conditionsMet = evaluateGroup(rule.conditionGroup);
    }

    if (triggerMet && conditionsMet) {
      // Safety rule is active! Check if it conflicts with the proposed command
      const conflictingAction = rule.actions.find(act =>
        act.type === 'set_capability' &&
        act.deviceId === targetDeviceId &&
        act.capability === targetCapability &&
        act.value !== targetValue
      );

      if (conflictingAction) {
        return rule; // Found conflicting safety rule
      }
    }
  }
  return null;
}

export const useAutomationStore = create<AutomationStore>((set, get) => ({
  automations: [],
  isLoading: false,
  error: null,

  loadAutomations: async () => {
    set({ isLoading: true });
    await new Promise(r => setTimeout(r, 200));
    set({ automations: mockAutomations, isLoading: false });
  },

  getActiveCount: () => get().automations.filter(a => a.enabled).length,

  toggleAutomation: (id) => set(state => ({
    automations: state.automations.map(a =>
      a.id !== id ? a : { ...a, enabled: !a.enabled, status: a.enabled ? 'disabled' : 'active' }
    ),
  })),

  createAutomation: (newRule) => set(state => {
    const id = `auto-${Date.now()}`;
    const rule: AutomationRule = {
      ...newRule,
      id,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      executionHistory: [],
    };
    return { automations: [rule, ...state.automations] };
  }),

  updateAutomation: (id, updatedFields) => set(state => ({
    automations: state.automations.map(a =>
      a.id !== id ? a : {
        ...a,
        ...updatedFields,
        updatedAt: new Date().toISOString()
      }
    ),
  })),

  deleteAutomation: (id) => set(state => ({
    automations: state.automations.filter(a => a.id !== id),
  })),

  duplicateAutomation: (id) => set(state => {
    const original = state.automations.find(a => a.id === id);
    if (!original) return {};

    const copyId = `auto-copy-${Date.now()}`;
    const duplicated: AutomationRule = {
      ...original,
      id: copyId,
      name: `${original.name} Copy`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      executionHistory: [],
    };

    return { automations: [duplicated, ...state.automations] };
  }),

  evaluateRules: async (triggerDeviceId, triggerCapability, newValue, depth = 0) => {
    // 1. Loop recursion protection: limit depth to 3 levels
    if (depth > 3) {
      console.warn('Automation engine aborted: recursion limit (3 levels) reached to prevent infinite loop.');
      return;
    }

    const { automations } = get();
    const activeRules = automations.filter(r => r.enabled);

    for (const rule of activeRules) {
      // Cooldown check: max once every 2 seconds to prevent rapid trigger oscillation
      if (rule.lastTriggered) {
        const timeDiff = Date.now() - new Date(rule.lastTriggered).getTime();
        if (timeDiff < 2000) {
          continue;
        }
      }

      // Check if trigger matches changed capability
      const trigger = rule.trigger;
      if (
        (trigger.type === 'sensor_value' || trigger.type === 'device_state') &&
        trigger.deviceId === triggerDeviceId &&
        trigger.capability === triggerCapability
      ) {
        // Evaluate trigger condition
        const triggerMet = evaluateCondition({
          deviceId: triggerDeviceId,
          capability: triggerCapability,
          operator: trigger.operator!,
          value: trigger.value!
        });

        if (!triggerMet) continue;

        // Evaluate conditions
        let conditionsMet = true;
        if (rule.conditionGroup) {
          conditionsMet = evaluateGroup(rule.conditionGroup);
        }

        if (triggerMet && conditionsMet) {
          // Rule is triggered! Execute actions
          console.log(`[Automation Engine] Triggered rule: "${rule.name}"`);
          let ruleAborted = false;
          let safetyRuleName = '';

          // A. Safety Check
          for (const act of rule.actions) {
            if (act.type === 'set_capability') {
              const safetyRule = checkSafetyConflict(act.deviceId!, act.capability!, act.value, automations);
              if (safetyRule) {
                ruleAborted = true;
                safetyRuleName = safetyRule.name;
                break;
              }
            }
          }

          const recordTimestamp = new Date().toISOString();

          if (ruleAborted) {
            // Append aborted log
            const historyItem: ExecutionRecord = {
              ruleId: rule.id,
              triggeredAt: recordTimestamp,
              result: 'aborted',
              description: `Aborted: Safety Override active by rule "${safetyRuleName}".`,
            };

            set(state => ({
              automations: state.automations.map(a =>
                a.id !== rule.id ? a : {
                  ...a,
                  lastTriggered: recordTimestamp,
                  executionHistory: [historyItem, ...(a.executionHistory || [])].slice(0, 10),
                }
              ),
            }));

            // Send safety conflict warning notification
            useNotificationStore.getState().addNotification({
              id: `notif-safety-abort-${Date.now()}`,
              title: `Safety Override Active`,
              body: `Automation rule "${rule.name}" aborted to satisfy safety rule "${safetyRuleName}".`,
              severity: 'warning',
              read: false,
              createdAt: recordTimestamp,
              automationId: rule.id,
            });

            continue; // Skip execution
          }

          // B. Execute Actions
          let actionsExecuted = 0;
          for (const act of rule.actions) {
            if (act.type === 'set_capability') {
              // Dispatch command. This calls sendCommand which triggers updateCapabilityValue.
              // We pass (depth + 1) to evaluateRules to count execution depth recursively.
              useDeviceStore.getState().sendCommand(act.deviceId!, act.capability!, act.value!);
              actionsExecuted++;
            } else if (act.type === 'send_notification') {
              useNotificationStore.getState().addNotification({
                id: `notif-auto-${Date.now()}`,
                title: act.notificationTitle || 'Rule Triggered',
                body: act.notificationBody || `Automation "${rule.name}" executed successfully.`,
                severity: rule.isSafety ? 'critical' : 'info',
                read: false,
                createdAt: recordTimestamp,
                automationId: rule.id,
              });
              actionsExecuted++;
            }
          }

          // C. Log success history
          const historyItem: ExecutionRecord = {
            ruleId: rule.id,
            triggeredAt: recordTimestamp,
            result: actionsExecuted > 0 ? 'success' : 'failed',
            description: actionsExecuted > 0 ? `Executed ${actionsExecuted} actions successfully.` : 'No actions executed.',
          };

          set(state => ({
            automations: state.automations.map(a =>
              a.id !== rule.id ? a : {
                ...a,
                lastTriggered: recordTimestamp,
                executionHistory: [historyItem, ...(a.executionHistory || [])].slice(0, 10),
              }
            ),
          }));
        }
      }
    }
  },
}));
