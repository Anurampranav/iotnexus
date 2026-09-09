import * as net from 'net';
import * as dgram from 'dgram';
import * as crypto from 'crypto';
import { DeviceService } from './deviceService.js';
import type { DeviceType, CapabilityDefinition } from '../models/index.js';

// Standard Tuya UDP Discovery MD5/AES key
const UDP_KEY = crypto.createHash('md5').update('yGAdlopoPVldABfn').digest();

// Packet Header / Suffix constants
const PREFIX_BYTES = Buffer.from([0x00, 0x00, 0x55, 0xAA]);
const SUFFIX_BYTES = Buffer.from([0x00, 0x00, 0xAA, 0x55]);

// Command OpCodes
export enum TuyaOpCode {
  UDP = 0x00,
  AP_CONFIG = 0x01,
  ACTIVE = 0x02,
  BIND = 0x03,
  RENAME_GW = 0x04,
  RENAME_DEVICE = 0x05,
  UNBIND = 0x06,
  CONTROL = 0x07,
  STATUS = 0x08,
  HEART_BEAT = 0x09,
  DP_QUERY = 0x0A,
  QUERY_STATE = 0x0B,
  DP_QUERY_NEW = 0x10,
  ENABLE_SCENE = 0x11,
  DP_QUERY_AUTO = 0x12,
  UDP_NEW = 0x13,
  AP_CONFIG_NEW = 0x14,
}

export interface TuyaDeviceConfig {
  devId: string;
  localKey: string;
  ip: string;
  version?: '3.3' | '3.4' | '3.5';
  port?: number;
}

export class TuyaLocalDriver {
  private static udpServer: dgram.Socket | null = null;
  private static sequenceNumber: number = 0;

  /**
   * Initialize UDP broadcast listener for Auto-Discovery (Port 6666 & 6667)
   */
  public static startDiscoveryListener(): void {
    if (this.udpServer) return;

    try {
      this.udpServer = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      this.udpServer.on('error', (err) => {
        console.warn('⚠️ [TuyaLocalDriver] UDP Discovery warning:', err.message);
      });

      this.udpServer.on('message', (msg, rinfo) => {
        this.handleUdpBroadcast(msg, rinfo.address);
      });

      this.udpServer.bind(6666, () => {
        console.log('📡 [TuyaLocalDriver] Listening for Tuya Local UDP discovery beacons on Port 6666/6667');
      });
    } catch (e: any) {
      console.warn('⚠️ [TuyaLocalDriver] Could not bind UDP discovery socket:', e.message);
    }
  }

  /**
   * Handle incoming UDP discovery beacon from a Tuya device on LAN
   */
  private static handleUdpBroadcast(msg: Buffer, senderIp: string): void {
    try {
      let payloadBuffer: Buffer = msg;

      // Strip 55AA header if present
      if (msg.length >= 16 && msg.subarray(0, 4).equals(PREFIX_BYTES)) {
        const payloadLength = msg.readUInt32BE(12);
        payloadBuffer = msg.subarray(16, 16 + payloadLength - 8);
      }

      // Attempt decryption with standard Tuya UDP key
      let jsonStr: string;
      try {
        const decipher = crypto.createDecipheriv('aes-128-ecb', UDP_KEY, null);
        decipher.setAutoPadding(true);
        jsonStr = Buffer.concat([decipher.update(payloadBuffer), decipher.final()]).toString('utf8');
      } catch {
        // Plaintext fallback
        jsonStr = payloadBuffer.toString('utf8');
      }

      // Find JSON object
      const startIdx = jsonStr.indexOf('{');
      const endIdx = jsonStr.lastIndexOf('}');
      if (startIdx === -1 || endIdx === -1) return;

      const data = JSON.parse(jsonStr.substring(startIdx, endIdx + 1));
      const devId = data.gwId || data.devId;
      const ip = data.ip || senderIp;
      const productKey = data.productKey || 'tuya_smart_device';
      const version = data.version || '3.3';

      if (!devId) return;

      // Infer Device Type and Capabilities from Product Key / Name
      const { type, name, capabilities, initialState } = this.inferDeviceProfile(devId, productKey);

      // Register into Pending Devices queue for 1-tap user adoption
      DeviceService.holdPendingDevice({
        id: devId,
        name,
        type,
        manufacturer: 'Tuya Smart Hardware',
        model: productKey,
        protocol: 'tuya_lan',
        integrationId: 'tuya_local_driver',
        ip,
        capabilities,
        initialState,
        metadata: {
          gwId: devId,
          version,
          productKey,
          discoveredVia: 'LAN UDP Broadcast (Port 6666)',
        },
      });
    } catch {
      // Ignored packet parsing error
    }
  }

  /**
   * Infer device type & capabilities from Tuya product signature
   */
  public static inferDeviceProfile(devId: string, productKey: string): {
    type: DeviceType;
    name: string;
    capabilities: Record<string, CapabilityDefinition>;
    initialState: Record<string, any>;
  } {
    const keyLower = productKey.toLowerCase();
    const shortId = devId.slice(-4);

    if (keyLower.includes('pump') || keyLower.includes('motor') || keyLower.includes('water')) {
      return {
        type: 'pump',
        name: `Tuya Water Pump (${shortId})`,
        capabilities: {
          power: { name: 'power', label: 'Pump Power', type: 'boolean', writable: true },
          runtime: { name: 'runtime', label: 'Runtime (Min)', type: 'integer', unit: 'min', writable: false },
          water_flow: { name: 'water_flow', label: 'Flow Rate', type: 'float', unit: 'L/min', writable: false },
        },
        initialState: {
          power: { value: false, commandStatus: 'confirmed', lastUpdated: new Date().toISOString(), isStale: false },
          runtime: { value: 0, commandStatus: 'confirmed', lastUpdated: new Date().toISOString(), isStale: false },
        },
      };
    }

    if (keyLower.includes('light') || keyLower.includes('bulb') || keyLower.includes('rgb')) {
      return {
        type: 'light',
        name: `Tuya Smart Light (${shortId})`,
        capabilities: {
          power: { name: 'power', label: 'Power', type: 'boolean', writable: true },
          brightness: { name: 'brightness', label: 'Brightness', type: 'integer', min: 1, max: 100, unit: '%', writable: true },
        },
        initialState: {
          power: { value: false, commandStatus: 'confirmed', lastUpdated: new Date().toISOString(), isStale: false },
          brightness: { value: 100, commandStatus: 'confirmed', lastUpdated: new Date().toISOString(), isStale: false },
        },
      };
    }

    // Default: Smart Switch / 16A Heavy Duty Relay Plug
    return {
      type: 'switch',
      name: `Tuya Smart Plug (${shortId})`,
      capabilities: {
        power: { name: 'power', label: 'Relay Power', type: 'boolean', writable: true },
        power_draw: { name: 'power_draw', label: 'Power Draw', type: 'float', unit: 'W', writable: false },
        voltage: { name: 'voltage', label: 'Line Voltage', type: 'float', unit: 'V', writable: false },
        current: { name: 'current', label: 'Current', type: 'float', unit: 'mA', writable: false },
      },
      initialState: {
        power: { value: false, commandStatus: 'confirmed', lastUpdated: new Date().toISOString(), isStale: false },
        power_draw: { value: 0, commandStatus: 'confirmed', lastUpdated: new Date().toISOString(), isStale: false },
        voltage: { value: 230, commandStatus: 'confirmed', lastUpdated: new Date().toISOString(), isStale: false },
      },
    };
  }

  /**
   * Map standard IoTNexus capability to Tuya DPS key
   */
  public static mapCapabilityToDps(capability: string, value: any): Record<string, any> {
    switch (capability) {
      case 'power':
        return { '1': Boolean(value) };
      case 'brightness':
        return { '2': Math.round(Number(value) * 10) };
      case 'speed':
        return { '3': Number(value) };
      default:
        return { '1': value };
    }
  }

  /**
   * Map incoming Tuya DPS dictionary to canonical IoTNexus states
   */
  public static mapDpsToCapabilities(dps: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    if (dps['1'] !== undefined) result.power = Boolean(dps['1']);
    if (dps['20'] !== undefined) result.voltage = Number(dps['20']) / 10; // 2300 -> 230.0V
    if (dps['19'] !== undefined) result.power_draw = Number(dps['19']) / 10; // 12500 -> 1250.0W
    if (dps['18'] !== undefined) result.current = Number(dps['18']); // mA
    if (dps['2'] !== undefined && typeof dps['2'] === 'number') result.brightness = Math.round(dps['2'] / 10);

    return result;
  }

  /**
   * Encode a Tuya Local LAN binary frame
   */
  public static encodeFrame(opCode: TuyaOpCode, payload: Buffer, version: string = '3.3'): Buffer {
    this.sequenceNumber = (this.sequenceNumber + 1) % 0xffffffff;

    const payloadLength = payload.length + 8; // payload + 4 bytes CRC + 4 bytes suffix
    const header = Buffer.alloc(16);

    PREFIX_BYTES.copy(header, 0);
    header.writeUInt32BE(this.sequenceNumber, 4);
    header.writeUInt32BE(opCode, 8);
    header.writeUInt32BE(payloadLength, 12);

    // Calculate CRC32 over header + payload
    const crcData = Buffer.concat([header, payload]);
    const crc = this.crc32(crcData);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);

    return Buffer.concat([header, payload, crcBuf, SUFFIX_BYTES]);
  }

  /**
   * Encrypt and send command directly to Tuya device over TCP port 6668
   */
  public static async sendLocalCommand(
    config: TuyaDeviceConfig,
    dps: Record<string, any>
  ): Promise<{ success: boolean; latencyMs: number }> {
    const startTime = Date.now();
    const port = config.port || 6668;
    const version = config.version || '3.3';

    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2500);

      const cleanup = () => {
        socket.removeAllListeners();
        socket.destroy();
      };

      socket.on('error', (err) => {
        cleanup();
        console.warn(`⚠️ [TuyaLocalDriver] Local TCP note for ${config.devId} (${config.ip}):`, err.message);
        resolve({ success: false, latencyMs: Date.now() - startTime });
      });

      socket.on('timeout', () => {
        cleanup();
        resolve({ success: false, latencyMs: Date.now() - startTime });
      });

      socket.connect(port, config.ip, () => {
        try {
          const timestamp = Math.floor(Date.now() / 1000);
          const payloadJson = JSON.stringify({
            devId: config.devId,
            uid: '',
            t: timestamp,
            dps,
          });

          // AES-128-ECB payload encryption using localKey
          let encryptedPayload: Buffer;
          if (config.localKey && config.localKey.length === 16) {
            const cipher = crypto.createCipheriv('aes-128-ecb', Buffer.from(config.localKey, 'utf8'), null);
            cipher.setAutoPadding(true);
            encryptedPayload = Buffer.concat([cipher.update(Buffer.from(payloadJson, 'utf8')), cipher.final()]);
          } else {
            encryptedPayload = Buffer.from(payloadJson, 'utf8');
          }

          // Format 3.3 payload with version header
          const versionHeader = Buffer.from(version);
          const zeroPadding = Buffer.alloc(12, 0);
          const fullPayload = Buffer.concat([versionHeader, zeroPadding, encryptedPayload]);

          const packet = this.encodeFrame(TuyaOpCode.CONTROL, fullPayload, version);
          socket.write(packet);

          cleanup();
          resolve({ success: true, latencyMs: Date.now() - startTime });
        } catch (e: any) {
          cleanup();
          resolve({ success: false, latencyMs: Date.now() - startTime });
        }
      });
    });
  }

  /**
   * Pure CRC32 calculation table
   */
  private static crcTable: Uint32Array | null = null;
  private static crc32(buf: Buffer): number {
    if (!this.crcTable) {
      this.crcTable = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
          c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        this.crcTable[i] = c >>> 0;
      }
    }

    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ this.crcTable[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
}
