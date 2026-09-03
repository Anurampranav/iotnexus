import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().default('file:./dev.db'),
  JWT_SECRET: z.string().default('smartcodeflurry_jwt_secret_dev_key_2026_super_secure'),
  MQTT_BROKER_URL: z.string().default('mqtt://127.0.0.1:1883'),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.string().default('info'),
});

export const env = envSchema.parse(process.env);
