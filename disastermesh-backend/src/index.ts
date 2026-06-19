import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import os from 'os';


import { env } from './config/env';
import { connectMongoDB } from './config/mongodb';
import { connectNeo4j, closeNeo4j } from './config/neo4j';
import { generalLimiter } from './middleware/rateLimit.middleware';
import routes from './routes/index';
import { setupSocket } from './socket/index';

const app = express();
const httpServer = createServer(app);

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: env.NODE_ENV === 'production' ? env.CORS_ORIGIN : '*',
    methods: ['GET', 'POST'],
    credentials: env.NODE_ENV === 'production',
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});
setupSocket(io);

// ─── Security & Middleware ────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", 'https://api.sarvam.ai'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: env.NODE_ENV === 'production'
      ? [env.CORS_ORIGIN, 'http://localhost:3000']
      : true, // allow all origins in dev (needed for Expo phone connections)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(generalLimiter);

// ─── Health Check (Render keep-alive) ────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/', (_, res) => res.json({ app: 'DisasterMesh API', version: '1.0.0' }));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1', routes);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
const start = async () => {
  await connectMongoDB();
  await connectNeo4j();

  httpServer.listen(env.PORT, '0.0.0.0', () => {
    // Find LAN IP for phone connection
    const nets = os.networkInterfaces();
    const lanIp = Object.values(nets).flat().find(
      (n) => n?.family === 'IPv4' && !n.internal && n.address.startsWith('10.')
    )?.address || 'localhost';
    console.log(`🚀 DisasterMesh API on port ${env.PORT}`);
    console.log(`   Local:   http://localhost:${env.PORT}`);
    console.log(`   Network: http://${lanIp}:${env.PORT}  ← use this in app .env`);
    console.log(`   Env: ${env.NODE_ENV}`);
  });
};

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\nShutting down gracefully...');
  await closeNeo4j();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
