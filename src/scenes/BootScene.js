import SceneKeys from '../config/SceneKeys.js';
import GameState from '../state/GameState.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  create() {
    this.createGeneratedTextures();

    const gameState = new GameState();
    this.registry.set('gameState', gameState);

    this.scene.start(SceneKeys.MainMenu);
  }

  createGeneratedTextures() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    const tileSize = 96;

    const drawTile = (key, fill, stroke, strokeAlpha = 1) => {
      graphics.clear();
      graphics.fillStyle(fill, 1);
      graphics.fillRoundedRect(0, 0, tileSize, tileSize, 18);
      graphics.lineStyle(4, stroke, strokeAlpha);
      graphics.strokeRoundedRect(2, 2, tileSize - 4, tileSize - 4, 16);
      graphics.generateTexture(key, tileSize, tileSize);
    };

    drawTile('tile-empty', 0x17202a, 0x0b1118);
    drawTile('tile-path', 0x332f5c, 0x7f6cd7, 0.75);

    const buildingSpecs = [
      {
        key: 'building-house',
        base: 0xcfa15f,
        roof: 0x8e5a2a
      },
      {
        key: 'building-lumber',
        base: 0x6bbf59,
        roof: 0x34682b
      },
      {
        key: 'building-quarry',
        base: 0x9aa6b2,
        roof: 0x56606c
      },
      {
        key: 'building-barracks',
        base: 0xd7d1bc,
        roof: 0x9e4737
      },
      {
        key: 'building-farm',
        custom: () => {
          graphics.clear();
          graphics.fillStyle(0x6ab04c, 1);
          graphics.fillRoundedRect(0, 42, tileSize, tileSize - 42, 20);
          graphics.fillStyle(0xf5cd79, 1);
          graphics.fillRoundedRect(12, 54, tileSize - 24, tileSize - 58, 12);
          graphics.lineStyle(4, 0x9b7d2a, 0.6);
          graphics.strokeRoundedRect(12, 54, tileSize - 24, tileSize - 58, 12);
          graphics.fillStyle(0x3c7340, 1);
          graphics.fillRoundedRect(18, 18, tileSize - 36, 26, 10);
          graphics.fillStyle(0xfad390, 1);
          graphics.fillCircle(tileSize / 2, 30, 8);
          graphics.generateTexture('building-farm', tileSize, tileSize);
        }
      },
      {
        key: 'building-hospital',
        custom: () => {
          graphics.clear();
          graphics.fillStyle(0xe6ecf8, 1);
          graphics.fillRoundedRect(0, 18, tileSize, tileSize - 18, 18);
          graphics.fillStyle(0x6c7ae0, 1);
          graphics.fillRoundedRect(0, 0, tileSize, 28, 18);
          graphics.fillStyle(0xc44569, 1);
          graphics.fillRect(tileSize / 2 - 8, 34, 16, 32);
          graphics.fillRect(tileSize / 2 - 20, 46, 40, 12);
          graphics.lineStyle(4, 0x4b6584, 0.6);
          graphics.strokeRoundedRect(2, 20, tileSize - 4, tileSize - 24, 14);
          graphics.generateTexture('building-hospital', tileSize, tileSize);
        }
      }
    ];

    buildingSpecs.forEach((spec) => {
      if (spec.custom) {
        spec.custom();
        return;
      }

      const { key, base, roof } = spec;
      graphics.clear();
      graphics.fillStyle(base, 1);
      graphics.fillRoundedRect(0, 18, tileSize, tileSize - 18, 16);
      graphics.fillStyle(roof, 1);
      graphics.fillRoundedRect(0, 0, tileSize, 26, 16);
      graphics.lineStyle(4, 0x1b1b1b, 0.4);
      graphics.strokeRoundedRect(2, 20, tileSize - 4, tileSize - 24, 12);
      graphics.generateTexture(key, tileSize, tileSize);
    });

    const towerSpecs = [
      { key: 'tower-archer', primary: 0xc27ba0, secondary: 0x532849 },
      { key: 'tower-cannon', primary: 0x7f8fa6, secondary: 0x293342 },
      { key: 'tower-magic', primary: 0x9c88ff, secondary: 0x3f2f72 }
    ];

    towerSpecs.forEach(({ key, primary, secondary }) => {
      graphics.clear();
      graphics.fillStyle(secondary, 1);
      graphics.fillRoundedRect(12, 16, tileSize - 24, tileSize - 20, 16);
      graphics.fillStyle(primary, 1);
      graphics.fillRoundedRect(20, 8, tileSize - 40, tileSize - 32, 16);
      graphics.fillStyle(0xffffff, 0.35);
      graphics.fillCircle(tileSize / 2, tileSize / 2, 12);
      graphics.generateTexture(key, tileSize, tileSize);
    });

    const enemySpecs = [
      { key: 'enemy-goblin', color: 0x4cd137 },
      { key: 'enemy-orc', color: 0x487eb0 },
      { key: 'enemy-dragon', color: 0xe84118 }
    ];

    enemySpecs.forEach(({ key, color }) => {
      graphics.clear();
      graphics.fillStyle(0x000000, 0.25);
      graphics.fillCircle(28, 44, 20);
      graphics.fillStyle(color, 1);
      graphics.fillCircle(32, 32, 26);
      graphics.lineStyle(4, 0xffffff, 0.35);
      graphics.strokeCircle(32, 32, 22);
      graphics.generateTexture(key, 64, 64);
    });

    const projectileSpecs = [
      { key: 'projectile-arrow', color: 0xf7eedd },
      { key: 'projectile-shell', color: 0xf5a623 },
      { key: 'projectile-orb', color: 0x8c7ae6 }
    ];

    projectileSpecs.forEach(({ key, color }) => {
      graphics.clear();
      graphics.fillStyle(0x000000, 0.4);
      graphics.fillCircle(10, 10, 10);
      graphics.fillStyle(color, 1);
      graphics.fillCircle(12, 12, 10);
      graphics.generateTexture(key, 24, 24);
    });

    graphics.destroy();
  }
}
