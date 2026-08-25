import type { AutomationRule } from '@models/automation';

export const mockAutomations: AutomationRule[] = [
  {
    id: 'auto-smart-irrigation',
    name: 'Smart Irrigation',
    description: 'Start irrigation when soil is dry and tank has enough water',
    enabled: true,
    status: 'active',
    trigger: { type: 'sensor_value', deviceId: 'dev-soil-sensor', capability: 'moisture', operator: 'lt', value: 30 },
    conditionGroup: {
      logic: 'AND',
      conditions: [
        { deviceId: 'dev-soil-sensor', capability: 'moisture', operator: 'lt', value: 30 },
        { deviceId: 'dev-tank-sensor', capability: 'level',    operator: 'gt', value: 25 },
      ],
    },
    actions: [{ type: 'set_capability', deviceId: 'dev-irrigation-pump', capability: 'power', value: true }],
    lastTriggered: new Date(Date.now() - 1800000).toISOString(),
    executionHistory: [
      { ruleId: 'auto-smart-irrigation', triggeredAt: new Date(Date.now() - 1800000).toISOString(), result: 'success', description: 'Irrigation Pump turned ON successfully.' }
    ],
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'auto-tap-trigger',
    name: 'Soil Dry Tap Trigger',
    description: 'Open water tap when soil moisture is critically dry',
    enabled: true,
    status: 'active',
    trigger: { type: 'sensor_value', deviceId: 'dev-soil-sensor', capability: 'moisture', operator: 'lt', value: 20 },
    actions: [{ type: 'set_capability', deviceId: 'dev-water-valve', capability: 'open', value: true }],
    lastTriggered: new Date(Date.now() - 3600000).toISOString(),
    executionHistory: [
      { ruleId: 'auto-tap-trigger', triggeredAt: new Date(Date.now() - 3600000).toISOString(), result: 'success', description: 'Smart Water Tap OPEN command sent.' }
    ],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'auto-low-tank-alert',
    name: 'Low Tank Alert',
    description: 'Notify when tank level drops below 20%',
    enabled: true,
    status: 'active',
    trigger: { type: 'sensor_value', deviceId: 'dev-tank-sensor', capability: 'level', operator: 'lt', value: 20 },
    actions: [{ type: 'send_notification', notificationTitle: 'Tank level is low', notificationBody: 'Tank is below 20%. Please turn on the pump.' }],
    lastTriggered: new Date(Date.now() - 120000).toISOString(),
    executionHistory: [
      { ruleId: 'auto-low-tank-alert', triggeredAt: new Date(Date.now() - 120000).toISOString(), result: 'success', description: 'Alert notification dispatched.' }
    ],
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'auto-pump-protection',
    name: 'Pump Protection',
    description: 'Emergency stop irrigation if tank level is critically low',
    enabled: true,
    status: 'active',
    isSafety: true,
    trigger: { type: 'sensor_value', deviceId: 'dev-tank-sensor', capability: 'level', operator: 'lt', value: 10 },
    actions: [
      { type: 'set_capability', deviceId: 'dev-irrigation-pump', capability: 'power', value: false },
      { type: 'send_notification', notificationTitle: 'CRITICAL: Pump stopped', notificationBody: 'Tank critically low. Irrigation pump has been stopped automatically.' },
    ],
    executionHistory: [
      { ruleId: 'auto-pump-protection', triggeredAt: new Date(Date.now() - 7200000).toISOString(), result: 'success', description: 'Safety shutdown completed.' }
    ],
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'auto-temp-cooling',
    name: 'Temp Cooling Routine',
    description: 'Turn on Smart Fan if soil temperature goes above 35°C',
    enabled: true,
    status: 'active',
    trigger: { type: 'sensor_value', deviceId: 'dev-soil-sensor', capability: 'temperature', operator: 'gt', value: 35 },
    actions: [{ type: 'set_capability', deviceId: 'dev-smart-fan', capability: 'power', value: true }],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'auto-night-motion',
    name: 'Night Motion Light',
    description: 'Turn on Garden Light if motion is detected and light level is low',
    enabled: true,
    status: 'active',
    trigger: { type: 'device_state', deviceId: 'dev-motion-sensor', capability: 'motion', operator: 'eq', value: true },
    conditionGroup: {
      logic: 'AND',
      conditions: [
        { deviceId: 'dev-motion-sensor', capability: 'motion', operator: 'eq', value: true },
        { deviceId: 'dev-motion-sensor', capability: 'light_level', operator: 'lt', value: 20 },
      ],
    },
    actions: [{ type: 'set_capability', deviceId: 'dev-garden-light', capability: 'power', value: true }],
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'auto-morning-routine',
    name: 'Morning Routine',
    description: 'Turn on garden light at 6:00 AM',
    enabled: false,
    status: 'disabled',
    trigger: { type: 'time', timeValue: '06:00' },
    actions: [{ type: 'set_capability', deviceId: 'dev-garden-light', capability: 'power', value: true }],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'auto-plug-overload',
    name: 'Plug Overload Safety',
    description: 'Turn off Smart Plug if power consumption exceeds 1000W',
    enabled: true,
    status: 'active',
    isSafety: true,
    trigger: { type: 'sensor_value', deviceId: 'dev-smart-plug', capability: 'wattage', operator: 'gt', value: 1000 },
    actions: [
      { type: 'set_capability', deviceId: 'dev-smart-plug', capability: 'power', value: false },
      { type: 'send_notification', notificationTitle: 'Plug Overload Stopped', notificationBody: 'Smart Plug shut off because load exceeded 1000W.' }
    ],
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'auto-door-welcome',
    name: 'Door Welcome Light',
    description: 'Turn on Garden Light when Door Sensor is opened',
    enabled: true,
    status: 'active',
    trigger: { type: 'device_state', deviceId: 'dev-door-sensor', capability: 'open', operator: 'eq', value: true },
    actions: [{ type: 'set_capability', deviceId: 'dev-garden-light', capability: 'power', value: true }],
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'auto-overflow-protection',
    name: 'Valve Overflow Protection',
    description: 'Shut off Smart Water Tap and warn if flow exceeds 100 L/h',
    enabled: true,
    status: 'active',
    isSafety: true,
    trigger: { type: 'sensor_value', deviceId: 'dev-water-valve', capability: 'flow', operator: 'gt', value: 100 },
    actions: [
      { type: 'set_capability', deviceId: 'dev-water-valve', capability: 'open', value: false },
      { type: 'send_notification', notificationTitle: 'Overflow Shutoff Active', notificationBody: 'Smart Water Tap shut off automatically due to excessive flow.' }
    ],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];
