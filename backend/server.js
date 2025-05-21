import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173','http://localhost:5174', 'http://192.168.0.55:3000', 'http://192.168.0.38:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173','http://localhost:5174', 'http://192.168.0.55:3000', 'http://192.168.0.38:3000'],
  methods: ['GET', 'POST'],
  credentials: true,
}));

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('offer', (data) => socket.broadcast.emit('offer', data));
  socket.on('answer', (data) => socket.broadcast.emit('answer', data));
  socket.on('ice-candidate', (data) => socket.broadcast.emit('ice-candidate', data));
  socket.on('form-update', (data) => socket.broadcast.emit('form-update', data));
  socket.on('form-submit', (data) => socket.broadcast.emit('form-submit', data));
  socket.on('screen-shared', () => socket.broadcast.emit('screen-shared'));
  socket.on('screen-ended', () => socket.broadcast.emit('screen-ended'));
  socket.on('end-call', () => socket.broadcast.emit('end-call'));
  socket.on('trigger-start-call', () => socket.broadcast.emit('trigger-start-call'));
  socket.on('agent-form-submitted', () => socket.broadcast.emit('agent-form-submitted'));
  socket.on('call-summary', (data) => socket.broadcast.emit('call-summary', data));

  socket.on('disconnect', () => console.log('User disconnected:', socket.id));
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));