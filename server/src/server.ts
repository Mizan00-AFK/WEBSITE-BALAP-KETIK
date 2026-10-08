/**
 * Balap Ketik server
 *
 *   Browser -> React -> Phaser -> Socket.IO -> Node.js -> in-memory game state
 *
 * THIS SERVER DOES NOT USE A DATABASE. Rooms live in a Map inside this process;
 * restarting the server clears every room. That is intentional.
 */
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import express from 'express';
import { Server } from 'socket.io';
import { GAME_CONFIG } from '@shared/gameConfig';
import { SERVER_CONFIG } from './config';
import { RaceManager } from './game/RaceManager';
import { RoomManager } from './game/RoomManager';
import { createGuard } from './socket/guard';
import { registerRaceSocket } from './socket/raceSocket';
import { registerRoomSocket } from './socket/roomSocket';
import type { GameServer } from './types';
import { logger } from './utils/logger';
import { RateLimiter } from './utils/rateLimiter';

const app = express();
app.disable('x-powered-by');

const httpServer = createServer(app);

const io: GameServer = new Server(httpServer, {
  cors: {
    // In development any origin may connect (LAN / phone testing).
    origin: SERVER_CONFIG.isProduction ? SERVER_CONFIG.clientUrls : true,
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: GAME_CONFIG.maxPayloadBytes,
  pingInterval: 10_000,
  pingTimeout: 8_000,
});

const rooms = new RoomManager(io);
const races = new RaceManager(io, rooms);

io.on('connection', (socket) => {
  socket.data = { playerId: null, roomCode: null, limiter: new RateLimiter() };
  const on = createGuard(socket);
  registerRoomSocket(socket, on, rooms, races);
  registerRaceSocket(socket, on, rooms, races);
});

// ---------------------------------------------------------------- HTTP routes

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    database: false,
    uptime: Math.round(process.uptime()),
    ...rooms.stats,
  });
});

const indexHtml = path.join(SERVER_CONFIG.clientDist, 'index.html');
if (existsSync(indexHtml)) {
  // Production: serve the built React client from the same origin.
  app.use(express.static(SERVER_CONFIG.clientDist, { index: false, maxAge: '1h' }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    res.sendFile(indexHtml);
  });
  logger.info(`Serving client from ${SERVER_CONFIG.clientDist}`);
} else {
  app.get('/', (_req, res) => {
    res
      .type('text/plain')
      .send('Server Balap Ketik berjalan. Buka client lewat npm run dev -> http://localhost:5173');
  });
}

httpServer.listen(SERVER_CONFIG.port, () => {
  logger.info(`Balap Ketik server listening on http://localhost:${SERVER_CONFIG.port}`);
  logger.info('No database: all rooms are stored in memory and vanish on restart.');
});

const shutdown = () => {
  logger.info('Shutting down - clearing all rooms from memory.');
  rooms.shutdown();
  io.close();
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
