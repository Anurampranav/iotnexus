/**
 * Coolify Automation & Telemetry Engine (Client-side)
 * Connects to your Coolify Server's WebSocket stream (/ws)
 * Receives <15ms device-to-device triggers and state updates.
 */

import { useDeviceStore } from '@store/deviceStore';
import type { Device } from '@models/device';

export class CoolifyAutomationEngine {
  private static ws: WebSocket | null = null;
  private static serverWsUrl = 'ws://127.0.0.1:3000/ws';
  private static isConnected = false;
  private static reconnectTimer: any = null;

  static setServerUrl(url: string) {
    this.serverWsUrl = url;
    this.reconnect();
  }

  static connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.serverWsUrl);

      this.ws.onopen = () => {
        console.log('[Coolify Engine] Connected to Coolify Cloud WebSocket stream');
        this.isConnected = true;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'DEVICE_UPDATED' && data.device) {
            this.handleDeviceUpdate(data.device);
          } else if (data.type === 'INITIAL_STATE' && Array.isArray(data.devices)) {
            data.devices.forEach((dev: Device) => this.handleDeviceUpdate(dev));
          }
        } catch (e) {
          console.warn('[Coolify Engine] WS message parse error:', e);
        }
      };

      this.ws.onerror = (e) => {
        console.warn('[Coolify Engine] WS connection error (will reconnect)');
        this.isConnected = false;
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.scheduleReconnect();
      };
    } catch (err) {
      console.warn('[Coolify Engine] WS init error:', err);
      this.scheduleReconnect();
    }
  }

  private static handleDeviceUpdate(device: Device) {
    useDeviceStore.setState((state) => {
      const exists = state.devices.some((d) => d.id === device.id);
      if (exists) {
        return {
          devices: state.devices.map((d) => (d.id === device.id ? { ...d, ...device } : d)),
        };
      } else {
        return {
          devices: [device, ...state.devices],
        };
      }
    });
  }

  private static scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 5000);
  }

  static reconnect() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
    }
    this.connect();
  }
}
