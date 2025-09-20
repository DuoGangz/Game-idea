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
    this.activePopup = null;
    this.lastGrid = null;
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
    this.closeBuildingMenu();
  }

  onShutdown() {
    this.gameState.off('building-selected', this.handleBuildingSelected, this);
    this.gameState.off('city-updated', this.syncBuildingsFromState, this);
    this.closeBuildingMenu();
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

    this.closeBuildingMenu();

    const tileData = this.lastGrid?.[row]?.[col] ?? null;
    if (tileData) {
      this.openBuildingMenu(col, row, tileData);
      return;
    }

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
        case 'resources': {
          const cost = this.gameState.getBuildingTierCost(this.selectedBuildingKey, 1);
          const description = this.describeCost(cost);
          this.gameState.notify(
            description
              ? `You need more resources for that structure (${description}).`
              : 'You need more resources for that structure.'
          );
          break;
        }
        case 'population':
          this.gameState.notify(`Recruit more citizens before constructing another barracks (needs ${result.required}).`);
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
    this.lastGrid = grid;
    const activeKeys = new Set();

    grid.forEach((row, rowIndex) => {
      row.forEach((tileData, colIndex) => {
        const key = `${colIndex},${rowIndex}`;
        const tile = this.tiles[rowIndex]?.[colIndex];
        if (!tile || !tileData) {
          return;
        }

        activeKeys.add(key);
        const blueprint = this.gameState.getBuildingBlueprint(tileData.key);
        if (!blueprint) {
          return;
        }

        let entry = this.buildingSprites.get(key);
        if (!entry || entry.type !== tileData.key) {
          if (entry) {
            entry.container.destroy();
          }

          const container = this.add.container(tile.x, tile.y).setDepth(6);
          const sprite = this.add.image(0, 0, blueprint.texture).setDepth(6);
          container.add(sprite);

          const levelText = this.add
            .text(0, this.tileSize / 2 - 20, '', {
              fontFamily: 'Cinzel',
              fontSize: '18px',
              color: '#f8f4e3'
            })
            .setOrigin(0.5);
          container.add(levelText);

          let citizenText = null;
          if ((blueprint.citizenRequirement ?? 0) > 0) {
            citizenText = this.add
              .text(0, -this.tileSize / 2 + 20, '', {
                fontFamily: 'Cinzel',
                fontSize: '16px',
                color: '#d5c6a1'
              })
              .setOrigin(0.5);
            container.add(citizenText);
          }

          entry = {
            container,
            sprite,
            levelText,
            citizenText,
            type: tileData.key,
            requirement: blueprint.citizenRequirement ?? 0
          };

          this.buildingSprites.set(key, entry);
        }

        entry.levelText.setText(`T${tileData.level}`);
        if (entry.citizenText) {
          entry.citizenText.setText(`${tileData.assignedCitizens}/${entry.requirement}`);
        }

        tile.setTint(0xffffff);
      });
    });

    this.buildingSprites.forEach((entry, key) => {
      if (!activeKeys.has(key)) {
        entry.container.destroy();
        this.buildingSprites.delete(key);
      }
    });

    this.tiles.forEach((row, rowIndex) => {
      row.forEach((tile, colIndex) => {
        const key = `${colIndex},${rowIndex}`;
        if (activeKeys.has(key)) {
          tile.setTint(0xffffff);
        } else {
          tile.clearTint();
        }
      });
    });

    if (this.activePopup) {
      const { col, row, titleText, citizenText } = this.activePopup;
      const tileData = grid[row]?.[col];
      if (!tileData) {
        this.closeBuildingMenu();
        return;
      }

      const blueprint = this.gameState.getBuildingBlueprint(tileData.key);
      if (blueprint) {
        titleText.setText(`${blueprint.name} — Tier ${tileData.level}`);
        if (citizenText) {
          citizenText.setText(`Citizens: ${tileData.assignedCitizens}/${blueprint.citizenRequirement ?? 0}`);
        }
      }
    }
  }

  openBuildingMenu(col, row, tileData) {
    const tile = this.tiles[row]?.[col];
    if (!tile) {
      return;
    }

    const getTileData = () => this.lastGrid?.[row]?.[col] ?? tileData;
    const current = getTileData();
    const blueprint = this.gameState.getBuildingBlueprint(current.key);
    if (!blueprint) {
      return;
    }

    this.closeBuildingMenu();

    const container = this.add.container(tile.x, tile.y - this.tileSize / 2 - 70).setDepth(50);
    const background = this.add
      .rectangle(0, 0, 300, 170, 0x111a2b, 0.95)
      .setStrokeStyle(2, 0xc89b3c, 0.6);
    container.add(background);

    const titleText = this.add
      .text(0, -56, `${blueprint.name} — Tier ${current.level}`, {
        fontFamily: 'Cinzel',
        fontSize: '20px',
        color: '#f8f4e3'
      })
      .setOrigin(0.5);
    container.add(titleText);

    let citizenText = null;
    if ((blueprint.citizenRequirement ?? 0) > 0) {
      citizenText = this.add
        .text(0, -20, `Citizens: ${current.assignedCitizens}/${blueprint.citizenRequirement}`, {
          fontFamily: 'Cinzel',
          fontSize: '16px',
          color: '#d5c6a1'
        })
        .setOrigin(0.5);
      container.add(citizenText);
    }

    const upgradeButton = this.createPopupButton(-80, 30, 'Upgrade', () => {
      const latest = getTileData();
      if (!latest) {
        this.closeBuildingMenu();
        return;
      }

      const upgradeBlueprint = this.gameState.getBuildingBlueprint(latest.key);
      if (!upgradeBlueprint) {
        this.closeBuildingMenu();
        return;
      }

      if (latest.level >= 5) {
        this.gameState.notify(`${upgradeBlueprint.name} is already at its peak tier.`);
        return;
      }

      const result = this.gameState.upgradeBuilding(col, row);
      if (!result.success) {
        if (result.reason === 'resources') {
          const cost = this.gameState.getBuildingTierCost(latest.key, latest.level + 1);
          const description = this.describeCost(cost);
          this.gameState.notify(
            description
              ? `Not enough resources to upgrade (${description}).`
              : 'Not enough resources to upgrade.'
          );
        } else if (result.reason === 'max-level') {
          this.gameState.notify(`${upgradeBlueprint.name} cannot be improved further.`);
        } else {
          this.gameState.notify('Unable to upgrade that structure.');
        }
        return;
      }

      this.gameState.notify(`${upgradeBlueprint.name} advanced to Tier ${result.level}.`);
    });
    container.add(upgradeButton);

    if (current.level >= 5) {
      upgradeButton.setEnabled(false);
      if (upgradeButton.label) {
        upgradeButton.label.setText('Max Tier');
      }
    }

    const refundPreview = this.gameState.getBuildingRefund(current.key, current.level);
    const refundText = this.describeCost(refundPreview);

    const demolishButton = this.createPopupButton(80, 30, 'Demolish', () => {
      const latest = getTileData();
      if (!latest) {
        this.closeBuildingMenu();
        return;
      }

      const removeBlueprint = this.gameState.getBuildingBlueprint(latest.key);
      const outcome = this.gameState.removeBuilding(col, row);
      if (!outcome.success) {
        this.gameState.notify('Unable to demolish that structure.');
        return;
      }

      const refundDescription = this.describeCost(outcome.refund);
      if (removeBlueprint) {
        this.gameState.notify(
          refundDescription
            ? `${removeBlueprint.name} dismantled. Refunded ${refundDescription}.`
            : `${removeBlueprint.name} dismantled.`
        );
      }
      this.closeBuildingMenu();
    });
    container.add(demolishButton);

    if (refundText) {
      demolishButton.label.setText(`Demolish (+${refundText})`);
      demolishButton.label.setFontSize(14);
    }

    const closeButton = this.createPopupButton(0, 78, 'Close', () => {
      this.closeBuildingMenu();
    });
    container.add(closeButton);

    this.activePopup = {
      container,
      col,
      row,
      titleText,
      citizenText
    };
  }

  closeBuildingMenu() {
    if (!this.activePopup) {
      return;
    }

    this.activePopup.container.destroy();
    this.activePopup = null;
  }

  createPopupButton(x, y, label, callback) {
    const container = this.add.container(x, y);
    const background = this.add.rectangle(0, 0, 160, 44, 0x1b2538, 0.85).setStrokeStyle(2, 0xc89b3c, 0.6);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'Cinzel',
        fontSize: '16px',
        color: '#f8f4e3'
      })
      .setOrigin(0.5);

    container.add([background, text]);
    container.setSize(160, 44);
    container.setDataEnabled();
    container.setData('disabled', false);
    container.background = background;
    container.label = text;

    container.setInteractive(new Phaser.Geom.Rectangle(-80, -22, 160, 44), Phaser.Geom.Rectangle.Contains);
    container.on('pointerover', () => {
      if (!container.getData('disabled')) {
        background.setFillStyle(0x233149, 0.95);
      }
    });
    container.on('pointerout', () => {
      if (!container.getData('disabled')) {
        background.setFillStyle(0x1b2538, 0.85);
      }
    });
    container.on('pointerup', () => {
      if (!container.getData('disabled')) {
        callback();
      }
    });

    container.setEnabled = (enabled) => {
      container.setData('disabled', !enabled);
      background.setFillStyle(enabled ? 0x1b2538 : 0x101722, enabled ? 0.85 : 0.6);
      background.setStrokeStyle(2, enabled ? 0xc89b3c : 0x444b5d, enabled ? 0.6 : 0.3);
      text.setAlpha(enabled ? 1 : 0.6);
    };

    return container;
  }

  describeCost(cost = {}) {
    if (!cost) {
      return '';
    }

    return Object.entries(cost)
      .filter(([, amount]) => amount > 0)
      .map(([resource, amount]) => `${amount} ${resource.charAt(0).toUpperCase()}${resource.slice(1)}`)
      .join(', ');
  }

  collectProduction() {
    const summary = this.gameState.processCityTick();
    if (summary) {
      this.gameState.notify(summary);
    }
  }
}
