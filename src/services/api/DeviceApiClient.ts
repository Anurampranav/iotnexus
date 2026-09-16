/**
 * Clean Device API Client — Smart CodeFlurry
 * Connects directly to Fastify Backend Core (REST + WebSocket)
 * Zero Tuya SDK / Cloud dependencies.
 */

import type { Device, DeviceCommand, PendingDevice, ConfirmPendingDeviceDto } from '@models/index';
import type { AutomationRule } from '@models/automation';
import type { AppNotification } from '@models/notification';
import { useSettingsStore } from '@store/settingsStore';

export interface BackendConfig {
  baseUrl: string; // e.g. http://192.168.1.26:3000 or http://10.0.2.2:3000
  wsUrl: string;   // e.g. ws://192.168.1.26:3000/ws
  token?: string;
}

class DeviceApiClient {
  /**
   * Optional manual override. When null, URL is read from settingsStore at runtime.
   * This lets the user change the backend IP from the Settings screen without restarting.
   */
  private manualBaseUrl: string | null = null;

  /**
   * Returns the active backend base URL.
   * Priority: manualOverride > settingsStore.backendUrl > LAN fallback
   */
  private getBaseUrl(): string {
    if (this.manualBaseUrl) return this.manualBaseUrl;
    const stored = useSettingsStore.getState().backendUrl;
    if (stored && stored.length > 0) return stored;
    // No URL configured — operate in standalone/local mode (no backend)
    return '';
  }

  configure(newUrl: string) {
    this.manualBaseUrl = newUrl.trim() || null;
  }

  getConfig(): { baseUrl: string } {
    return { baseUrl: this.getBaseUrl() };
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const token = useSettingsStore.getState().backendUrl; // extend later for auth token
    return headers;
  }

  // ─── Devices ─────────────────────────────────────────────────────────────

  async fetchDevices(homeId = 'home_flurry_1'): Promise<Device[]> {
    const base = this.getBaseUrl();
    if (!base) return [];
    try {
      const res = await fetch(`${base}/api/devices?homeId=${homeId}`, {
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
    const base = this.getBaseUrl();
    if (!base) return null;
    try {
      const res = await fetch(`${base}/api/devices/${id}`, {
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
    const base = this.getBaseUrl();
    if (!base) return null;
    try {
      const res = await fetch(`${base}/api/devices/${deviceId}/cmd`, {
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
    const base = this.getBaseUrl();
    if (!base) return [];
    try {
      const res = await fetch(`${base}/api/devices/pending`, {
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
    const base = this.getBaseUrl();
    if (!base) return null;
    try {
      const res = await fetch(`${base}/api/devices/pending/${id}/confirm`, {
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
    const base = this.getBaseUrl();
    if (!base) return false;
    try {
      const res = await fetch(`${base}/api/devices/${id}`, {
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
    const base = this.getBaseUrl();
    if (!base) return [];
    try {
      const res = await fetch(`${base}/api/automations?homeId=${homeId}`, {
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
    const base = this.getBaseUrl();
    if (!base) return false;
    try {
      const res = await fetch(`${base}/api/automations/${id}/toggle`, {
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
    const base = this.getBaseUrl();
    if (!base) return [];
    try {
      const res = await fetch(`${base}/api/notifications`, {
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
    const base = this.getBaseUrl();
    if (!base) return false;
    try {
      const res = await fetch(`${base}/api/notifications/${id}/read`, {
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
