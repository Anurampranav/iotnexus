/**
 * Clean Device API Client — Smart CodeFlurry
 * Connects directly to Fastify Backend Core (REST + WebSocket)
 * Zero Tuya SDK / Cloud dependencies.
 */

import type { Device, DeviceCommand, PendingDevice, ConfirmPendingDeviceDto } from '@models/index';
import type { AutomationRule } from '@models/automation';
import type { AppNotification } from '@models/notification';

export interface BackendConfig {
  baseUrl: string; // e.g. http://192.168.1.26:3000 or http://10.0.2.2:3000
  wsUrl: string;   // e.g. ws://192.168.1.26:3000/ws
  token?: string;
}

class DeviceApiClient {
  private config: BackendConfig = {
    baseUrl: 'http://192.168.1.26:3000',
    wsUrl: 'ws://192.168.1.26:3000/ws',
  };

  configure(newConfig: Partial<BackendConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): BackendConfig {
    return this.config;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.config.token) {
      headers['Authorization'] = `Bearer ${this.config.token}`;
    }
    return headers;
  }

  // ─── Devices ─────────────────────────────────────────────────────────────

  async fetchDevices(homeId = 'home_flurry_1'): Promise<Device[]> {
    try {
      const res = await fetch(`${this.config.baseUrl}/api/devices?homeId=${homeId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.devices || [];
    } catch (err) {
      console.warn('[DeviceApiClient] fetchDevices error, returning empty list:', err);
      return [];
    }
  }

  async getDevice(id: string): Promise<Device | null> {
    try {
      const res = await fetch(`${this.config.baseUrl}/api/devices/${id}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.device || null;
    } catch {
      return null;
    }
  }

  async sendCommand(deviceId: string, capability: string, value: boolean | number | string): Promise<Device | null> {
    try {
      const res = await fetch(`${this.config.baseUrl}/api/devices/${deviceId}/cmd`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ capability, value }),
      });
      if (!res.ok) throw new Error(`Command failed: HTTP ${res.status}`);
      const data = await res.json();
      return data.device || null;
    } catch (err) {
      console.warn('[DeviceApiClient] sendCommand error:', err);
      return null;
    }
  }

  // ─── Effortless Pairing (Pending Devices) ──────────────────────────────────

  async fetchPendingDevices(): Promise<PendingDevice[]> {
    try {
      const res = await fetch(`${this.config.baseUrl}/api/devices/pending`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.pending || [];
    } catch (err) {
      console.warn('[DeviceApiClient] fetchPendingDevices error:', err);
      return [];
    }
  }

  async confirmPendingDevice(id: string, dto: ConfirmPendingDeviceDto): Promise<Device | null> {
    try {
      const res = await fetch(`${this.config.baseUrl}/api/devices/pending/${id}/confirm`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new Error(`Adoption failed: HTTP ${res.status}`);
      const data = await res.json();
      return data.device || null;
    } catch (err) {
      console.warn('[DeviceApiClient] confirmPendingDevice error:', err);
      return null;
    }
  }

  async deleteDevice(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.baseUrl}/api/devices/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ─── Automations ──────────────────────────────────────────────────────────

  async fetchAutomations(homeId = 'home_flurry_1'): Promise<AutomationRule[]> {
    try {
      const res = await fetch(`${this.config.baseUrl}/api/automations?homeId=${homeId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.rules || [];
    } catch {
      return [];
    }
  }

  async toggleAutomation(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.baseUrl}/api/automations/${id}/toggle`, {
        method: 'PATCH',
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ─── Notifications ────────────────────────────────────────────────────────

  async fetchNotifications(): Promise<AppNotification[]> {
    try {
      const res = await fetch(`${this.config.baseUrl}/api/notifications`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.notifications || [];
    } catch {
      return [];
    }
  }

  async markNotificationRead(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.baseUrl}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const deviceApiClient = new DeviceApiClient();
