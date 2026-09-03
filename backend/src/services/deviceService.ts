import { prisma } from './db.js';
import { wsGateway } from './ws.js';
import type {
  Device,
  DeviceState,
  DeviceCapabilityState,
  CapabilityDefinition,
  PendingDevice,
  ConfirmPendingDeviceDto,
} from '../models/index.js';

export class DeviceService {
  /**
   * Parse DB record into canonical Device object
   */
  static formatDevice(raw: any): Device {
    return {
      id: raw.id,
      name: raw.name,
      type: raw.type,
      manufacturer: raw.manufacturer,
      model: raw.model || undefined,
      protocol: raw.protocol,
      integrationId: raw.integrationId,
      capabilities: typeof raw.capabilities === 'string' ? JSON.parse(raw.capabilities) : raw.capabilities || {},
      state: typeof raw.state === 'string' ? JSON.parse(raw.state) : raw.state || {},
      connectionStatus: raw.connectionStatus,
      homeId: raw.homeId,
      roomId: raw.roomId || undefined,
      room: raw.room || (raw.roomRef ? raw.roomRef.name : undefined),
      isFavorite: raw.isFavorite,
      lastSeen: raw.lastSeen ? raw.lastSeen.toISOString() : undefined,
      metadata: typeof raw.metadata === 'string' ? JSON.parse(raw.metadata) : raw.metadata || {},
    };
  }

  /**
   * Format DB record into canonical PendingDevice object
   */
  static formatPending(raw: any): PendingDevice {
    return {
      id: raw.id,
      name: raw.name,
      type: raw.type,
      manufacturer: raw.manufacturer,
      model: raw.model || undefined,
      protocol: raw.protocol,
      integrationId: raw.integrationId,
      ip: raw.ip || undefined,
      mac: raw.mac || undefined,
      discoveredAt: raw.discoveredAt ? raw.discoveredAt.toISOString() : new Date().toISOString(),
      capabilities: typeof raw.capabilities === 'string' ? JSON.parse(raw.capabilities) : raw.capabilities || {},
      initialState: typeof raw.initialState === 'string' ? JSON.parse(raw.initialState) : raw.initialState || {},
      metadata: typeof raw.metadata === 'string' ? JSON.parse(raw.metadata) : raw.metadata || {},
    };
  }

  /**
   * List all registered devices for a Home
   */
  static async listDevices(homeId: string): Promise<Device[]> {
    const rawDevices = await prisma.device.findMany({
      where: { homeId },
      include: { roomRef: true },
      orderBy: { createdAt: 'asc' },
    });
    return rawDevices.map(this.formatDevice);
  }

  /**
   * Get a single device by ID
   */
  static async getDevice(id: string): Promise<Device | null> {
    const raw = await prisma.device.findUnique({
      where: { id },
      include: { roomRef: true },
    });
    return raw ? this.formatDevice(raw) : null;
  }

  /**
   * Send a command to a device, updating local DB state and broadcasting via WS
   */
  static async sendCommand(
    deviceId: string,
    capability: string,
    value: boolean | number | string
  ): Promise<Device> {
    const existing = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!existing) {
      throw new Error(`Device with ID ${deviceId} not found`);
    }

    const state: DeviceState = typeof existing.state === 'string' ? JSON.parse(existing.state) : existing.state || {};
    const nowIso = new Date().toISOString();

    state[capability] = {
      value,
      commandStatus: 'confirmed',
      lastUpdated: nowIso,
      isStale: false,
    };

    const updated = await prisma.device.update({
      where: { id: deviceId },
      data: {
        state: JSON.stringify(state),
        lastSeen: new Date(),
      },
      include: { roomRef: true },
    });

    const formatted = this.formatDevice(updated);

    // Save telemetry point
    await prisma.telemetry.create({
      data: {
        deviceId,
        capability,
        valueBoolean: typeof value === 'boolean' ? value : null,
        valueNumber: typeof value === 'number' ? value : null,
        valueString: typeof value === 'string' ? value : null,
        timestamp: new Date(),
      },
    });

    // Broadcast state change over WebSocket Gateway
    wsGateway.broadcast('device_state_changed', {
      deviceId,
      capability,
      value,
      state: formatted.state,
      lastUpdated: nowIso,
    });

    return formatted;
  }

  /**
   * Handle incoming state from an adapter (MQTT or LAN)
   */
  static async handleIncomingState(
    deviceId: string,
    capability: string,
    value: boolean | number | string
  ): Promise<void> {
    const existing = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!existing) return;

    const state: DeviceState = typeof existing.state === 'string' ? JSON.parse(existing.state) : existing.state || {};
    const nowIso = new Date().toISOString();

    state[capability] = {
      value,
      commandStatus: 'confirmed',
      lastUpdated: nowIso,
      isStale: false,
    };

    const updated = await prisma.device.update({
      where: { id: deviceId },
      data: {
        state: JSON.stringify(state),
        lastSeen: new Date(),
        connectionStatus: 'online',
      },
      include: { roomRef: true },
    });

    wsGateway.broadcast('device_state_changed', {
      deviceId,
      capability,
      value,
      state: JSON.parse(updated.state),
      lastUpdated: nowIso,
    });
  }

  /**
   * Handle incoming device availability ("online" | "offline")
   */
  static async handleIncomingAvailability(
    deviceId: string,
    status: 'online' | 'offline'
  ): Promise<void> {
    const existing = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!existing) return;

    await prisma.device.update({
      where: { id: deviceId },
      data: {
        connectionStatus: status,
        lastSeen: status === 'online' ? new Date() : undefined,
      },
    });

    wsGateway.broadcast('device_availability_changed', {
      deviceId,
      connectionStatus: status,
    });
  }

  /**
   * Hold unassigned device in Pending Devices queue
   */
  static async holdPendingDevice(data: Omit<PendingDevice, 'discoveredAt'>): Promise<PendingDevice> {
    const raw = await prisma.pendingDevice.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        name: data.name,
        type: data.type,
        manufacturer: data.manufacturer,
        model: data.model || null,
        protocol: data.protocol,
        integrationId: data.integrationId,
        ip: data.ip || null,
        mac: data.mac || null,
        capabilities: JSON.stringify(data.capabilities || {}),
        initialState: JSON.stringify(data.initialState || {}),
        metadata: JSON.stringify(data.metadata || {}),
      },
      update: {
        name: data.name,
        ip: data.ip || null,
        mac: data.mac || null,
        capabilities: JSON.stringify(data.capabilities || {}),
        initialState: JSON.stringify(data.initialState || {}),
      },
    });

    const formatted = this.formatPending(raw);
    wsGateway.broadcast('device_discovered', { device: formatted });
    return formatted;
  }

  /**
   * List all pending discovered devices
   */
  static async listPendingDevices(): Promise<PendingDevice[]> {
    const raw = await prisma.pendingDevice.findMany({
      orderBy: { discoveredAt: 'desc' },
    });
    return raw.map(this.formatPending);
  }

  /**
   * Confirm and adopt a pending device into an active Home and Room
   */
  static async confirmPendingDevice(
    pendingId: string,
    dto: ConfirmPendingDeviceDto
  ): Promise<Device> {
    const pending = await prisma.pendingDevice.findUnique({ where: { id: pendingId } });
    if (!pending) {
      throw new Error(`Pending device with ID ${pendingId} not found`);
    }

    const deviceName = dto.name || pending.name;
    const capabilities = pending.capabilities;
    const initialState = pending.initialState;

    // Create active Device
    const created = await prisma.device.create({
      data: {
        id: pending.id,
        name: deviceName,
        type: pending.type,
        manufacturer: pending.manufacturer,
        model: pending.model,
        protocol: pending.protocol,
        integrationId: pending.integrationId,
        capabilities,
        state: initialState,
        connectionStatus: 'online',
        homeId: dto.homeId,
        roomId: dto.roomId || null,
        room: dto.room || null,
        isFavorite: dto.isFavorite ?? false,
        lastSeen: new Date(),
        metadata: pending.metadata,
      },
      include: { roomRef: true },
    });

    // Remove from pending queue
    await prisma.pendingDevice.delete({ where: { id: pendingId } });

    const formatted = this.formatDevice(created);
    wsGateway.broadcast('device_adopted', { device: formatted });
    return formatted;
  }

  /**
   * Delete a device
   */
  static async deleteDevice(id: string): Promise<boolean> {
    await prisma.device.delete({ where: { id } });
    return true;
  }
}
