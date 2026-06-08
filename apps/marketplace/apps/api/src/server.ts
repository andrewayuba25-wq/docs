import http from 'node:http';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { Server as SocketServer } from 'socket.io';

import { config } from './lib/config.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.routes.js';
import { meRouter } from './routes/me.routes.js';
import { artisanRouter } from './routes/artisan.routes.js';
import { makeBookingRouter } from './routes/booking.routes.js';
import { makeChatRouter } from './routes/chat.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { RealtimeBus } from './realtime/bus.js';

export function buildApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger }));

  const server = http.createServer(app);
  const io = new SocketServer(server, {
    cors: { origin: config.corsOrigins, credentials: true },
  });
  const bus = new RealtimeBus(io);

  app.get('/health', (_req, res) => res.json({ ok: true, env: config.NODE_ENV }));

  app.use('/v1/auth', authRouter);
  app.use('/v1/me', meRouter);
  app.use('/v1', artisanRouter);
  app.use('/v1/bookings', makeBookingRouter(bus));
  app.use('/v1/threads', makeChatRouter(bus));
  app.use('/v1/admin', adminRouter);

  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }));
  app.use(errorHandler);

  return { app, server, io };
}

if (process.env.NODE_ENV !== 'test') {
  const { server } = buildApp();
  server.listen(config.API_PORT, () => {
    logger.info({ port: config.API_PORT }, `API listening`);
  });
}
