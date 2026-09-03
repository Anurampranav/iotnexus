/**
 * Pending Device Model — Smart CodeFlurry
 * Represents an auto-discovered hardware device waiting for user adoption into a Home & Room.
 */

import type { DeviceType, DeviceProtocol, CapabilityDefinition, DeviceState } from './device';

export interface PendingDevice {
  id: string;
  name: string;
  type: DeviceType;
  manufacturer: string;
  model?: string;
  protocol: DeviceProtocol;
  integrationId: string;
  ip?: string;
  mac?: string;
  discoveredAt: string; // ISO timestamp
  capabilities: Record<string, CapabilityDefinition>;
  initialState: DeviceState;
  metadata: Record<string, unknown>;
}

export interface ConfirmPendingDeviceDto {
  name?: string;
  homeId: string;
  roomId?: string;
  room?: string;
  isFavorite?: boolean;
}
