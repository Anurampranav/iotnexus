import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../services/db.js';

export async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post('/register', async (request, reply) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string().min(2),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.format() });
    }

    const { email, password, name } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    });

    // Create default Home
    const home = await prisma.home.create({
      data: {
        name: `${name}'s Home`,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'owner',
          },
        },
        rooms: {
          createMany: {
            data: [
              { name: 'Living Room', icon: 'sofa' },
              { name: 'Kitchen', icon: 'stove' },
              { name: 'Utility Area', icon: 'water-pump' },
              { name: 'Rooftop', icon: 'home-roof' },
            ],
          },
        },
      },
    });

    const token = fastify.jwt.sign({ userId: user.id, email: user.email });

    return {
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt.toISOString() },
      defaultHomeId: home.id,
    };
  });

  // Login
  fastify.post('/login', async (request, reply) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.format() });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        homes: {
          include: { home: true },
        },
      },
    });

    if (!user) {
      return reply.status(401).send({ success: false, message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ success: false, message: 'Invalid credentials' });
    }

    const token = fastify.jwt.sign({ userId: user.id, email: user.email });
    const defaultHomeId = user.homes[0]?.homeId || 'home_flurry_1';

    return {
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt.toISOString() },
      defaultHomeId,
    };
  });

  // Current user info
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request) => {
    const userPayload = request.user as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: userPayload.userId },
      include: {
        homes: {
          include: { home: true },
        },
      },
    });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    return {
      success: true,
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt.toISOString() },
      homes: user.homes.map((h) => ({
        id: h.home.id,
        name: h.home.name,
        role: h.role,
      })),
    };
  });
}
