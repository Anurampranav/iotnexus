import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { env } from './config/env.js';
import { wsGateway } from './services/ws.js';
import { authRoutes } from './routes/auth.js';
import { homeRoutes } from './routes/homes.js';
import { deviceRoutes } from './routes/devices.js';
import { automationRoutes } from './routes/automations.js';
import { notificationRoutes } from './routes/notifications.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  // CORS
  await fastify.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // JWT
  await fastify.register(jwt, {
    secret: env.JWT_SECRET,
  });

  // Decorate fastify with authenticate method
  fastify.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  // WebSocket Plugin
  await fastify.register(websocket);

  // WebSocket Route
  fastify.register(async function (fastifyInstance) {
    fastifyInstance.get('/ws', { websocket: true }, (socket, req) => {
      fastify.log.info('[WebSocket] Client connected to live telemetry stream');
      wsGateway.registerClient(socket);
    });
  });

  // Health Check
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      service: 'iotnexus-backend',
      timestamp: new Date().toISOString(),
      wsClients: wsGateway.getClientCount(),
    };
  });

  // API Routes
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(homeRoutes, { prefix: '/api/homes' });
  await fastify.register(deviceRoutes, { prefix: '/api/devices' });
  await fastify.register(automationRoutes, { prefix: '/api/automations' });
  await fastify.register(notificationRoutes, { prefix: '/api/notifications' });

  return fastify;
}
