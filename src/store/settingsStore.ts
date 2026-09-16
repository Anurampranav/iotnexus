import { create } from 'zustand';

export type ThemeMode = 'dark' | 'system';
export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type VolumeUnit = 'liters' | 'gallons';

interface SettingsStore {
  // Appearance
  themeMode: ThemeMode;
  // Notifications
  pushNotificationsEnabled: boolean;
  criticalAlertsEnabled: boolean;
  automationAlertsEnabled: boolean;
  // Units
  temperatureUnit: TemperatureUnit;
  volumeUnit: VolumeUnit;
  // Automation
  autoEvaluateEnabled: boolean;
  cooldownMs: number;
  // Security
  biometricEnabled: boolean;
  // Connectivity
  mqttAutoReconnect: boolean;
  /**
   * User-configured backend base URL (e.g. http://192.168.1.5:3000).
   * Leave empty to operate in standalone / local-only mode.
   */
  backendUrl: string;

  // Setters
  setThemeMode: (mode: ThemeMode) => void;
  setPushNotificationsEnabled: (val: boolean) => void;
  setCriticalAlertsEnabled: (val: boolean) => void;
  setAutomationAlertsEnabled: (val: boolean) => void;
  setTemperatureUnit: (unit: TemperatureUnit) => void;
  setVolumeUnit: (unit: VolumeUnit) => void;
  setAutoEvaluateEnabled: (val: boolean) => void;
  setBiometricEnabled: (val: boolean) => void;
  setMqttAutoReconnect: (val: boolean) => void;
  setBackendUrl: (url: string) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  // Appearance
  themeMode: 'dark',
  // Notifications
  pushNotificationsEnabled: true,
  criticalAlertsEnabled: true,
  automationAlertsEnabled: true,
  // Units
  temperatureUnit: 'celsius',
  volumeUnit: 'liters',
  // Automation
  autoEvaluateEnabled: true,
  cooldownMs: 2000,
  // Security
  biometricEnabled: false,
  // Connectivity
  mqttAutoReconnect: true,
  backendUrl: '',

  setThemeMode: (mode) => set({ themeMode: mode }),
  setPushNotificationsEnabled: (val) => set({ pushNotificationsEnabled: val }),
  setCriticalAlertsEnabled: (val) => set({ criticalAlertsEnabled: val }),
  setAutomationAlertsEnabled: (val) => set({ automationAlertsEnabled: val }),
  setTemperatureUnit: (unit) => set({ temperatureUnit: unit }),
  setVolumeUnit: (unit) => set({ volumeUnit: unit }),
  setAutoEvaluateEnabled: (val) => set({ autoEvaluateEnabled: val }),
  setBiometricEnabled: (val) => set({ biometricEnabled: val }),
  setMqttAutoReconnect: (val) => set({ mqttAutoReconnect: val }),
  setBackendUrl: (url) => set({ backendUrl: url.trim() }),
}));
