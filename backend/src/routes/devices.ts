import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DeviceService } from '../services/deviceService.js';
import { prisma } from '../services/db.js';

export async function deviceRoutes(fastify: FastifyInstance) {
  // 1. List active devices for a home
  fastify.get('/', async (request) => {
    const query = request.query as { homeId?: string };
    const homeId = query.homeId || 'home_flurry_1';

    let devices = await DeviceService.listDevices(homeId);

    // Auto-seed default baseline devices if home is brand new
    if (devices.length === 0) {
      const nowIso = new Date().toISOString();
      const pump = await prisma.device.create({
        data: {
          id: 'dev_borewell_pump_1',
          name: 'Borewell Submersible Pump',
          type: 'pump',
          manufacturer: 'Smart CodeFlurry Motor Panel',
          model: 'HP3-415V-PRO',
          protocol: 'mqtt',
          integrationId: 'esphome_starter',
          capabilities: JSON.stringify({
            power: { name: 'power', label: 'Motor Power', type: 'boolean', writable: true },
            power_draw: { name: 'power_draw', label: 'Active Power', type: 'float', unit: 'W', writable: false },
            voltage: { name: 'voltage', label: 'Line Voltage', type: 'float', unit: 'V', writable: false },
            current: { name: 'current', label: 'Phase Current', type: 'float', unit: 'A', writable: false },
          }),
          state: JSON.stringify({
            power: { value: false, commandStatus: 'confirmed', lastUpdated: nowIso, isStale: false },
            power_draw: { value: 0, commandStatus: 'confirmed', lastUpdated: nowIso, isStale: false },
            voltage: { value: 232.4, commandStatus: 'confirmed', lastUpdated: nowIso, isStale: false },
            current: { value: 0, commandStatus: 'confirmed', lastUpdated: nowIso, isStale: false },
          }),
          connectionStatus: 'online',
          homeId,
          room: 'Utility Area',
          isFavorite: true,
          lastSeen: new Date(),
        },
      });

      const tank = await prisma.device.create({
        data: {
          id: 'dev_overhead_tank_1',
          name: 'Overhead Water Tank (1500L)',
          type: 'water_sensor',
          manufacturer: 'Smart CodeFlurry Ultrasonic Sensor',
          model: 'US-LEVEL-PRO',
          protocol: 'mqtt',
          integrationId: 'esphome_tank',
          capabilities: JSON.stringify({
            level: { name: 'level', label: 'Tank Water Level', type: 'percentage', unit: '%', writable: false },
            volume: { name: 'volume', label: 'Available Litres', type: 'integer', unit: 'L', writable: false },
          }),
          state: JSON.stringify({
            level: { value: 78, commandStatus: 'confirmed', lastUpdated: nowIso, isStale: false },
            volume: { value: 1170, commandStatus: 'confirmed', lastUpdated: nowIso, isStale: false },
          }),
          connectionStatus: 'online',
          homeId,
          room: 'Rooftop',
          isFavorite: true,
          lastSeen: new Date(),
        },
      });

      devices = [DeviceService.formatDevice(pump), DeviceService.formatDevice(tank)];
    }

    return { success: true, devices };
  });

  // 2. Get single device
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const device = await DeviceService.getDevice(id);
    if (!device) {
      return reply.status(404).send({ success: false, message: 'Device not found' });
    }
    return { success: true, device };
  });

  // 3. Send command to device (e.g. power on/off, brightness, color)
  fastify.post('/:id/cmd', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      capability: z.string(),
      value: z.union([z.boolean(), z.number(), z.string()]),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.format() });
    }

    try {
      const updated = await DeviceService.sendCommand(id, parsed.data.capability, parsed.data.value);
      return { success: true, device: updated };
    } catch (e: any) {
      return reply.status(404).send({ success: false, message: e.message });
    }
  });

  // 4. List pending discovered devices
  fastify.get('/pending', async () => {
    const pending = await DeviceService.listPendingDevices();
    return { success: true, pending };
  });

  // 5. Confirm and adopt a pending device into an active Home & Room
  fastify.post('/pending/:id/confirm', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      name: z.string().optional(),
      homeId: z.string().default('home_flurry_1'),
      roomId: z.string().optional(),
      room: z.string().optional(),
      isFavorite: z.boolean().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.format() });
    }

    try {
      const adopted = await DeviceService.confirmPendingDevice(id, parsed.data);
      return { success: true, device: adopted };
    } catch (e: any) {
      return reply.status(400).send({ success: false, message: e.message });
    }
  });

  // 6. Delete a device
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await DeviceService.deleteDevice(id);
      return { success: true, message: 'Device removed' };
    } catch (e: any) {
      return reply.status(404).send({ success: false, message: e.message });
    }
  });
}
