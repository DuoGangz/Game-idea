const RESOURCE_KEYS = ['gold', 'wood', 'stone', 'food', 'shards'];
const SHARD_REQUIREMENTS = { 2: 5, 3: 20, 4: 50, 5: 100 };
const HOUSE_CAPACITY_BY_TIER = { 1: 5, 2: 10, 3: 15, 4: 20, 5: 30 };
const BUILDING_ASSIGNMENT_ORDER = ['farm', 'hospital', 'lumberMill', 'quarry', 'barracks'];
const STARTING_CITIZENS = 5;
const POPULATION_PER_BARRACKS = 10;
const SUPPORT_PER_BARRACKS = 1;
const MAX_BUILDING_LEVEL = 5;
const MAX_TOWER_LEVEL = 3;
const BASE_MAX_HEALTH = 100;
const BASE_LEAK_DAMAGE = 10;
const FOOD_CONSUMPTION_PER_TICK = 0.2; // food per citizen each production cycle

const BUILDINGS = {
  house: {
    key: 'house',
    name: 'House',
    texture: 'building-house',
    cost: { gold: 100, wood: 50 },
    description: 'Adds housing for citizens and generates a small tax income.',
    production: { gold: 10 },
    citizenRequirement: 0
  },
  lumberMill: {
    key: 'lumberMill',
    name: 'Lumber Mill',
    texture: 'building-lumber',
    cost: { gold: 200, wood: 100 },
    description: 'Harvests timber when staffed by up to 5 citizens.',
    production: { wood: 20 },
    citizenRequirement: 5
  },
  quarry: {
    key: 'quarry',
    name: 'Stone Quarry',
    texture: 'building-quarry',
    cost: { gold: 300, stone: 50 },
    description: 'Mines stone with a crew of up to 10 citizens.',
    production: { stone: 16 },
    citizenRequirement: 10
  },
  farm: {
    key: 'farm',
    name: 'Farm',
    texture: 'building-farm',
    cost: { gold: 150, wood: 75 },
    description: 'Produces food supplies when up to 6 citizens tend the crops.',
    production: { food: 22 },
    citizenRequirement: 6
  },
  barracks: {
    key: 'barracks',
    name: 'Barracks',
    texture: 'building-barracks',
    cost: { gold: 300, wood: 10, stone: 10 },
    description: 'Trains soldiers. Each staffed barracks supports one tower.',
    production: { gold: 6 },
    citizenRequirement: 10,
    towerSupport: 1
  },
  hospital: {
    key: 'hospital',
    name: 'Hospital',
    texture: 'building-hospital',
    cost: { gold: 450, wood: 150, stone: 150 },
    description: 'Improves keep resilience when staffed by healers.',
    production: null,
    citizenRequirement: 20,
    healthBonusPerLevel: 0.15
  }
};

const TOWERS = {
  archer: {
    key: 'archer',
    name: 'Archer Tower',
    texture: 'tower-archer',
    cost: { gold: 150, wood: 40, stone: 15 },
    projectileTexture: 'projectile-arrow',
    damage: 24,
    range: 180,
    fireRate: 900,
    projectileSpeed: 360
  },
  cannon: {
    key: 'cannon',
    name: 'Cannon Tower',
    texture: 'tower-cannon',
    cost: { gold: 300, wood: 20, stone: 90 },
    projectileTexture: 'projectile-shell',
    damage: 50,
    range: 210,
    fireRate: 1600,
    projectileSpeed: 280
  },
  magic: {
    key: 'magic',
    name: 'Magic Tower',
    texture: 'tower-magic',
    cost: { gold: 250, wood: 35, stone: 60, shards: 5 },
    projectileTexture: 'projectile-orb',
    damage: 36,
    range: 220,
    fireRate: 1200,
    projectileSpeed: 420
  }
};

const ENEMIES = {
  goblin: {
    key: 'goblin',
    name: 'Goblin',
    texture: 'enemy-goblin',
    hp: 60,
    speed: 0.00012,
    reward: 12
  },
  orc: {
    key: 'orc',
    name: 'Orc',
    texture: 'enemy-orc',
    hp: 140,
    speed: 0.00009,
    reward: 26
  },
  dragon: {
    key: 'dragon',
    name: 'Drake',
    texture: 'enemy-dragon',
    hp: 280,
    speed: 0.000075,
    reward: 66
  }
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function multiplyCost(cost = {}, multiplier = 1) {
  const result = {};
  RESOURCE_KEYS.forEach((key) => {
    const amount = cost[key] ?? 0;
    if (amount > 0) {
      result[key] = Math.round(amount * multiplier);
    }
  });
  return result;
}

function accumulateCost(total = {}, extra = {}) {
  RESOURCE_KEYS.forEach((key) => {
    const amount = extra[key] ?? 0;
    if (amount > 0) {
      total[key] = (total[key] ?? 0) + amount;
    }
  });
  return total;
}

function formatResourceBundle(bundle = {}) {
  return RESOURCE_KEYS
    .filter((key) => (bundle[key] ?? 0) > 0)
    .map((key) => `${bundle[key]} ${key}`)
    .join(', ');
}

export default class GameState extends Phaser.Events.EventEmitter {
  constructor() {
    super();
    this.reset();
  }

  reset() {
    this.resources = {
      gold: 500,
      wood: 50,
      stone: 50,
      food: 50,
      shards: 0
    };

    this.population = STARTING_CITIZENS;
    this.populationCapacity = STARTING_CITIZENS;
    this.unassignedCitizens = STARTING_CITIZENS;

    this.cityRows = 5;
    this.cityCols = 8;
    this.cityGrid = Array.from({ length: this.cityRows }, () => Array(this.cityCols).fill(null));
    this.buildings = [];
    this.nextBuildingId = 1;

    this.towerPlacements = [];

    this.baseMaxHealth = BASE_MAX_HEALTH;
    this.maxHealth = this.baseMaxHealth;
    this.health = this.maxHealth;
    this.leakDamage = BASE_LEAK_DAMAGE;

    this.currentWave = 1;
    this.waveRunning = false;
    this.selectedBuilding = null;
    this.selectedTower = null;

    this.gameSpeed = 1;
    this.musicVolume = 50;
    this.effectsVolume = 50;

    this.cachedSupport = 0;

    this.emit('resources-changed', this.getResources());
    this.emit('city-updated', this.getCityGrid());
    this.emit('population-changed', this.getPopulationState());
    this.emit('health-changed', this.getHealthState());
    this.emit('towers-updated', this.getTowerPlacements());
    this.emit('tower-support-changed', this.getTowerSupportState());
    this.emit('wave-updated', this.currentWave);
    this.emit('wave-state-changed', this.waveRunning);
    this.emit('game-speed-changed', this.gameSpeed);
    this.emit('volume-changed', this.getVolumeState());
    this.emit('building-selected', this.selectedBuilding);
    this.emit('tower-selected', this.selectedTower);
  }

  getResources() {
    return { ...this.resources };
  }

  getPopulationState() {
    return {
      population: Math.floor(this.population),
      capacity: Math.floor(this.populationCapacity),
      unassigned: Math.floor(this.unassignedCitizens)
    };
  }

  getFoodRequirementPerTick() {
    return Math.max(0, Math.floor(this.population * FOOD_CONSUMPTION_PER_TICK));
  }

  getHealthState() {
    return {
      current: Math.round(this.health),
      max: Math.round(this.maxHealth)
    };
  }

  getTowerSupportState() {
    return {
      support: this.getBarracksSupport(),
      used: this.towerPlacements.length
    };
  }

  getVolumeState() {
    return {
      music: this.musicVolume,
      effects: this.effectsVolume
    };
  }

  canAfford(cost = {}) {
    return RESOURCE_KEYS.every((key) => {
      const required = cost[key] ?? 0;
      return (this.resources[key] ?? 0) >= required;
    });
  }

  spend(cost = {}) {
    if (!this.canAfford(cost)) {
      return false;
    }

    RESOURCE_KEYS.forEach((key) => {
      const amount = cost[key] ?? 0;
      if (amount > 0) {
        this.resources[key] -= amount;
      }
    });

    this.emit('resources-changed', this.getResources());
    return true;
  }

  addResources(bundle = {}) {
    let changed = false;
    RESOURCE_KEYS.forEach((key) => {
      const amount = bundle[key] ?? 0;
      if (Number.isFinite(amount) && amount !== 0) {
        this.resources[key] += amount;
        changed = true;
      }
    });

    if (changed) {
      this.emit('resources-changed', this.getResources());
    }
  }

  getBuildingBlueprint(key) {
    return BUILDINGS[key] ?? null;
  }

  getBuildingList() {
    return Object.values(BUILDINGS);
  }

  getBuildingTierCost(key, tier) {
    const blueprint = this.getBuildingBlueprint(key);
    if (!blueprint) {
      return null;
    }

    const tierCost = multiplyCost(blueprint.cost, tier);
    const shardCost = SHARD_REQUIREMENTS[tier] ?? 0;
    if (shardCost > 0) {
      tierCost.shards = (tierCost.shards ?? 0) + shardCost;
    }
    return tierCost;
  }

  getBuildingTotalInvestment(key, level) {
    const total = {};
    for (let tier = 1; tier <= level; tier += 1) {
      accumulateCost(total, this.getBuildingTierCost(key, tier));
    }
    return total;
  }

  getBuildingRefund(key, level) {
    const investment = this.getBuildingTotalInvestment(key, level);
    const refund = {};
    RESOURCE_KEYS.forEach((resource) => {
      const amount = investment[resource] ?? 0;
      if (amount > 0) {
        refund[resource] = Math.floor(amount * 0.5);
      }
    });
    return refund;
  }

  getCityGrid() {
    return this.cityGrid.map((row) =>
      row.map((placement) =>
        placement
          ? {
              key: placement.key,
              level: placement.level,
              assignedCitizens: placement.assignedCitizens
            }
          : null
      )
    );
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

  findBuilding(col, row) {
    const placement = this.cityGrid[row]?.[col] ?? null;
    return placement ?? null;
  }

  placeBuilding(col, row, key) {
    const blueprint = this.getBuildingBlueprint(key);
    if (!blueprint) {
      return { success: false, reason: 'unknown-building' };
    }

    const tileRow = this.cityGrid[row];
    if (!tileRow || typeof tileRow[col] === 'undefined') {
      return { success: false, reason: 'invalid-location' };
    }

    if (tileRow[col]) {
      return { success: false, reason: 'occupied' };
    }

    if (key === 'barracks') {
      const existing = this.buildings.filter((building) => building.key === 'barracks').length;
      const requiredPopulation = POPULATION_PER_BARRACKS * (existing + 1);
      if (this.population < requiredPopulation) {
        return { success: false, reason: 'population', required: requiredPopulation };
      }
    }

    const cost = this.getBuildingTierCost(key, 1);
    if (!this.spend(cost)) {
      return { success: false, reason: 'resources' };
    }

    const placement = {
      id: this.nextBuildingId,
      key,
      col,
      row,
      level: 1,
      assignedCitizens: 0
    };
    this.nextBuildingId += 1;

    this.buildings.push(placement);
    tileRow[col] = placement;

    this.recalculateCityStats();
    this.emit('city-updated', this.getCityGrid());

    return { success: true, building: blueprint };
  }

  upgradeBuilding(col, row) {
    const placement = this.findBuilding(col, row);
    if (!placement) {
      return { success: false, reason: 'missing' };
    }

    if (placement.level >= MAX_BUILDING_LEVEL) {
      return { success: false, reason: 'max-level' };
    }

    const nextLevel = placement.level + 1;
    const cost = this.getBuildingTierCost(placement.key, nextLevel);
    if (!this.spend(cost)) {
      return { success: false, reason: 'resources', cost };
    }

    placement.level = nextLevel;
    this.recalculateCityStats();
    this.emit('city-updated', this.getCityGrid());

    return { success: true, level: placement.level };
  }

  removeBuilding(col, row) {
    const placement = this.findBuilding(col, row);
    if (!placement) {
      return { success: false, reason: 'missing' };
    }

    const refund = this.getBuildingRefund(placement.key, placement.level);

    const rowData = this.cityGrid[row];
    if (rowData) {
      rowData[col] = null;
    }
    const index = this.buildings.findIndex((building) => building.id === placement.id);
    if (index !== -1) {
      this.buildings.splice(index, 1);
    }

    this.addResources(refund);
    this.recalculateCityStats();
    this.emit('city-updated', this.getCityGrid());

    return { success: true, refund };
  }

  recalculateCityStats() {
    const previousCapacity = this.populationCapacity;
    this.populationCapacity = Math.max(
      STARTING_CITIZENS,
      this.buildings.reduce((total, building) => {
        if (building.key === 'house') {
          const level = clamp(building.level, 1, MAX_BUILDING_LEVEL);
          return total + (HOUSE_CAPACITY_BY_TIER[level] ?? 0);
        }
        return total;
      }, 0)
    );

    if (this.population > this.populationCapacity) {
      this.population = this.populationCapacity;
    } else if (this.population < STARTING_CITIZENS) {
      this.population = STARTING_CITIZENS;
    }

    this.autoAssignCitizens();
    this.recalculateHealthFromBuildings();

    if (previousCapacity !== this.populationCapacity) {
      this.emit('population-changed', this.getPopulationState());
    } else {
      this.emit('population-changed', this.getPopulationState());
    }

    this.emit('tower-support-changed', this.getTowerSupportState());
  }

  autoAssignCitizens() {
    const totalCitizens = Math.max(0, Math.floor(this.population));
    let remaining = totalCitizens;

    this.buildings.forEach((building) => {
      building.assignedCitizens = 0;
    });

    const ordered = [...this.buildings].sort((a, b) => {
      const priorityA = BUILDING_ASSIGNMENT_ORDER.indexOf(a.key);
      const priorityB = BUILDING_ASSIGNMENT_ORDER.indexOf(b.key);
      const resolvedA = priorityA === -1 ? Number.MAX_SAFE_INTEGER : priorityA;
      const resolvedB = priorityB === -1 ? Number.MAX_SAFE_INTEGER : priorityB;
      if (resolvedA === resolvedB) {
        return a.id - b.id;
      }
      return resolvedA - resolvedB;
    });

    ordered.forEach((building) => {
      const blueprint = this.getBuildingBlueprint(building.key);
      const requirement = blueprint?.citizenRequirement ?? 0;
      if (requirement <= 0) {
        return;
      }

      const assigned = Math.min(requirement, remaining);
      building.assignedCitizens = assigned;
      remaining -= assigned;
    });

    this.unassignedCitizens = remaining;
  }

  recalculateHealthFromBuildings() {
    const previousMax = this.maxHealth;
    const ratio = previousMax > 0 ? this.health / previousMax : 1;

    let bonus = 0;
    this.buildings.forEach((building) => {
      const blueprint = this.getBuildingBlueprint(building.key);
      if (!blueprint?.healthBonusPerLevel) {
        return;
      }
      const staffing = blueprint.citizenRequirement > 0
        ? building.assignedCitizens / blueprint.citizenRequirement
        : 1;
      const effective = clamp(staffing, 0, 1) * blueprint.healthBonusPerLevel * building.level;
      bonus += effective;
    });

    const multiplier = 1 + bonus;
    this.maxHealth = Math.max(this.baseMaxHealth, Math.round(this.baseMaxHealth * multiplier));
    this.health = clamp(Math.round(this.maxHealth * ratio), 1, this.maxHealth);
    this.emit('health-changed', this.getHealthState());
  }

  processCityTick() {
    if (this.buildings.length === 0) {
      return null;
    }

    const totals = {};

    this.buildings.forEach((building) => {
      const blueprint = this.getBuildingBlueprint(building.key);
      if (!blueprint) {
        return;
      }

      const staffing = blueprint.citizenRequirement > 0
        ? building.assignedCitizens / blueprint.citizenRequirement
        : 1;
      const efficiency = clamp(staffing, 0, 1);

      if (blueprint.production) {
        Object.entries(blueprint.production).forEach(([resource, amount]) => {
          const gain = Math.round(amount * building.level * efficiency);
          if (gain > 0) {
            totals[resource] = (totals[resource] ?? 0) + gain;
          }
        });
      }
    });

    const foodConsumption = this.getFoodRequirementPerTick();
    if (foodConsumption > 0) {
      totals.food = (totals.food ?? 0) - foodConsumption;
    }

    const summaryParts = [];
    Object.entries(totals).forEach(([resource, amount]) => {
      if (amount === 0) {
        return;
      }
      this.resources[resource] = (this.resources[resource] ?? 0) + amount;
      summaryParts.push(`${amount > 0 ? '+' : ''}${amount} ${resource}`);
    });

    this.resources.food = Math.max(0, this.resources.food);

    if (this.population < this.populationCapacity && this.resources.food > this.getFoodRequirementPerTick()) {
      this.population += 1;
    }

    this.autoAssignCitizens();

    this.emit('resources-changed', this.getResources());
    this.emit('population-changed', this.getPopulationState());
    this.emit('tower-support-changed', this.getTowerSupportState());
    this.recalculateHealthFromBuildings();

    if (summaryParts.length === 0) {
      return null;
    }

    return `City production: ${summaryParts.join(', ')}`;
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

  getBarracksSupport() {
    const support = this.buildings.reduce((total, building) => {
      if (building.key !== 'barracks') {
        return total;
      }
      const blueprint = this.getBuildingBlueprint('barracks');
      const staffing = blueprint.citizenRequirement > 0
        ? building.assignedCitizens / blueprint.citizenRequirement
        : 1;
      const effective = clamp(staffing, 0, 1) * (blueprint.towerSupport ?? 0) * building.level;
      return total + Math.floor(effective * SUPPORT_PER_BARRACKS);
    }, 0);

    return support;
  }

  getAvailableTowerSlots() {
    return Math.max(0, this.getBarracksSupport() - this.towerPlacements.length);
  }

  emitTowerSupport() {
    this.emit('tower-support-changed', this.getTowerSupportState());
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

    if (this.getAvailableTowerSlots() <= 0) {
      return { success: false, reason: 'support' };
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
    this.emitTowerSupport();

    return { success: true, tower: blueprint };
  }

  removeTower(col, row) {
    const index = this.towerPlacements.findIndex((placement) => placement.col === col && placement.row === row);
    if (index === -1) {
      return false;
    }

    this.towerPlacements.splice(index, 1);
    this.emit('towers-updated', this.getTowerPlacements());
    this.emitTowerSupport();
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

  takeDamage(amount) {
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    this.health = Math.max(0, this.health - amount);
    this.emit('health-changed', this.getHealthState());
    if (this.health <= 0) {
      this.emit('game-over');
    }
  }

  heal(amount) {
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.emit('health-changed', this.getHealthState());
  }

  getGameSpeed() {
    return this.gameSpeed;
  }

  getLeakDamage() {
    return this.leakDamage;
  }

  setGameSpeed(speed) {
    const normalized = clamp(Math.round(speed), 1, 5);
    if (normalized === this.gameSpeed) {
      return;
    }
    this.gameSpeed = normalized;
    this.emit('game-speed-changed', this.gameSpeed);
  }

  setMusicVolume(volume) {
    const normalized = clamp(Math.round(volume), 0, 100);
    if (normalized === this.musicVolume) {
      return;
    }
    this.musicVolume = normalized;
    this.emit('volume-changed', this.getVolumeState());
  }

  setEffectsVolume(volume) {
    const normalized = clamp(Math.round(volume), 0, 100);
    if (normalized === this.effectsVolume) {
      return;
    }
    this.effectsVolume = normalized;
    this.emit('volume-changed', this.getVolumeState());
  }

  purchaseShopItem(itemKey) {
    if (!itemKey) {
      return { success: false, reason: 'unknown' };
    }

    if (itemKey.startsWith('shard-')) {
      const quantity = Number.parseInt(itemKey.split('-')[1], 10);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return { success: false, reason: 'unknown' };
      }
      const costs = { 1: 500, 5: 2000, 10: 3500 };
      const goldCost = costs[quantity];
      if (!goldCost) {
        return { success: false, reason: 'unknown' };
      }
      const cost = { gold: goldCost };
      if (!this.spend(cost)) {
        return { success: false, reason: 'resources', cost };
      }
      this.addResources({ shards: quantity });
      return { success: true, message: `Purchased ${quantity} shard${quantity > 1 ? 's' : ''}.` };
    }

    const blueprint = this.getBuildingBlueprint(itemKey);
    if (!blueprint) {
      return { success: false, reason: 'unknown' };
    }

    const cost = this.getBuildingTierCost(itemKey, 1);
    if (!this.spend(cost)) {
      return { success: false, reason: 'resources', cost };
    }

    return { success: true, message: `${blueprint.name} schematics acquired.` };
  }

  getCurrentWave() {
    return this.currentWave;
  }

  notify(message) {
    if (!message) {
      return;
    }
    this.emit('notification', message);
  }
}
