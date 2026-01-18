/**
 * Panda & Dog - Game Server
 * WebSocket server for multiplayer coordination
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { RoomManager } from './Room';
import { PROTOCOL } from '../../shared/protocol';
import type { ClientMessage, ServerMessage } from '../../shared/protocol';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Static file serving for production
const STATIC_DIR = join(process.cwd(), '..', 'client', 'dist');
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function serveStaticFile(filePath: string, res: import('http').ServerResponse): boolean {
  const fullPath = join(STATIC_DIR, filePath);

  if (!existsSync(fullPath)) {
    return false;
  }

  try {
    const content = readFileSync(fullPath);
    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

// Create HTTP server for health checks and static files
const httpServer = createServer((req, res) => {
  const url = req.url || '/';

  // Health check endpoint
  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      rooms: roomManager.getRoomCount(),
      connections: wss.clients.size,
    }));
    return;
  }

  // Try to serve static files
  let filePath = url === '/' ? '/index.html' : url;

  // Remove query string
  filePath = filePath.split('?')[0];

  if (serveStaticFile(filePath, res)) {
    return;
  }

  // For SPA routing, serve index.html for non-file paths
  if (!filePath.includes('.')) {
    if (serveStaticFile('/index.html', res)) {
      return;
    }
  }

  res.writeHead(404);
  res.end('Not found');
});

// Create WebSocket server
const wss = new WebSocketServer({ server: httpServer });
const roomManager = new RoomManager();

// Client connection tracking
interface ClientData {
  playerId: string;
  roomCode: string | null;
  lastHeartbeat: number;
}

const clients = new Map<WebSocket, ClientData>();

// Generate unique player ID
let playerIdCounter = 0;
function generatePlayerId(): string {
  return `player_${++playerIdCounter}_${Date.now().toString(36)}`;
}

// Send message to client
function send(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Handle incoming messages
function handleMessage(ws: WebSocket, data: string): void {
  const clientData = clients.get(ws);
  if (!clientData) return;

  let message: ClientMessage;
  try {
    message = JSON.parse(data) as ClientMessage;
  } catch {
    console.error('Invalid JSON from client');
    return;
  }

  switch (message.type) {
    case 'create_room': {
      const result = roomManager.createRoom(clientData.playerId, message.levelId);
      if (result.success) {
        clientData.roomCode = result.roomCode!;
        send(ws, {
          type: 'room_created',
          timestamp: Date.now(),
          roomCode: result.roomCode!,
          qrCodeUrl: result.qrCodeUrl!,
          role: 'dog',  // Creator is always Dog (desktop)
        });
      } else {
        send(ws, {
          type: 'room_error',
          timestamp: Date.now(),
          error: 'connection_failed',
          message: result.error || 'Failed to create room',
        });
      }
      break;
    }

    case 'join_room': {
      const result = roomManager.joinRoom(
        message.roomCode,
        clientData.playerId,
        message.preferredRole
      );

      if (result.success) {
        clientData.roomCode = message.roomCode;
        const room = roomManager.getRoom(message.roomCode);

        send(ws, {
          type: 'room_joined',
          timestamp: Date.now(),
          roomCode: message.roomCode,
          role: result.role!,
          roomState: room!.getRoomState(),
          gameState: room!.getGameState(),
        });

        // Notify other player
        const otherRole = result.role === 'dog' ? 'panda' : 'dog';
        const otherPlayerId = room!.getPlayerByRole(otherRole);
        if (otherPlayerId) {
          const otherWs = findClientByPlayerId(otherPlayerId);
          if (otherWs) {
            send(otherWs, {
              type: 'player_joined',
              timestamp: Date.now(),
              role: result.role!,
            });
          }
        }

        // Start game if both players ready
        if (room!.isFull()) {
          const gameState = room!.startGame();
          broadcastToRoom(message.roomCode, {
            type: 'game_start',
            timestamp: Date.now(),
            gameState,
          });
        }
      } else {
        send(ws, {
          type: 'room_error',
          timestamp: Date.now(),
          error: result.errorCode || 'connection_failed',
          message: result.error || 'Failed to join room',
        });
      }
      break;
    }

    case 'leave_room': {
      if (clientData.roomCode) {
        handlePlayerLeave(ws, clientData);
      }
      break;
    }

    case 'input': {
      if (!clientData.roomCode) return;
      const room = roomManager.getRoom(clientData.roomCode);
      if (!room) return;

      room.handleInput(clientData.playerId, message.tick, message.input, message.position);
      break;
    }

    case 'interact': {
      if (!clientData.roomCode) return;
      const room = roomManager.getRoom(clientData.roomCode);
      if (!room) return;

      const result = room.handleInteraction(
        clientData.playerId,
        message.targetId,
        message.action,
        message.data
      );

      send(ws, {
        type: 'interaction_result',
        timestamp: Date.now(),
        targetId: message.targetId,
        action: message.action,
        success: result.success,
        newState: result.newState,
        reason: result.reason,
      });

      // Broadcast state change if successful
      if (result.success && result.newState) {
        broadcastToRoom(clientData.roomCode, {
          type: 'state_update',
          timestamp: Date.now(),
          tick: room.getTick(),
          entities: room.getEntityStates(),
          interactables: room.getInteractableStates(),
          pings: room.getPings(),
        });
      }
      break;
    }

    case 'ping_marker': {
      if (!clientData.roomCode) return;
      const room = roomManager.getRoom(clientData.roomCode);
      if (!room) return;

      const ping = room.addPing(clientData.playerId, message.position, message.pingType);
      if (ping) {
        broadcastToRoom(clientData.roomCode, {
          type: 'ping_received',
          timestamp: Date.now(),
          ping,
        });
      }
      break;
    }

    case 'clear_ping': {
      if (!clientData.roomCode) return;
      const room = roomManager.getRoom(clientData.roomCode);
      if (!room) return;

      if (room.removePing(message.pingId, clientData.playerId)) {
        broadcastToRoom(clientData.roomCode, {
          type: 'ping_expired',
          timestamp: Date.now(),
          pingId: message.pingId,
        });
      }
      break;
    }

    case 'pause': {
      if (!clientData.roomCode) return;
      const room = roomManager.getRoom(clientData.roomCode);
      if (!room) return;

      const role = room.getPlayerRole(clientData.playerId);
      if (role) {
        room.setPaused(message.paused);
        broadcastToRoom(clientData.roomCode, {
          type: 'game_paused',
          timestamp: Date.now(),
          paused: message.paused,
          pausedBy: role,
        });
      }
      break;
    }

    case 'heartbeat': {
      clientData.lastHeartbeat = Date.now();
      send(ws, {
        type: 'heartbeat_ack',
        timestamp: Date.now(),
        serverTime: Date.now(),
      });
      break;
    }
  }
}

// Find client WebSocket by player ID
function findClientByPlayerId(playerId: string): WebSocket | undefined {
  for (const [ws, data] of clients.entries()) {
    if (data.playerId === playerId) {
      return ws;
    }
  }
  return undefined;
}

// Broadcast message to all players in a room
function broadcastToRoom(roomCode: string, message: ServerMessage): void {
  for (const [ws, data] of clients.entries()) {
    if (data.roomCode === roomCode) {
      send(ws, message);
    }
  }
}

// Handle player leaving/disconnecting
function handlePlayerLeave(ws: WebSocket, clientData: ClientData): void {
  if (!clientData.roomCode) return;

  const room = roomManager.getRoom(clientData.roomCode);
  if (!room) return;

  const role = room.getPlayerRole(clientData.playerId);
  room.removePlayer(clientData.playerId);

  // Notify other player
  if (role) {
    broadcastToRoom(clientData.roomCode, {
      type: 'player_left',
      timestamp: Date.now(),
      role,
      reconnectWindow: PROTOCOL.RECONNECT_WINDOW / 1000,
    });
  }

  // Clean up empty rooms
  if (room.isEmpty()) {
    roomManager.removeRoom(clientData.roomCode);
  }

  clientData.roomCode = null;
}

// WebSocket connection handler
wss.on('connection', (ws: WebSocket) => {
  const playerId = generatePlayerId();
  clients.set(ws, {
    playerId,
    roomCode: null,
    lastHeartbeat: Date.now(),
  });

  console.log(`Client connected: ${playerId}`);

  ws.on('message', (data: Buffer) => {
    handleMessage(ws, data.toString());
  });

  ws.on('close', () => {
    const clientData = clients.get(ws);
    if (clientData) {
      handlePlayerLeave(ws, clientData);
      console.log(`Client disconnected: ${clientData.playerId}`);
    }
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Game tick loop
const TICK_INTERVAL = 1000 / PROTOCOL.SERVER_TICK_RATE;
setInterval(() => {
  for (const [roomCode, room] of roomManager.getRooms()) {
    if (room.isPlaying()) {
      room.tick();

      // Broadcast state updates
      broadcastToRoom(roomCode, {
        type: 'state_update',
        timestamp: Date.now(),
        tick: room.getTick(),
        entities: room.getEntityStates(),
        interactables: room.getInteractableStates(),
        pings: room.getPings(),
        puzzleStates: room.getPuzzleStates(),
      });

      // Check for puzzle completion
      const puzzleUpdates = room.checkPuzzles();
      for (const update of puzzleUpdates) {
        broadcastToRoom(roomCode, {
          type: 'puzzle_update',
          timestamp: Date.now(),
          puzzleId: update.puzzleId,
          objectives: update.objectives,
          completed: update.completed,
        });
      }

      // Check for level completion
      if (room.isLevelComplete()) {
        broadcastToRoom(roomCode, {
          type: 'level_complete',
          timestamp: Date.now(),
          puzzlesCompleted: room.getCompletedPuzzleCount(),
          totalPuzzles: room.getTotalPuzzleCount(),
          timeElapsed: room.getElapsedTime(),
        });
      }
    }
  }
}, TICK_INTERVAL);

// Heartbeat check - disconnect stale clients
setInterval(() => {
  const now = Date.now();
  const timeout = PROTOCOL.HEARTBEAT_INTERVAL * 3;

  for (const [ws, data] of clients.entries()) {
    if (now - data.lastHeartbeat > timeout) {
      console.log(`Client timed out: ${data.playerId}`);
      ws.close();
    }
  }
}, PROTOCOL.HEARTBEAT_INTERVAL);

// Room cleanup - remove stale rooms
setInterval(() => {
  roomManager.cleanupStaleRooms();
}, 60000);  // Every minute

// Start server
httpServer.listen(PORT, HOST, () => {
  console.log(`Panda & Dog server running on ${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
});
// Build timestamp: Sun Jan 18 15:53:43 CET 2026
