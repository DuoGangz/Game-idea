import SceneKeys from '../config/SceneKeys.js';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: SceneKeys.UI, active: false });
  }

  init(data) {
    this.mode = data?.mode ?? 'city';
  }

  create() {
    this.gameState = this.registry.get('gameState');
    this.buildingButtons = new Map();
    this.towerButtons = new Map();
    this.shopButtons = [];
    this.volumeControls = {};
    this.speedButtons = [];
    this.notificationTween = null;

    this.createHudLayer();
    this.createNavigation();
    this.createPanels();
    this.createNotificationArea();

    this.input.setTopOnly(true);

    this.gameState.on('resources-changed', this.updateResources, this);
    this.gameState.on('health-changed', this.updateHealth, this);
    this.gameState.on('wave-updated', this.updateWave, this);
    this.gameState.on('wave-state-changed', this.updateWaveState, this);
    this.gameState.on('building-selected', this.updateBuildingSelection, this);
    this.gameState.on('tower-selected', this.updateTowerSelection, this);
    this.gameState.on('notification', this.showNotification, this);
    this.gameState.on('game-over', this.handleGameOver, this);
    this.gameState.on('population-changed', this.updatePopulation, this);
    this.gameState.on('tower-support-changed', this.updateTowerSupport, this);
    this.gameState.on('game-speed-changed', this.updateSpeedDisplay, this);
    this.gameState.on('volume-changed', this.syncVolumeControls, this);

    this.events.once('shutdown', this.onShutdown, this);

    this.updateResources(this.gameState.getResources());
    this.updateHealth(this.gameState.getHealthState());
    this.updateWave(this.gameState.getCurrentWave());
    this.updateWaveState(this.gameState.isWaveRunning());
    this.updateBuildingSelection(this.gameState.getSelectedBuilding());
    this.updateTowerSelection(this.gameState.getSelectedTower());
    this.updatePopulation(this.gameState.getPopulationState());
    this.updateTowerSupport(this.gameState.getTowerSupportState());
    this.updateSpeedDisplay(this.gameState.getGameSpeed());
    this.syncVolumeControls(this.gameState.getVolumeState());

    this.setMode(this.mode);
  }

  createHudLayer() {
    const { width } = this.scale;
    this.add.rectangle(width / 2, 48, width, 96, 0x0b1118, 0.9).setDepth(10);

    this.resourceText = this.add
      .text(36, 18, '', {
        fontFamily: 'Cinzel',
        fontSize: '20px',
        color: '#f8f4e3'
      })
      .setDepth(11);

    this.healthText = this.add
      .text(width - 320, 18, '', {
        fontFamily: 'Cinzel',
        fontSize: '20px',
        color: '#f8f4e3'
      })
      .setDepth(11);

    this.waveText = this.add
      .text(width - 120, 18, '', {
        fontFamily: 'Cinzel',
        fontSize: '20px',
        color: '#f8f4e3'
      })
      .setDepth(11)
      .setOrigin(0.5, 0);
  }

  createNavigation() {
    const { width } = this.scale;
    const navY = 78;
    this.navButtons = {};

    this.navButtons.menu = this.createHudButton(width * 0.14, navY, 150, 'Main Menu', () => {
      this.navigateToMenu();
    });

    this.navButtons.settings = this.createHudButton(width * 0.32, navY, 160, 'Settings', () => {
      this.showSettings();
    });

    this.navButtons.shop = this.createHudButton(width * 0.5, navY, 160, 'Shop', () => {
      this.showShop();
    });

    this.navButtons.city = this.createHudButton(width * 0.68, navY, 170, 'City', () => {
      this.showCity();
    });

    this.navButtons.defense = this.createHudButton(width * 0.86, navY, 180, 'Defense', () => {
      this.showDefense();
    });
  }

  createPanels() {
    const { width } = this.scale;
    const panelY = 148;
    const panelWidth = width * 0.82;

    this.settingsPanel = this.createSettingsPanel(width / 2, panelY, panelWidth);
    this.shopPanel = this.createShopPanel(width / 2, panelY, panelWidth);
    this.cityPanel = this.createCityPanel(width / 2, panelY, panelWidth);
    this.defensePanel = this.createDefensePanel(width / 2, panelY, panelWidth);
  }

  createSettingsPanel(centerX, centerY, panelWidth) {
    const panel = this.add.container(centerX, centerY).setDepth(11);
    const bg = this.add.rectangle(0, 0, panelWidth, 200, 0x111a2b, 0.78).setStrokeStyle(2, 0xc89b3c, 0.3);
    panel.add(bg);

    const heading = this.add
      .text(-panelWidth / 2 + 20, -70, 'Audio Controls', {
        fontFamily: 'Cinzel',
        fontSize: '22px',
        color: '#f8f4e3'
      })
      .setOrigin(0, 0.5);
    panel.add(heading);

    const musicControl = this.createVolumeControl(-panelWidth / 2 + 260, -20, 'Music Volume', this.gameState.musicVolume ?? 50, (value) => {
      this.gameState.setMusicVolume(value);
    });
    panel.add(musicControl.container);
    this.volumeControls.music = musicControl;

    const effectsControl = this.createVolumeControl(-panelWidth / 2 + 260, 40, 'Effects Volume', this.gameState.effectsVolume ?? 50, (value) => {
      this.gameState.setEffectsVolume(value);
    });
    panel.add(effectsControl.container);
    this.volumeControls.effects = effectsControl;

    const resetButton = this.createHudButton(panelWidth / 2 - 160, 50, 240, 'Reset Kingdom', () => {
      this.gameState.reset();
      this.gameState.notify('The kingdom has been restored.');
      this.setMode('settings');
    });
    panel.add(resetButton);

    const resetHint = this.add
      .text(panelWidth / 2 - 160, 90, 'Restores resources, buildings, and waves.', {
        fontFamily: 'Cinzel',
        fontSize: '16px',
        color: '#d5c6a1'
      })
      .setOrigin(0.5, 0);
    panel.add(resetHint);

    return panel;
  }

  createShopPanel(centerX, centerY, panelWidth) {
    const panel = this.add.container(centerX, centerY).setDepth(11);
    const bg = this.add.rectangle(0, 0, panelWidth, 260, 0x111a2b, 0.78).setStrokeStyle(2, 0xc89b3c, 0.3);
    panel.add(bg);

    const title = this.add
      .text(-panelWidth / 2 + 20, -102, 'Construction Contracts', {
        fontFamily: 'Cinzel',
        fontSize: '22px',
        color: '#f8f4e3'
      })
      .setOrigin(0, 0.5);
    panel.add(title);

    const buildingKeys = ['house', 'lumberMill', 'quarry', 'farm', 'barracks', 'hospital'];
    buildingKeys.forEach((key, index) => {
      const blueprint = this.gameState.getBuildingBlueprint(key);
      if (!blueprint) {
        return;
      }
      const card = this.createShopCard(blueprint, index, buildingKeys.length, panelWidth, -20, key);
      panel.add(card.container);
      this.shopButtons.push(card.button);
    });

    const shardTitle = this.add
      .text(-panelWidth / 2 + 20, 60, 'Shard Exchange', {
        fontFamily: 'Cinzel',
        fontSize: '22px',
        color: '#f8f4e3'
      })
      .setOrigin(0, 0.5);
    panel.add(shardTitle);

    const shardPacks = [
      { key: 'shard-1', name: '1 Shard', cost: { gold: 500 } },
      { key: 'shard-5', name: '5 Shards', cost: { gold: 2000 } },
      { key: 'shard-10', name: '10 Shards', cost: { gold: 3500 } }
    ];
    shardPacks.forEach((pack, index) => {
      const card = this.createShardCard(pack, index, shardPacks.length, panelWidth, 120);
      panel.add(card.container);
      this.shopButtons.push(card.button);
    });

    return panel;
  }

  createCityPanel(centerX, centerY, panelWidth) {
    const panel = this.add.container(centerX, centerY).setDepth(11);
    const bg = this.add.rectangle(0, 0, panelWidth, 200, 0x111a2b, 0.78).setStrokeStyle(2, 0xc89b3c, 0.3);
    panel.add(bg);

    this.populationText = this.add
      .text(-panelWidth / 2 + 20, -74, '', {
        fontFamily: 'Cinzel',
        fontSize: '18px',
        color: '#f8f4e3'
      })
      .setOrigin(0, 0.5);
    panel.add(this.populationText);

    this.unassignedText = this.add
      .text(-panelWidth / 2 + 20, -40, '', {
        fontFamily: 'Cinzel',
        fontSize: '16px',
        color: '#d5c6a1'
      })
      .setOrigin(0, 0.5);
    panel.add(this.unassignedText);

    this.foodStoresText = this.add
      .text(-panelWidth / 2 + 20, -6, '', {
        fontFamily: 'Cinzel',
        fontSize: '16px',
        color: '#d5c6a1'
      })
      .setOrigin(0, 0.5);
    panel.add(this.foodStoresText);

    this.foodNeedText = this.add
      .text(-panelWidth / 2 + 20, 26, '', {
        fontFamily: 'Cinzel',
        fontSize: '16px',
        color: '#d5c6a1'
      })
      .setOrigin(0, 0.5);
    panel.add(this.foodNeedText);

    this.towerSupportCityText = this.add
      .text(panelWidth / 2 - 20, -74, '', {
        fontFamily: 'Cinzel',
        fontSize: '16px',
        color: '#f8f4e3'
      })
      .setOrigin(1, 0.5);
    panel.add(this.towerSupportCityText);

    const buildings = this.gameState.getBuildingList();
    buildings.forEach((building, index) => {
      const card = this.createBuildingCard(building, index, buildings.length, panelWidth);
      panel.add(card);
      this.buildingButtons.set(building.key, card);
    });

    return panel;
  }

  createDefensePanel(centerX, centerY, panelWidth) {
    const panel = this.add.container(centerX, centerY).setDepth(11);
    const bg = this.add.rectangle(0, 0, panelWidth, 220, 0x111a2b, 0.78).setStrokeStyle(2, 0xc89b3c, 0.3);
    panel.add(bg);

    this.towerSupportDefenseText = this.add
      .text(-panelWidth / 2 + 20, -86, '', {
        fontFamily: 'Cinzel',
        fontSize: '18px',
        color: '#f8f4e3'
      })
      .setOrigin(0, 0.5);
    panel.add(this.towerSupportDefenseText);

    const towers = this.gameState.getTowerList();
    towers.forEach((tower, index) => {
      const card = this.createTowerCard(tower, index, towers.length, panelWidth);
      panel.add(card);
      this.towerButtons.set(tower.key, card);
    });

    this.startWaveButton = this.createHudButton(panelWidth / 2 - 150, -10, 220, 'Start Wave', () => {
      this.gameState.emit('request-wave-start');
    });
    panel.add(this.startWaveButton);

    const speedLabel = this.add
      .text(-panelWidth / 2 + 20, 40, 'Game Speed', {
        fontFamily: 'Cinzel',
        fontSize: '18px',
        color: '#f8f4e3'
      })
      .setOrigin(0, 0.5);
    panel.add(speedLabel);

    const speeds = [1, 2, 3, 4, 5];
    speeds.forEach((speed, index) => {
      const button = this.createSmallButton(-panelWidth / 2 + 130 + index * 70, 40, `${speed}x`, () => {
        this.gameState.setGameSpeed(speed);
      });
      button.speed = speed;
      panel.add(button);
      this.speedButtons.push(button);
    });

    return panel;
  }

  createNotificationArea() {
    const { width } = this.scale;
    this.notificationText = this.add
      .text(width / 2, 116, '', {
        fontFamily: 'Cinzel',
        fontSize: '22px',
        color: '#f8f4e3'
      })
      .setOrigin(0.5)
      .setDepth(12)
      .setAlpha(0);
  }

  createBuildingCard(building, index, total, panelWidth) {
    const spacing = panelWidth / total;
    const container = this.add.container(-panelWidth / 2 + spacing * index + spacing / 2, 68);
    container.setSize(spacing - 20, 120);

    const background = this.add.rectangle(0, 0, spacing - 24, 120, 0x1b2538, 0.85).setStrokeStyle(2, 0x555e73, 0.5);
    const name = this.add.text(0, -44, building.name, {
      fontFamily: 'Cinzel',
      fontSize: '20px',
      color: '#f8f4e3'
    }).setOrigin(0.5);
    const cost = this.add.text(0, -14, this.describeCost(this.gameState.getBuildingTierCost(building.key, 1)), {
      fontFamily: 'Cinzel',
      fontSize: '16px',
      color: '#d5c6a1'
    }).setOrigin(0.5);

    const descriptionLines = [building.description];
    if ((building.citizenRequirement ?? 0) > 0) {
      descriptionLines.push(`Citizens: ${building.citizenRequirement}`);
    }
    if (building.towerSupport) {
      descriptionLines.push(`Tower Support: ${building.towerSupport}`);
    }

    const desc = this.add.text(0, 26, descriptionLines.join('
'), {
      fontFamily: 'Cinzel',
      fontSize: '14px',
      color: '#b6c1d1',
      align: 'center',
      wordWrap: { width: spacing - 48 }
    }).setOrigin(0.5);

    container.add([background, name, cost, desc]);
    container.setDataEnabled();
    container.setData('key', building.key);
    container.background = background;

    container.setInteractive(new Phaser.Geom.Rectangle(-spacing / 2, -60, spacing, 120), Phaser.Geom.Rectangle.Contains);
    container.on('pointerover', () => {
      background.setFillStyle(0x233149, 0.95);
    });
    container.on('pointerout', () => {
      this.applyBuildingHighlight();
    });
    container.on('pointerup', () => {
      const current = this.gameState.getSelectedBuilding();
      if (current === building.key) {
        this.gameState.selectBuilding(null);
      } else {
        this.gameState.selectBuilding(building.key);
      }
    });

    return container;
  }

  createTowerCard(tower, index, total, panelWidth) {
    const spacing = panelWidth / total;
    const container = this.add.container(-panelWidth / 2 + spacing * index + spacing / 2, -10);
    container.setSize(spacing - 20, 120);

    const background = this.add.rectangle(0, 0, spacing - 24, 120, 0x1b2538, 0.85).setStrokeStyle(2, 0x555e73, 0.5);
    const name = this.add.text(0, -42, tower.name, {
      fontFamily: 'Cinzel',
      fontSize: '20px',
      color: '#f8f4e3'
    }).setOrigin(0.5);
    const cost = this.add.text(0, -12, this.describeCost(tower.cost), {
      fontFamily: 'Cinzel',
      fontSize: '16px',
      color: '#d5c6a1'
    }).setOrigin(0.5);
    const stats = this.add.text(
      0,
      24,
      `DMG ${tower.damage} | RNG ${tower.range} | SPD ${(1000 / tower.fireRate).toFixed(1)}/s`,
      {
        fontFamily: 'Cinzel',
        fontSize: '14px',
        color: '#b6c1d1'
      }
    ).setOrigin(0.5);

    container.add([background, name, cost, stats]);
    container.setDataEnabled();
    container.setData('key', tower.key);
    container.background = background;

    container.setInteractive(new Phaser.Geom.Rectangle(-spacing / 2, -60, spacing, 120), Phaser.Geom.Rectangle.Contains);
    container.on('pointerover', () => {
      background.setFillStyle(0x233149, 0.95);
    });
    container.on('pointerout', () => {
      this.applyTowerHighlight();
    });
    container.on('pointerup', () => {
      const current = this.gameState.getSelectedTower();
      if (current === tower.key) {
        this.gameState.selectTower(null);
      } else {
        this.gameState.selectTower(tower.key);
      }
    });

    return container;
  }

  createShopCard(blueprint, index, total, panelWidth, yOffset, purchaseKey) {
    const spacing = panelWidth / total;
    const container = this.add.container(-panelWidth / 2 + spacing * index + spacing / 2, yOffset);
    container.setSize(spacing - 20, 120);

    const background = this.add.rectangle(0, 0, spacing - 24, 120, 0x1b2538, 0.85).setStrokeStyle(2, 0x555e73, 0.5);
    const name = this.add.text(0, -40, blueprint.name, {
      fontFamily: 'Cinzel',
      fontSize: '20px',
      color: '#f8f4e3'
    }).setOrigin(0.5);
    const cost = this.add.text(0, -12, this.describeCost(this.gameState.getBuildingTierCost(purchaseKey, 1)), {
      fontFamily: 'Cinzel',
      fontSize: '16px',
      color: '#d5c6a1'
    }).setOrigin(0.5);
    const desc = this.add.text(0, 18, blueprint.description, {
      fontFamily: 'Cinzel',
      fontSize: '14px',
      color: '#b6c1d1',
      wordWrap: { width: spacing - 48 }
    }).setOrigin(0.5);

    const button = this.createSmallButton(0, 50, 'Buy', () => {
      this.handleShopPurchase(purchaseKey);
    });

    container.add([background, name, cost, desc, button]);

    return { container, button };
  }

  createShardCard(pack, index, total, panelWidth, yOffset) {
    const spacing = panelWidth / total;
    const container = this.add.container(-panelWidth / 2 + spacing * index + spacing / 2, yOffset);
    container.setSize(spacing - 20, 110);

    const background = this.add.rectangle(0, 0, spacing - 24, 110, 0x1b2538, 0.85).setStrokeStyle(2, 0x555e73, 0.5);
    const name = this.add.text(0, -26, pack.name, {
      fontFamily: 'Cinzel',
      fontSize: '18px',
      color: '#f8f4e3'
    }).setOrigin(0.5);
    const cost = this.add.text(0, 4, this.describeCost(pack.cost), {
      fontFamily: 'Cinzel',
      fontSize: '16px',
      color: '#d5c6a1'
    }).setOrigin(0.5);

    const button = this.createSmallButton(0, 46, 'Buy', () => {
      this.handleShopPurchase(pack.key);
    });

    container.add([background, name, cost, button]);

    return { container, button };
  }

  createVolumeControl(x, y, label, initialValue, onChange) {
    const container = this.add.container(x, y);
    const labelText = this.add
      .text(-160, 0, label, {
        fontFamily: 'Cinzel',
        fontSize: '18px',
        color: '#f8f4e3'
      })
      .setOrigin(0, 0.5);
    const valueText = this.add
      .text(30, 0, `${initialValue}`, {
        fontFamily: 'Cinzel',
        fontSize: '18px',
        color: '#f8f4e3'
      })
      .setOrigin(0.5);

    let current = Phaser.Math.Clamp(Math.round(initialValue), 0, 100);

    const updateDisplay = (value) => {
      current = Phaser.Math.Clamp(Math.round(value), 0, 100);
      valueText.setText(`${current}`);
    };

    const emitChange = (value) => {
      const normalized = Phaser.Math.Clamp(Math.round(value), 0, 100);
      if (normalized === current) {
        return;
      }
      current = normalized;
      valueText.setText(`${current}`);
      onChange(current);
    };

    const minus = this.createSmallButton(-20, 0, '−', () => {
      emitChange(current - 10);
    });
    const plus = this.createSmallButton(90, 0, '+', () => {
      emitChange(current + 10);
    });

    container.add([labelText, valueText, minus, plus]);

    updateDisplay(current);

    return {
      container,
      updateDisplay
    };
  }

  createHudButton(x, y, width, label, callback) {
    const container = this.add.container(x, y).setDepth(12);
    const background = this.add.rectangle(0, 0, width, 46, 0x1a2436, 0.85).setStrokeStyle(2, 0xc89b3c, 0.6);
    const text = this.add.text(0, 0, label, {
      fontFamily: 'Cinzel',
      fontSize: '18px',
      color: '#f8f4e3'
    }).setOrigin(0.5);

    container.add([background, text]);
    container.setSize(width, 46);
    container.setDataEnabled();
    container.setData('disabled', false);
    container.setData('active', false);
    container.background = background;
    container.label = text;

    container.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -23, width, 46), Phaser.Geom.Rectangle.Contains);
    container.on('pointerover', () => {
      if (container.getData('disabled')) {
        return;
      }
      if (!container.getData('active')) {
        background.setFillStyle(0x233149, 0.95);
      }
    });
    container.on('pointerout', () => {
      this.resetButtonFill(container);
    });
    container.on('pointerup', () => {
      if (container.getData('disabled')) {
        return;
      }
      callback();
    });

    container.setEnabled = (enabled) => {
      container.setData('disabled', !enabled);
      background.setFillStyle(enabled ? 0x1a2436 : 0x101722, enabled ? 0.85 : 0.6);
      background.setStrokeStyle(2, enabled ? 0xc89b3c : 0x444b5d, enabled ? 0.6 : 0.3);
      text.setAlpha(enabled ? 1 : 0.6);
    };

    container.setActiveState = (active) => {
      container.setData('active', active);
      if (active) {
        background.setFillStyle(0x31405c, 0.95);
        background.setStrokeStyle(2, 0xc89b3c, 0.9);
      } else {
        this.resetButtonFill(container);
      }
    };

    return container;
  }

  createSmallButton(x, y, label, callback) {
    const container = this.add.container(x, y);
    const background = this.add.rectangle(0, 0, 60, 36, 0x1a2436, 0.85).setStrokeStyle(2, 0xc89b3c, 0.6);
    const text = this.add.text(0, 0, label, {
      fontFamily: 'Cinzel',
      fontSize: '18px',
      color: '#f8f4e3'
    }).setOrigin(0.5);

    container.add([background, text]);
    container.setSize(60, 36);
    container.setDataEnabled();
    container.setData('active', false);
    container.background = background;
    container.label = text;

    container.setInteractive(new Phaser.Geom.Rectangle(-30, -18, 60, 36), Phaser.Geom.Rectangle.Contains);
    container.on('pointerover', () => {
      if (!container.getData('active')) {
        background.setFillStyle(0x233149, 0.95);
      }
    });
    container.on('pointerout', () => {
      if (!container.getData('active')) {
        background.setFillStyle(0x1a2436, 0.85);
      }
    });
    container.on('pointerup', () => {
      callback();
    });

    container.setActiveState = (active) => {
      container.setData('active', active);
      if (active) {
        background.setFillStyle(0x31405c, 0.95);
        background.setStrokeStyle(2, 0xc89b3c, 0.9);
      } else {
        background.setFillStyle(0x1a2436, 0.85);
        background.setStrokeStyle(2, 0xc89b3c, 0.6);
      }
    };

    return container;
  }

  resetButtonFill(button) {
    if (button.getData('disabled')) {
      button.background.setFillStyle(0x101722, 0.6);
      button.background.setStrokeStyle(2, 0x444b5d, 0.3);
    } else if (button.getData('active')) {
      button.background.setFillStyle(0x31405c, 0.95);
      button.background.setStrokeStyle(2, 0xc89b3c, 0.9);
    } else {
      button.background.setFillStyle(0x1a2436, 0.85);
      button.background.setStrokeStyle(2, 0xc89b3c, 0.6);
    }
  }

  updateResources(resources) {
    const segments = [
      `Gold: ${Math.floor(resources.gold ?? 0)}`,
      `Wood: ${Math.floor(resources.wood ?? 0)}`,
      `Stone: ${Math.floor(resources.stone ?? 0)}`,
      `Food: ${Math.floor(resources.food ?? 0)}`,
      `Shards: ${Math.floor(resources.shards ?? 0)}`
    ];
    this.resourceText.setText(segments.join('   '));
    if (this.foodStoresText) {
      this.foodStoresText.setText(`Food Stores: ${Math.floor(resources.food ?? 0)}`);
    }
  }

  updateHealth(state) {
    if (!state) {
      return;
    }
    this.healthText.setText(`Health: ${state.current} / ${state.max}`);
  }

  updateWave(wave) {
    this.waveText.setText(`Wave ${wave}`);
  }

  updateWaveState(running) {
    if (!this.startWaveButton) {
      return;
    }

    this.startWaveButton.setEnabled(!running);
    this.startWaveButton.label.setText(running ? 'Wave In Progress' : 'Start Wave');
  }

  updateBuildingSelection(selectedKey) {
    this.selectedBuildingKey = selectedKey;
    this.applyBuildingHighlight();
  }

  updateTowerSelection(selectedKey) {
    this.selectedTowerKey = selectedKey;
    this.applyTowerHighlight();
  }

  updatePopulation(state) {
    if (!state) {
      return;
    }

    if (this.populationText) {
      this.populationText.setText(`Citizens: ${state.population} / ${state.capacity}`);
    }

    if (this.unassignedText) {
      this.unassignedText.setText(`Unassigned: ${state.unassigned}`);
    }

    const foodNeed = Math.max(0, Math.floor(this.gameState.getFoodRequirementPerTick()));
    if (this.foodNeedText) {
      this.foodNeedText.setText(`Food upkeep per cycle: ${foodNeed}`);
    }
  }

  updateTowerSupport(state) {
    if (!state) {
      return;
    }

    const label = `Tower Support: ${state.used} / ${state.support}`;
    if (this.towerSupportCityText) {
      this.towerSupportCityText.setText(label);
    }
    if (this.towerSupportDefenseText) {
      this.towerSupportDefenseText.setText(label);
    }
  }

  updateSpeedDisplay(speed) {
    if (!this.speedButtons) {
      return;
    }

    this.speedButtons.forEach((button) => {
      button.setActiveState(button.speed === speed);
    });
  }

  syncVolumeControls(volumes) {
    if (!volumes) {
      return;
    }

    if (this.volumeControls.music) {
      this.volumeControls.music.updateDisplay(volumes.music ?? 0);
    }
    if (this.volumeControls.effects) {
      this.volumeControls.effects.updateDisplay(volumes.effects ?? 0);
    }
  }

  applyBuildingHighlight() {
    this.buildingButtons.forEach((card, key) => {
      if (!card.background) {
        return;
      }
      if (this.selectedBuildingKey === key) {
        card.background.setFillStyle(0x31405c, 0.95);
        card.background.setStrokeStyle(2, 0xc89b3c, 0.8);
      } else {
        card.background.setFillStyle(0x1b2538, 0.85);
        card.background.setStrokeStyle(2, 0x555e73, 0.5);
      }
    });
  }

  applyTowerHighlight() {
    this.towerButtons.forEach((card, key) => {
      if (!card.background) {
        return;
      }
      if (this.selectedTowerKey === key) {
        card.background.setFillStyle(0x31405c, 0.95);
        card.background.setStrokeStyle(2, 0xc89b3c, 0.8);
      } else {
        card.background.setFillStyle(0x1b2538, 0.85);
        card.background.setStrokeStyle(2, 0x555e73, 0.5);
      }
    });
  }

  describeCost(cost) {
    if (!cost) {
      return 'N/A';
    }

    return Object.entries(cost)
      .filter(([, amount]) => amount > 0)
      .map(([resource, amount]) => `${amount} ${resource.charAt(0).toUpperCase()}${resource.slice(1)}`)
      .join(' | ');
  }

  setMode(mode) {
    this.mode = mode;

    const showSettings = mode === 'settings';
    const showShop = mode === 'shop';
    const showCity = mode === 'city';
    const showDefense = mode === 'defense';

    this.settingsPanel.setVisible(showSettings);
    this.shopPanel.setVisible(showShop);
    this.cityPanel.setVisible(showCity);
    this.defensePanel.setVisible(showDefense);

    this.buildingButtons.forEach((card) => {
      if (showCity) {
        card.setInteractive();
      } else {
        card.disableInteractive();
      }
    });

    this.towerButtons.forEach((card) => {
      if (showDefense) {
        card.setInteractive();
      } else {
        card.disableInteractive();
      }
    });

    this.shopButtons.forEach((button) => {
      if (showShop) {
        button.setInteractive();
      } else {
        button.disableInteractive();
      }
    });

    if (this.startWaveButton) {
      if (showDefense) {
        this.startWaveButton.setInteractive();
      } else {
        this.startWaveButton.disableInteractive();
      }
      this.startWaveButton.setVisible(showDefense);
    }

    if (showSettings) {
      this.syncVolumeControls(this.gameState.getVolumeState());
    }

    if (showDefense) {
      this.updateWaveState(this.gameState.isWaveRunning());
      this.updateSpeedDisplay(this.gameState.getGameSpeed());
    }

    this.updateNavHighlight();
  }

  updateNavHighlight() {
    if (!this.navButtons) {
      return;
    }

    this.navButtons.menu.setActiveState(false);
    this.navButtons.settings.setActiveState(this.mode === 'settings');
    this.navButtons.shop.setActiveState(this.mode === 'shop');
    this.navButtons.city.setActiveState(this.mode === 'city');
    this.navButtons.defense.setActiveState(this.mode === 'defense');
  }

  showSettings() {
    const manager = this.scene;
    this.sleepSceneIfExists(SceneKeys.City);
    this.sleepSceneIfExists(SceneKeys.Defense);
    this.setMode('settings');
    manager.bringToTop(SceneKeys.UI);
  }

  showShop() {
    const manager = this.scene;
    this.sleepSceneIfExists(SceneKeys.City);
    this.sleepSceneIfExists(SceneKeys.Defense);
    this.setMode('shop');
    manager.bringToTop(SceneKeys.UI);
  }

  showCity() {
    const manager = this.scene;
    if (manager.isSleeping(SceneKeys.City)) {
      manager.wake(SceneKeys.City);
    } else if (!manager.isActive(SceneKeys.City)) {
      manager.launch(SceneKeys.City);
    }

    this.sleepSceneIfExists(SceneKeys.Defense);

    this.setMode('city');
    manager.bringToTop(SceneKeys.UI);
  }

  showDefense() {
    const manager = this.scene;
    if (manager.isSleeping(SceneKeys.Defense)) {
      manager.wake(SceneKeys.Defense);
    } else if (!manager.isActive(SceneKeys.Defense)) {
      manager.launch(SceneKeys.Defense);
    }

    this.sleepSceneIfExists(SceneKeys.City);

    this.setMode('defense');
    manager.bringToTop(SceneKeys.UI);
  }

  navigateToMenu() {
    const manager = this.scene;
    if (!manager.isActive(SceneKeys.MainMenu)) {
      manager.launch(SceneKeys.MainMenu);
    } else {
      manager.get(SceneKeys.MainMenu).scene.restart();
    }

    this.stopSceneIfExists(SceneKeys.City);
    this.stopSceneIfExists(SceneKeys.Defense);

    this.scene.stop(SceneKeys.UI);
  }

  showNotification(message) {
    if (!message) {
      return;
    }

    this.notificationText.setText(message);
    this.notificationText.setAlpha(1);

    if (this.notificationTween) {
      this.notificationTween.remove();
    }

    this.notificationTween = this.tweens.add({
      targets: this.notificationText,
      alpha: 0,
      delay: 2200,
      duration: 420,
      ease: 'Sine.easeInOut'
    });
  }

  handleShopPurchase(key) {
    const result = this.gameState.purchaseShopItem(key);
    if (!result.success) {
      if (result.reason === 'resources') {
        const description = this.describeCost(result.cost);
        this.gameState.notify(description ? `Not enough resources (${description}).` : 'Not enough resources.');
      } else {
        this.gameState.notify('Unable to complete that purchase.');
      }
      return;
    }

    if (result.message) {
      this.gameState.notify(result.message);
    }
  }

  handleGameOver() {
    this.showNotification('The kingdom has fallen. Regrouping in the citadel...');
    this.gameState.reset();
    this.time.delayedCall(2400, () => {
      const manager = this.scene;
      this.stopSceneIfExists(SceneKeys.City);
      this.stopSceneIfExists(SceneKeys.Defense);
      if (!manager.isActive(SceneKeys.MainMenu)) {
        manager.launch(SceneKeys.MainMenu);
      } else {
        manager.get(SceneKeys.MainMenu).scene.restart();
      }
      manager.stop(SceneKeys.UI);
    });
  }

  sleepSceneIfExists(key) {
    if (this.scene.isActive(key)) {
      this.scene.sleep(key);
    }
  }

  stopSceneIfExists(key) {
    if (this.scene.isActive(key) || this.scene.isSleeping(key) || this.scene.isPaused(key)) {
      this.scene.stop(key);
    }
  }

  onShutdown() {
    this.gameState.off('resources-changed', this.updateResources, this);
    this.gameState.off('health-changed', this.updateHealth, this);
    this.gameState.off('wave-updated', this.updateWave, this);
    this.gameState.off('wave-state-changed', this.updateWaveState, this);
    this.gameState.off('building-selected', this.updateBuildingSelection, this);
    this.gameState.off('tower-selected', this.updateTowerSelection, this);
    this.gameState.off('notification', this.showNotification, this);
    this.gameState.off('game-over', this.handleGameOver, this);
    this.gameState.off('population-changed', this.updatePopulation, this);
    this.gameState.off('tower-support-changed', this.updateTowerSupport, this);
    this.gameState.off('game-speed-changed', this.updateSpeedDisplay, this);
    this.gameState.off('volume-changed', this.syncVolumeControls, this);
  }
}
