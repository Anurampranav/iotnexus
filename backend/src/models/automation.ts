/**
 * Automation Rule Model — Smart CodeFlurry
 */

export type TriggerType =
  | 'device_state'
  | 'sensor_value'
  | 'time'
  | 'schedule'
  | 'device_online'
  | 'device_offline';

export type ConditionOperator =
  | 'eq' | 'neq'
  | 'gt' | 'gte'
  | 'lt' | 'lte';

export type LogicOperator = 'AND' | 'OR';

export type ActionType =
  | 'set_capability'
  | 'delay'
  | 'send_notification';

export interface Trigger {
  type: TriggerType;
  deviceId?: string;
  capability?: string;
  operator?: ConditionOperator;
  value?: boolean | number | string;
  timeValue?: string; // HH:MM
  cronExpression?: string;
}

export interface Condition {
  deviceId: string;
  capability: string;
  operator: ConditionOperator;
  value: boolean | number | string;
}

export interface ConditionGroup {
  logic: LogicOperator;
  conditions: (Condition | ConditionGroup)[];
}

export interface AutomationAction {
  type: ActionType;
  deviceId?: string;
  capability?: string;
  value?: boolean | number | string;
  delaySeconds?: number;
  notificationTitle?: string;
  notificationBody?: string;
}

export type AutomationStatus = 'active' | 'disabled' | 'error';

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  status: AutomationStatus;
  trigger: Trigger;
  conditionGroup?: ConditionGroup;
  actions: AutomationAction[];
  lastTriggered?: string; // ISO
  isSafety?: boolean; // Safety-critical rules override ordinary actions
  executionHistory?: ExecutionRecord[]; // Runs history log
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionRecord {
  ruleId: string;
  triggeredAt: string;
  result: 'success' | 'partial' | 'failed' | 'aborted';
  description?: string; // Human-readable result detail
  error?: string;
}
