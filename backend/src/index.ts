import { buildApp } from './app.js';
import { env } from './config/env.js';
import { initDb } from './services/db.js';

async function start() {
  try {
    await initDb();
    const app = await buildApp();

    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`================================================================`);
    console.log(` iotnexus Fastify Backend Core running on http://${env.HOST}:${env.PORT}`);
    console.log(` Live WebSocket Gateway: ws://${env.HOST}:${env.PORT}/ws`);
    console.log(` REST API Base: http://${env.HOST}:${env.PORT}/api`);
    console.log(` ZERO Tuya SDK/Cloud dependencies active.`);
    console.log(`================================================================`);
  } catch (err) {
    console.error('Fatal backend bootstrap error:', err);
    process.exit(1);
  }
}

start();
