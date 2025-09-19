// Medieval Kingdom Defense - Game Logic

class GameState {
    constructor() {
        this.resources = {
            gold: 1000,
            wood: 500,
            stone: 300,
            shards: 0
        };
        this.buildings = [];
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.enemyPath = [];
        this.currentWave = 1;
        this.lives = 10;
        this.gameRunning = false;
        this.selectedBuilding = null;
        this.selectedTower = null;
        this.gameSpeed = 1;
        this.musicVolume = 50;
        this.effectsVolume = 50;
        this.enemyIdCounter = 0;
        this.waveInProgress = false;
        this.enemiesSpawned = 0;
        this.enemiesDefeated = 0;
        this.waveStartTime = 0;
        this.consecutiveFailures = 0;
        this.activePowerUp = null;
        this.currentPathData = null;
        this.lastPathTemplateIndex = null;
        this.loadGameState();
    }

    updateResources() {
        // Update resource displays
        document.getElementById('gold').textContent = this.resources.gold;
        document.getElementById('wood').textContent = this.resources.wood;
        document.getElementById('stone').textContent = this.resources.stone;
        document.getElementById('shards').textContent = this.resources.shards;
        document.getElementById('city-gold').textContent = this.resources.gold;
        document.getElementById('city-wood').textContent = this.resources.wood;
        document.getElementById('city-stone').textContent = this.resources.stone;
        document.getElementById('defense-gold').textContent = this.resources.gold;
        document.getElementById('shop-gold').textContent = this.resources.gold;
        document.getElementById('shop-wood').textContent = this.resources.wood;
        document.getElementById('shop-stone').textContent = this.resources.stone;
        document.getElementById('shop-shards').textContent = this.resources.shards;
    }

    canAfford(cost) {
        return this.resources.gold >= (cost.gold || 0) && 
               this.resources.wood >= (cost.wood || 0) && 
               this.resources.stone >= (cost.stone || 0) &&
               this.resources.shards >= (cost.shards || 0);
    }

    spendResources(cost) {
        this.resources.gold -= (cost.gold || 0);
        this.resources.wood -= (cost.wood || 0);
        this.resources.stone -= (cost.stone || 0);
        this.resources.shards -= (cost.shards || 0);
        this.updateResources();
        this.saveGameState();
    }

    addResources(amount) {
        this.resources.gold += amount.gold || 0;
        this.resources.wood += amount.wood || 0;
        this.resources.stone += amount.stone || 0;
        this.resources.shards += amount.shards || 0;
        this.updateResources();
        this.saveGameState();
    }

    saveGameState() {
        const gameData = {
            resources: this.resources,
            currentWave: this.currentWave,
            lives: this.lives,
            buildings: this.buildings,
            towers: this.towers,
            musicVolume: this.musicVolume,
            effectsVolume: this.effectsVolume,
            consecutiveFailures: this.consecutiveFailures
        };
        localStorage.setItem('medievalKingdomDefense', JSON.stringify(gameData));
    }

    loadGameState() {
        const savedData = localStorage.getItem('medievalKingdomDefense');
        if (savedData) {
            try {
                const gameData = JSON.parse(savedData);
                this.resources = gameData.resources || this.resources;
                this.currentWave = gameData.currentWave || this.currentWave;
                this.lives = gameData.lives || this.lives;
                this.buildings = gameData.buildings || this.buildings;
                this.towers = gameData.towers || this.towers;
                this.musicVolume = gameData.musicVolume || this.musicVolume;
                this.effectsVolume = gameData.effectsVolume || this.effectsVolume;
                this.consecutiveFailures = gameData.consecutiveFailures || 0;
            } catch (e) {
                console.log('Failed to load saved game data');
            }
        }
    }
}

class Building {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.level = 1;
        this.productionRate = this.getProductionRate();
        this.lastProduction = Date.now();
    }

    getProductionRate() {
        const rates = {
            'lumber-mill': { wood: 10 },
            'quarry': { stone: 8 },
            'house': { gold: 5 }
        };
        return rates[this.type] || {};
    }

    getIcon() {
        const icons = {
            'house': '🏠',
            'lumber-mill': '🏭',
            'quarry': '⛏️',
            'barracks': '🏰'
        };
        return icons[this.type] || '🏠';
    }

    produce() {
        const now = Date.now();
        if (now - this.lastProduction >= 60000) { // 1 minute
            this.lastProduction = now;
            return this.productionRate;
        }
        return {};
    }
}

class Tower {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.damage = this.getDamage();
        this.range = this.getRange();
        this.fireRate = this.getFireRate();
        this.lastShot = 0;
        this.target = null;
    }

    getDamage() {
        const damages = {
            'archer': 25,
            'cannon': 50,
            'magic': 40
        };
        let baseDamage = damages[this.type] || 25;
        
        // Apply power-up effect if active
        if (game.activePowerUp === 'enhanced_damage') {
            baseDamage = Math.floor(baseDamage * 1.3); // 30% more damage
        }
        
        return baseDamage;
    }

    getRange() {
        const ranges = {
            'archer': 80,
            'cannon': 120,
            'magic': 60
        };
        return ranges[this.type] || 80;
    }

    getFireRate() {
        const rates = {
            'archer': 1000,
            'cannon': 2000,
            'magic': 1500
        };
        return rates[this.type] || 1000;
    }

    getIcon() {
        const icons = {
            'archer': '🏹',
            'cannon': '💣',
            'magic': '🔮'
        };
        return icons[this.type] || '🏹';
    }

    canShoot() {
        return Date.now() - this.lastShot >= this.fireRate;
    }

    findTarget(enemies) {
        let closest = null;
        let closestDistance = this.range;

        enemies.forEach(enemy => {
            const distance = Math.sqrt(
                Math.pow(enemy.x - this.x, 2) + Math.pow(enemy.y - this.y, 2)
            );
            if (distance <= this.range && distance < closestDistance) {
                closest = enemy;
                closestDistance = distance;
            }
        });

        return closest;
    }

    shoot(target) {
        if (this.canShoot() && target) {
            this.lastShot = Date.now();
            this.target = target;
            return true;
        }
        return false;
    }
}

class Enemy {
    constructor(type, path) {
        this.type = type;
        this.path = path;
        this.pathIndex = 0;
        this.x = path[0].x;
        this.y = path[0].y;
        this.health = this.getHealth();
        this.maxHealth = this.health;
        this.speed = this.getSpeed();
        this.reward = this.getReward();
        this.lastMove = Date.now();
    }

    getHealth() {
        const healths = {
            'goblin': 50,
            'orc': 100,
            'dragon': 200,
            'boss-goblin': 300,
            'boss-orc': 500,
            'boss-dragon': 1000
        };
        let baseHealth = healths[this.type] || 50;
        
        // Apply power-up effect if active
        if (game.activePowerUp === 'weakened_enemies') {
            baseHealth = Math.floor(baseHealth * 0.5); // 50% health
        }
        
        return baseHealth;
    }

    getSpeed() {
        const speeds = {
            'goblin': 1,
            'orc': 0.7,
            'dragon': 0.5
        };
        return speeds[this.type] || 1;
    }

    getReward() {
        const rewards = {
            'goblin': { gold: 15 },
            'orc': { gold: 35 },
            'dragon': { gold: 75 },
            'boss-goblin': { gold: 100 },
            'boss-orc': { gold: 200 },
            'boss-dragon': { gold: 500 }
        };
        return rewards[this.type] || { gold: 15 };
    }

    getIcon() {
        const icons = {
            'goblin': '👹',
            'orc': '👺',
            'dragon': '🐉',
            'boss-goblin': '👑👹',
            'boss-orc': '👑👺',
            'boss-dragon': '👑🐉'
        };
        return icons[this.type] || '👹';
    }

    move() {
        const now = Date.now();
        if (now - this.lastMove >= 100 / this.speed) {
            this.lastMove = now;
            if (this.pathIndex < this.path.length - 1) {
                this.pathIndex++;
                this.x = this.path[this.pathIndex].x;
                this.y = this.path[this.pathIndex].y;
            } else {
                return 'reached_end';
            }
        }
        return 'moving';
    }

    takeDamage(damage) {
        this.health -= damage;
        return this.health <= 0;
    }
}

class Projectile {
    constructor(x, y, target, damage) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.speed = 5;
        this.active = true;
    }

    update() {
        if (!this.target || !this.active) return false;

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) {
            this.active = false;
            return { hit: true, damage: this.damage, target: this.target };
        }

        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;
        return { hit: false };
    }
}

// Game instance
const game = new GameState();

// Initialize the game
document.addEventListener('DOMContentLoaded', function() {
    initializeGame();
    setupEventListeners();
    generateCityGrid();
    generateDefensePath();
    startResourceProduction();
});

function initializeGame() {
    game.updateResources();
    document.getElementById('current-wave').textContent = game.currentWave;
    document.getElementById('lives').textContent = game.lives;
    document.getElementById('music-volume').value = game.musicVolume;
    document.getElementById('effects-volume').value = game.effectsVolume;
}

function setupEventListeners() {
    // Navigation
    document.getElementById('settings-btn').addEventListener('click', () => switchScreen('settings'));
    document.getElementById('shop-btn').addEventListener('click', () => switchScreen('shop'));
    document.getElementById('city-btn').addEventListener('click', () => switchScreen('city'));
    document.getElementById('defense-btn').addEventListener('click', () => switchScreen('defense'));

    // Settings
    document.getElementById('music-volume').addEventListener('input', (e) => {
        game.musicVolume = e.target.value;
        game.saveGameState();
    });

    document.getElementById('effects-volume').addEventListener('input', (e) => {
        game.effectsVolume = e.target.value;
        game.saveGameState();
    });

    // Shop
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const item = e.target.dataset.item;
            buyItem(item);
        });
    });

    // City Management
    document.querySelectorAll('.building-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const building = e.target.closest('.building-option').dataset.building;
            selectBuilding(building);
        });
    });

    // Tower Defense
    document.querySelectorAll('.tower-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const tower = e.target.closest('.tower-option').dataset.tower;
            selectTower(tower);
        });
    });

    document.getElementById('start-wave').addEventListener('click', startWave);
    document.getElementById('pause-game').addEventListener('click', togglePause);
    document.getElementById('reset-game').addEventListener('click', resetGame);
}

function switchScreen(screenName) {
    // Hide all screens
    document.querySelectorAll('.game-screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected screen
    document.getElementById(`${screenName}-screen`).classList.add('active');
    document.getElementById(`${screenName}-btn`).classList.add('active');

    // Update displays
    game.updateResources();

    // Regenerate defense path when opening defense screen so dimensions are correct
    if (screenName === 'defense') {
        // Allow layout to settle before measuring
        setTimeout(() => {
            generateDefensePath();
        }, 0);
    }
}

function buyItem(item) {
    const costs = {
        'house': { gold: 100, wood: 50, stone: 0, shards: 0 },
        'lumber-mill': { gold: 200, wood: 100, stone: 0, shards: 0 },
        'quarry': { gold: 300, wood: 0, stone: 50, shards: 0 },
        'shard-1': { gold: 500, wood: 0, stone: 0, shards: 0 },
        'shard-5': { gold: 2000, wood: 0, stone: 0, shards: 0 },
        'shard-10': { gold: 3500, wood: 0, stone: 0, shards: 0 }
    };

    const cost = costs[item];
    if (game.canAfford(cost)) {
        game.spendResources(cost);
        
        if (item.startsWith('shard-')) {
            const shardAmount = parseInt(item.split('-')[1]);
            game.addResources({ shards: shardAmount });
            alert(`${shardAmount} shard(s) purchased successfully!`);
        } else {
            alert(`${item} purchased successfully!`);
        }
    } else {
        alert('Not enough resources!');
    }
}

function generateCityGrid() {
    const grid = document.getElementById('city-grid');
    grid.innerHTML = '';

    for (let i = 0; i < 48; i++) {
        const tile = document.createElement('div');
        tile.className = 'city-tile';
        tile.dataset.index = i;
        tile.addEventListener('click', () => placeBuilding(i));
        grid.appendChild(tile);
    }
}

function selectBuilding(buildingType) {
    game.selectedBuilding = buildingType;
    document.querySelectorAll('.building-option').forEach(option => {
        option.style.borderColor = '#8b4513';
    });
    document.querySelector(`[data-building="${buildingType}"]`).style.borderColor = '#d4af37';
}

function placeBuilding(index) {
    if (!game.selectedBuilding) {
        alert('Please select a building first!');
        return;
    }

    const costs = {
        'house': { gold: 100, wood: 50, stone: 0 },
        'lumber-mill': { gold: 200, wood: 100, stone: 0 },
        'quarry': { gold: 300, wood: 0, stone: 50 },
        'barracks': { gold: 500, wood: 200, stone: 0 }
    };

    const cost = costs[game.selectedBuilding];
    if (game.canAfford(cost)) {
        const tile = document.querySelector(`[data-index="${index}"]`);
        if (!tile.classList.contains('occupied')) {
            game.spendResources(cost);
            tile.classList.add('occupied');
            tile.textContent = new Building(game.selectedBuilding, 0, 0).getIcon();
            
            const building = new Building(game.selectedBuilding, 0, 0);
            game.buildings.push(building);
            
            game.selectedBuilding = null;
            document.querySelectorAll('.building-option').forEach(option => {
                option.style.borderColor = '#8b4513';
            });
        } else {
            alert('This tile is already occupied!');
        }
    } else {
        alert('Not enough resources!');
    }
}

// Path layouts inspired by the dirt routes drawn in maps.png
const PATH_TEMPLATES = [
    {
        id: 'serpentine',
        points: [
            { x: 0, y: 0.5 },
            { x: 0.2, y: 0.3 },
            { x: 0.38, y: 0.68 },
            { x: 0.6, y: 0.35 },
            { x: 0.78, y: 0.7 },
            { x: 1, y: 0.5 }
        ]
    },
    {
        id: 'meandering',
        points: [
            { x: 0, y: 0.65 },
            { x: 0.18, y: 0.75 },
            { x: 0.35, y: 0.4 },
            { x: 0.52, y: 0.55 },
            { x: 0.72, y: 0.25 },
            { x: 1, y: 0.35 }
        ]
    },
    {
        id: 'switchback',
        points: [
            { x: 0, y: 0.35 },
            { x: 0.22, y: 0.2 },
            { x: 0.4, y: 0.75 },
            { x: 0.58, y: 0.25 },
            { x: 0.76, y: 0.75 },
            { x: 1, y: 0.45 }
        ]
    },
    {
        id: 'riverbend',
        points: [
            { x: 0, y: 0.45 },
            { x: 0.18, y: 0.6 },
            { x: 0.34, y: 0.2 },
            { x: 0.5, y: 0.4 },
            { x: 0.68, y: 0.18 },
            { x: 0.86, y: 0.65 },
            { x: 1, y: 0.55 }
        ]
    }
];

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function ensureFieldLayers() {
    const field = document.getElementById('game-field');

    let pathLayer = field.querySelector('.path-layer');
    if (!pathLayer) {
        pathLayer = document.createElement('div');
        pathLayer.className = 'path-layer';
        field.insertBefore(pathLayer, field.firstChild);
    }

    let towerLayer = field.querySelector('.tower-layer');
    if (!towerLayer) {
        towerLayer = document.createElement('div');
        towerLayer.className = 'tower-layer';
        field.appendChild(towerLayer);
    }

    let enemyLayer = field.querySelector('.enemy-layer');
    if (!enemyLayer) {
        enemyLayer = document.createElement('div');
        enemyLayer.className = 'enemy-layer';
        field.appendChild(enemyLayer);
    }

    let projectileLayer = field.querySelector('.projectile-layer');
    if (!projectileLayer) {
        projectileLayer = document.createElement('div');
        projectileLayer.className = 'projectile-layer';
        field.appendChild(projectileLayer);
    }

    return { field, pathLayer, towerLayer, enemyLayer, projectileLayer };
}

function buildPathPoints(width, height, marginX, marginY, templateIndex, jitter) {
    const template = PATH_TEMPLATES[templateIndex];
    const horizontalSpan = Math.max(10, width - marginX * 2);
    const verticalSpan = Math.max(10, height - marginY * 2);

    return template.points.map((point, index) => {
        const offset = jitter[index] || { dx: 0, dy: 0 };
        const normalizedX = clamp(point.x + offset.dx, 0, 1);
        const normalizedY = clamp(point.y + offset.dy, 0, 1);
        return {
            x: marginX + normalizedX * horizontalSpan,
            y: marginY + normalizedY * verticalSpan
        };
    });
}

function interpolatePath(points, step = 20) {
    const interpolated = [];
    for (let i = 0; i < points.length - 1; i++) {
        const start = points[i];
        const end = points[i + 1];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const segments = Math.max(1, Math.floor(distance / step));

        for (let s = 0; s < segments; s++) {
            const t = s / segments;
            interpolated.push({
                x: start.x + dx * t,
                y: start.y + dy * t
            });
        }
    }

    if (points.length > 0) {
        interpolated.push(points[points.length - 1]);
    }

    return interpolated;
}

function drawDirtPath(layer, points, pathWidth) {
    for (let i = 0; i < points.length - 1; i++) {
        const start = points[i];
        const end = points[i + 1];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        const segment = document.createElement('div');
        segment.className = 'path-segment';
        segment.style.width = `${length}px`;
        segment.style.height = `${pathWidth}px`;
        segment.style.left = `${start.x}px`;
        segment.style.top = `${start.y}px`;
        segment.style.transform = `translate(-${pathWidth / 2}px, -${pathWidth / 2}px) rotate(${angle}deg)`;
        layer.appendChild(segment);
    }
}

function addPathMarkers(layer, points) {
    if (!points.length) return;

    const startMarker = document.createElement('div');
    startMarker.className = 'path-marker start';
    startMarker.style.left = `${points[0].x}px`;
    startMarker.style.top = `${points[0].y}px`;
    layer.appendChild(startMarker);

    const endMarker = document.createElement('div');
    endMarker.className = 'path-marker end';
    endMarker.style.left = `${points[points.length - 1].x}px`;
    endMarker.style.top = `${points[points.length - 1].y}px`;
    layer.appendChild(endMarker);
}

function pickRandomPathTemplate(excludeIndex = null) {
    const indices = PATH_TEMPLATES.map((_, index) => index);
    const available = excludeIndex !== null && indices.length > 1
        ? indices.filter(index => index !== excludeIndex)
        : indices;
    const choice = available[Math.floor(Math.random() * available.length)];
    return choice;
}

function generateDefensePath(options = {}) {
    const { forceNew = false } = options;
    const { field, pathLayer } = ensureFieldLayers();

    const fieldRect = field.getBoundingClientRect();
    const width = fieldRect.width || field.clientWidth || 800;
    const height = fieldRect.height || field.clientHeight || 500;
    const marginBase = Math.min(width, height) * 0.12;
    const marginX = Math.min(Math.max(60, marginBase), Math.max(width / 2 - 40, 20));
    const marginY = Math.min(Math.max(60, marginBase), Math.max(height / 2 - 40, 20));
    const pathWidth = Math.max(50, Math.min(width, height) * 0.12);

    if (!game.currentPathData || forceNew) {
        const templateIndex = pickRandomPathTemplate(game.lastPathTemplateIndex);
        const jitter = PATH_TEMPLATES[templateIndex].points.map((_, index, array) => {
            if (index === 0 || index === array.length - 1) {
                return { dx: 0, dy: 0 };
            }
            return {
                dx: (Math.random() - 0.5) * 0.08,
                dy: (Math.random() - 0.5) * 0.12
            };
        });

        game.currentPathData = { templateIndex, jitter };
        game.lastPathTemplateIndex = templateIndex;
    }

    const { templateIndex, jitter } = game.currentPathData;
    const basePoints = buildPathPoints(width, height, marginX, marginY, templateIndex, jitter);

    pathLayer.innerHTML = '';
    drawDirtPath(pathLayer, basePoints, pathWidth);
    addPathMarkers(pathLayer, basePoints);

    game.enemyPath = interpolatePath(basePoints, 18);
}

function selectTower(towerType) {
    game.selectedTower = towerType;
    document.querySelectorAll('.tower-option').forEach(option => {
        option.style.borderColor = '#8b4513';
    });
    document.querySelector(`[data-tower="${towerType}"]`).style.borderColor = '#d4af37';
    
    // Update cost display if power-up is active
    updateTowerCostDisplay();
}

function updateTowerCostDisplay() {
    const costs = {
        'archer': { gold: 150, wood: 0, stone: 0 },
        'cannon': { gold: 300, wood: 0, stone: 0 },
        'magic': { gold: 250, wood: 0, stone: 0 }
    };
    
    document.querySelectorAll('.tower-option').forEach(option => {
        const towerType = option.dataset.tower;
        const costInfo = option.querySelector('.tower-info p:last-child');
        let cost = costs[towerType];
        
        if (game.activePowerUp === 'cheaper_towers') {
            cost = {
                gold: Math.floor(cost.gold * 0.75),
                wood: cost.wood,
                stone: cost.stone
            };
            costInfo.textContent = `Cost: ${cost.gold} Gold (25% OFF!)`;
            costInfo.style.color = '#32cd32';
        } else {
            costInfo.textContent = `Cost: ${cost.gold} Gold`;
            costInfo.style.color = '#f4e4bc';
        }
    });
}

function placeTower(x, y) {
    if (!game.selectedTower) {
        alert('Please select a tower first!');
        return;
    }

    const costs = {
        'archer': { gold: 150, wood: 0, stone: 0 },
        'cannon': { gold: 300, wood: 0, stone: 0 },
        'magic': { gold: 250, wood: 0, stone: 0 }
    };

    let cost = costs[game.selectedTower];
    
    // Apply power-up effect if active
    if (game.activePowerUp === 'cheaper_towers') {
        cost = {
            gold: Math.floor(cost.gold * 0.75), // 25% cheaper
            wood: cost.wood,
            stone: cost.stone
        };
    }
    
    if (game.canAfford(cost)) {
        game.spendResources(cost);
        
        const tower = new Tower(game.selectedTower, x, y);
        game.towers.push(tower);
        
        const towerElement = document.createElement('div');
        towerElement.className = 'tower';
        towerElement.style.left = x + 'px';
        towerElement.style.top = y + 'px';
        towerElement.textContent = tower.getIcon();
        towerElement.addEventListener('click', () => upgradeTower(tower));

        const { towerLayer } = ensureFieldLayers();
        towerLayer.appendChild(towerElement);
        
        game.selectedTower = null;
        document.querySelectorAll('.tower-option').forEach(option => {
            option.style.borderColor = '#8b4513';
        });
    } else {
        alert('Not enough resources!');
    }
}

function upgradeTower(tower) {
    const upgradeCost = { gold: 100, wood: 0, stone: 0 };
    if (game.canAfford(upgradeCost)) {
        game.spendResources(upgradeCost);
        tower.damage += 10;
        tower.range += 10;
        alert('Tower upgraded!');
    } else {
        alert('Not enough gold for upgrade!');
    }
}

function startWave() {
    if (game.waveInProgress) return;

    // Generate a fresh randomized path for this wave
    generateDefensePath({ forceNew: true });

    // Ensure we have a valid enemy path
    if (!game.enemyPath || game.enemyPath.length < 2) {
        generateDefensePath();
    }
    
    game.waveInProgress = true;
    game.enemiesSpawned = 0;
    game.enemiesDefeated = 0;
    game.waveStartTime = Date.now();
    
    document.getElementById('start-wave').textContent = 'Wave in Progress';
    document.getElementById('start-wave').disabled = true;
    
    // Check if this is a boss wave (every 5 waves)
    const isBossWave = game.currentWave % 5 === 0;
    
    if (isBossWave) {
        // Boss wave - spawn one powerful boss
        const bossTypes = ['boss-goblin', 'boss-orc', 'boss-dragon'];
        const bossType = bossTypes[Math.floor(Math.random() * bossTypes.length)];
        setTimeout(() => {
            spawnEnemy(bossType);
            game.enemiesSpawned = 1;
        }, 1000);
    } else {
        // Regular wave
        const enemyTypes = ['goblin', 'orc', 'dragon'];
        const enemyCount = Math.min(5 + game.currentWave * 2, 20);
        
        for (let i = 0; i < enemyCount; i++) {
            setTimeout(() => {
                const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
                spawnEnemy(enemyType);
                game.enemiesSpawned++;
            }, i * 1000);
        }
    }
}

function spawnEnemy(type) {
    const enemy = new Enemy(type, game.enemyPath);
    game.enemies.push(enemy);
    
    const enemyElement = document.createElement('div');
    enemyElement.className = `enemy ${type}`;
    enemyElement.style.left = enemy.x + 'px';
    enemyElement.style.top = enemy.y + 'px';
    enemyElement.textContent = enemy.getIcon();
    const id = game.enemyIdCounter++;
    enemy.domId = `enemy-${id}`;
    enemyElement.id = enemy.domId;
    
    const { enemyLayer } = ensureFieldLayers();
    enemyLayer.appendChild(enemyElement);
}

function endWave() {
    game.waveInProgress = false;
    game.currentWave++;
    game.consecutiveFailures = 0; // Reset failure counter on success
    game.activePowerUp = null; // Clear any active power-up
    document.getElementById('current-wave').textContent = game.currentWave;
    document.getElementById('start-wave').textContent = 'Start Wave';
    document.getElementById('start-wave').disabled = false;
    
    // Save game state
    game.saveGameState();
    
    // Wave completion reward
    const waveReward = 50 + game.currentWave * 25;
    game.addResources({ gold: waveReward });
    
    const isBossWave = (game.currentWave - 1) % 5 === 0;
    const waveType = isBossWave ? 'BOSS WAVE' : 'Wave';
    alert(`${waveType} ${game.currentWave - 1} completed! +${waveReward} gold bonus!`);
}

function handleWaveFailure() {
    game.waveInProgress = false;
    game.consecutiveFailures++;
    
    // Apply 10% gold penalty
    const penalty = Math.floor(game.resources.gold * 0.1);
    game.resources.gold = Math.max(0, game.resources.gold - penalty);
    game.updateResources();
    
    // Check if player is eligible for power-up
    if (game.consecutiveFailures >= 3) {
        showPowerUpSelection();
    } else {
        document.getElementById('start-wave').textContent = 'Start Wave';
        document.getElementById('start-wave').disabled = false;
        alert(`Wave failed! -${penalty} gold penalty. Failures: ${game.consecutiveFailures}/3`);
    }
    
    game.saveGameState();
}

function togglePause() {
    game.gameRunning = !game.gameRunning;
    document.getElementById('pause-game').textContent = game.gameRunning ? 'Pause' : 'Resume';
}

function resetGame() {
    if (confirm('Are you sure you want to reset the game? This will delete all progress!')) {
        localStorage.removeItem('medievalKingdomDefense');
        location.reload();
    }
}

function showPowerUpSelection() {
    const powerUps = [
        {
            id: 'weakened_enemies',
            name: 'Weakened Enemies',
            description: 'Enemies start with 50% health',
            icon: '💀'
        },
        {
            id: 'cheaper_towers',
            name: 'Cheaper Towers',
            description: 'Tower costs reduced by 25%',
            icon: '💰'
        },
        {
            id: 'enhanced_damage',
            name: 'Enhanced Damage',
            description: 'Towers deal 30% more damage',
            icon: '⚡'
        }
    ];
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    overlay.style.zIndex = '10000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    
    // Create modal content
    const modal = document.createElement('div');
    modal.style.backgroundColor = '#2c1810';
    modal.style.border = '3px solid #d4af37';
    modal.style.borderRadius = '15px';
    modal.style.padding = '2rem';
    modal.style.maxWidth = '600px';
    modal.style.width = '90%';
    modal.style.textAlign = 'center';
    
    modal.innerHTML = `
        <h2 style="color: #d4af37; margin-bottom: 1rem;">⚡ POWER-UP SELECTION ⚡</h2>
        <p style="color: #f4e4bc; margin-bottom: 2rem;">You've failed 3 waves in a row! Choose a power-up to help you succeed:</p>
        <div id="powerup-options" style="display: flex; flex-direction: column; gap: 1rem;">
        </div>
    `;
    
    // Add power-up options
    const optionsContainer = modal.querySelector('#powerup-options');
    powerUps.forEach(powerUp => {
        const option = document.createElement('div');
        option.style.backgroundColor = 'rgba(61, 41, 20, 0.8)';
        option.style.border = '2px solid #8b4513';
        option.style.borderRadius = '10px';
        option.style.padding = '1rem';
        option.style.cursor = 'pointer';
        option.style.transition = 'all 0.3s ease';
        
        option.innerHTML = `
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">${powerUp.icon}</div>
            <h3 style="color: #d4af37; margin-bottom: 0.5rem;">${powerUp.name}</h3>
            <p style="color: #f4e4bc; font-size: 0.9rem;">${powerUp.description}</p>
        `;
        
        option.addEventListener('mouseenter', () => {
            option.style.borderColor = '#d4af37';
            option.style.backgroundColor = 'rgba(61, 41, 20, 1)';
        });
        
        option.addEventListener('mouseleave', () => {
            option.style.borderColor = '#8b4513';
            option.style.backgroundColor = 'rgba(61, 41, 20, 0.8)';
        });
        
        option.addEventListener('click', () => {
            selectPowerUp(powerUp.id);
            overlay.remove();
        });
        
        optionsContainer.appendChild(option);
    });
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

function selectPowerUp(powerUpId) {
    game.activePowerUp = powerUpId;
    game.consecutiveFailures = 0; // Reset failure counter
    game.saveGameState();
    
    const powerUpNames = {
        'weakened_enemies': 'Weakened Enemies',
        'cheaper_towers': 'Cheaper Towers',
        'enhanced_damage': 'Enhanced Damage'
    };
    
    alert(`Power-up activated: ${powerUpNames[powerUpId]}! This effect lasts for one wave only.`);
    
    // Show power-up indicator
    showPowerUpIndicator(powerUpId);
    
    // Re-enable start wave button
    document.getElementById('start-wave').textContent = 'Start Wave';
    document.getElementById('start-wave').disabled = false;
}

function showPowerUpIndicator(powerUpId) {
    // Remove existing indicator
    const existingIndicator = document.getElementById('powerup-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    const powerUpInfo = {
        'weakened_enemies': { name: 'Weakened Enemies', icon: '💀' },
        'cheaper_towers': { name: 'Cheaper Towers', icon: '💰' },
        'enhanced_damage': { name: 'Enhanced Damage', icon: '⚡' }
    };
    
    const info = powerUpInfo[powerUpId];
    const indicator = document.createElement('div');
    indicator.id = 'powerup-indicator';
    indicator.style.position = 'fixed';
    indicator.style.top = '20px';
    indicator.style.right = '20px';
    indicator.style.backgroundColor = 'rgba(212, 175, 55, 0.9)';
    indicator.style.color = '#1a0f0a';
    indicator.style.padding = '10px 15px';
    indicator.style.borderRadius = '8px';
    indicator.style.fontWeight = 'bold';
    indicator.style.fontSize = '14px';
    indicator.style.zIndex = '1000';
    indicator.style.border = '2px solid #b8860b';
    indicator.innerHTML = `${info.icon} ${info.name} ACTIVE`;
    
    document.body.appendChild(indicator);
}

function startResourceProduction() {
    setInterval(() => {
        game.buildings.forEach(building => {
            const production = building.produce();
            if (production) {
                game.addResources(production);
            }
        });
    }, 60000); // Every minute
}

// Game loop for tower defense
function gameLoop() {
    if (game.gameRunning) {
        // Update enemies
        game.enemies.forEach((enemy, index) => {
            const result = enemy.move();
            if (result === 'reached_end') {
                game.lives--;
                document.getElementById('lives').textContent = game.lives;
                game.enemies.splice(index, 1);
                if (enemy.domId) {
                    document.getElementById(enemy.domId)?.remove();
                }
                
                if (game.lives <= 0) {
                    alert('Game Over!');
                    game.gameRunning = false;
                    game.waveInProgress = false;
                } else {
                    // Wave failed - apply penalty and check for power-up
                    handleWaveFailure();
                }
            } else {
                const enemyElement = document.getElementById(enemy.domId || `enemy-${index}`);
                if (enemyElement) {
                    enemyElement.style.left = enemy.x + 'px';
                    enemyElement.style.top = enemy.y + 'px';
                }
            }
        });

        // Check if wave is complete (all enemies defeated)
        if (game.waveInProgress && game.enemies.length === 0 && game.enemiesSpawned > 0) {
            endWave();
        }

        // Update towers
        game.towers.forEach(tower => {
            const target = tower.findTarget(game.enemies);
            if (target && tower.shoot(target)) {
                const projectile = new Projectile(tower.x + 20, tower.y + 20, target, tower.damage);
                game.projectiles.push(projectile);
                
                const projectileElement = document.createElement('div');
                projectileElement.className = 'projectile';
                projectileElement.style.left = projectile.x + 'px';
                projectileElement.style.top = projectile.y + 'px';
                projectileElement.id = `projectile-${game.projectiles.length - 1}`;
                const { projectileLayer } = ensureFieldLayers();
                projectileLayer.appendChild(projectileElement);
            }
        });

        // Update projectiles
        game.projectiles.forEach((projectile, index) => {
            const result = projectile.update();
            if (result.hit) {
                const enemyIndex = game.enemies.findIndex(e => e === result.target);
                if (enemyIndex !== -1) {
                    const enemy = game.enemies[enemyIndex];
                    if (enemy.takeDamage(result.damage)) {
                        // Enemy defeated - give reward
                        game.addResources(enemy.reward);
                        game.enemiesDefeated++;
                        
                        // Check for shard drop (0.05% chance for boss enemies)
                        if (enemy.type.startsWith('boss-') && Math.random() < 0.0005) {
                            game.addResources({ shards: 1 });
                            showRewardNotification('+1 💎 SHARD!', enemy.x, enemy.y - 30);
                        }
                        
                        game.enemies.splice(enemyIndex, 1);
                        if (enemy.domId) {
                            document.getElementById(enemy.domId)?.remove();
                        }
                        
                        // Show reward notification
                        const rewardText = `+${enemy.reward.gold} gold`;
                        showRewardNotification(rewardText, enemy.x, enemy.y);
                    }
                }
                game.projectiles.splice(index, 1);
                document.getElementById(`projectile-${index}`)?.remove();
            } else if (projectile.active) {
                const projectileElement = document.getElementById(`projectile-${index}`);
                if (projectileElement) {
                    projectileElement.style.left = projectile.x + 'px';
                    projectileElement.style.top = projectile.y + 'px';
                }
            } else {
                game.projectiles.splice(index, 1);
                document.getElementById(`projectile-${index}`)?.remove();
            }
        });
    }
    
    requestAnimationFrame(gameLoop);
}

// Handle tower placement on game field
const gameFieldElement = document.getElementById('game-field');
if (gameFieldElement) {
    gameFieldElement.addEventListener('click', (e) => {
        if (!game.selectedTower) {
            return;
        }

        if (e.target.closest('.tower') || e.target.closest('.enemy') || e.target.closest('.projectile')) {
            return;
        }

        const rect = gameFieldElement.getBoundingClientRect();
        const x = e.clientX - rect.left - 20;
        const y = e.clientY - rect.top - 20;
        placeTower(x, y);
    });
}

// Show reward notification when enemy is defeated
function showRewardNotification(text, x, y) {
    const notification = document.createElement('div');
    notification.textContent = text;
    notification.style.position = 'absolute';
    notification.style.left = x + 'px';
    notification.style.top = (y - 20) + 'px';
    notification.style.color = '#d4af37';
    notification.style.fontWeight = 'bold';
    notification.style.fontSize = '14px';
    notification.style.pointerEvents = 'none';
    notification.style.zIndex = '1000';
    notification.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';
    
    document.getElementById('game-field').appendChild(notification);
    
    // Animate the notification
    let opacity = 1;
    let moveY = 0;
    const animate = () => {
        opacity -= 0.02;
        moveY -= 1;
        notification.style.opacity = opacity;
        notification.style.transform = `translateY(${moveY}px)`;
        
        if (opacity > 0) {
            requestAnimationFrame(animate);
        } else {
            notification.remove();
        }
    };
    
    requestAnimationFrame(animate);
}

// Start the game loop
gameLoop();
