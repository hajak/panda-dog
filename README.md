# Shadow Ninja

A modern isometric action/stealth platformer built with PixiJS and TypeScript.

## Quick Start

```bash
# Clone the repo
git clone https://github.com/hajak/last-ninja.git
cd last-ninja

# Install dependencies
pnpm install

# Run dev server
pnpm dev
```

Open **http://localhost:5173** in your browser.

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrows | Move (8 directions) |
| Shift | Run (drains stamina) |
| Space | Jump |
| J | Attack (2-hit combo) |
| K | Block / Parry |
| L | Throw shuriken |
| E | Interact |
| 1-3 | Quick inventory slots |
| Escape | Pause |
| H | Help / Controls |
| M | Toggle music |
| § | Debug mode (2D view) |
| V | Toggle vision cones |
| G | Toggle grid |

## Project Structure

```
src/
├── engine/           # Core rendering and systems
│   ├── Application.ts    # PixiJS application wrapper
│   ├── Camera.ts         # Smooth follow camera with zoom
│   ├── constants.ts      # Game constants and configuration
│   ├── Input.ts          # Keyboard input handling
│   ├── isometric.ts      # Isometric coordinate utilities
│   ├── ShapeRenderer.ts  # Procedural shape generation
│   ├── Tilemap.ts        # Isometric tilemap system
│   └── types.ts          # TypeScript type definitions
│
├── game/             # Game logic and entities
│   ├── Entity.ts         # Base entity class
│   ├── GameScene.ts      # Main game scene controller
│   └── Player.ts         # Player entity with full movement
│
├── levels/           # Level definitions
│   └── Courtyard.ts      # Vertical slice level
│
├── ui/               # User interface
│   ├── HUD.ts            # HTML-based HUD components
│   └── styles/           # CSS design system
│       ├── tokens.css    # Design tokens
│       └── main.css      # Component styles
│
└── main.ts           # Application entry point
```

## Technical Specifications

### Isometric Rendering
- **Tile size**: 64x32 pixels (2:1 ratio)
- **Tile depth**: 16 pixels per elevation unit
- **Target resolution**: 1280x720
- **Target framerate**: 60 FPS

### Camera
- Smooth follow with configurable damping (0.08)
- 3 zoom levels: 0.75x, 1.0x, 1.5x
- Screen shake support

### Player Movement
- 8-directional isometric movement
- Walk speed: 3.5 tiles/sec
- Run speed: 6 tiles/sec
- **Jump buffering**: 150ms window
- **Coyote time**: 100ms grace period

### Combat
- Light attack combo (2 hits)
- Block with 75% damage reduction
- **Parry window**: 120ms for perfect block
- **Invulnerability**: 500ms after hit

## Adding Content

### New Tile Type

1. Add type to `TileType` in `src/engine/types.ts`
2. Add tile config in `src/engine/Tilemap.ts` `createTileData()`
3. Add color mapping in `getTileGraphics()`

### New Prop

1. Add case to `createPropShape()` in `src/engine/ShapeRenderer.ts`
2. Use Graphics API to draw the shape
3. Add to level data in `src/levels/`

### New Enemy

1. Create class extending `Entity` in `src/game/`
2. Implement `update()` and `updateVisual()` methods
3. Add spawn data to level definition

## Performance Notes

- Tile culling based on camera visibility
- Depth sorting only on entity layer
- Fixed timestep physics (16.67ms) with interpolation
- Lazy visual updates when not visible

## Known Issues

- Elevation collision needs refinement
- No audio system yet
- Enemy AI not implemented in Phase 1

## Roadmap

- [x] **Phase 1**: Design system, camera, tilemap, player movement
- [ ] **Phase 2**: Elevation, climbing, occlusion fade, basic HUD
- [ ] **Phase 3**: Combat, enemy AI, stealth overlays
- [ ] **Phase 4**: Polish, animation timing, audio hooks

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Design System

The UI uses a token-based design system defined in `src/ui/styles/tokens.css`:

- **Colors**: Primary (cyan/teal), danger (red), warning (yellow), success (green)
- **Typography**: Inter for UI, JetBrains Mono for technical info
- **Spacing**: 4px base unit scale (0.25rem increments)
- **Animations**: Fast (100ms), normal (200ms), slow (300ms)

Current version: **2.1.1**
