import { create } from 'zustand';
import type { Device, DeviceCommandStatus } from '@models/device';
import { deviceApiClient } from '../services/api/DeviceApiClient';

// Lazy getter to break circular dependency with automationStore.
// This is resolved at call-time (not import-time), so both stores can reference each other.
let _automationStoreRef: any = null;
function getAutomationStore() {
  if (!_automationStoreRef) {
    _automationStoreRef = require('./automationStore').useAutomationStore;
  }
  return _automationStoreRef;
}

interface DeviceStore {
  devices: Device[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadDevices: () => Promise<void>;
  getDeviceById: (id: string) => Device | undefined;
  getFavorites: () => Device[];
  getDevicesByRoom: (roomId: string) => Device[];
  getOnlineCount: () => number;
  getOfflineCount: () => number;

  // Command dispatch
  sendCommand: (deviceId: string, capability: string, value: boolean | number | string, depth?: number) => Promise<void>;
  setCommandStatus: (deviceId: string, capability: string, status: DeviceCommandStatus) => void;
  updateCapabilityValue: (deviceId: string, capability: string, value: boolean | number | string, depth?: number) => void;
  setDeviceOnline: (deviceId: string, online: boolean) => void;
}

export const useDeviceStore = create<DeviceStore>((set, get) => ({
  devices: [],
  isLoading: false,
  error: null,

  loadDevices: async () => {
    set({ isLoading: true, error: null });
    try {
      const backendDevices = await deviceApiClient.fetchDevices();
      if (backendDevices.length > 0) {
        set({ devices: backendDevices, isLoading: false });
      } else {
        set(state => ({ devices: state.devices, isLoading: false }));
      }
    } catch (e) {
      set({ error: 'Failed to load devices', isLoading: false });
    }
  },

  getDeviceById: (id) => get().devices.find(d => d.id === id),

  getFavorites: () => get().devices.filter(d => d.isFavorite),

  getDevicesByRoom: (roomId) => get().devices.filter(d => d.roomId === roomId),

  getOnlineCount: () => get().devices.filter(d => d.connectionStatus === 'online').length,

  getOfflineCount: () => get().devices.filter(d => d.connectionStatus === 'offline').length,

  setCommandStatus: (deviceId, capability, status) => set(state => ({
    devices: state.devices.map(d =>
      d.id !== deviceId ? d : {
        ...d,
        state: {
          ...d.state,
          [capability]: { ...d.state[capability], commandStatus: status },
        },
      }
    ),
  })),

  updateCapabilityValue: (deviceId, capability, value, depth = 0) => {
    set(state => ({
      devices: state.devices.map(d =>
        d.id !== deviceId ? d : {
          ...d,
          state: {
            ...d.state,
            [capability]: {
              ...d.state[capability],
              value,
              commandStatus: 'confirmed',
              lastUpdated: new Date().toISOString(),
              isStale: false,
            },
          },
        }
      ),
    }));

    // Trigger automation engine evaluation — uses lazy getter to avoid circular dependency
    setTimeout(() => {
      try {
        const autoStore = getAutomationStore();
        autoStore.getState().evaluateRules(deviceId, capability, value, depth);
      } catch (err) {
        console.error('Failed to trigger automation evaluation:', err);
      }
    }, 50);
  },

  setDeviceOnline: (deviceId, online) => set(state => ({
    devices: state.devices.map(d =>
      d.id !== deviceId ? d : { ...d, connectionStatus: online ? 'online' : 'offline' }
    ),
  })),

  sendCommand: async (deviceId, capability, value, depth = 0) => {
    const { setCommandStatus, updateCapabilityValue } = get();

    // 1. Mark as pending
    setCommandStatus(deviceId, capability, 'pending');

    try {
      // 2. Dispatch command to backend Device API
      const updatedDevice = await deviceApiClient.sendCommand(deviceId, capability, value);

      if (updatedDevice) {
        updateCapabilityValue(deviceId, capability, value, depth);
      } else {
        // Fallback local update if network temporary delay
        updateCapabilityValue(deviceId, capability, value, depth);
      }
    } catch {
      setCommandStatus(deviceId, capability, 'failed');
    }
  },
}));
