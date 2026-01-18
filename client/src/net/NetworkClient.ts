/**
 * Panda & Dog - Network Client
 * WebSocket client for multiplayer communication
 */

import type {
  Role,
  InputState,
  WorldPos,
  PingType,
} from '@shared/types';
import type {
  ClientMessage,
  ServerMessage,
} from '@shared/protocol';
import { PROTOCOL } from '@shared/protocol';

// ============================================
// Event Types
// ============================================

export type NetworkEventType =
  | 'connected'
  | 'disconnected'
  | 'room_created'
  | 'room_joined'
  | 'room_error'
  | 'player_joined'
  | 'player_left'
  | 'player_reconnected'
  | 'game_start'
  | 'state_update'
  | 'interaction_result'
  | 'ping_received'
  | 'ping_expired'
  | 'puzzle_update'
  | 'level_complete'
  | 'game_paused'
  | 'error';

export interface NetworkEvent {
  type: NetworkEventType;
  data?: unknown;
}

export type NetworkEventHandler = (event: NetworkEvent) => void;

// ============================================
// Connection State
// ============================================

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

// ============================================
// Network Client Class
// ============================================

export class NetworkClient {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private state: ConnectionState = 'disconnected';
  private listeners: Map<NetworkEventType | '*', Set<NetworkEventHandler>> = new Map();

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  private heartbeatInterval: number | null = null;
  private lastServerTime = 0;
  private latency = 0;

  // Current session info
  private roomCode: string | null = null;
  private role: Role | null = null;
  private currentTick = 0;

  constructor(serverUrl?: string) {
    this.serverUrl = serverUrl || this.getDefaultServerUrl();
  }

  private getDefaultServerUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;

    // In development, use port 3001. In production, use same host (no port needed for Railway)
    if (import.meta.env.DEV) {
      return `${protocol}//${host}:3001`;
    }

    // Production: use the same host without explicit port
    return `${protocol}//${window.location.host}`;
  }

  // ============================================
  // Connection Management
  // ============================================

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.state = 'connecting';

      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          this.state = 'connected';
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emit({ type: 'connected' });
          resolve();
        };

        this.ws.onclose = () => {
          this.handleDisconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (this.state === 'connecting') {
            reject(new Error('Connection failed'));
          }
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.state = 'disconnected';
    this.roomCode = null;
    this.role = null;
  }

  private handleDisconnect(): void {
    this.stopHeartbeat();
    this.state = 'disconnected';
    this.emit({ type: 'disconnected' });

    // Attempt reconnection if we were in a room
    if (this.roomCode && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    this.state = 'reconnecting';
    this.reconnectAttempts++;

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(async () => {
      try {
        await this.connect();
        // Rejoin room if we had one
        if (this.roomCode) {
          this.joinRoom(this.roomCode, this.role || undefined);
        }
      } catch {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        }
      }
    }, delay);
  }

  // ============================================
  // Heartbeat
  // ============================================

  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      this.send({ type: 'heartbeat', timestamp: Date.now() });
    }, PROTOCOL.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ============================================
  // Message Handling
  // ============================================

  private send(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private handleMessage(data: string): void {
    let message: ServerMessage;
    try {
      message = JSON.parse(data);
    } catch {
      console.error('Invalid JSON from server');
      return;
    }

    switch (message.type) {
      case 'room_created':
        this.roomCode = message.roomCode;
        this.role = message.role;
        this.emit({ type: 'room_created', data: message });
        break;

      case 'room_joined':
        this.roomCode = message.roomCode;
        this.role = message.role;
        this.emit({ type: 'room_joined', data: message });
        break;

      case 'room_error':
        this.emit({ type: 'room_error', data: message });
        break;

      case 'player_joined':
        this.emit({ type: 'player_joined', data: message });
        break;

      case 'player_left':
        this.emit({ type: 'player_left', data: message });
        break;

      case 'player_reconnected':
        this.emit({ type: 'player_reconnected', data: message });
        break;

      case 'game_start':
        this.emit({ type: 'game_start', data: message });
        break;

      case 'state_update':
        this.currentTick = message.tick;
        this.emit({ type: 'state_update', data: message });
        break;

      case 'full_state':
        this.emit({ type: 'state_update', data: message });
        break;

      case 'interaction_result':
        this.emit({ type: 'interaction_result', data: message });
        break;

      case 'ping_received':
        this.emit({ type: 'ping_received', data: message });
        break;

      case 'ping_expired':
        this.emit({ type: 'ping_expired', data: message });
        break;

      case 'puzzle_update':
        this.emit({ type: 'puzzle_update', data: message });
        break;

      case 'level_complete':
        this.emit({ type: 'level_complete', data: message });
        break;

      case 'game_paused':
        this.emit({ type: 'game_paused', data: message });
        break;

      case 'heartbeat_ack':
        this.lastServerTime = message.serverTime;
        this.latency = Date.now() - message.timestamp;
        break;

      case 'server_error':
        this.emit({ type: 'error', data: message });
        break;
    }
  }

  // ============================================
  // Event Emitter
  // ============================================

  on(type: NetworkEventType | '*', handler: NetworkEventHandler): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(handler);
    };
  }

  private emit(event: NetworkEvent): void {
    // Call specific handlers
    this.listeners.get(event.type)?.forEach(handler => handler(event));
    // Call wildcard handlers
    this.listeners.get('*')?.forEach(handler => handler(event));
  }

  // ============================================
  // Room Actions
  // ============================================

  createRoom(levelId: string = 'vertical_slice'): void {
    this.send({
      type: 'create_room',
      timestamp: Date.now(),
      levelId,
    });
  }

  joinRoom(roomCode: string, preferredRole?: Role): void {
    this.send({
      type: 'join_room',
      timestamp: Date.now(),
      roomCode: roomCode.toUpperCase(),
      preferredRole,
    });
  }

  leaveRoom(): void {
    this.send({
      type: 'leave_room',
      timestamp: Date.now(),
    });
    this.roomCode = null;
    this.role = null;
  }

  // ============================================
  // Game Actions
  // ============================================

  sendInput(input: InputState, position: WorldPos): void {
    this.send({
      type: 'input',
      timestamp: Date.now(),
      tick: this.currentTick,
      input,
      position,
    });
  }

  interact(targetId: string, action: string, data?: Record<string, unknown>): void {
    this.send({
      type: 'interact',
      timestamp: Date.now(),
      targetId,
      action,
      data,
    });
  }

  placePing(position: WorldPos, pingType: PingType): void {
    this.send({
      type: 'ping_marker',
      timestamp: Date.now(),
      position,
      pingType,
    });
  }

  clearPing(pingId: string): void {
    this.send({
      type: 'clear_ping',
      timestamp: Date.now(),
      pingId,
    });
  }

  toggleSurveillance(enabled: boolean, cameraNodeId?: string): void {
    this.send({
      type: 'surveillance',
      timestamp: Date.now(),
      enabled,
      cameraNodeId,
    });
  }

  setPaused(paused: boolean): void {
    this.send({
      type: 'pause',
      timestamp: Date.now(),
      paused,
    });
  }

  setReady(): void {
    this.send({
      type: 'ready',
      timestamp: Date.now(),
    });
  }

  // ============================================
  // Getters
  // ============================================

  getState(): ConnectionState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === 'connected';
  }

  getRoomCode(): string | null {
    return this.roomCode;
  }

  getRole(): Role | null {
    return this.role;
  }

  getLatency(): number {
    return this.latency;
  }

  getCurrentTick(): number {
    return this.currentTick;
  }

  getServerTime(): number {
    return this.lastServerTime;
  }
}

// Singleton instance
export const networkClient = new NetworkClient();
