# Panda & Dog - Architecture Overview

## Original Codebase Analysis (Shadow Ninja)

### Core Systems Map

```
src/
├── main.ts                    # Entry point, initializes PixiJS + GameScene
├── engine/
│   ├── Application.ts         # PixiJS wrapper, 7-layer depth system
│   ├── Camera.ts              # Smooth follow camera, zoom, shake
│   ├── Input.ts               # Keyboard handling, state tracking
│   ├── Tilemap.ts             # 20x20 grid, tile rendering, culling
│   ├── isometric.ts           # Coordinate conversion (world <-> screen)
│   ├── ShapeRenderer.ts       # Procedural graphics generation
│   ├── ParticleSystem.ts      # Lightweight particle effects
│   ├── constants.ts           # Game constants, colors, timing
│   └── types.ts               # TypeScript type definitions
├── game/
│   ├── GameScene.ts           # Main game loop, orchestration
│   ├── Entity.ts              # Base entity class
│   ├── Player.ts              # Player character (now: Dog + Panda)
│   ├── Enemy.ts               # AI state machine base
│   ├── Guard/Archer/etc.ts    # Enemy variants (remove for puzzler)
│   ├── Collision.ts           # Movement resolution, elevation
│   ├── CombatSystem.ts        # Hit detection (adapt for interactions)
│   ├── Projectile.ts          # Projectile system (may remove)
│   ├── PropManager.ts         # Static objects
│   └── Interactable.ts        # Interactive objects (expand heavily)
├── levels/
│   └── *.ts                   # Level definitions
└── ui/
    ├── HUD.ts                 # On-screen UI
    ├── DebugUI.ts             # Developer tools
    └── styles/main.css        # Styling
```

### Key Architectural Properties

| Property | Value | Impact on Migration |
|----------|-------|---------------------|
| Rendering | PixiJS 8.x WebGL | Keep - works on mobile |
| Physics | Fixed 60Hz timestep | Keep - deterministic for netcode |
| Networking | None | Add WebSocket layer |
| Input | Keyboard only | Add touch controls |
| Entities | Class hierarchy | Adapt for Dog/Panda |
| Collision | Grid + elevation | Keep - works for puzzles |
| State | Local only | Add server authority |

---

## Target Architecture

```
/
├── client/                    # Browser client (Vite + TypeScript)
│   ├── src/
│   │   ├── main.ts           # Entry point
│   │   ├── game/
│   │   │   ├── GameScene.ts  # Main loop, now network-aware
│   │   │   ├── Entity.ts     # Base entity
│   │   │   ├── Dog.ts        # Desktop player character
│   │   │   ├── Panda.ts      # Mobile player character
│   │   │   ├── Collision.ts  # Movement resolution
│   │   │   └── Interactable/ # Expanded interactable system
│   │   │       ├── Door.ts
│   │   │       ├── Lever.ts
│   │   │       ├── PressurePlate.ts
│   │   │       ├── Crate.ts
│   │   │       ├── Winch.ts
│   │   │       ├── CameraNode.ts
│   │   │       └── Platform.ts
│   │   ├── engine/           # Rendering, camera, input (keep mostly)
│   │   ├── net/              # NEW: Client networking
│   │   │   ├── NetworkClient.ts
│   │   │   ├── StateSync.ts
│   │   │   └── Protocol.ts
│   │   ├── ui/               # Expanded UI system
│   │   │   ├── tokens.ts     # Design system tokens
│   │   │   ├── components/   # Reusable UI components
│   │   │   ├── screens/      # Join, lobby, game over
│   │   │   ├── hud/          # Role-specific HUDs
│   │   │   └── mobile/       # Touch controls
│   │   └── levels/           # Level definitions
│   └── index.html
│
├── server/                    # Node.js WebSocket server
│   ├── src/
│   │   ├── index.ts          # Server entry
│   │   ├── Room.ts           # Room management
│   │   ├── GameState.ts      # Authoritative state
│   │   ├── Validation.ts     # Permission checks
│   │   └── Protocol.ts       # Message handling
│   └── package.json
│
└── shared/                    # Shared types and constants
    ├── types.ts              # Common type definitions
    ├── protocol.ts           # Network protocol types
    ├── constants.ts          # Shared game constants
    └── levelSchema.ts        # Level validation schema
```

---

## Migration Plan

### Phase 0: File Structure (Current)

**Actions:**
1. Create `/client`, `/server`, `/shared` directories
2. Move `src/` contents to `client/src/`
3. Create server skeleton
4. Create shared types package
5. Update imports and build config

**Minimal Changes:**
- Keep existing engine code intact
- Keep isometric rendering pipeline
- Keep collision system
- Keep particle system

**Remove/Deprecate:**
- Combat system (no enemies in puzzler)
- Enemy AI (Guard, Archer, etc.)
- Projectile system
- Score/highscore system

### Phase 1: Networking

**Add:**
- WebSocket server (Node.js + ws library)
- Room creation with 4-character codes
- QR code generation for mobile join
- Role assignment (Dog = desktop, Panda = mobile)
- Basic state sync protocol

**Protocol Messages:**
```typescript
// Client -> Server
JoinRoom { roomCode: string, role?: 'dog' | 'panda' }
LeaveRoom { }
Input { tick: number, input: InputState }
Interact { targetId: string, action: string }
Ping { position: Vec2, type: PingType }

// Server -> Client
RoomCreated { roomCode: string, qrUrl: string }
RoomJoined { role: 'dog' | 'panda', state: GameState }
StateUpdate { tick: number, entities: EntityState[], interactables: InteractableState[] }
PlayerJoined { role: 'dog' | 'panda' }
PlayerLeft { role: 'dog' | 'panda' }
InteractionResult { targetId: string, success: boolean, newState: any }
PingReceived { position: Vec2, type: PingType, from: 'dog' | 'panda' }
```

### Phase 2: Character Split

**Dog (Desktop):**
- Fast movement (6 tiles/s)
- Cannot push heavy objects
- Surveillance mode (wider zoom)
- Ping/marker placement
- Light switch interactions

**Panda (Mobile):**
- Slower movement (3 tiles/s)
- Can push/pull crates
- Operates machinery
- Touch-optimized controls
- Contextual interaction UI

### Phase 3: Interactable Toolkit

**Base Interactable Interface:**
```typescript
interface Interactable {
  id: string;
  type: InteractableType;
  position: WorldPos;
  state: Record<string, any>;
  canInteract(role: 'dog' | 'panda'): boolean;
  getInteractions(role: 'dog' | 'panda'): Interaction[];
  applyAction(action: string, role: 'dog' | 'panda'): StateChange;
}
```

**Implementations:**
1. Door - both can open unlocked; Panda needed for heavy doors
2. PressurePlate - weight-based; heavy = Panda only
3. Lever - toggle or hold; some Panda-only
4. Crate - Panda pushes; affects pressure plates
5. Winch - Panda operates; controls platforms/bridges
6. CameraNode - Dog views; limited rotation
7. Platform - moves on rails; timed or triggered

### Phase 4: Level Design

**Facility Courtyard Layout:**
```
+------------------+
|  [A] Tutorial    |  Puzzle A: Ping + Switch
|    Entry zone    |
+--------+---------+
         |
    [Corridor]
         |
+--------+---------+
|  [B] Weight     |  Puzzle B: Crate + Plate + Switch
|    Room         |
+--------+---------+
         |
    [Elevated]
         |
+--------+---------+
|  [C] Timing     |  Puzzle C: Winch + Platform + Button
|    Exit zone    |
+------------------+
```

### Phase 5: Polish

**UI System:**
- Design tokens (colors, spacing, typography)
- Responsive components
- Role-specific HUDs
- Mobile touch optimization
- Connection status indicators

---

## Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Network latency causing desync | High | Server-authoritative state; client prediction for movement only |
| Mobile performance | Medium | Reduce particle count; disable expensive effects; target 30fps |
| Touch controls precision | Medium | Large touch targets (44px+); contextual buttons; haptic feedback |
| Puzzle unsolvable solo | Low | Server validates both players present; tutorial hints |
| WebSocket disconnection | Medium | Auto-reconnect with 20s grace period; state restoration |
| Cross-origin issues | Low | CORS headers; same-origin deployment option |
| Browser compatibility | Low | Target modern browsers; fallback for WebGL |

---

## Technical Decisions

### Keep From Original:
- PixiJS rendering (proven, mobile-capable)
- Isometric coordinate system
- Fixed timestep game loop
- Tile-based collision
- Procedural graphics (no assets needed)
- Entity base class pattern

### Modify:
- GameScene → Network-aware tick processing
- Input → Add touch controls alongside keyboard
- Camera → Role-specific zoom ranges
- Interactable → Expanded with role permissions

### Add New:
- WebSocket networking layer
- Server-authoritative game state
- Room/session management
- Touch control overlay
- Role-based UI variants
- QR code join flow

### Remove:
- Enemy AI system (not needed for puzzler)
- Combat/damage system
- Projectiles
- Score/highscore
- Stealth mechanics

---

## File Changes Summary

### New Files:
- `server/` - Complete new package
- `shared/` - Complete new package
- `client/src/net/` - Networking layer
- `client/src/game/Dog.ts` - Dog character
- `client/src/game/Panda.ts` - Panda character
- `client/src/game/Interactable/*.ts` - Expanded interactables
- `client/src/ui/tokens.ts` - Design system
- `client/src/ui/components/` - UI component library
- `client/src/ui/mobile/` - Touch controls

### Modified Files:
- `client/src/main.ts` - Add network + role selection
- `client/src/game/GameScene.ts` - Network-aware loop
- `client/src/engine/Input.ts` - Add touch support
- `client/src/engine/Camera.ts` - Role-specific behavior

### Removed/Deprecated:
- `src/game/Guard.ts`
- `src/game/Archer.ts`
- `src/game/Skeleton.ts`
- `src/game/Oni.ts`
- `src/game/Boss.ts`
- `src/game/CombatSystem.ts`
- `src/game/Projectile.ts`
