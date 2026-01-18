/**
 * Panda & Dog - Network Protocol
 * Message types for WebSocket communication
 */

import type {
  Role,
  InputState,
  GameState,
  EntityState,
  InteractableState,
  PingMarker,
  PingType,
  RoomState,
  WorldPos,
  PuzzleState,
} from './types';

// ============================================
// Message Base
// ============================================

export interface BaseMessage {
  type: string;
  timestamp: number;
}

// ============================================
// Client -> Server Messages
// ============================================

export interface CreateRoomMessage extends BaseMessage {
  type: 'create_room';
  levelId: string;
}

export interface JoinRoomMessage extends BaseMessage {
  type: 'join_room';
  roomCode: string;
  preferredRole?: Role;
}

export interface LeaveRoomMessage extends BaseMessage {
  type: 'leave_room';
}

export interface InputMessage extends BaseMessage {
  type: 'input';
  tick: number;
  input: InputState;
  position: WorldPos;  // Client's predicted position for reconciliation
}

export interface InteractMessage extends BaseMessage {
  type: 'interact';
  targetId: string;
  action: string;
  data?: Record<string, unknown>;
}

export interface PingMessage extends BaseMessage {
  type: 'ping_marker';
  position: WorldPos;
  pingType: PingType;
}

export interface ClearPingMessage extends BaseMessage {
  type: 'clear_ping';
  pingId: string;
}

export interface SurveillanceMessage extends BaseMessage {
  type: 'surveillance';
  enabled: boolean;
  cameraNodeId?: string;  // If viewing specific camera
}

export interface ReadyMessage extends BaseMessage {
  type: 'ready';
}

export interface PauseMessage extends BaseMessage {
  type: 'pause';
  paused: boolean;
}

export interface HeartbeatMessage extends BaseMessage {
  type: 'heartbeat';
}

export type ClientMessage =
  | CreateRoomMessage
  | JoinRoomMessage
  | LeaveRoomMessage
  | InputMessage
  | InteractMessage
  | PingMessage
  | ClearPingMessage
  | SurveillanceMessage
  | ReadyMessage
  | PauseMessage
  | HeartbeatMessage;

// ============================================
// Server -> Client Messages
// ============================================

export interface RoomCreatedMessage extends BaseMessage {
  type: 'room_created';
  roomCode: string;
  qrCodeUrl: string;
  role: Role;
}

export interface RoomJoinedMessage extends BaseMessage {
  type: 'room_joined';
  roomCode: string;
  role: Role;
  roomState: RoomState;
  gameState: GameState;
}

export interface RoomErrorMessage extends BaseMessage {
  type: 'room_error';
  error: 'not_found' | 'full' | 'role_taken' | 'invalid_code' | 'connection_failed';
  message: string;
}

export interface PlayerJoinedMessage extends BaseMessage {
  type: 'player_joined';
  role: Role;
}

export interface PlayerLeftMessage extends BaseMessage {
  type: 'player_left';
  role: Role;
  reconnectWindow: number;  // Seconds to reconnect
}

export interface PlayerReconnectedMessage extends BaseMessage {
  type: 'player_reconnected';
  role: Role;
}

export interface GameStartMessage extends BaseMessage {
  type: 'game_start';
  gameState: GameState;
}

export interface StateUpdateMessage extends BaseMessage {
  type: 'state_update';
  tick: number;
  entities: EntityState[];
  interactables: InteractableState[];
  pings: PingMarker[];
  puzzleStates?: PuzzleState[];
}

export interface FullStateMessage extends BaseMessage {
  type: 'full_state';
  gameState: GameState;
}

export interface InteractionResultMessage extends BaseMessage {
  type: 'interaction_result';
  targetId: string;
  action: string;
  success: boolean;
  newState?: Record<string, unknown>;
  reason?: string;
}

export interface PingReceivedMessage extends BaseMessage {
  type: 'ping_received';
  ping: PingMarker;
}

export interface PingExpiredMessage extends BaseMessage {
  type: 'ping_expired';
  pingId: string;
}

export interface PuzzleUpdateMessage extends BaseMessage {
  type: 'puzzle_update';
  puzzleId: string;
  objectives: { id: string; completed: boolean }[];
  completed: boolean;
}

export interface LevelCompleteMessage extends BaseMessage {
  type: 'level_complete';
  puzzlesCompleted: number;
  totalPuzzles: number;
  timeElapsed: number;
}

export interface GamePausedMessage extends BaseMessage {
  type: 'game_paused';
  paused: boolean;
  pausedBy: Role;
}

export interface ServerErrorMessage extends BaseMessage {
  type: 'server_error';
  error: string;
  fatal: boolean;
}

export interface HeartbeatAckMessage extends BaseMessage {
  type: 'heartbeat_ack';
  serverTime: number;
}

export type ServerMessage =
  | RoomCreatedMessage
  | RoomJoinedMessage
  | RoomErrorMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | PlayerReconnectedMessage
  | GameStartMessage
  | StateUpdateMessage
  | FullStateMessage
  | InteractionResultMessage
  | PingReceivedMessage
  | PingExpiredMessage
  | PuzzleUpdateMessage
  | LevelCompleteMessage
  | GamePausedMessage
  | ServerErrorMessage
  | HeartbeatAckMessage;

// ============================================
// Protocol Constants
// ============================================

export const PROTOCOL = {
  VERSION: '1.0.0',

  // Tick rates
  SERVER_TICK_RATE: 20,      // 20 Hz server simulation
  CLIENT_SEND_RATE: 20,      // 20 Hz input send rate
  STATE_SEND_RATE: 20,       // 20 Hz state broadcast

  // Timeouts
  HEARTBEAT_INTERVAL: 5000,  // 5 seconds
  RECONNECT_WINDOW: 20000,   // 20 seconds to reconnect
  ROOM_TIMEOUT: 300000,      // 5 minutes room idle timeout

  // Limits
  MAX_PINGS_PER_PLAYER: 5,
  PING_COOLDOWN: 500,        // 500ms between pings
  PING_LIFETIME: 10000,      // 10 seconds default

  // Room codes
  ROOM_CODE_LENGTH: 4,
  ROOM_CODE_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',  // Avoid confusing chars
} as const;

// ============================================
// Utility Types
// ============================================

export type MessageType = ClientMessage['type'] | ServerMessage['type'];

export function isClientMessage(msg: unknown): msg is ClientMessage {
  return typeof msg === 'object' && msg !== null && 'type' in msg && 'timestamp' in msg;
}

export function isServerMessage(msg: unknown): msg is ServerMessage {
  return typeof msg === 'object' && msg !== null && 'type' in msg && 'timestamp' in msg;
}
