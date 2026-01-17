/* ============================================
   SHADOW NINJA - Shape Renderer
   Procedural graphics generation for placeholders
   ============================================ */

import { Graphics, Container, Text, TextStyle } from 'pixi.js';
import { TILE_WIDTH, TILE_HEIGHT, TILE_DEPTH, COLORS, LIGHT_DIRECTION } from './constants';

/**
 * Create an isometric tile shape
 */
export function createIsoTile(
  color: number,
  elevation: number = 0,
  pattern?: 'solid' | 'grass' | 'stone' | 'water',
  isHidingSpot: boolean = false
): Graphics {
  const g = new Graphics();
  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;
  const depth = elevation * TILE_DEPTH;

  // Calculate shaded colors
  const topColor = color;
  const leftColor = shadeColor(color, -0.3);
  const rightColor = shadeColor(color, -0.15);

  // Draw sides if elevated
  if (depth > 0) {
    // Left side
    g.poly([
      { x: -hw, y: 0 },
      { x: 0, y: hh },
      { x: 0, y: hh + depth },
      { x: -hw, y: depth },
    ]);
    g.fill(leftColor);

    // Right side
    g.poly([
      { x: hw, y: 0 },
      { x: 0, y: hh },
      { x: 0, y: hh + depth },
      { x: hw, y: depth },
    ]);
    g.fill(rightColor);
  }

  // Top surface
  g.poly([
    { x: 0, y: -hh },
    { x: hw, y: 0 },
    { x: 0, y: hh },
    { x: -hw, y: 0 },
  ]);
  g.fill(topColor);

  // Add pattern details
  if (pattern === 'grass') {
    if (isHidingSpot) {
      addTallGrassPattern(g, hw, hh);
    } else {
      addGrassPattern(g, hw, hh);
    }
  } else if (pattern === 'stone') {
    addStonePattern(g, hw, hh);
  } else if (pattern === 'water') {
    addWaterPattern(g, hw, hh);
  }

  return g;
}

/**
 * Create an isometric wall/block
 */
export function createIsoBlock(
  color: number,
  height: number = 1,
  width: number = 1,
  length: number = 1
): Graphics {
  const g = new Graphics();
  const hw = (TILE_WIDTH * width) / 2;
  const hh = (TILE_HEIGHT * length) / 2;
  const blockHeight = height * TILE_DEPTH;

  const topColor = color;
  const leftColor = shadeColor(color, -0.35);
  const rightColor = shadeColor(color, -0.2);

  // Left face
  g.poly([
    { x: -hw, y: 0 },
    { x: -hw, y: -blockHeight },
    { x: 0, y: hh - blockHeight },
    { x: 0, y: hh },
  ]);
  g.fill(leftColor);

  // Right face
  g.poly([
    { x: hw, y: 0 },
    { x: hw, y: -blockHeight },
    { x: 0, y: hh - blockHeight },
    { x: 0, y: hh },
  ]);
  g.fill(rightColor);

  // Top face
  g.poly([
    { x: 0, y: -hh - blockHeight },
    { x: hw, y: -blockHeight },
    { x: 0, y: hh - blockHeight },
    { x: -hw, y: -blockHeight },
  ]);
  g.fill(topColor);

  return g;
}

/**
 * Create a character shape (ninja/guard/archer)
 */
export function createCharacterShape(
  color: number,
  size: number = 1,
  type: 'ninja' | 'guard' | 'archer' = 'ninja'
): Container {
  const container = new Container();
  const g = new Graphics();

  const baseSize = 12 * size;
  const height = 24 * size;

  // Shadow
  const shadow = new Graphics();
  shadow.ellipse(0, 4, baseSize * 0.8, baseSize * 0.4);
  shadow.fill({ color: 0x000000, alpha: 0.3 });
  container.addChild(shadow);

  // Body shape varies by type
  if (type === 'ninja') {
    // Sleek, agile shape
    g.roundRect(-baseSize * 0.4, -height, baseSize * 0.8, height * 0.6, 4);
    g.fill(shadeColor(color, -0.2));

    // Head
    g.circle(0, -height + 4, baseSize * 0.35);
    g.fill(color);

    // Headband accent
    g.rect(-baseSize * 0.4, -height + 2, baseSize * 0.8, 3);
    g.fill(0xff4444);
  } else if (type === 'guard') {
    // Bulky armored shape
    g.roundRect(-baseSize * 0.5, -height * 0.9, baseSize, height * 0.7, 2);
    g.fill(shadeColor(color, -0.2));

    // Helmet
    g.roundRect(-baseSize * 0.4, -height, baseSize * 0.8, height * 0.25, 2);
    g.fill(color);

    // Visor slit
    g.rect(-baseSize * 0.3, -height + 6, baseSize * 0.6, 2);
    g.fill(0x111111);
  } else if (type === 'archer') {
    // Medium build with bow indication
    g.roundRect(-baseSize * 0.35, -height * 0.85, baseSize * 0.7, height * 0.6, 3);
    g.fill(shadeColor(color, -0.2));

    // Hood
    g.moveTo(0, -height);
    g.lineTo(baseSize * 0.4, -height * 0.7);
    g.lineTo(-baseSize * 0.4, -height * 0.7);
    g.closePath();
    g.fill(color);

    // Quiver indication
    g.rect(baseSize * 0.3, -height * 0.8, 4, height * 0.4);
    g.fill(0x8b4513);
  }

  container.addChild(g);
  return container;
}

/**
 * Create a projectile shape (shuriken)
 */
export function createProjectileShape(type: 'shuriken' | 'arrow' = 'shuriken'): Graphics {
  const g = new Graphics();

  if (type === 'shuriken') {
    // 4-pointed star
    const points = 4;
    const outerRadius = 8;
    const innerRadius = 3;

    g.moveTo(outerRadius, 0);
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      g.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    g.closePath();
    g.fill(0xcccccc);
    g.stroke({ color: 0x888888, width: 1 });
  } else {
    // Arrow
    g.moveTo(12, 0);
    g.lineTo(-8, 0);
    g.stroke({ color: 0x8b4513, width: 2 });

    // Arrowhead
    g.moveTo(12, 0);
    g.lineTo(6, -3);
    g.lineTo(6, 3);
    g.closePath();
    g.fill(0x888888);
  }

  return g;
}

/**
 * Create a prop shape (tree, bush, crate, etc.)
 */
export function createPropShape(
  type: 'tree' | 'bush' | 'crate' | 'barrel' | 'lantern' | 'rock'
): Container {
  const container = new Container();

  if (type === 'tree') {
    // Trunk
    const trunk = new Graphics();
    trunk.rect(-4, -40, 8, 40);
    trunk.fill(0x5d4037);
    container.addChild(trunk);

    // Foliage layers
    for (let i = 0; i < 3; i++) {
      const foliage = new Graphics();
      const y = -45 - i * 12;
      const radius = 20 - i * 4;
      foliage.ellipse(0, y, radius, radius * 0.7);
      foliage.fill(shadeColor(0x2e7d32, -i * 0.1));
      container.addChild(foliage);
    }
  } else if (type === 'bush') {
    const bush = new Graphics();
    bush.ellipse(0, -8, 16, 12);
    bush.fill(0x388e3c);
    bush.ellipse(-6, -6, 10, 8);
    bush.fill(0x43a047);
    bush.ellipse(6, -6, 10, 8);
    bush.fill(0x2e7d32);
    container.addChild(bush);
  } else if (type === 'crate') {
    const crate = createIsoBlock(0x8d6e63, 1, 0.8, 0.8);
    // Add wooden plank lines
    crate.moveTo(-12, -8);
    crate.lineTo(12, -8);
    crate.stroke({ color: 0x5d4037, width: 1 });
    container.addChild(crate);
  } else if (type === 'barrel') {
    const barrel = new Graphics();
    // Body
    barrel.ellipse(0, -12, 10, 6);
    barrel.fill(0x6d4c41);
    barrel.rect(-10, -12, 20, 20);
    barrel.fill(0x8d6e63);
    barrel.ellipse(0, 8, 10, 6);
    barrel.fill(0x5d4037);
    // Bands
    barrel.rect(-11, -8, 22, 2);
    barrel.fill(0x424242);
    barrel.rect(-11, 2, 22, 2);
    barrel.fill(0x424242);
    container.addChild(barrel);
  } else if (type === 'lantern') {
    const lantern = new Graphics();
    // Post
    lantern.rect(-2, -30, 4, 30);
    lantern.fill(0x37474f);
    // Lantern body
    lantern.roundRect(-6, -42, 12, 14, 2);
    lantern.fill(0x263238);
    // Light glow
    lantern.circle(0, -35, 4);
    lantern.fill({ color: 0xffeb3b, alpha: 0.8 });
    container.addChild(lantern);
  } else if (type === 'rock') {
    const rock = new Graphics();
    rock.poly([
      { x: -12, y: 4 },
      { x: -8, y: -8 },
      { x: 4, y: -10 },
      { x: 14, y: -2 },
      { x: 10, y: 6 },
      { x: -4, y: 8 },
    ]);
    rock.fill(0x616161);
    rock.poly([
      { x: -8, y: -8 },
      { x: 4, y: -10 },
      { x: 2, y: -4 },
    ]);
    rock.fill(0x757575);
    container.addChild(rock);
  }

  // Add shadow
  const shadow = new Graphics();
  shadow.ellipse(0, 4, 12, 6);
  shadow.fill({ color: 0x000000, alpha: 0.25 });
  container.addChildAt(shadow, 0);

  return container;
}

/**
 * Create a door/gate shape
 */
export function createDoorShape(isOpen: boolean = false): Container {
  const container = new Container();
  const g = new Graphics();

  if (isOpen) {
    // Open gate - just the frame
    g.rect(-20, -48, 4, 48);
    g.fill(0x5d4037);
    g.rect(16, -48, 4, 48);
    g.fill(0x5d4037);
    g.rect(-20, -52, 40, 6);
    g.fill(0x4e342e);
  } else {
    // Closed gate
    g.rect(-20, -48, 40, 48);
    g.fill(0x6d4c41);
    // Vertical bars
    for (let i = -12; i <= 12; i += 8) {
      g.rect(i, -44, 3, 40);
      g.fill(0x37474f);
    }
    // Horizontal bar
    g.rect(-18, -28, 36, 4);
    g.fill(0x455a64);
  }

  container.addChild(g);
  return container;
}

/**
 * Create a pickup item shape
 */
export function createPickupShape(type: 'shuriken' | 'health' | 'key'): Container {
  const container = new Container();
  const g = new Graphics();

  // Glow effect
  const glow = new Graphics();
  glow.circle(0, -8, 16);
  glow.fill({ color: type === 'health' ? COLORS.HEALTH : COLORS.PRIMARY, alpha: 0.2 });
  container.addChild(glow);

  if (type === 'shuriken') {
    const shuriken = createProjectileShape('shuriken');
    shuriken.y = -10;
    container.addChild(shuriken);
  } else if (type === 'health') {
    // Heart shape
    g.moveTo(0, -4);
    g.bezierCurveTo(-8, -14, -14, -6, 0, 4);
    g.moveTo(0, -4);
    g.bezierCurveTo(8, -14, 14, -6, 0, 4);
    g.fill(COLORS.HEALTH);
    g.y = -8;
    container.addChild(g);
  } else if (type === 'key') {
    // Key shape
    g.circle(-6, -10, 5);
    g.fill(0xffd700);
    g.rect(-4, -10, 14, 3);
    g.fill(0xffd700);
    g.rect(6, -10, 2, 6);
    g.fill(0xffd700);
    g.rect(2, -10, 2, 4);
    g.fill(0xffd700);
    container.addChild(g);
  }

  return container;
}

/**
 * Create vision cone graphics
 */
export function createVisionCone(
  range: number,
  angle: number,
  state: 'calm' | 'suspicious' | 'alert'
): Graphics {
  const g = new Graphics();

  const colors = {
    calm: COLORS.VISION_CONE_CALM,
    suspicious: COLORS.VISION_CONE_SUSPICIOUS,
    alert: COLORS.VISION_CONE_ALERT,
  };

  const color = colors[state];
  const segments = 12;
  const halfAngle = angle / 2;

  // Draw cone as polygon
  g.moveTo(0, 0);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const currentAngle = -halfAngle + angle * t - Math.PI / 2;
    const x = Math.cos(currentAngle) * range * TILE_WIDTH;
    const y = Math.sin(currentAngle) * range * TILE_HEIGHT;
    g.lineTo(x, y);
  }
  g.closePath();
  g.fill({ color, alpha: 0.15 });
  g.stroke({ color, width: 1, alpha: 0.4 });

  return g;
}

/**
 * Create a highlight ring for selection/interaction
 */
export function createHighlightRing(radius: number, color: number): Graphics {
  const g = new Graphics();

  // Outer glow
  g.ellipse(0, 0, radius + 4, (radius + 4) * 0.5);
  g.fill({ color, alpha: 0.1 });

  // Main ring
  g.ellipse(0, 0, radius, radius * 0.5);
  g.stroke({ color, width: 2, alpha: 0.8 });

  return g;
}

/**
 * Create text label for debugging or prompts
 */
export function createLabel(
  text: string,
  fontSize: number = 12,
  color: number = 0xffffff
): Text {
  const style = new TextStyle({
    fontFamily: 'Inter, sans-serif',
    fontSize,
    fill: color,
    align: 'center',
  });
  return new Text({ text, style });
}

// Helper functions

function shadeColor(color: number, percent: number): number {
  const r = Math.max(0, Math.min(255, ((color >> 16) & 0xff) * (1 + percent)));
  const g = Math.max(0, Math.min(255, ((color >> 8) & 0xff) * (1 + percent)));
  const b = Math.max(0, Math.min(255, (color & 0xff) * (1 + percent)));
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

function addGrassPattern(g: Graphics, hw: number, hh: number): void {
  // Add grass blade details
  const grassColor = 0x4caf50;
  for (let i = 0; i < 5; i++) {
    const x = (Math.random() - 0.5) * hw;
    const y = (Math.random() - 0.5) * hh * 0.8;
    g.moveTo(x, y);
    g.lineTo(x - 1, y - 4);
    g.lineTo(x + 1, y - 3);
    g.stroke({ color: grassColor, width: 1, alpha: 0.5 });
  }
}

function addTallGrassPattern(g: Graphics, hw: number, hh: number): void {
  // Add tall grass for hiding spots - much denser and taller
  const grassColors = [0x2e7d32, 0x388e3c, 0x43a047, 0x4caf50];

  // Draw many tall grass blades
  for (let i = 0; i < 20; i++) {
    const x = (Math.random() - 0.5) * hw * 1.4;
    const y = (Math.random() - 0.5) * hh * 1.2;
    const height = 10 + Math.random() * 14; // Tall grass (10-24 pixels)
    const color = grassColors[Math.floor(Math.random() * grassColors.length)];
    const sway = (Math.random() - 0.5) * 4; // Random sway direction

    // Draw grass blade as a thin triangle
    g.moveTo(x - 1, y);
    g.lineTo(x + sway, y - height);
    g.lineTo(x + 1, y);
    g.closePath();
    g.fill({ color, alpha: 0.9 });
  }

  // Add some grass tufts (clusters)
  for (let i = 0; i < 6; i++) {
    const cx = (Math.random() - 0.5) * hw * 0.8;
    const cy = (Math.random() - 0.5) * hh * 0.6;
    const color = grassColors[Math.floor(Math.random() * grassColors.length)];

    // Draw a small grass tuft
    for (let j = 0; j < 3; j++) {
      const offsetX = (j - 1) * 3;
      const height = 12 + Math.random() * 8;
      g.moveTo(cx + offsetX - 1, cy);
      g.lineTo(cx + offsetX + (Math.random() - 0.5) * 2, cy - height);
      g.lineTo(cx + offsetX + 1, cy);
      g.closePath();
      g.fill({ color, alpha: 0.85 });
    }
  }
}

function addStonePattern(g: Graphics, hw: number, hh: number): void {
  // Add crack details
  const crackColor = 0x555555;
  g.moveTo(-hw * 0.3, -hh * 0.2);
  g.lineTo(0, hh * 0.1);
  g.lineTo(hw * 0.2, -hh * 0.1);
  g.stroke({ color: crackColor, width: 1, alpha: 0.3 });
}

function addWaterPattern(g: Graphics, _hw: number, _hh: number): void {
  // Add wave highlights
  const waveColor = 0x64b5f6;
  g.moveTo(-10, -2);
  g.bezierCurveTo(-5, -4, 5, 0, 10, -2);
  g.stroke({ color: waveColor, width: 1, alpha: 0.4 });
}

// Export light direction for external use
export { LIGHT_DIRECTION };
