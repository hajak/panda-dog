/* ============================================
   SHADOW NINJA - Shape Renderer
   Procedural graphics generation for placeholders
   ============================================ */

import { Graphics, Container, Text, TextStyle } from 'pixi.js';
import { TILE_WIDTH, TILE_HEIGHT, TILE_DEPTH, COLORS, LIGHT_DIRECTION } from './constants';

/**
 * Create an isometric tile shape - Low-poly style with clean faces
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

  // Low-poly color palette with sharper contrast
  const topColor = color;
  const leftColor = shadeColor(color, -0.4);
  const rightColor = shadeColor(color, -0.2);
  const edgeColor = shadeColor(color, -0.5);

  // Draw sides if elevated
  if (depth > 0) {
    // Left side - clean flat face
    g.poly([
      { x: -hw, y: 0 },
      { x: 0, y: hh },
      { x: 0, y: hh + depth },
      { x: -hw, y: depth },
    ]);
    g.fill(leftColor);

    // Right side - clean flat face
    g.poly([
      { x: hw, y: 0 },
      { x: 0, y: hh },
      { x: 0, y: hh + depth },
      { x: hw, y: depth },
    ]);
    g.fill(rightColor);

    // Edge highlight for depth
    g.moveTo(-hw, 0);
    g.lineTo(0, hh);
    g.lineTo(hw, 0);
    g.stroke({ color: edgeColor, width: 1, alpha: 0.5 });
  }

  // Top surface - clean diamond
  g.poly([
    { x: 0, y: -hh },
    { x: hw, y: 0 },
    { x: 0, y: hh },
    { x: -hw, y: 0 },
  ]);
  g.fill(topColor);

  // Add subtle edge definition for low-poly look
  g.poly([
    { x: 0, y: -hh },
    { x: hw, y: 0 },
    { x: 0, y: hh },
    { x: -hw, y: 0 },
  ]);
  g.stroke({ color: edgeColor, width: 0.5, alpha: 0.3 });

  // Add pattern details (simplified for low-poly)
  if (pattern === 'grass') {
    if (isHidingSpot) {
      addTallGrassPatternLowPoly(g, hw, hh);
    } else {
      addGrassPatternLowPoly(g, hw, hh);
    }
  } else if (pattern === 'stone') {
    addStonePatternLowPoly(g, hw, hh);
  } else if (pattern === 'water') {
    addWaterPatternLowPoly(g, hw, hh);
  }

  return g;
}

/**
 * Create an isometric wall/block - Low-poly style with edge highlights
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
  const leftColor = shadeColor(color, -0.4);
  const rightColor = shadeColor(color, -0.2);
  const edgeColor = shadeColor(color, -0.5);

  // Left face - clean flat surface
  g.poly([
    { x: -hw, y: 0 },
    { x: -hw, y: -blockHeight },
    { x: 0, y: hh - blockHeight },
    { x: 0, y: hh },
  ]);
  g.fill(leftColor);

  // Right face - clean flat surface
  g.poly([
    { x: hw, y: 0 },
    { x: hw, y: -blockHeight },
    { x: 0, y: hh - blockHeight },
    { x: 0, y: hh },
  ]);
  g.fill(rightColor);

  // Top face - clean flat surface
  g.poly([
    { x: 0, y: -hh - blockHeight },
    { x: hw, y: -blockHeight },
    { x: 0, y: hh - blockHeight },
    { x: -hw, y: -blockHeight },
  ]);
  g.fill(topColor);

  // Edge highlights for low-poly definition
  // Top edges
  g.moveTo(0, -hh - blockHeight);
  g.lineTo(hw, -blockHeight);
  g.lineTo(0, hh - blockHeight);
  g.lineTo(-hw, -blockHeight);
  g.closePath();
  g.stroke({ color: edgeColor, width: 0.5, alpha: 0.4 });

  // Vertical edge highlight
  g.moveTo(0, hh - blockHeight);
  g.lineTo(0, hh);
  g.stroke({ color: edgeColor, width: 0.5, alpha: 0.3 });

  return g;
}

/**
 * Create a character shape (ninja/guard/archer) - Low-poly voxel style
 */
export function createCharacterShape(
  color: number,
  size: number = 1,
  type: 'ninja' | 'guard' | 'archer' = 'ninja'
): Container {
  const container = new Container();

  const baseSize = 14 * size;
  const height = 28 * size;

  // Shadow - hexagonal for low-poly feel
  const shadow = new Graphics();
  shadow.poly([
    { x: -baseSize * 0.6, y: 3 },
    { x: 0, y: 6 },
    { x: baseSize * 0.6, y: 3 },
    { x: baseSize * 0.6, y: -1 },
    { x: 0, y: -4 },
    { x: -baseSize * 0.6, y: -1 },
  ]);
  shadow.fill({ color: 0x000000, alpha: 0.35 });
  container.addChild(shadow);

  // Low-poly voxel body
  if (type === 'ninja') {
    drawLowPolyNinja(container, color, baseSize, height);
  } else if (type === 'guard') {
    drawLowPolyGuard(container, color, baseSize, height);
  } else if (type === 'archer') {
    drawLowPolyArcher(container, color, baseSize, height);
  }

  return container;
}

function drawLowPolyNinja(container: Container, color: number, baseSize: number, height: number): void {
  const g = new Graphics();
  const topColor = color;
  const leftColor = shadeColor(color, -0.35);
  const rightColor = shadeColor(color, -0.2);

  // === LEGS (two blocky columns) ===
  const legWidth = baseSize * 0.25;
  const legHeight = height * 0.35;
  const legGap = baseSize * 0.15;

  // Left leg - front face
  g.rect(-legGap - legWidth, -legHeight, legWidth, legHeight);
  g.fill(leftColor);
  // Left leg - top
  g.rect(-legGap - legWidth, -legHeight - 2, legWidth, 2);
  g.fill(topColor);

  // Right leg - front face
  g.rect(legGap, -legHeight, legWidth, legHeight);
  g.fill(rightColor);
  // Right leg - top
  g.rect(legGap, -legHeight - 2, legWidth, 2);
  g.fill(topColor);

  // === TORSO (isometric cube) ===
  const torsoWidth = baseSize * 0.7;
  const torsoHeight = height * 0.35;
  const torsoBottom = -legHeight;
  const torsoTop = torsoBottom - torsoHeight;

  // Torso - left face
  g.poly([
    { x: -torsoWidth / 2, y: torsoBottom },
    { x: -torsoWidth / 2, y: torsoTop },
    { x: 0, y: torsoTop - 4 },
    { x: 0, y: torsoBottom - 4 },
  ]);
  g.fill(leftColor);

  // Torso - right face
  g.poly([
    { x: torsoWidth / 2, y: torsoBottom },
    { x: torsoWidth / 2, y: torsoTop },
    { x: 0, y: torsoTop - 4 },
    { x: 0, y: torsoBottom - 4 },
  ]);
  g.fill(rightColor);

  // Torso - top face
  g.poly([
    { x: 0, y: torsoTop - 8 },
    { x: torsoWidth / 2, y: torsoTop },
    { x: 0, y: torsoTop + 4 },
    { x: -torsoWidth / 2, y: torsoTop },
  ]);
  g.fill(topColor);

  // === HEAD (blocky cube) ===
  const headSize = baseSize * 0.5;
  const headBottom = torsoTop - 2;
  const headTop = headBottom - headSize;

  // Head - left face
  g.poly([
    { x: -headSize / 2, y: headBottom },
    { x: -headSize / 2, y: headTop },
    { x: 0, y: headTop - 3 },
    { x: 0, y: headBottom - 3 },
  ]);
  g.fill(shadeColor(0x4a4a4a, -0.2));

  // Head - right face
  g.poly([
    { x: headSize / 2, y: headBottom },
    { x: headSize / 2, y: headTop },
    { x: 0, y: headTop - 3 },
    { x: 0, y: headBottom - 3 },
  ]);
  g.fill(shadeColor(0x4a4a4a, 0.1));

  // Head - top
  g.poly([
    { x: 0, y: headTop - 6 },
    { x: headSize / 2, y: headTop },
    { x: 0, y: headTop + 3 },
    { x: -headSize / 2, y: headTop },
  ]);
  g.fill(0x4a4a4a);

  // Ninja mask eye slit
  g.rect(-headSize * 0.35, headTop + headSize * 0.3, headSize * 0.7, 3);
  g.fill(0x111111);

  // Headband (red accent)
  g.rect(-headSize * 0.45, headTop + 2, headSize * 0.9, 4);
  g.fill(0xe53935);

  container.addChild(g);
}

function drawLowPolyGuard(container: Container, color: number, baseSize: number, height: number): void {
  const g = new Graphics();
  const topColor = color;
  const leftColor = shadeColor(color, -0.35);
  const rightColor = shadeColor(color, -0.2);

  // Wider, bulkier proportions
  const bodyWidth = baseSize * 0.9;
  const bodyHeight = height * 0.55;

  // === BODY (large isometric block) ===
  // Body - left face
  g.poly([
    { x: -bodyWidth / 2, y: 0 },
    { x: -bodyWidth / 2, y: -bodyHeight },
    { x: 0, y: -bodyHeight - 6 },
    { x: 0, y: -6 },
  ]);
  g.fill(leftColor);

  // Body - right face
  g.poly([
    { x: bodyWidth / 2, y: 0 },
    { x: bodyWidth / 2, y: -bodyHeight },
    { x: 0, y: -bodyHeight - 6 },
    { x: 0, y: -6 },
  ]);
  g.fill(rightColor);

  // Body - top
  g.poly([
    { x: 0, y: -bodyHeight - 12 },
    { x: bodyWidth / 2, y: -bodyHeight },
    { x: 0, y: -bodyHeight + 6 },
    { x: -bodyWidth / 2, y: -bodyHeight },
  ]);
  g.fill(topColor);

  // Armor plate details
  g.rect(-bodyWidth * 0.35, -bodyHeight * 0.6, bodyWidth * 0.7, 4);
  g.fill(shadeColor(color, 0.2));

  // === HELMET (angular) ===
  const helmetSize = baseSize * 0.55;
  const helmetBottom = -bodyHeight;
  const helmetTop = helmetBottom - helmetSize * 0.8;

  // Helmet - left
  g.poly([
    { x: -helmetSize / 2, y: helmetBottom },
    { x: -helmetSize / 2, y: helmetTop },
    { x: 0, y: helmetTop - 4 },
    { x: 0, y: helmetBottom - 4 },
  ]);
  g.fill(shadeColor(0x795548, -0.3));

  // Helmet - right
  g.poly([
    { x: helmetSize / 2, y: helmetBottom },
    { x: helmetSize / 2, y: helmetTop },
    { x: 0, y: helmetTop - 4 },
    { x: 0, y: helmetBottom - 4 },
  ]);
  g.fill(shadeColor(0x795548, 0.1));

  // Helmet - top (dome)
  g.poly([
    { x: 0, y: helmetTop - 8 },
    { x: helmetSize / 2, y: helmetTop },
    { x: 0, y: helmetTop + 4 },
    { x: -helmetSize / 2, y: helmetTop },
  ]);
  g.fill(0x795548);

  // Visor slit
  g.rect(-helmetSize * 0.3, helmetTop + helmetSize * 0.35, helmetSize * 0.6, 3);
  g.fill(0x111111);

  container.addChild(g);
}

function drawLowPolyArcher(container: Container, color: number, baseSize: number, height: number): void {
  const g = new Graphics();
  const topColor = color;
  const leftColor = shadeColor(color, -0.35);
  const rightColor = shadeColor(color, -0.2);

  const bodyWidth = baseSize * 0.65;
  const bodyHeight = height * 0.5;

  // === BODY ===
  // Body - left face
  g.poly([
    { x: -bodyWidth / 2, y: 0 },
    { x: -bodyWidth / 2, y: -bodyHeight },
    { x: 0, y: -bodyHeight - 5 },
    { x: 0, y: -5 },
  ]);
  g.fill(leftColor);

  // Body - right face
  g.poly([
    { x: bodyWidth / 2, y: 0 },
    { x: bodyWidth / 2, y: -bodyHeight },
    { x: 0, y: -bodyHeight - 5 },
    { x: 0, y: -5 },
  ]);
  g.fill(rightColor);

  // Body - top
  g.poly([
    { x: 0, y: -bodyHeight - 10 },
    { x: bodyWidth / 2, y: -bodyHeight },
    { x: 0, y: -bodyHeight + 5 },
    { x: -bodyWidth / 2, y: -bodyHeight },
  ]);
  g.fill(topColor);

  // === HOOD (angular pyramid) ===
  const hoodBase = -bodyHeight;
  const hoodTop = hoodBase - baseSize * 0.5;

  // Hood - front triangular face
  g.moveTo(0, hoodTop - 4);
  g.lineTo(baseSize * 0.35, hoodBase);
  g.lineTo(-baseSize * 0.35, hoodBase);
  g.closePath();
  g.fill(shadeColor(color, 0.1));

  // Hood shadow under
  g.rect(-baseSize * 0.25, hoodBase + 2, baseSize * 0.5, 4);
  g.fill(0x222222);

  // === QUIVER (blocky) ===
  const quiverColor = 0x6d4c41;
  g.rect(bodyWidth * 0.4, -bodyHeight * 0.8, 5, bodyHeight * 0.6);
  g.fill(quiverColor);
  // Arrow tips
  g.poly([
    { x: bodyWidth * 0.4, y: -bodyHeight * 0.85 },
    { x: bodyWidth * 0.4 + 2.5, y: -bodyHeight * 0.95 },
    { x: bodyWidth * 0.4 + 5, y: -bodyHeight * 0.85 },
  ]);
  g.fill(0x888888);

  container.addChild(g);
}

/**
 * Create a projectile shape (shuriken) - Low-poly style
 */
export function createProjectileShape(type: 'shuriken' | 'arrow' = 'shuriken'): Graphics {
  const g = new Graphics();

  if (type === 'shuriken') {
    // Clean 4-pointed star with flat surfaces
    const outerRadius = 9;
    const innerRadius = 3;

    // Main star shape
    g.poly([
      { x: 0, y: -outerRadius },
      { x: innerRadius, y: -innerRadius },
      { x: outerRadius, y: 0 },
      { x: innerRadius, y: innerRadius },
      { x: 0, y: outerRadius },
      { x: -innerRadius, y: innerRadius },
      { x: -outerRadius, y: 0 },
      { x: -innerRadius, y: -innerRadius },
    ]);
    g.fill(0xb0bec5);

    // Highlight facet
    g.poly([
      { x: 0, y: -outerRadius },
      { x: innerRadius, y: -innerRadius },
      { x: 0, y: 0 },
      { x: -innerRadius, y: -innerRadius },
    ]);
    g.fill(0xcfd8dc);

    // Center
    g.poly([
      { x: -2, y: -2 },
      { x: 2, y: -2 },
      { x: 2, y: 2 },
      { x: -2, y: 2 },
    ]);
    g.fill(0x455a64);
  } else {
    // Low-poly arrow
    // Shaft
    g.rect(-8, -1, 16, 2);
    g.fill(0x8d6e63);

    // Arrowhead (angular)
    g.poly([
      { x: 12, y: 0 },
      { x: 6, y: -4 },
      { x: 7, y: 0 },
      { x: 6, y: 4 },
    ]);
    g.fill(0x78909c);

    // Fletching
    g.poly([
      { x: -8, y: 0 },
      { x: -10, y: -3 },
      { x: -6, y: 0 },
    ]);
    g.fill(0xef5350);
    g.poly([
      { x: -8, y: 0 },
      { x: -10, y: 3 },
      { x: -6, y: 0 },
    ]);
    g.fill(0xc62828);
  }

  return g;
}

/**
 * Create a prop shape (tree, bush, crate, etc.) - Low-poly voxel style
 */
export function createPropShape(
  type: 'tree' | 'bush' | 'crate' | 'barrel' | 'lantern' | 'rock'
): Container {
  const container = new Container();

  if (type === 'tree') {
    // Low-poly tree with blocky trunk and angular foliage
    const trunk = new Graphics();
    const trunkColor = 0x6d4c41;

    // Isometric blocky trunk
    // Left face
    trunk.poly([
      { x: -5, y: 0 },
      { x: -5, y: -35 },
      { x: 0, y: -38 },
      { x: 0, y: -3 },
    ]);
    trunk.fill(shadeColor(trunkColor, -0.3));

    // Right face
    trunk.poly([
      { x: 5, y: 0 },
      { x: 5, y: -35 },
      { x: 0, y: -38 },
      { x: 0, y: -3 },
    ]);
    trunk.fill(shadeColor(trunkColor, -0.1));

    container.addChild(trunk);

    // Angular foliage pyramids (stacked)
    const foliageColors = [0x2e7d32, 0x388e3c, 0x43a047];
    const layers = [
      { y: -42, size: 24, height: 18 },
      { y: -55, size: 18, height: 14 },
      { y: -65, size: 12, height: 10 },
    ];

    for (let i = 0; i < layers.length; i++) {
      const { y, size, height } = layers[i];
      const foliage = new Graphics();
      const color = foliageColors[i];

      // Front face (diamond shape pointing down)
      foliage.poly([
        { x: 0, y: y - height },
        { x: size / 2, y: y },
        { x: 0, y: y + size / 4 },
        { x: -size / 2, y: y },
      ]);
      foliage.fill(color);

      // Left dark face
      foliage.poly([
        { x: 0, y: y - height },
        { x: -size / 2, y: y },
        { x: 0, y: y + size / 4 },
      ]);
      foliage.fill(shadeColor(color, -0.25));

      container.addChild(foliage);
    }
  } else if (type === 'bush') {
    // Low-poly bush - angular cluster
    const bush = new Graphics();
    const baseColor = 0x43a047;

    // Main angular shape (hexagonal)
    bush.poly([
      { x: 0, y: -16 },
      { x: 12, y: -10 },
      { x: 14, y: -2 },
      { x: 8, y: 4 },
      { x: -8, y: 4 },
      { x: -14, y: -2 },
      { x: -12, y: -10 },
    ]);
    bush.fill(baseColor);

    // Dark left facet
    bush.poly([
      { x: 0, y: -16 },
      { x: -12, y: -10 },
      { x: -14, y: -2 },
      { x: -8, y: 4 },
      { x: 0, y: 0 },
    ]);
    bush.fill(shadeColor(baseColor, -0.3));

    // Light top facet
    bush.poly([
      { x: 0, y: -16 },
      { x: 12, y: -10 },
      { x: 0, y: -6 },
      { x: -12, y: -10 },
    ]);
    bush.fill(shadeColor(baseColor, 0.15));

    container.addChild(bush);
  } else if (type === 'crate') {
    // Low-poly isometric crate
    const g = new Graphics();
    const crateColor = 0xa1887f;
    const size = 14;

    // Left face
    g.poly([
      { x: -size, y: 0 },
      { x: -size, y: -size * 1.2 },
      { x: 0, y: -size * 1.2 - 6 },
      { x: 0, y: -6 },
    ]);
    g.fill(shadeColor(crateColor, -0.35));

    // Right face
    g.poly([
      { x: size, y: 0 },
      { x: size, y: -size * 1.2 },
      { x: 0, y: -size * 1.2 - 6 },
      { x: 0, y: -6 },
    ]);
    g.fill(shadeColor(crateColor, -0.15));

    // Top face
    g.poly([
      { x: 0, y: -size * 1.2 - 12 },
      { x: size, y: -size * 1.2 },
      { x: 0, y: -size * 1.2 + 6 },
      { x: -size, y: -size * 1.2 },
    ]);
    g.fill(crateColor);

    // Cross detail on top
    g.moveTo(-size * 0.5, -size * 1.2 - 3);
    g.lineTo(size * 0.5, -size * 1.2 - 3);
    g.stroke({ color: shadeColor(crateColor, -0.3), width: 2 });

    container.addChild(g);
  } else if (type === 'barrel') {
    // Low-poly octagonal barrel
    const g = new Graphics();
    const barrelColor = 0x8d6e63;

    // Body (simplified octagon sides)
    const radius = 10;
    const height = 22;

    // Front-left face
    g.poly([
      { x: -radius, y: 0 },
      { x: -radius, y: -height },
      { x: -radius * 0.5, y: -height - 3 },
      { x: -radius * 0.5, y: -3 },
    ]);
    g.fill(shadeColor(barrelColor, -0.35));

    // Front face
    g.poly([
      { x: -radius * 0.5, y: -3 },
      { x: -radius * 0.5, y: -height - 3 },
      { x: radius * 0.5, y: -height - 3 },
      { x: radius * 0.5, y: -3 },
    ]);
    g.fill(shadeColor(barrelColor, -0.2));

    // Front-right face
    g.poly([
      { x: radius * 0.5, y: -3 },
      { x: radius * 0.5, y: -height - 3 },
      { x: radius, y: -height },
      { x: radius, y: 0 },
    ]);
    g.fill(shadeColor(barrelColor, -0.1));

    // Top (octagonal)
    g.poly([
      { x: 0, y: -height - 8 },
      { x: radius * 0.5, y: -height - 5 },
      { x: radius, y: -height },
      { x: radius * 0.5, y: -height + 3 },
      { x: -radius * 0.5, y: -height + 3 },
      { x: -radius, y: -height },
      { x: -radius * 0.5, y: -height - 5 },
    ]);
    g.fill(barrelColor);

    // Metal bands
    g.rect(-radius - 1, -height * 0.3, radius * 2 + 2, 3);
    g.fill(0x546e7a);
    g.rect(-radius - 1, -height * 0.7, radius * 2 + 2, 3);
    g.fill(0x546e7a);

    container.addChild(g);
  } else if (type === 'lantern') {
    // Low-poly angular lantern
    const g = new Graphics();

    // Post (blocky)
    g.poly([
      { x: -2, y: 0 },
      { x: -2, y: -28 },
      { x: 0, y: -30 },
      { x: 0, y: -2 },
    ]);
    g.fill(0x455a64);

    g.poly([
      { x: 2, y: 0 },
      { x: 2, y: -28 },
      { x: 0, y: -30 },
      { x: 0, y: -2 },
    ]);
    g.fill(0x607d8b);

    // Lantern body (hexagonal)
    const ly = -38;
    g.poly([
      { x: 0, y: ly - 8 },
      { x: 6, y: ly - 4 },
      { x: 6, y: ly + 6 },
      { x: 0, y: ly + 10 },
      { x: -6, y: ly + 6 },
      { x: -6, y: ly - 4 },
    ]);
    g.fill(0x37474f);

    // Light glow (diamond)
    g.poly([
      { x: 0, y: ly - 4 },
      { x: 4, y: ly + 1 },
      { x: 0, y: ly + 6 },
      { x: -4, y: ly + 1 },
    ]);
    g.fill({ color: 0xffeb3b, alpha: 0.9 });

    container.addChild(g);
  } else if (type === 'rock') {
    // Low-poly angular rock
    const g = new Graphics();
    const rockColor = 0x78909c;

    // Main body - angular facets
    g.poly([
      { x: -14, y: 4 },
      { x: -10, y: -6 },
      { x: -2, y: -10 },
      { x: 8, y: -8 },
      { x: 14, y: -2 },
      { x: 12, y: 6 },
      { x: 2, y: 8 },
      { x: -8, y: 6 },
    ]);
    g.fill(rockColor);

    // Top facet (lighter)
    g.poly([
      { x: -10, y: -6 },
      { x: -2, y: -10 },
      { x: 8, y: -8 },
      { x: 2, y: -4 },
    ]);
    g.fill(shadeColor(rockColor, 0.2));

    // Left facet (darker)
    g.poly([
      { x: -14, y: 4 },
      { x: -10, y: -6 },
      { x: -4, y: -2 },
      { x: -8, y: 6 },
    ]);
    g.fill(shadeColor(rockColor, -0.25));

    container.addChild(g);
  }

  // Low-poly shadow (hexagonal)
  const shadow = new Graphics();
  shadow.poly([
    { x: -10, y: 3 },
    { x: 0, y: 6 },
    { x: 10, y: 3 },
    { x: 10, y: 1 },
    { x: 0, y: -2 },
    { x: -10, y: 1 },
  ]);
  shadow.fill({ color: 0x000000, alpha: 0.3 });
  container.addChildAt(shadow, 0);

  return container;
}

/**
 * Create a door/gate shape - Low-poly isometric wooden door
 */
export function createDoorShape(isOpen: boolean = false): Container {
  const container = new Container();
  const g = new Graphics();

  const doorWidth = 16;
  const doorHeight = 40;
  const doorDepth = 6;
  const woodColor = 0x6d4c41;
  const frameColor = 0x4e342e;
  const metalColor = 0x5d4037;

  // Shadow
  const shadow = new Graphics();
  shadow.poly([
    { x: -doorWidth * 0.6, y: 2 },
    { x: 0, y: 5 },
    { x: doorWidth * 0.6, y: 2 },
    { x: doorWidth * 0.6, y: 0 },
    { x: 0, y: -3 },
    { x: -doorWidth * 0.6, y: 0 },
  ]);
  shadow.fill({ color: 0x000000, alpha: 0.35 });
  container.addChild(shadow);

  if (isOpen) {
    // Open door - door swung open to the left (hinged on left side)

    // Door frame (the opening)
    g.poly([
      { x: -doorWidth - 2, y: 2 },
      { x: -doorWidth - 2, y: -doorHeight - 2 },
      { x: doorWidth + 2, y: -doorHeight - 2 },
      { x: doorWidth + 2, y: 2 },
    ]);
    g.fill(frameColor);

    // Dark interior/passage
    g.rect(-doorWidth, -doorHeight, doorWidth * 2, doorHeight);
    g.fill(0x1a1a1a);

    // The open door panel - swung inward and to the left
    // Door is now at an angle, showing its side
    const openDoorX = -doorWidth - 12;

    // Door back face (now visible because door is open)
    g.poly([
      { x: openDoorX, y: 0 },
      { x: openDoorX, y: -doorHeight },
      { x: openDoorX + doorDepth, y: -doorHeight - 3 },
      { x: openDoorX + doorDepth, y: -3 },
    ]);
    g.fill(shadeColor(woodColor, -0.25));

    // Door edge (thickness, now visible)
    g.poly([
      { x: openDoorX + doorDepth, y: -3 },
      { x: openDoorX + doorDepth, y: -doorHeight - 3 },
      { x: -doorWidth, y: -doorHeight },
      { x: -doorWidth, y: 0 },
    ]);
    g.fill(shadeColor(woodColor, -0.1));

    // Door inside face (the back of the door)
    g.poly([
      { x: openDoorX, y: 0 },
      { x: openDoorX, y: -doorHeight },
      { x: -doorWidth - 4, y: -doorHeight + 2 },
      { x: -doorWidth - 4, y: 2 },
    ]);
    g.fill(woodColor);

    // Hinge hardware
    g.rect(-doorWidth - 1, -doorHeight + 6, 3, 4);
    g.fill(metalColor);
    g.rect(-doorWidth - 1, -12, 3, 4);
    g.fill(metalColor);

  } else {
    // Closed door - solid wooden door with isometric depth

    // Door frame (behind door)
    g.poly([
      { x: -doorWidth - 2, y: 2 },
      { x: -doorWidth - 2, y: -doorHeight - 2 },
      { x: doorWidth + 2, y: -doorHeight - 2 },
      { x: doorWidth + 2, y: 2 },
    ]);
    g.fill(frameColor);

    // Door left face (depth)
    g.poly([
      { x: -doorWidth, y: 0 },
      { x: -doorWidth, y: -doorHeight },
      { x: -doorWidth + doorDepth, y: -doorHeight - doorDepth / 2 },
      { x: -doorWidth + doorDepth, y: -doorDepth / 2 },
    ]);
    g.fill(shadeColor(woodColor, -0.3));

    // Door top face (depth)
    g.poly([
      { x: -doorWidth, y: -doorHeight },
      { x: -doorWidth + doorDepth, y: -doorHeight - doorDepth / 2 },
      { x: doorWidth + doorDepth, y: -doorHeight - doorDepth / 2 },
      { x: doorWidth, y: -doorHeight },
    ]);
    g.fill(shadeColor(woodColor, 0.15));

    // Door front face
    g.rect(-doorWidth, -doorHeight, doorWidth * 2, doorHeight);
    g.fill(woodColor);

    // Vertical wood planks
    for (let i = 1; i < 4; i++) {
      const x = -doorWidth + (doorWidth * 2 * i) / 4;
      g.moveTo(x, -doorHeight + 2);
      g.lineTo(x, -2);
      g.stroke({ color: shadeColor(woodColor, -0.15), width: 1 });
    }

    // Horizontal metal bands
    const bandY1 = -doorHeight + 8;
    const bandY2 = -10;
    g.rect(-doorWidth + 2, bandY1, doorWidth * 2 - 4, 4);
    g.fill(metalColor);
    g.rect(-doorWidth + 2, bandY2, doorWidth * 2 - 4, 4);
    g.fill(metalColor);

    // Door handle (right side)
    g.circle(doorWidth - 6, -doorHeight / 2, 3);
    g.fill(metalColor);
    g.stroke({ color: shadeColor(metalColor, 0.3), width: 1 });

    // Metal studs on bands
    const studPositions = [
      { x: -doorWidth + 6, y: bandY1 + 2 },
      { x: doorWidth - 6, y: bandY1 + 2 },
      { x: -doorWidth + 6, y: bandY2 + 2 },
      { x: doorWidth - 6, y: bandY2 + 2 },
    ];
    for (const stud of studPositions) {
      g.circle(stud.x, stud.y, 2);
      g.fill(shadeColor(metalColor, 0.2));
    }
  }

  container.addChild(g);
  return container;
}

/**
 * Create stairs shape - Nethack-inspired dungeon stairs
 */
export function createStairsShape(direction: 'down' | 'up'): Container {
  const container = new Container();
  const g = new Graphics();

  const stairWidth = 28;
  const stairHeight = 40;
  const stepCount = 4;
  const stepHeight = stairHeight / stepCount;

  const isDown = direction === 'down';
  const baseColor = isDown ? 0x5d4037 : 0x78909c;
  const glowColor = isDown ? 0x00bcd4 : 0xffeb3b;

  // Shadow
  const shadow = new Graphics();
  shadow.poly([
    { x: 0, y: 10 },
    { x: stairWidth + 6, y: 18 },
    { x: 0, y: 26 },
    { x: -stairWidth - 6, y: 18 },
  ]);
  shadow.fill({ color: 0x000000, alpha: 0.5 });
  container.addChild(shadow);

  // Glow effect around stairs
  const glow = new Graphics();
  glow.poly([
    { x: 0, y: -stairHeight - 8 },
    { x: stairWidth + 8, y: -stairHeight / 2 },
    { x: 0, y: 10 },
    { x: -stairWidth - 8, y: -stairHeight / 2 },
  ]);
  glow.fill({ color: glowColor, alpha: 0.25 });
  container.addChild(glow);

  // Draw steps (from back to front for proper layering)
  for (let i = 0; i < stepCount; i++) {
    const stepY = -stairHeight + (i * stepHeight);
    const stepDepth = isDown ? i + 1 : stepCount - i;
    const depthOffset = stepDepth * 4;

    // Step top face
    g.poly([
      { x: 0, y: stepY - stepHeight / 2 + depthOffset },
      { x: stairWidth / 2 - i * 2, y: stepY + depthOffset },
      { x: 0, y: stepY + stepHeight / 2 + depthOffset },
      { x: -stairWidth / 2 + i * 2, y: stepY + depthOffset },
    ]);
    g.fill(shadeColor(baseColor, 0.1 - i * 0.1));

    // Step front face
    g.poly([
      { x: -stairWidth / 2 + i * 2, y: stepY + depthOffset },
      { x: 0, y: stepY + stepHeight / 2 + depthOffset },
      { x: 0, y: stepY + stepHeight / 2 + depthOffset + 6 },
      { x: -stairWidth / 2 + i * 2, y: stepY + depthOffset + 6 },
    ]);
    g.fill(shadeColor(baseColor, -0.3));

    // Step right face
    g.poly([
      { x: stairWidth / 2 - i * 2, y: stepY + depthOffset },
      { x: 0, y: stepY + stepHeight / 2 + depthOffset },
      { x: 0, y: stepY + stepHeight / 2 + depthOffset + 6 },
      { x: stairWidth / 2 - i * 2, y: stepY + depthOffset + 6 },
    ]);
    g.fill(shadeColor(baseColor, -0.15));
  }

  // Direction indicator (arrow)
  const arrowY = -stairHeight / 2;
  if (isDown) {
    // Down arrow
    g.poly([
      { x: 0, y: arrowY + 10 },
      { x: -8, y: arrowY - 2 },
      { x: -3, y: arrowY - 2 },
      { x: -3, y: arrowY - 10 },
      { x: 3, y: arrowY - 10 },
      { x: 3, y: arrowY - 2 },
      { x: 8, y: arrowY - 2 },
    ]);
    g.fill(glowColor);
    g.stroke({ color: 0xffffff, width: 1 });
  } else {
    // Up arrow
    g.poly([
      { x: 0, y: arrowY - 10 },
      { x: -8, y: arrowY + 2 },
      { x: -3, y: arrowY + 2 },
      { x: -3, y: arrowY + 10 },
      { x: 3, y: arrowY + 10 },
      { x: 3, y: arrowY + 2 },
      { x: 8, y: arrowY + 2 },
    ]);
    g.fill(glowColor);
    g.stroke({ color: 0xffffff, width: 1 });
  }

  // Border frame
  g.poly([
    { x: 0, y: -stairHeight - 4 },
    { x: stairWidth / 2 + 4, y: -stairHeight / 2 },
    { x: 0, y: 6 },
    { x: -stairWidth / 2 - 4, y: -stairHeight / 2 },
  ]);
  g.stroke({ color: glowColor, width: 3 });

  container.addChild(g);
  return container;
}

/**
 * Create a pickup item shape - Calm low-poly style (50% smaller for heart/shuriken)
 */
export function createPickupShape(type: 'shuriken' | 'health' | 'key'): Container {
  const container = new Container();
  const g = new Graphics();

  // Small shadow
  const shadow = new Graphics();
  shadow.poly([
    { x: -6, y: 2 },
    { x: 0, y: 4 },
    { x: 6, y: 2 },
    { x: 6, y: 0 },
    { x: 0, y: -2 },
    { x: -6, y: 0 },
  ]);
  shadow.fill({ color: 0x000000, alpha: 0.3 });
  container.addChild(shadow);

  const y = -8; // Float slightly above ground

  if (type === 'health') {
    // Small heart - 50% of original size
    const heartColor = 0xc62828;

    // Heart shape (smaller)
    g.poly([
      { x: 0, y: y + 6 },      // Bottom point
      { x: -6, y: y - 1 },     // Left bottom
      { x: -4, y: y - 5 },     // Left top
      { x: 0, y: y - 2 },      // Center dip
      { x: 4, y: y - 5 },      // Right top
      { x: 6, y: y - 1 },      // Right bottom
    ]);
    g.fill(heartColor);

    // Highlight on left lobe
    g.poly([
      { x: -4, y: y - 5 },
      { x: -2, y: y - 3 },
      { x: -5, y: y - 2 },
    ]);
    g.fill(shadeColor(heartColor, 0.3));

    // Subtle outline
    g.poly([
      { x: 0, y: y + 6 },
      { x: -6, y: y - 1 },
      { x: -4, y: y - 5 },
      { x: 0, y: y - 2 },
      { x: 4, y: y - 5 },
      { x: 6, y: y - 1 },
    ]);
    g.stroke({ color: shadeColor(heartColor, -0.2), width: 1 });

  } else if (type === 'shuriken') {
    // Small shuriken - 50% of original size
    const metalColor = 0x90a4ae;
    const size = 6;
    const inner = 2;

    // 4-point star
    g.poly([
      { x: 0, y: y - size },
      { x: inner, y: y - inner },
      { x: size, y: y },
      { x: inner, y: y + inner },
      { x: 0, y: y + size },
      { x: -inner, y: y + inner },
      { x: -size, y: y },
      { x: -inner, y: y - inner },
    ]);
    g.fill(metalColor);

    // Top highlight facet
    g.poly([
      { x: 0, y: y - size },
      { x: inner, y: y - inner },
      { x: 0, y: y },
      { x: -inner, y: y - inner },
    ]);
    g.fill(shadeColor(metalColor, 0.25));

    // Left shadow facet
    g.poly([
      { x: -size, y: y },
      { x: -inner, y: y - inner },
      { x: 0, y: y },
      { x: -inner, y: y + inner },
    ]);
    g.fill(shadeColor(metalColor, -0.2));

    // Center hole
    g.circle(0, y, 1.5);
    g.fill(shadeColor(metalColor, -0.4));

  } else {
    // Key - keep similar size
    const keyColor = 0xffc107;

    // Key ring (circle)
    g.circle(-3, y, 5);
    g.fill(keyColor);
    g.circle(-3, y, 2);
    g.fill(shadeColor(keyColor, -0.3));

    // Key shaft
    g.rect(1, y - 2, 10, 4);
    g.fill(keyColor);

    // Key teeth
    g.rect(8, y + 2, 3, 4);
    g.fill(keyColor);

    // Highlight
    g.poly([
      { x: -5, y: y - 3 },
      { x: -2, y: y - 4 },
      { x: -1, y: y - 2 },
    ]);
    g.fill(shadeColor(keyColor, 0.3));

    // Outline
    g.circle(-3, y, 5);
    g.stroke({ color: shadeColor(keyColor, -0.2), width: 1 });
  }

  container.addChild(g);
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

// Low-poly style grass - geometric triangular tufts
function addGrassPatternLowPoly(g: Graphics, hw: number, hh: number): void {
  const grassColors = [0x4caf50, 0x66bb6a, 0x43a047];

  // Simple geometric grass tufts at fixed positions
  const positions = [
    { x: -hw * 0.3, y: -hh * 0.2 },
    { x: hw * 0.2, y: hh * 0.1 },
    { x: 0, y: 0 },
  ];

  for (const pos of positions) {
    const color = grassColors[Math.floor(Math.random() * grassColors.length)];
    // Simple triangle tuft
    g.moveTo(pos.x, pos.y);
    g.lineTo(pos.x - 3, pos.y - 6);
    g.lineTo(pos.x + 3, pos.y - 5);
    g.closePath();
    g.fill({ color, alpha: 0.7 });
  }
}

// Low-poly tall grass for hiding spots - larger geometric shapes
function addTallGrassPatternLowPoly(g: Graphics, hw: number, hh: number): void {
  const grassColors = [0x2e7d32, 0x388e3c, 0x43a047];

  // Fixed positions for consistent look
  const tufts = [
    { x: -hw * 0.4, y: 0 },
    { x: -hw * 0.1, y: -hh * 0.3 },
    { x: hw * 0.2, y: hh * 0.2 },
    { x: hw * 0.35, y: -hh * 0.1 },
    { x: 0, y: hh * 0.15 },
    { x: -hw * 0.25, y: hh * 0.25 },
  ];

  for (let i = 0; i < tufts.length; i++) {
    const { x, y } = tufts[i];
    const color = grassColors[i % grassColors.length];
    const height = 14 + (i % 3) * 4;

    // Blocky triangular blade
    g.moveTo(x - 2, y);
    g.lineTo(x, y - height);
    g.lineTo(x + 2, y);
    g.closePath();
    g.fill({ color, alpha: 0.9 });

    // Secondary blade
    g.moveTo(x + 1, y);
    g.lineTo(x + 3, y - height * 0.7);
    g.lineTo(x + 4, y);
    g.closePath();
    g.fill({ color: shadeColor(color, -0.15), alpha: 0.85 });
  }
}

// Low-poly stone pattern - geometric facets
function addStonePatternLowPoly(g: Graphics, hw: number, hh: number): void {
  // Geometric crack lines
  const crackColor = 0x555555;

  // Angular crack pattern
  g.moveTo(-hw * 0.4, -hh * 0.1);
  g.lineTo(-hw * 0.1, 0);
  g.lineTo(hw * 0.2, -hh * 0.15);
  g.stroke({ color: crackColor, width: 1, alpha: 0.4 });

  // Small facet highlight
  g.poly([
    { x: hw * 0.1, y: hh * 0.1 },
    { x: hw * 0.3, y: 0 },
    { x: hw * 0.2, y: hh * 0.2 },
  ]);
  g.fill({ color: 0xffffff, alpha: 0.1 });
}

// Low-poly water pattern - geometric ripples
function addWaterPatternLowPoly(g: Graphics, hw: number, hh: number): void {
  const rippleColor = 0x90caf9;

  // Angular wave lines
  g.moveTo(-hw * 0.4, -hh * 0.1);
  g.lineTo(-hw * 0.1, -hh * 0.2);
  g.lineTo(hw * 0.2, -hh * 0.1);
  g.lineTo(hw * 0.4, -hh * 0.15);
  g.stroke({ color: rippleColor, width: 1, alpha: 0.5 });

  // Second ripple
  g.moveTo(-hw * 0.3, hh * 0.15);
  g.lineTo(0, hh * 0.1);
  g.lineTo(hw * 0.3, hh * 0.2);
  g.stroke({ color: rippleColor, width: 1, alpha: 0.3 });
}

/**
 * Create a lever shape - Wall-mounted switch
 */
export function createLeverShape(isOn: boolean = false): Container {
  const container = new Container();
  const g = new Graphics();

  const baseColor = 0x5d4037;
  const metalColor = 0x78909c;
  const handleColor = isOn ? 0x4caf50 : 0xf44336;

  // Shadow
  const shadow = new Graphics();
  shadow.poly([
    { x: -8, y: 4 },
    { x: 0, y: 8 },
    { x: 8, y: 4 },
    { x: 0, y: 0 },
  ]);
  shadow.fill({ color: 0x000000, alpha: 0.4 });
  container.addChild(shadow);

  // Base plate (stone/metal mounting)
  g.poly([
    { x: -12, y: -16 },
    { x: 12, y: -16 },
    { x: 12, y: 4 },
    { x: -12, y: 4 },
  ]);
  g.fill(baseColor);

  // Base plate edge (depth)
  g.poly([
    { x: -12, y: 4 },
    { x: 12, y: 4 },
    { x: 10, y: 8 },
    { x: -10, y: 8 },
  ]);
  g.fill(shadeColor(baseColor, -0.3));

  // Metal pivot mount
  g.circle(0, -6, 6);
  g.fill(metalColor);
  g.circle(0, -6, 4);
  g.fill(shadeColor(metalColor, -0.2));

  // Lever handle - angle based on state
  const angle = isOn ? -Math.PI / 4 : Math.PI / 4;
  const handleLength = 18;
  const handleEndX = Math.sin(angle) * handleLength;
  const handleEndY = -6 - Math.cos(angle) * handleLength;

  // Handle shaft
  g.moveTo(0, -6);
  g.lineTo(handleEndX, handleEndY);
  g.stroke({ color: metalColor, width: 4 });

  // Handle knob
  g.circle(handleEndX, handleEndY, 5);
  g.fill(handleColor);
  g.circle(handleEndX, handleEndY, 3);
  g.fill(shadeColor(handleColor, 0.3));

  // Highlight on knob
  g.circle(handleEndX - 1, handleEndY - 1, 1.5);
  g.fill(shadeColor(handleColor, 0.5));

  // State indicator text area
  g.rect(-8, 0, 16, 3);
  g.fill(isOn ? 0x4caf50 : 0x263238);

  container.addChild(g);
  return container;
}

// Export light direction for external use
export { LIGHT_DIRECTION };
