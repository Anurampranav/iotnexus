import { NativeModules, Platform } from 'react-native';

const { TuyaNativeModule } = NativeModules;

export interface TuyaInitOptions {
  appKey?: string;
  appSecret?: string;
}

export interface TuyaStatus {
  initialized: boolean;
  sdkVersion: string;
  error?: string;
  code?: string;
}

export interface TuyaPairingResult {
  started: boolean;
  status: string;
  deviceId?: string;
  deviceName?: string;
  category?: string;
  error?: string;
  code?: string;
}

export const Tuya = {
  /**
   * Initializes the native Tuya Smart Life App SDK (ThingHomeSdk).
   * If appKey and appSecret are omitted, the SDK attempts to read from AndroidManifest metadata.
   */
  initialize: async (options?: TuyaInitOptions): Promise<TuyaStatus> => {
    if (Platform.OS !== 'android') {
      return {
        initialized: false,
        sdkVersion: '7.8.0',
        error: 'Tuya native SDK is currently configured for Android in this milestone.',
        code: 'PLATFORM_UNSUPPORTED',
      };
    }

    if (!TuyaNativeModule) {
      return {
        initialized: false,
        sdkVersion: '7.8.0',
        error: 'TuyaNativeModule is not linked in native runtime.',
        code: 'MODULE_NOT_FOUND',
      };
    }

    try {
      const result = await TuyaNativeModule.initialize(options || null);
      return result as TuyaStatus;
    } catch (err: any) {
      return {
        initialized: false,
        sdkVersion: '7.8.0',
        error: err?.message || 'Unknown initialization error',
        code: err?.code || 'INIT_FAILED',
      };
    }
  },

  /**
   * Checks the current initialization status of the native Tuya SDK.
   */
  getStatus: async (): Promise<TuyaStatus> => {
    if (Platform.OS !== 'android' || !TuyaNativeModule) {
      return {
        initialized: false,
        sdkVersion: '7.8.0',
        error: 'Native module unavailable',
        code: 'UNAVAILABLE',
      };
    }

    try {
      const result = await TuyaNativeModule.getStatus();
      return result as TuyaStatus;
    } catch (err: any) {
      return {
        initialized: false,
        sdkVersion: '7.8.0',
        error: err?.message || 'Failed to get status',
        code: err?.code || 'STATUS_FAILED',
      };
    }
  },

  /**
   * Launches the official Tuya Device Pairing UI BizBundle.
   */
  startDevicePairing: async (): Promise<TuyaPairingResult> => {
    if (Platform.OS !== 'android' || !TuyaNativeModule) {
      return {
        started: false,
        status: 'UNAVAILABLE',
        error: 'Native module unavailable for pairing',
        code: 'UNAVAILABLE',
      };
    }

    try {
      const result = await TuyaNativeModule.startDevicePairing();
      return result as TuyaPairingResult;
    } catch (err: any) {
      return {
        started: false,
        status: 'FAILED',
        error: err?.message || 'Failed to launch device pairing UI',
        code: err?.code || 'PAIRING_FAILED',
      };
    }
  },
};

export default Tuya;
