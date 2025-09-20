const BUILDINGS = {
  house: {
    key: 'house',
    name: 'House',
    texture: 'building-house',
    cost: { gold: 120, wood: 40 },
    production: { gold: 12 },
    description: 'Shelters villagers and generates tax revenue each cycle.'
  },
  lumberMill: {
    key: 'lumberMill',
    name: 'Lumber Mill',
    texture: 'building-lumber',
    cost: { gold: 140, wood: 90 },
    production: { wood: 16 },
    description: 'Harvests timber from nearby forests.'
  },
  quarry: {
    key: 'quarry',
    name: 'Stone Quarry',
    texture: 'building-quarry',
    cost: { gold: 180, stone: 60 },
    production: { stone: 14 },
    description: 'Extracts stone for construction projects.'
  },
  barracks: {
    key: 'barracks',
    name: 'Barracks',
    texture: 'building-barracks',
    cost: { gold: 220, wood: 120, stone: 60 },
    production: { gold: 6, wood: 6 },
    description: 'Trains militia that contribute taxes and gather supplies.'
  }
};

const TOWERS = {
  archer: {
    key: 'archer',
    name: 'Archer Tower',
    texture: 'tower-archer',
    cost: { gold: 160, wood: 60 },
    projectileTexture: 'projectile-arrow',
    damage: 22,
    range: 180,
    fireRate: 900,
    projectileSpeed: 360,
    description: 'Fast-firing archers pick off lightly armoured foes.'
  },
  cannon: {
    key: 'cannon',
    name: 'Cannon Tower',
    texture: 'tower-cannon',
    cost: { gold: 260, stone: 90 },
    projectileTexture: 'projectile-shell',
    damage: 46,
    range: 200,
    fireRate: 1600,
    projectileSpeed: 280,
    description: 'Slow but devastating cannonballs crush tough enemies.'
  },
  mystic: {
    key: 'mystic',
    name: 'Mystic Spire',
    texture: 'tower-mystic',
    cost: { gold: 230, wood: 50, stone: 50 },
    projectileTexture: 'projectile-orb',
    damage: 32,
    range: 220,
    fireRate: 1200,
    projectileSpeed: 420,
    description: 'Harnesses arcane energy to burn through magical hides.'
  }
};

const ENEMIES = {
  goblin: {
    key: 'goblin',
    name: 'Goblin',
    texture: 'enemy-goblin',
    hp: 60,
    speed: 0.00011,
    reward: 12
  },
  orc: {
    key: 'orc',
    name: 'Orc',
    texture: 'enemy-orc',
    hp: 130,
    speed: 0.000085,
    reward: 25
  },
  dragon: {
    key: 'dragon',
    name: 'Drake',
    texture: 'enemy-dragon',
    hp: 260,
    speed: 0.00007,
    reward: 60
  }
};

const RESOURCE_KEYS = ['gold', 'wood', 'stone'];
const GRID_ROWS = 5;
const GRID_COLS = 8;

export default class GameState extends Phaser.Events.EventEmitter {
  constructor() {
    super();
    this.reset();
  }

  reset() {
    this.resources = {
      gold: 520,
      wood: 260,
      stone: 180
    };

    this.cityGrid = Array.from({ length: GRID_ROWS }, () =>
      Array.from({ length: GRID_COLS }, () => null)
    );

    this.towerPlacements = [];
    this.lives = 20;
    this.currentWave = 1;
    this.waveRunning = false;
    this.selectedBuilding = null;
    this.selectedTower = null;

    this.emit('resources-changed', this.getResources());
    this.emit('city-updated', this.getCityGrid());
    this.emit('towers-updated', this.getTowerPlacements());
    this.emit('lives-changed', this.lives);
    this.emit('wave-updated', this.currentWave);
    this.emit('wave-state-changed', this.waveRunning);
    this.emit('building-selected', this.selectedBuilding);
    this.emit('tower-selected', this.selectedTower);
  }

  getResources() {
    return { ...this.resources };
  }

  getLives() {
    return this.lives;
  }

  getCurrentWave() {
    return this.currentWave;
  }

  canAfford(cost = {}) {
    return Object.entries(cost).every(([resource, amount]) => {
      const available = this.resources[resource] ?? 0;
      return available >= amount;
    });
  }

  spend(cost = {}) {
    if (!this.canAfford(cost)) {
      return false;
    }

    Object.entries(cost).forEach(([resource, amount]) => {
      if (!RESOURCE_KEYS.includes(resource)) {
        return;
      }

      this.resources[resource] -= amount;
    });

    this.emit('resources-changed', this.getResources());
    return true;
  }

  addResource(resource, amount) {
    if (!RESOURCE_KEYS.includes(resource) || !Number.isFinite(amount)) {
      return;
    }

    this.resources[resource] += amount;
    this.emit('resources-changed', this.getResources());
  }

  addResources(bundle = {}) {
    let updated = false;
    Object.entries(bundle).forEach(([resource, amount]) => {
      if (!RESOURCE_KEYS.includes(resource) || !Number.isFinite(amount)) {
        return;
      }

      this.resources[resource] += amount;
      updated = true;
    });

    if (updated) {
      this.emit('resources-changed', this.getResources());
    }
  }

  getBuildingBlueprint(key) {
    return BUILDINGS[key] ?? null;
  }

  getBuildingList() {
    return Object.values(BUILDINGS);
  }

  getCityGrid() {
    return this.cityGrid.map((row) => row.map((tile) => (tile ? { ...tile } : null)));
  }

  getSelectedBuilding() {
    return this.selectedBuilding;
  }

  selectBuilding(key) {
    if (key && !BUILDINGS[key]) {
      return;
    }

    this.selectedBuilding = key ?? null;
    this.emit('building-selected', this.selectedBuilding);
  }

  placeBuilding(col, row, key) {
    const blueprint = this.getBuildingBlueprint(key);
    if (!blueprint) {
      return { success: false, reason: 'unknown-building' };
    }

    const rowData = this.cityGrid[row];
    if (!rowData || typeof rowData[col] === 'undefined') {
      return { success: false, reason: 'invalid-location' };
    }

    if (rowData[col]) {
      return { success: false, reason: 'occupied' };
    }

    if (!this.spend(blueprint.cost)) {
      return { success: false, reason: 'resources' };
    }

    rowData[col] = {
      key,
      level: 1
    };

    this.emit('city-updated', this.getCityGrid());
    return { success: true, building: blueprint };
  }

  getTowerBlueprint(key) {
    return TOWERS[key] ?? null;
  }

  getTowerList() {
    return Object.values(TOWERS);
  }

  getSelectedTower() {
    return this.selectedTower;
  }

  selectTower(key) {
    if (key && !TOWERS[key]) {
      return;
    }

    this.selectedTower = key ?? null;
    this.emit('tower-selected', this.selectedTower);
  }

  getTowerPlacements() {
    return this.towerPlacements.map((placement) => ({ ...placement }));
  }

  hasTowerAt(col, row) {
    return this.towerPlacements.some((placement) => placement.col === col && placement.row === row);
  }

  placeTower(col, row, key) {
    const blueprint = this.getTowerBlueprint(key);
    if (!blueprint) {
      return { success: false, reason: 'unknown-tower' };
    }

    if (!Number.isInteger(col) || !Number.isInteger(row)) {
      return { success: false, reason: 'invalid-location' };
    }

    if (this.hasTowerAt(col, row)) {
      return { success: false, reason: 'occupied' };
    }

    if (!this.spend(blueprint.cost)) {
      return { success: false, reason: 'resources' };
    }

    const placement = {
      key,
      col,
      row,
      level: 1
    };
    this.towerPlacements.push(placement);
    this.emit('towers-updated', this.getTowerPlacements());
    return { success: true, tower: blueprint };
  }

  removeTower(col, row) {
    const index = this.towerPlacements.findIndex((placement) => placement.col === col && placement.row === row);
    if (index === -1) {
      return false;
    }

    this.towerPlacements.splice(index, 1);
    this.emit('towers-updated', this.getTowerPlacements());
    return true;
  }

  getEnemyDefinition(key) {
    return ENEMIES[key] ?? null;
  }

  getWaveDefinition() {
    const wave = this.currentWave;
    const baseCount = 6 + (wave - 1) * 2;
    const composition = [{ type: 'goblin', count: Math.max(4, Math.round(baseCount * 0.6)) }];

    if (wave >= 2) {
      composition.push({ type: 'orc', count: Math.max(2, Math.round(baseCount * 0.3)) });
    }

    if (wave >= 4) {
      composition.push({ type: 'dragon', count: 1 + Math.floor((wave - 4) / 2) });
    }

    return composition;
  }

  setWaveRunning(running) {
    this.waveRunning = !!running;
    this.emit('wave-state-changed', this.waveRunning);
  }

  isWaveRunning() {
    return this.waveRunning;
  }

  advanceWave() {
    this.currentWave += 1;
    this.emit('wave-updated', this.currentWave);
  }

  loseLife(amount = 1) {
    this.lives = Math.max(0, this.lives - amount);
    this.emit('lives-changed', this.lives);

    if (this.lives <= 0) {
      this.emit('game-over');
    }
  }

  restoreLives(amount) {
    if (!Number.isFinite(amount)) {
      return;
    }

    this.lives += amount;
    this.emit('lives-changed', this.lives);
  }

  notify(message) {
    if (!message) {
      return;
    }

    this.emit('notification', message);
  }
}
