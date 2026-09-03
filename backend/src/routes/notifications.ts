import type { FastifyInstance } from 'fastify';
import { prisma } from '../services/db.js';
import type { AppNotification } from '../models/index.js';

export async function notificationRoutes(fastify: FastifyInstance) {
  // List notifications
  fastify.get('/', async () => {
    let raw = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (raw.length === 0) {
      const n1 = await prisma.notification.create({
        data: {
          title: 'System Initialized',
          body: 'Smart CodeFlurry Backend Core connected with zero Tuya cloud dependencies.',
          severity: 'info',
          read: false,
        },
      });
      raw = [n1];
    }

    const notifications: AppNotification[] = raw.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      severity: n.severity as any,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
      deviceId: n.deviceId || undefined,
      actionRoute: n.actionRoute || undefined,
    }));

    return { success: true, notifications };
  });

  // Mark notification as read
  fastify.patch('/:id/read', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const updated = await prisma.notification.update({
        where: { id },
        data: { read: true },
      });
      return { success: true, notification: updated };
    } catch {
      return reply.status(404).send({ success: false, message: 'Notification not found' });
    }
  });
}
