import mongoose from 'mongoose';
import { env } from '../config/env.js';

const DB_STATES = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

export const getHealth = (req, res) => {
  const database = DB_STATES[mongoose.connection.readyState] ?? 'unknown';
  const healthy = database === 'connected';

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    service: 'shopnest-api',
    environment: env.nodeEnv,
    database,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};