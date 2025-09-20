import SceneKeys from '../config/SceneKeys.js';

const WAVE_REWARD_BASE = 50;
const WAVE_REWARD_BONUS = 15;
const RESOURCE_DROP_CHANCES = {
  shards: 0.01,
  wood: 0.35,
  stone: 0.18
};
const RESOURCE_DROP_AMOUNTS = {
  shards: 1,
  wood: 14,
  stone: 10
};

export default class TowerDefenseScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Defense);
  }

  create() {
    this.gameState = this.registry.get('gameState');
    this.gridCols = 12;
    this.gridRows = 8;
    this.tileSize = 64;
    this.gridWidth = this.gridCols * this.tileSize;
    this.gridHeight = this.gridRows * this.tileSize;
    this.originX = (this.scale.width - this.gridWidth) / 2 + this.tileSize / 2;
    this.originY = 170;

    this.pathCells = this.createPathCells();
    this.pathCellSet = new Set(this.pathCells.map(({ col, row }) => `${col},${row}`));

    this.tiles = [];
    this.towerMap = new Map();
    this.selectedTowerKey = this.gameState.getSelectedTower();
    this.waveQueue = [];
    this.waveInProgress = false;
    this.enemySpawnEvent = null;
    this.speedMultiplier = this.gameState.getGameSpeed();

    this.createBattlefield();
    this.createPath();

    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group();

    this.physics.add.overlap(this.projectiles, this.enemies, this.handleProjectileHit, undefined, this);

    this.pathVector = new Phaser.Math.Vector2();

    this.gameState.on('tower-selected', this.handleTowerSelection, this);
    this.gameState.on('towers-updated', this.syncTowersFromState, this);
    this.gameState.on('request-wave-start', this.handleWaveRequest, this);
    this.gameState.on('game-speed-changed', this.handleSpeedChanged, this);

    this.events.on('wake', this.onWake, this);
    this.events.on('sleep', this.onSleep, this);
    this.events.once('shutdown', this.onShutdown, this);

    this.syncTowersFromState();
  }

  createBattlefield() {
    const { width, height } = this.scale;
    this.add
      .rectangle(width / 2, height / 2 + 30, this.gridWidth + 80, this.gridHeight + 96, 0x0c1320, 0.85)
      .setStrokeStyle(4, 0xc89b3c, 0.35);

    for (let row = 0; row < this.gridRows; row += 1) {
      const rowTiles = [];
      for (let col = 0; col < this.gridCols; col += 1) {
        const x = this.getTileCenterX(col);
        const y = this.getTileCenterY(row);
        const isPath = this.pathCellSet.has(`${col},${row}`);
        const tile = this.add
          .image(x, y, isPath ? 'tile-path' : 'tile-empty')
          .setData('gridPosition', { col, row })
          .setData('isPath', isPath)
          .setData('occupied', false);

        if (!isPath) {
          tile.setInteractive({ useHandCursor: true });
          tile.on('pointerover', () => {
            tile.setTint(0x8391c9);
          });
          tile.on('pointerout', () => {
            this.resetTileTint(tile);
          });
          tile.on('pointerup', () => {
            this.handleTilePlacement(tile);
          });
        }

        rowTiles.push(tile);
      }
      this.tiles.push(rowTiles);
    }
  }

  createPathCells() {
    return [
      { col: -1, row: 3 },
      { col: 0, row: 3 },
      { col: 1, row: 3 },
      { col: 2, row: 3 },
      { col: 2, row: 4 },
      { col: 2, row: 5 },
      { col: 3, row: 5 },
      { col: 4, row: 5 },
      { col: 5, row: 5 },
      { col: 6, row: 5 },
      { col: 7, row: 5 },
      { col: 7, row: 4 },
      { col: 7, row: 3 },
      { col: 7, row: 2 },
      { col: 8, row: 2 },
      { col: 9, row: 2 },
      { col: 10, row: 2 },
      { col: 11, row: 2 },
      { col: 12, row: 2 }
    ];
  }

  createPath() {
    const points = this.pathCells.map(({ col, row }) => new Phaser.Math.Vector2(this.getTileCenterX(col), this.getTileCenterY(row)));
    this.path = new Phaser.Curves.Path(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      this.path.lineTo(points[i].x, points[i].y);
    }

    const pathGraphics = this.add.graphics();
    pathGraphics.lineStyle(26, 0x4a3e8c, 0.35);
    this.path.draw(pathGraphics);
    pathGraphics.setDepth(-2);

    this.add.circle(points[0].x, points[0].y, 18, 0x4cd137, 0.6).setDepth(1);
    this.add.circle(points[points.length - 1].x, points[points.length - 1].y, 26, 0xe84118, 0.4).setDepth(1);
  }

  handleTowerSelection(key) {
    this.selectedTowerKey = key;
  }

  handleTilePlacement(tile) {
    if (tile.getData('occupied')) {
      this.gameState.notify('A tower already occupies that spot.');
      return;
    }

    if (!this.selectedTowerKey) {
      this.gameState.notify('Select a tower from the HUD to place it.');
      return;
    }

    const { col, row } = tile.getData('gridPosition');
    const result = this.gameState.placeTower(col, row, this.selectedTowerKey);

    if (!result.success) {
      switch (result.reason) {
        case 'resources':
          this.gameState.notify('Gather more resources before recruiting that tower.');
          break;
        case 'support':
          this.gameState.notify('Staff additional barracks to support more towers.');
          break;
        case 'occupied':
          this.gameState.notify('That tile is no longer available.');
          break;
        default:
          this.gameState.notify('Unable to place that tower.');
      }
      return;
    }

    if (result.tower) {
      this.gameState.notify(`${result.tower.name} deployed.`);
    }
  }

  syncTowersFromState() {
    const placements = this.gameState.getTowerPlacements();
    const activeKeys = new Set();

    placements.forEach((placement) => {
      const { col, row, key } = placement;
      const tileKey = `${col},${row}`;
      activeKeys.add(tileKey);

      if (this.towerMap.has(tileKey)) {
        return;
      }

      const tile = this.tiles[row]?.[col];
      const blueprint = this.gameState.getTowerBlueprint(key);
      if (!tile || !blueprint) {
        return;
      }

      const sprite = this.add.image(tile.x, tile.y, blueprint.texture).setDepth(5);
      this.towerMap.set(tileKey, {
        sprite,
        blueprint,
        cooldown: Phaser.Math.Between(0, blueprint.fireRate),
        placement
      });
      tile.setData('occupied', true);
    });

    // Remove towers not in state
    this.towerMap.forEach((tower, key) => {
      if (!activeKeys.has(key)) {
        tower.sprite.destroy();
        this.towerMap.delete(key);
        const [col, row] = key.split(',').map(Number);
        const tile = this.tiles[row]?.[col];
        if (tile) {
          tile.setData('occupied', false);
          this.resetTileTint(tile);
        }
      }
    });
  }

  handleWaveRequest() {
    if (this.scene.isSleeping()) {
      return;
    }
    this.startWave();
  }

  handleSpeedChanged(speed) {
    this.speedMultiplier = speed;
    if (this.enemySpawnEvent) {
      this.enemySpawnEvent.timeScale = this.speedMultiplier;
    }
  }

  startWave() {
    if (this.waveInProgress) {
      return;
    }

    this.waveQueue = [];
    const definition = this.gameState.getWaveDefinition();
    definition.forEach(({ type, count }) => {
      for (let i = 0; i < count; i += 1) {
        this.waveQueue.push(type);
      }
    });

    if (this.waveQueue.length === 0) {
      return;
    }

    Phaser.Utils.Array.Shuffle(this.waveQueue);

    this.waveInProgress = true;
    this.gameState.setWaveRunning(true);
    this.gameState.notify(`Wave ${this.gameState.getCurrentWave()} is approaching!`);

    this.spawnNextEnemy();
    this.enemySpawnEvent = this.time.addEvent({
      delay: 900,
      loop: true,
      callback: () => {
        if (this.waveQueue.length === 0) {
          if (this.enemySpawnEvent) {
            this.enemySpawnEvent.remove(false);
            this.enemySpawnEvent = null;
          }
          return;
        }
        this.spawnNextEnemy();
      }
    });
    if (this.enemySpawnEvent) {
      this.enemySpawnEvent.timeScale = this.speedMultiplier;
    }
  }

  spawnNextEnemy() {
    if (this.waveQueue.length === 0) {
      return;
    }

    const type = this.waveQueue.shift();
    const blueprint = this.gameState.getEnemyDefinition(type);
    if (!blueprint) {
      return;
    }

    const startPoint = new Phaser.Math.Vector2();
    this.path.getStartPoint(startPoint);

    const enemy = this.enemies.create(startPoint.x, startPoint.y, blueprint.texture);
    enemy.setDepth(4);
    enemy.setCircle(20, 12, 12);
    enemy.setDataEnabled();
    enemy.setData('hp', blueprint.hp);
    enemy.setData('reward', blueprint.reward);
    enemy.setData('type', blueprint.key);
    enemy.speed = blueprint.speed;
    enemy.pathProgress = 0;
  }

  handleProjectileHit(projectile, enemy) {
    if (!projectile.active || !enemy.active) {
      return;
    }

    projectile.destroy();

    const damage = projectile.getData('damage') ?? 0;
    const remaining = (enemy.getData('hp') ?? 0) - damage;
    enemy.setData('hp', remaining);

    if (remaining <= 0) {
      this.destroyEnemy(enemy, true);
    }
  }

  destroyEnemy(enemy, awardReward) {
    if (!enemy.active) {
      return;
    }

    if (awardReward) {
      const reward = enemy.getData('reward') ?? 0;
      if (reward > 0) {
        this.gameState.addResources({ gold: reward });
      }
    }

    this.maybeDropResources(enemy);

    enemy.destroy();
    this.checkWaveStatus();
  }

  checkWaveStatus() {
    if (!this.waveInProgress) {
      return;
    }

    if (this.waveQueue.length === 0 && this.enemies.countActive(true) === 0) {
      this.finishWave();
    }
  }

  finishWave() {
    this.waveInProgress = false;
    this.gameState.setWaveRunning(false);
    this.waveQueue = [];
    const waveNumber = this.gameState.getCurrentWave();
    const reward = WAVE_REWARD_BASE + waveNumber * WAVE_REWARD_BONUS;
    this.gameState.addResources({ gold: reward });
    this.gameState.notify(`Wave ${waveNumber} repelled! +${reward} gold awarded.`);
    this.gameState.advanceWave();
  }

  handleEnemyReachedBase(enemy) {
    enemy.destroy();
    const damage = this.gameState.getLeakDamage();
    this.gameState.takeDamage(damage);
    this.gameState.notify(`An enemy slipped through the defenses (-${damage} health)!`);
    this.checkWaveStatus();
  }

  update(_time, delta) {
    if (this.scene.isSleeping()) {
      return;
    }

    const scaledDelta = delta * this.speedMultiplier;

    this.enemies.children.each((enemy) => {
      if (!enemy.active) {
        return;
      }

      enemy.pathProgress += enemy.speed * scaledDelta;
      this.path.getPoint(enemy.pathProgress, this.pathVector);
      enemy.setPosition(this.pathVector.x, this.pathVector.y);

      if (enemy.pathProgress >= 1) {
        this.handleEnemyReachedBase(enemy);
      }
    }, this);

    this.projectiles.children.each((projectile) => {
      if (!projectile.active) {
        return;
      }
      projectile.lifespan = (projectile.lifespan ?? 1000) - scaledDelta;
      if (projectile.lifespan <= 0) {
        projectile.destroy();
      }
    });

    this.towerMap.forEach((tower) => {
      tower.cooldown -= delta;
      if (tower.cooldown > 0) {
        return;
      }

      const target = this.acquireTarget(tower);
      if (!target) {
        return;
      }

      this.fireProjectile(tower, target);
      tower.cooldown = tower.blueprint.fireRate;
    });

    this.checkWaveStatus();
  }

  acquireTarget(tower) {
    const { sprite, blueprint } = tower;
    let closestEnemy = null;
    let closestDistance = Number.MAX_SAFE_INTEGER;

    this.enemies.children.each((enemy) => {
      if (!enemy.active) {
        return;
      }

      const distance = Phaser.Math.Distance.Between(sprite.x, sprite.y, enemy.x, enemy.y);
      if (distance <= blueprint.range && distance < closestDistance) {
        closestEnemy = enemy;
        closestDistance = distance;
      }
    });

    return closestEnemy;
  }

  fireProjectile(tower, enemy) {
    const { sprite, blueprint } = tower;
    const texture = blueprint.projectileTexture ?? 'projectile-arrow';
    const projectile = this.projectiles.create(sprite.x, sprite.y, texture);
    projectile.setDepth(6);
    projectile.setCircle(10, 2, 2);
    projectile.setData('damage', blueprint.damage);
    projectile.lifespan = 1200;
    this.physics.moveToObject(projectile, enemy, blueprint.projectileSpeed);
    if (projectile.body && projectile.body.velocity) {
      projectile.body.velocity.x *= this.speedMultiplier;
      projectile.body.velocity.y *= this.speedMultiplier;
    }
  }

  maybeDropResources(enemy) {
    const drops = {};
    Object.entries(RESOURCE_DROP_CHANCES).forEach(([resource, chance]) => {
      if (Math.random() < chance) {
        const amount = RESOURCE_DROP_AMOUNTS[resource] ?? 0;
        if (amount > 0) {
          drops[resource] = (drops[resource] ?? 0) + amount;
        }
      }
    });

    if (Object.keys(drops).length === 0) {
      return;
    }

    this.gameState.addResources(drops);
    const summary = Object.entries(drops)
      .map(([resource, amount]) => `+${amount} ${resource}`)
      .join(', ');
    this.gameState.notify(`Recovered spoils: ${summary}.`);
  }

  resetTileTint(tile) {
    if (tile.getData('occupied')) {
      tile.setTint(0xffffff);
    } else {
      tile.clearTint();
    }
  }

  getTileCenterX(col) {
    return this.originX + col * this.tileSize;
  }

  getTileCenterY(row) {
    return this.originY + row * this.tileSize;
  }

  onWake() {
    this.selectedTowerKey = this.gameState.getSelectedTower();
    if (this.enemySpawnEvent) {
      this.enemySpawnEvent.paused = false;
      this.enemySpawnEvent.timeScale = this.speedMultiplier;
    }
  }

  onSleep() {
    if (this.enemySpawnEvent) {
      this.enemySpawnEvent.paused = true;
    }
  }

  onShutdown() {
    this.gameState.off('tower-selected', this.handleTowerSelection, this);
    this.gameState.off('towers-updated', this.syncTowersFromState, this);
    this.gameState.off('request-wave-start', this.handleWaveRequest, this);
    this.gameState.off('game-speed-changed', this.handleSpeedChanged, this);
  }
}
