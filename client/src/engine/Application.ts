/* ============================================
   SHADOW NINJA - PixiJS Application Wrapper
   ============================================ */

import { Application, Container } from 'pixi.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, LAYERS } from './constants';

export class GameApplication {
  private app: Application;
  private layers: Map<number, Container> = new Map();

  constructor() {
    this.app = new Application();
  }

  async init(canvas: HTMLCanvasElement): Promise<void> {
    await this.app.init({
      canvas,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: 0x12141a,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    this.createLayers();
  }

  private createLayers(): void {
    const layerOrder = [
      LAYERS.GROUND,
      LAYERS.GROUND_DECOR,
      LAYERS.SHADOWS,
      LAYERS.ENTITIES,
      LAYERS.EFFECTS,
      LAYERS.PROJECTILES,
      LAYERS.UI_WORLD,
    ];

    for (const layer of layerOrder) {
      const container = new Container();
      container.sortableChildren = true;
      this.layers.set(layer, container);
      this.app.stage.addChild(container);
    }
  }

  getLayer(layer: number): Container {
    const container = this.layers.get(layer);
    if (!container) {
      throw new Error(`Layer ${layer} not found`);
    }
    return container;
  }

  get stage(): Container {
    return this.app.stage;
  }

  get ticker(): Application['ticker'] {
    return this.app.ticker;
  }

  get renderer(): Application['renderer'] {
    return this.app.renderer;
  }

  resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
  }

  destroy(): void {
    this.app.destroy(true, { children: true, texture: true });
  }
}
