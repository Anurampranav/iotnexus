/**
 * Canonical Device Model — Smart CodeFlurry
 * Protocol-agnostic. All integrations (Tuya, MQTT, Matter…) map to this.
 */

// ─── Capability Types ────────────────────────────────────────────────────

export type CapabilityType =
  | 'boolean'      // e.g. power on/off
  | 'percentage'   // 0-100
  | 'integer'
  | 'float'
  | 'enum'
  | 'string'
  | 'temperature'
  | 'duration';

export interface CapabilityDefinition {
  name: string;
  label: string;
  type: CapabilityType;
  unit?: string;
  writable: boolean;
  min?: number;
  max?: number;
  enumValues?: string[];
}

// ─── Device Types ────────────────────────────────────────────────────────

export type DeviceType =
  | 'pump'
  | 'light'
  | 'switch'
  | 'water_sensor'
  | 'soil_sensor'
  | 'temperature_sensor'
  | 'motion_sensor'
  | 'climate'
  | 'custom';

export type DeviceProtocol =
  | 'tuya'
  | 'mqtt'
  | 'matter'
  | 'zigbee'
  | 'ble'
  | 'custom'
  | 'simulated';

// ─── Connection & Command Status ─────────────────────────────────────────

export type DeviceConnectionStatus =
  | 'online'
  | 'offline'
  | 'unknown'
  | 'connecting';

export type DeviceCommandStatus =
  | 'idle'
  | 'pending'
  | 'confirmed'
  | 'failed'
  | 'unknown';

// ─── Device State ────────────────────────────────────────────────────────

export interface DeviceCapabilityState {
  value: boolean | number | string | null;
  commandStatus: DeviceCommandStatus;
  lastUpdated: string | null; // ISO timestamp
  isStale: boolean;
}

export type DeviceState = Record<string, DeviceCapabilityState>;

// ─── Telemetry ───────────────────────────────────────────────────────────

export interface TelemetryPoint {
  timestamp: string; // ISO
  capability: string;
  value: number | boolean | string;
}

// ─── Device ─────────────────────────────────────────────────────────────

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  manufacturer: string;
  model?: string;
  protocol: DeviceProtocol;
  integrationId: string;
  capabilities: Record<string, CapabilityDefinition>;
  state: DeviceState;
  connectionStatus: DeviceConnectionStatus;
  homeId: string;
  roomId?: string;
  room?: string;
  isFavorite: boolean;
  lastSeen?: string; // ISO timestamp
  metadata: Record<string, unknown>;
}

// ─── Command ─────────────────────────────────────────────────────────────

export interface DeviceCommand {
  deviceId: string;
  capability: string;
  value: boolean | number | string;
  requestedAt: string; // ISO
}

// ─── Safety ──────────────────────────────────────────────────────────────

export type SafetyStatus = 'normal' | 'warning' | 'critical' | 'unknown';

// ─── Water Level Status ──────────────────────────────────────────────────

export type WaterLevelStatus = 'normal' | 'warning' | 'low' | 'critical' | 'unknown';

export function getWaterLevelStatus(percentage: number | null): WaterLevelStatus {
  if (percentage === null) return 'unknown';
  if (percentage < 10) return 'critical';
  if (percentage < 20) return 'low';
  if (percentage < 30) return 'warning';
  return 'normal';
}
