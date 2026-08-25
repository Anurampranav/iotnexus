import { create } from 'zustand';
import type { Device, DeviceCommandStatus } from '@models/device';
import { mockDevices } from '@data/mock/devices';

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
  sendCommand: (deviceId: string, capability: string, value: boolean | number | string) => Promise<void>;
  setCommandStatus: (deviceId: string, capability: string, status: DeviceCommandStatus) => void;
  updateCapabilityValue: (deviceId: string, capability: string, value: boolean | number | string) => void;
  setDeviceOnline: (deviceId: string, online: boolean) => void;
}

export const useDeviceStore = create<DeviceStore>((set, get) => ({
  devices: [],
  isLoading: false,
  error: null,

  loadDevices: async () => {
    set({ isLoading: true, error: null });
    try {
      // TODO Phase 6: Replace with deviceService.getDevices()
      await new Promise(r => setTimeout(r, 400)); // simulate network
      set({ devices: mockDevices, isLoading: false });
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

  updateCapabilityValue: (deviceId, capability, value) => {
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

    // Trigger automation engine evaluation dynamically to avoid circular dependency imports
    setTimeout(() => {
      try {
        const { useAutomationStore } = require('./automationStore');
        useAutomationStore.getState().evaluateRules(deviceId, capability, value);
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

  sendCommand: async (deviceId, capability, value) => {
    const { setCommandStatus, updateCapabilityValue } = get();

    // 1. Mark as pending
    setCommandStatus(deviceId, capability, 'pending');

    try {
      // 2. TODO Phase 6: await deviceService.sendCommand(deviceId, capability, value)
      // Simulate network delay + confirmation
      await new Promise(r => setTimeout(r, 800));

      // SAFETY: Never silently confirm. Check that device is still online.
      const device = get().getDeviceById(deviceId);
      if (!device || device.connectionStatus !== 'online') {
        setCommandStatus(deviceId, capability, 'failed');
        return;
      }

      // 3. Simulate state confirmation
      updateCapabilityValue(deviceId, capability, value);
    } catch {
      setCommandStatus(deviceId, capability, 'failed');
    }
  },
}));
