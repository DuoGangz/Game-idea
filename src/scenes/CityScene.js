import SceneKeys from '../config/SceneKeys.js';

export default class CityScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.City);
  }

  create() {
    this.gameState = this.registry.get('gameState');
    this.gridCols = 8;
    this.gridRows = 5;
    this.tileSize = 96;
    this.gridWidth = this.gridCols * this.tileSize;
    this.gridHeight = this.gridRows * this.tileSize;
    this.originX = (this.scale.width - this.gridWidth) / 2 + this.tileSize / 2;
    this.originY = 180;
    this.tiles = [];
    this.buildingSprites = new Map();
    this.selectedBuildingKey = this.gameState.getSelectedBuilding();

    this.add
      .rectangle(
        this.scale.width / 2,
        this.scale.height / 2 + 40,
        this.gridWidth + 64,
        this.gridHeight + 80,
        0x0c1320,
        0.85
      )
      .setStrokeStyle(4, 0xc89b3c, 0.35);

    this.createGrid();
    this.syncBuildingsFromState();

    this.productionTimer = this.time.addEvent({
      delay: 6000,
      loop: true,
      callback: this.collectProduction,
      callbackScope: this
    });

    this.gameState.on('building-selected', this.handleBuildingSelected, this);
    this.gameState.on('city-updated', this.syncBuildingsFromState, this);

    this.events.on('wake', this.onWake, this);
    this.events.on('sleep', this.onSleep, this);
    this.events.once('shutdown', this.onShutdown, this);
  }

  onWake() {
    this.selectedBuildingKey = this.gameState.getSelectedBuilding();
    this.syncBuildingsFromState();
    if (this.productionTimer) {
      this.productionTimer.paused = false;
    }
  }

  onSleep() {
    if (this.productionTimer) {
      this.productionTimer.paused = true;
    }
  }

  onShutdown() {
    this.gameState.off('building-selected', this.handleBuildingSelected, this);
    this.gameState.off('city-updated', this.syncBuildingsFromState, this);
  }

  createGrid() {
    for (let row = 0; row < this.gridRows; row += 1) {
      const rowTiles = [];
      for (let col = 0; col < this.gridCols; col += 1) {
        const x = this.originX + col * this.tileSize;
        const y = this.originY + row * this.tileSize;
        const tile = this.add
          .image(x, y, 'tile-empty')
          .setInteractive({ useHandCursor: true })
          .setData('gridPosition', { col, row });

        tile.on('pointerover', () => {
          tile.setTint(0x7a89b6);
        });

        tile.on('pointerout', () => {
          this.updateTileTint(tile);
        });

        tile.on('pointerup', () => {
          this.handleTileSelection(tile);
        });

        rowTiles.push(tile);
      }
      this.tiles.push(rowTiles);
    }
  }

  updateTileTint(tile) {
    const { col, row } = tile.getData('gridPosition');
    const key = `${col},${row}`;
    if (this.buildingSprites.has(key)) {
      tile.setTint(0xffffff);
    } else if (this.selectedBuildingKey) {
      tile.clearTint();
    } else {
      tile.clearTint();
    }
  }

  handleBuildingSelected(key) {
    this.selectedBuildingKey = key;
  }

  handleTileSelection(tile) {
    const { col, row } = tile.getData('gridPosition');

    if (!this.selectedBuildingKey) {
      this.gameState.notify('Select a building from the HUD to place it.');
      return;
    }

    const result = this.gameState.placeBuilding(col, row, this.selectedBuildingKey);

    if (!result.success) {
      switch (result.reason) {
        case 'occupied':
          this.gameState.notify('That plot is already developed.');
          break;
        case 'resources':
          this.gameState.notify('You need more resources for that structure.');
          break;
        default:
          this.gameState.notify('Unable to place that structure.');
      }
      return;
    }

    if (result.building) {
      this.gameState.notify(`${result.building.name} constructed.`);
    }
  }

  syncBuildingsFromState() {
    const grid = this.gameState.getCityGrid();
    const activeKeys = new Set();

    grid.forEach((row, rowIndex) => {
      row.forEach((tileData, colIndex) => {
        const key = `${colIndex},${rowIndex}`;
        const tile = this.tiles[rowIndex][colIndex];

        if (tileData) {
          activeKeys.add(key);
          if (!this.buildingSprites.has(key)) {
            const blueprint = this.gameState.getBuildingBlueprint(tileData.key);
            if (blueprint) {
              const sprite = this.add.image(tile.x, tile.y, blueprint.texture);
              sprite.setDepth(5);
              this.buildingSprites.set(key, sprite);
            }
          }
        }
      });
    });

    // Remove stale buildings
    this.buildingSprites.forEach((sprite, key) => {
      if (!activeKeys.has(key)) {
        sprite.destroy();
        this.buildingSprites.delete(key);
      }
    });

    // Refresh tile tinting
    this.tiles.forEach((row, rowIndex) => {
      row.forEach((tile, colIndex) => {
        const key = `${colIndex},${rowIndex}`;
        if (this.buildingSprites.has(key)) {
          tile.setTint(0xffffff);
        } else {
          tile.clearTint();
        }
      });
    });
  }

  collectProduction() {
    const totals = {};
    const grid = this.gameState.getCityGrid();

    grid.forEach((row) => {
      row.forEach((tileData) => {
        if (!tileData) {
          return;
        }

        const blueprint = this.gameState.getBuildingBlueprint(tileData.key);
        if (!blueprint || !blueprint.production) {
          return;
        }

        Object.entries(blueprint.production).forEach(([resource, amount]) => {
          totals[resource] = (totals[resource] ?? 0) + amount;
        });
      });
    });

    this.gameState.addResources(totals);

    const summary = Object.entries(totals)
      .filter(([, amount]) => amount > 0)
      .map(([resource, amount]) => `+${amount} ${resource}`)
      .join(', ');

    if (summary) {
      this.gameState.notify(`City production yielded ${summary}.`);
    }
  }
}
