import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../services/db.js';

export async function homeRoutes(fastify: FastifyInstance) {
  // List user's homes
  fastify.get('/', async (request) => {
    let homes = await prisma.home.findMany({
      include: {
        rooms: {
          include: {
            devices: { select: { id: true } },
          },
        },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    // Auto-seed default home if database is fresh
    if (homes.length === 0) {
      const defaultHome = await prisma.home.create({
        data: {
          id: 'home_flurry_1',
          name: 'Vivaan Smart Residence',
          ownerId: 'user_master',
          rooms: {
            createMany: {
              data: [
                { id: 'room_living', name: 'Living Room', icon: 'sofa' },
                { id: 'room_kitchen', name: 'Kitchen', icon: 'stove' },
                { id: 'room_utility', name: 'Utility Area', icon: 'water-pump' },
                { id: 'room_rooftop', name: 'Rooftop', icon: 'home-roof' },
              ],
            },
          },
        },
        include: {
          rooms: {
            include: {
              devices: { select: { id: true } },
            },
          },
          members: true,
        },
      });
      homes = [defaultHome as any];
    }

    return {
      success: true,
      homes: homes.map((h) => ({
        id: h.id,
        name: h.name,
        ownerId: h.ownerId,
        rooms: h.rooms.map((r) => ({
          id: r.id,
          name: r.name,
          homeId: r.homeId,
          icon: r.icon || undefined,
          deviceCount: r.devices ? r.devices.length : 0,
        })),
        members: h.members.map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          user: m.user,
        })),
      })),
    };
  });

  // Create new Room in a Home
  fastify.post('/:homeId/rooms', async (request, reply) => {
    const { homeId } = request.params as { homeId: string };
    const schema = z.object({
      name: z.string().min(1),
      icon: z.string().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.format() });
    }

    const room = await prisma.room.create({
      data: {
        name: parsed.data.name,
        icon: parsed.data.icon || 'home',
        homeId,
      },
    });

    return { success: true, room };
  });

  // Add member to Home
  fastify.post('/:homeId/members', async (request, reply) => {
    const { homeId } = request.params as { homeId: string };
    const schema = z.object({
      email: z.string().email(),
      role: z.enum(['owner', 'member', 'guest']).default('member'),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.format() });
    }

    const targetUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!targetUser) {
      return reply.status(404).send({ success: false, message: 'User with this email not found' });
    }

    const member = await prisma.homeMember.upsert({
      where: { homeId_userId: { homeId, userId: targetUser.id } },
      create: {
        homeId,
        userId: targetUser.id,
        role: parsed.data.role,
      },
      update: {
        role: parsed.data.role,
      },
    });

    return { success: true, member };
  });
}
