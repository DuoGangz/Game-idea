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
    this.notificationTween = null;

    this.createHudLayer();
    this.createNavigation();
    this.createPanels();
    this.createNotificationArea();

    this.input.setTopOnly(true);

    this.gameState.on('resources-changed', this.updateResources, this);
    this.gameState.on('lives-changed', this.updateLives, this);
    this.gameState.on('wave-updated', this.updateWave, this);
    this.gameState.on('wave-state-changed', this.updateWaveState, this);
    this.gameState.on('building-selected', this.updateBuildingSelection, this);
    this.gameState.on('tower-selected', this.updateTowerSelection, this);
    this.gameState.on('notification', this.showNotification, this);
    this.gameState.on('game-over', this.handleGameOver, this);

    this.events.once('shutdown', this.onShutdown, this);

    this.updateResources(this.gameState.getResources());
    this.updateLives(this.gameState.getLives());
    this.updateWave(this.gameState.getCurrentWave());
    this.updateWaveState(this.gameState.isWaveRunning());
    this.updateBuildingSelection(this.gameState.getSelectedBuilding());
    this.updateTowerSelection(this.gameState.getSelectedTower());
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

    this.livesText = this.add
      .text(width - 320, 18, '', {
        fontFamily: 'Cinzel',
        fontSize: '20px',
        color: '#f8f4e3'
      })
      .setDepth(11);

    this.waveText = this.add
      .text(width - 140, 18, '', {
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

    this.navButtons.menu = this.createHudButton(width * 0.18, navY, 150, 'Main Menu', () => {
      this.navigateToMenu();
    });

    this.navButtons.city = this.createHudButton(width * 0.38, navY, 160, 'City', () => {
      this.showCity();
    });

    this.navButtons.defense = this.createHudButton(width * 0.58, navY, 180, 'Defense', () => {
      this.showDefense();
    });
  }

  createPanels() {
    const { width } = this.scale;
    const panelY = 148;
    const panelWidth = width * 0.82;

    this.cityPanel = this.add.container(width / 2, panelY).setDepth(11);
    const cityBg = this.add.rectangle(0, 0, panelWidth, 120, 0x111a2b, 0.78).setStrokeStyle(2, 0xc89b3c, 0.3);
    this.cityPanel.add(cityBg);

    const buildings = this.gameState.getBuildingList();
    buildings.forEach((building, index) => {
      const card = this.createBuildingCard(building, index, buildings.length, panelWidth);
      this.cityPanel.add(card);
      this.buildingButtons.set(building.key, card);
    });

    this.defensePanel = this.add.container(width / 2, panelY).setDepth(11);
    const defenseBg = this.add.rectangle(0, 0, panelWidth, 140, 0x111a2b, 0.78).setStrokeStyle(2, 0xc89b3c, 0.3);
    this.defensePanel.add(defenseBg);

    const towers = this.gameState.getTowerList();
    towers.forEach((tower, index) => {
      const card = this.createTowerCard(tower, index, towers.length, panelWidth);
      this.defensePanel.add(card);
      this.towerButtons.set(tower.key, card);
    });

    this.startWaveButton = this.createHudButton(0, 0, 200, 'Start Wave', () => {
      this.gameState.emit('request-wave-start');
    });
    this.startWaveButton.setPosition(panelWidth / 2 - 140, 0);
    this.defensePanel.add(this.startWaveButton);
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
    const container = this.add.container(-panelWidth / 2 + spacing * index + spacing / 2, 0);
    container.setSize(spacing - 20, 100);

    const background = this.add.rectangle(0, 0, spacing - 24, 100, 0x1b2538, 0.85).setStrokeStyle(2, 0x555e73, 0.5);
    const name = this.add.text(0, -28, building.name, {
      fontFamily: 'Cinzel',
      fontSize: '20px',
      color: '#f8f4e3'
    }).setOrigin(0.5);
    const cost = this.add.text(0, 4, this.formatCost(building.cost), {
      fontFamily: 'Cinzel',
      fontSize: '16px',
      color: '#d5c6a1'
    }).setOrigin(0.5);
    const desc = this.add.text(0, 32, building.description, {
      fontFamily: 'Cinzel',
      fontSize: '14px',
      color: '#b6c1d1',
      wordWrap: { width: spacing - 48 }
    }).setOrigin(0.5);

    container.add([background, name, cost, desc]);
    container.setDataEnabled();
    container.setData('key', building.key);
    container.background = background;

    container.setInteractive(new Phaser.Geom.Rectangle(-spacing / 2, -50, spacing, 100), Phaser.Geom.Rectangle.Contains);
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
    const container = this.add.container(-panelWidth / 2 + spacing * index + spacing / 2, -12);
    container.setSize(spacing - 20, 120);

    const background = this.add.rectangle(0, 0, spacing - 24, 120, 0x1b2538, 0.85).setStrokeStyle(2, 0x555e73, 0.5);
    const name = this.add.text(0, -42, tower.name, {
      fontFamily: 'Cinzel',
      fontSize: '20px',
      color: '#f8f4e3'
    }).setOrigin(0.5);
    const cost = this.add.text(0, -12, this.formatCost(tower.cost), {
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
    const parts = Object.entries(resources).map(([key, value]) => `${this.capitalize(key)}: ${Math.floor(value)}`);
    this.resourceText.setText(parts.join('   '));
  }

  updateLives(lives) {
    this.livesText.setText(`Hearts: ${lives}`);
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

  formatCost(cost) {
    return Object.entries(cost)
      .map(([resource, amount]) => `${amount} ${this.capitalize(resource)}`)
      .join(' | ');
  }

  capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  setMode(mode) {
    this.mode = mode;

    const showCity = mode === 'city';
    const showDefense = mode === 'defense';

    this.cityPanel.setVisible(showCity);
    this.buildingButtons.forEach((card) => {
      if (showCity) {
        card.setInteractive();
      } else {
        card.disableInteractive();
      }
    });

    this.defensePanel.setVisible(showDefense);
    this.towerButtons.forEach((card) => {
      if (showDefense) {
        card.setInteractive();
      } else {
        card.disableInteractive();
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

    if (showDefense) {
      this.updateWaveState(this.gameState.isWaveRunning());
    }

    this.updateNavHighlight();
  }

  updateNavHighlight() {
    if (!this.navButtons) {
      return;
    }

    this.navButtons.menu.setActiveState(false);
    this.navButtons.city.setActiveState(this.mode === 'city');
    this.navButtons.defense.setActiveState(this.mode === 'defense');
  }

  showCity() {
    const manager = this.scene;
    if (manager.isSleeping(SceneKeys.City)) {
      manager.wake(SceneKeys.City);
    } else if (!manager.isActive(SceneKeys.City)) {
      manager.launch(SceneKeys.City);
    }

    if (manager.isActive(SceneKeys.Defense)) {
      manager.sleep(SceneKeys.Defense);
    }

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

    if (manager.isActive(SceneKeys.City)) {
      manager.sleep(SceneKeys.City);
    }

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

  stopSceneIfExists(key) {
    if (this.scene.isActive(key) || this.scene.isSleeping(key) || this.scene.isPaused(key)) {
      this.scene.stop(key);
    }
  }

  onShutdown() {
    this.gameState.off('resources-changed', this.updateResources, this);
    this.gameState.off('lives-changed', this.updateLives, this);
    this.gameState.off('wave-updated', this.updateWave, this);
    this.gameState.off('wave-state-changed', this.updateWaveState, this);
    this.gameState.off('building-selected', this.updateBuildingSelection, this);
    this.gameState.off('tower-selected', this.updateTowerSelection, this);
    this.gameState.off('notification', this.showNotification, this);
    this.gameState.off('game-over', this.handleGameOver, this);
  }
}
