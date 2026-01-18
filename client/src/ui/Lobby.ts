/**
 * Panda & Dog - Lobby Screen
 * Room creation, QR code display, and player connection management
 */

import QRCode from 'qrcode';
import { networkClient, type NetworkEvent } from '@net/NetworkClient';
import type { Role } from '@shared/types';

export type LobbyState = 'initial' | 'connecting' | 'creating' | 'waiting' | 'ready' | 'starting';

interface LobbyCallbacks {
  onGameStart: () => void;
  onError: (message: string) => void;
}

export class LobbyUI {
  private container: HTMLElement;
  private state: LobbyState = 'initial';
  private roomCode: string | null = null;
  private role: Role | null = null;
  private dogConnected = false;
  private pandaConnected = false;
  private dogReady = false;
  private pandaReady = false;
  private callbacks: LobbyCallbacks;
  private unsubscribe: (() => void) | null = null;

  constructor(container: HTMLElement, callbacks: LobbyCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.render();
    this.setupNetworkListeners();
  }

  private setupNetworkListeners(): void {
    this.unsubscribe = networkClient.on('*', (event: NetworkEvent) => {
      this.handleNetworkEvent(event);
    });
  }

  private handleNetworkEvent(event: NetworkEvent): void {
    switch (event.type) {
      case 'connected':
        this.setState('initial');
        break;

      case 'disconnected':
        this.setState('initial');
        this.roomCode = null;
        this.role = null;
        this.dogConnected = false;
        this.pandaConnected = false;
        break;

      case 'room_created': {
        const data = event.data as { roomCode: string; role: Role };
        this.roomCode = data.roomCode;
        this.role = data.role;
        this.dogConnected = data.role === 'dog';
        this.pandaConnected = data.role === 'panda';
        this.setState('waiting');
        break;
      }

      case 'room_joined': {
        const data = event.data as { roomCode: string; role: Role };
        this.roomCode = data.roomCode;
        this.role = data.role;
        if (data.role === 'dog') {
          this.dogConnected = true;
        } else {
          this.pandaConnected = true;
        }
        this.setState('waiting');
        break;
      }

      case 'room_error': {
        const data = event.data as { message: string };
        this.callbacks.onError(data.message);
        this.setState('initial');
        break;
      }

      case 'player_joined': {
        const data = event.data as { role: Role };
        if (data.role === 'dog') {
          this.dogConnected = true;
        } else {
          this.pandaConnected = true;
        }
        this.render();
        break;
      }

      case 'player_left': {
        const data = event.data as { role: Role };
        if (data.role === 'dog') {
          this.dogConnected = false;
          this.dogReady = false;
        } else {
          this.pandaConnected = false;
          this.pandaReady = false;
        }
        this.render();
        break;
      }

      case 'game_start':
        this.setState('starting');
        setTimeout(() => {
          this.callbacks.onGameStart();
        }, 500);
        break;

      case 'error': {
        const data = event.data as { error: string };
        this.callbacks.onError(data.error);
        break;
      }
    }
  }

  private setState(state: LobbyState): void {
    this.state = state;
    this.render();
  }

  private async render(): Promise<void> {
    this.container.innerHTML = '';

    const lobby = document.createElement('div');
    lobby.className = 'lobby';

    switch (this.state) {
      case 'initial':
        lobby.appendChild(this.renderInitialScreen());
        break;
      case 'connecting':
        lobby.appendChild(this.renderConnectingScreen());
        break;
      case 'creating':
        lobby.appendChild(this.renderCreatingScreen());
        break;
      case 'waiting':
        lobby.appendChild(await this.renderWaitingScreen());
        break;
      case 'ready':
        lobby.appendChild(this.renderReadyScreen());
        break;
      case 'starting':
        lobby.appendChild(this.renderStartingScreen());
        break;
    }

    this.container.appendChild(lobby);
  }

  private renderInitialScreen(): HTMLElement {
    const screen = document.createElement('div');
    screen.className = 'lobby__content';
    screen.innerHTML = `
      <div class="lobby__header">
        <h1 class="lobby__title">Panda & Dog</h1>
        <p class="lobby__subtitle">A cooperative puzzle adventure</p>
      </div>

      <div class="lobby__actions">
        <button class="btn btn--primary btn--large" id="btn-create">
          Create Room
        </button>
        <div class="lobby__divider">
          <span>or</span>
        </div>
        <div class="lobby__join">
          <input type="text"
                 class="input input--large"
                 id="input-code"
                 placeholder="Enter room code"
                 maxlength="4"
                 autocomplete="off"
                 autocorrect="off"
                 autocapitalize="characters">
          <button class="btn btn--large" id="btn-join">Join</button>
        </div>
      </div>

      <div class="lobby__roles">
        <div class="role-card role-card--dog">
          <div class="role-card__icon">🐕</div>
          <div class="role-card__name">Dog</div>
          <div class="role-card__desc">Scout, ping locations, operate light switches</div>
        </div>
        <div class="role-card role-card--panda">
          <div class="role-card__icon">🐼</div>
          <div class="role-card__name">Panda</div>
          <div class="role-card__desc">Push crates, operate heavy machinery</div>
        </div>
      </div>
    `;

    const btnCreate = screen.querySelector('#btn-create') as HTMLButtonElement;
    const btnJoin = screen.querySelector('#btn-join') as HTMLButtonElement;
    const inputCode = screen.querySelector('#input-code') as HTMLInputElement;

    btnCreate.addEventListener('click', () => this.createRoom());
    btnJoin.addEventListener('click', () => this.joinRoom(inputCode.value));
    inputCode.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        this.joinRoom(inputCode.value);
      }
    });

    return screen;
  }

  private renderConnectingScreen(): HTMLElement {
    const screen = document.createElement('div');
    screen.className = 'lobby__content lobby__content--centered';
    screen.innerHTML = `
      <div class="lobby__spinner"></div>
      <p class="lobby__status">Connecting to server...</p>
    `;
    return screen;
  }

  private renderCreatingScreen(): HTMLElement {
    const screen = document.createElement('div');
    screen.className = 'lobby__content lobby__content--centered';
    screen.innerHTML = `
      <div class="lobby__spinner"></div>
      <p class="lobby__status">Creating room...</p>
    `;
    return screen;
  }

  private async renderWaitingScreen(): Promise<HTMLElement> {
    const screen = document.createElement('div');
    screen.className = 'lobby__content';

    const qrDataUrl = await this.generateQRCode();
    const bothConnected = this.dogConnected && this.pandaConnected;

    screen.innerHTML = `
      <div class="lobby__room">
        <div class="lobby__room-header">
          <span class="lobby__room-label">Room Code</span>
          <span class="lobby__room-code">${this.roomCode || '----'}</span>
        </div>

        <div class="lobby__qr">
          <img src="${qrDataUrl}" alt="Scan to join" class="lobby__qr-img">
          <p class="lobby__qr-hint">Scan with mobile to join as Panda</p>
        </div>
      </div>

      <div class="lobby__players">
        <div class="player-slot ${this.dogConnected ? 'player-slot--connected' : ''}">
          <div class="player-slot__icon">🐕</div>
          <div class="player-slot__info">
            <div class="player-slot__name">Dog</div>
            <div class="player-slot__status">${this.dogConnected ? 'Connected' : 'Waiting...'}</div>
          </div>
          ${this.role === 'dog' ? '<span class="player-slot__you">You</span>' : ''}
        </div>

        <div class="player-slot ${this.pandaConnected ? 'player-slot--connected' : ''}">
          <div class="player-slot__icon">🐼</div>
          <div class="player-slot__info">
            <div class="player-slot__name">Panda</div>
            <div class="player-slot__status">${this.pandaConnected ? 'Connected' : 'Waiting...'}</div>
          </div>
          ${this.role === 'panda' ? '<span class="player-slot__you">You</span>' : ''}
        </div>
      </div>

      <div class="lobby__footer">
        ${bothConnected
          ? `<button class="btn btn--primary btn--large" id="btn-ready">Ready to Start</button>`
          : `<p class="lobby__waiting">Waiting for other player...</p>`
        }
        <button class="btn btn--small" id="btn-leave">Leave Room</button>
      </div>
    `;

    if (bothConnected) {
      const btnReady = screen.querySelector('#btn-ready') as HTMLButtonElement;
      btnReady.addEventListener('click', () => this.setReady());
    }

    const btnLeave = screen.querySelector('#btn-leave') as HTMLButtonElement;
    btnLeave.addEventListener('click', () => this.leaveRoom());

    return screen;
  }

  private renderReadyScreen(): HTMLElement {
    const screen = document.createElement('div');
    screen.className = 'lobby__content lobby__content--centered';
    screen.innerHTML = `
      <div class="lobby__ready-status">
        <div class="player-ready ${this.dogReady ? 'player-ready--done' : ''}">
          <span class="player-ready__icon">🐕</span>
          <span class="player-ready__status">${this.dogReady ? 'Ready!' : 'Waiting...'}</span>
        </div>
        <div class="player-ready ${this.pandaReady ? 'player-ready--done' : ''}">
          <span class="player-ready__icon">🐼</span>
          <span class="player-ready__status">${this.pandaReady ? 'Ready!' : 'Waiting...'}</span>
        </div>
      </div>
      <p class="lobby__status">Waiting for both players to be ready...</p>
    `;
    return screen;
  }

  private renderStartingScreen(): HTMLElement {
    const screen = document.createElement('div');
    screen.className = 'lobby__content lobby__content--centered';
    screen.innerHTML = `
      <h2 class="lobby__starting-text">Starting Game...</h2>
      <div class="lobby__spinner"></div>
    `;
    return screen;
  }

  private async generateQRCode(): Promise<string> {
    if (!this.roomCode) return '';

    const joinUrl = `${window.location.origin}?join=${this.roomCode}`;
    try {
      return await QRCode.toDataURL(joinUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#14b8a6',
          light: '#0a0b0f',
        },
      });
    } catch {
      console.error('Failed to generate QR code');
      return '';
    }
  }

  private async createRoom(): Promise<void> {
    this.setState('connecting');

    try {
      await networkClient.connect();
      this.setState('creating');
      networkClient.createRoom('facility_courtyard');
    } catch (error) {
      this.callbacks.onError('Failed to connect to server');
      this.setState('initial');
    }
  }

  private async joinRoom(code: string): Promise<void> {
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length !== 4) {
      this.callbacks.onError('Room code must be 4 characters');
      return;
    }

    this.setState('connecting');

    try {
      await networkClient.connect();
      networkClient.joinRoom(cleanCode);
    } catch (error) {
      this.callbacks.onError('Failed to connect to server');
      this.setState('initial');
    }
  }

  private leaveRoom(): void {
    networkClient.leaveRoom();
    networkClient.disconnect();
    this.roomCode = null;
    this.role = null;
    this.dogConnected = false;
    this.pandaConnected = false;
    this.setState('initial');
  }

  private setReady(): void {
    if (this.role === 'dog') {
      this.dogReady = true;
    } else {
      this.pandaReady = true;
    }
    networkClient.setReady();
    this.setState('ready');
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.container.innerHTML = '';
  }
}

export function createLobby(container: HTMLElement, callbacks: LobbyCallbacks): LobbyUI {
  return new LobbyUI(container, callbacks);
}
