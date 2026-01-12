import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { SignalingServer } from './SignalingServer';

dotenv.config();

const app = express();
const server = createServer(app);

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const MAX_PEERS_PER_ROOM = parseInt(process.env.MAX_PEERS_PER_ROOM || '2');
const ROOM_TIMEOUT_MS = parseInt(process.env.ROOM_TIMEOUT_MS || '3600000');

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

const signalingServer = new SignalingServer(server, MAX_PEERS_PER_ROOM, ROOM_TIMEOUT_MS);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/stats', (_req, res) => {
  res.json(signalingServer.getStats());
});

server.listen(PORT, () => {
  console.log(`\nSignaling server running on port ${PORT}`);
  console.log(`CORS enabled for: ${CORS_ORIGIN}`);
  console.log(`Max peers per room: ${MAX_PEERS_PER_ROOM}`);
  console.log(`Room timeout: ${ROOM_TIMEOUT_MS}ms\n`);
});

process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
