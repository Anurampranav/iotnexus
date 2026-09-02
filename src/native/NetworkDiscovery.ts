import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { NetworkDiscoveryModule } = NativeModules;

export interface RealDiscoveredDevice {
  id: string;
  name: string;
  type: 'switch' | 'light' | 'pump' | 'water_sensor' | 'soil_sensor';
  category: string;
  protocol: string;
  ip?: string;
  port?: number;
  mac?: string;
  rssi?: number;
  source: string;
  state?: boolean;
  powerWatts?: number;
}

class NetworkDiscoveryService {
  private emitter: NativeEventEmitter | null = null;

  constructor() {
    if (Platform.OS === 'android' && NetworkDiscoveryModule) {
      this.emitter = new NativeEventEmitter(NetworkDiscoveryModule);
    }
  }

  async startScan(onDeviceFound: (device: RealDiscoveredDevice) => void): Promise<() => void> {
    if (Platform.OS !== 'android' || !NetworkDiscoveryModule) {
      return () => {};
    }

    const subscription = this.emitter?.addListener('onDeviceDiscovered', (device: RealDiscoveredDevice) => {
      onDeviceFound(device);
    });

    try {
      await NetworkDiscoveryModule.startLiveHardwareScan();
    } catch (e) {
      console.warn('NetworkDiscovery scan start failed:', e);
    }

    return () => {
      subscription?.remove();
      this.stopScan();
    };
  }

  async stopScan(): Promise<void> {
    if (Platform.OS === 'android' && NetworkDiscoveryModule) {
      try {
        await NetworkDiscoveryModule.stopLiveHardwareScan();
      } catch (e) {
        console.warn('NetworkDiscovery scan stop failed:', e);
      }
    }
  }

  async getDiscoveredDevices(): Promise<RealDiscoveredDevice[]> {
    if (Platform.OS === 'android' && NetworkDiscoveryModule) {
      try {
        return await NetworkDiscoveryModule.getDiscoveredDevices();
      } catch {
        return [];
      }
    }
    return [];
  }
}

export const NetworkDiscovery = new NetworkDiscoveryService();
