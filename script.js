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
        this.enemyPathLength = 0;
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
    constructor(type, path, totalPathLength) {
        this.type = type;
        this.path = path;
        this.pathIndex = 0;
        this.segmentProgress = 0;
        this.x = path[0]?.x || 0;
        this.y = path[0]?.y || 0;
        this.health = this.getHealth();
        this.maxHealth = this.health;
        this.totalPathLength = totalPathLength || calculatePathLength(path);
        this.baseTravelTime = 30; // seconds to reach the end for baseline enemies
        this.speedMultiplier = this.getSpeedMultiplier();
        const baseSpeed = this.totalPathLength > 0
            ? this.totalPathLength / this.baseTravelTime
            : 0;
        this.speed = baseSpeed * this.speedMultiplier;
        this.reward = this.getReward();
        this.lastMove = Date.now();
        this.segmentLengths = this.buildSegmentLengths();
        this.healthBarElement = null;
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

    getSpeedMultiplier() {
        const health = this.maxHealth;

        if (health >= 1000) {
            return 0.25;
        }
        if (health >= 500) {
            return 0.35;
        }
        if (health >= 300) {
            return 0.45;
        }
        if (health >= 200) {
            return 0.6;
        }
        if (health >= 100) {
            return 0.75;
        }
        return 1;
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

    buildSegmentLengths() {
        const lengths = [];
        if (!Array.isArray(this.path)) {
            return lengths;
        }
        for (let i = 0; i < this.path.length - 1; i++) {
            const start = this.path[i];
            const end = this.path[i + 1];
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            lengths.push(Math.sqrt(dx * dx + dy * dy));
        }
        return lengths;
    }

    setHealthBarElement(element) {
        this.healthBarElement = element;
        this.updateHealthBar();
    }

    updateHealthBar() {
        if (!this.healthBarElement) {
            return;
        }

        const ratio = this.maxHealth > 0 ? Math.max(this.health / this.maxHealth, 0) : 0;
        this.healthBarElement.style.width = `${(ratio * 100).toFixed(0)}%`;

        if (ratio <= 0.3) {
            this.healthBarElement.style.backgroundColor = '#d93025';
        } else if (ratio <= 0.6) {
            this.healthBarElement.style.backgroundColor = '#f9a825';
        } else {
            this.healthBarElement.style.backgroundColor = '#4caf50';
        }
    }

    move() {
        const now = Date.now();
        const deltaSeconds = (now - this.lastMove) / 1000;
        this.lastMove = now;

        if (!Array.isArray(this.path) || this.path.length < 2 || deltaSeconds <= 0) {
            return 'moving';
        }

        let distanceToTravel = this.speed * deltaSeconds;

        while (distanceToTravel > 0 && this.pathIndex < this.path.length - 1) {
            const segmentLength = this.segmentLengths[this.pathIndex] || 0;

            if (segmentLength === 0) {
                this.pathIndex++;
                this.segmentProgress = 0;
                continue;
            }

            const remainingInSegment = segmentLength - this.segmentProgress;

            if (distanceToTravel >= remainingInSegment) {
                distanceToTravel -= remainingInSegment;
                this.pathIndex++;
                this.segmentProgress = 0;

                if (this.pathIndex >= this.path.length - 1) {
                    const lastPoint = this.path[this.path.length - 1];
                    this.x = lastPoint.x;
                    this.y = lastPoint.y;
                    return 'reached_end';
                }

                this.x = this.path[this.pathIndex].x;
                this.y = this.path[this.pathIndex].y;
            } else {
                this.segmentProgress += distanceToTravel;
                const start = this.path[this.pathIndex];
                const end = this.path[this.pathIndex + 1];
                const t = this.segmentProgress / segmentLength;
                this.x = start.x + (end.x - start.x) * t;
                this.y = start.y + (end.y - start.y) * t;
                distanceToTravel = 0;
            }
        }

        return 'moving';
    }

    takeDamage(damage) {
        this.health = Math.max(0, this.health - damage);
        this.updateHealthBar();
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
        this.id = `projectile-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
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

    let sceneryLayer = field.querySelector('.scenery-layer');
    if (!sceneryLayer) {
        sceneryLayer = document.createElement('div');
        sceneryLayer.className = 'scenery-layer';
        field.insertBefore(sceneryLayer, field.firstChild);
    }

    let pathLayer = field.querySelector('.path-layer');
    if (!pathLayer) {
        pathLayer = document.createElement('div');
        pathLayer.className = 'path-layer';
        field.insertBefore(pathLayer, sceneryLayer.nextSibling);
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

    return { field, sceneryLayer, pathLayer, towerLayer, enemyLayer, projectileLayer };
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

function calculatePathLength(points) {
    if (!Array.isArray(points) || points.length < 2) {
        return 0;
    }

    let length = 0;
    for (let i = 0; i < points.length - 1; i++) {
        const start = points[i];
        const end = points[i + 1];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        length += Math.sqrt(dx * dx + dy * dy);
    }

    return length;
}

function drawDirtPath(layer, points, pathWidth, width, height) {
    if (!points.length) {
        return;
    }

    const svgNS = 'http://www.w3.org/2000/svg';
    const viewWidth = Math.max(1, width);
    const viewHeight = Math.max(1, height);
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'path-svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', `0 0 ${viewWidth} ${viewHeight}`);
    svg.setAttribute('preserveAspectRatio', 'none');

    const uniqueId = `path-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const gradientId = `${uniqueId}-gradient`;
    const textureId = `${uniqueId}-texture`;

    const defs = document.createElementNS(svgNS, 'defs');

    const gradient = document.createElementNS(svgNS, 'linearGradient');
    gradient.setAttribute('id', gradientId);
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '0%');
    gradient.setAttribute('y2', '100%');

    [
        { offset: '0%', color: '#d6bb92' },
        { offset: '45%', color: '#b88855' },
        { offset: '100%', color: '#825329' }
    ].forEach(stopInfo => {
        const stop = document.createElementNS(svgNS, 'stop');
        stop.setAttribute('offset', stopInfo.offset);
        stop.setAttribute('stop-color', stopInfo.color);
        gradient.appendChild(stop);
    });

    defs.appendChild(gradient);

    const filter = document.createElementNS(svgNS, 'filter');
    filter.setAttribute('id', textureId);
    filter.setAttribute('x', '-10%');
    filter.setAttribute('y', '-10%');
    filter.setAttribute('width', '120%');
    filter.setAttribute('height', '120%');

    const turbulence = document.createElementNS(svgNS, 'feTurbulence');
    turbulence.setAttribute('type', 'fractalNoise');
    turbulence.setAttribute('baseFrequency', '0.7');
    turbulence.setAttribute('numOctaves', '2');
    turbulence.setAttribute('seed', Math.floor(Math.random() * 1000));
    turbulence.setAttribute('result', 'noise');
    filter.appendChild(turbulence);

    const colorMatrix = document.createElementNS(svgNS, 'feColorMatrix');
    colorMatrix.setAttribute('in', 'noise');
    colorMatrix.setAttribute('type', 'matrix');
    colorMatrix.setAttribute('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.28 0');
    colorMatrix.setAttribute('result', 'softNoise');
    filter.appendChild(colorMatrix);

    const blend = document.createElementNS(svgNS, 'feBlend');
    blend.setAttribute('in', 'SourceGraphic');
    blend.setAttribute('in2', 'softNoise');
    blend.setAttribute('mode', 'soft-light');
    filter.appendChild(blend);

    defs.appendChild(filter);
    svg.appendChild(defs);

    const pathData = points
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
        .join(' ');

    const outlinePath = document.createElementNS(svgNS, 'path');
    outlinePath.setAttribute('d', pathData);
    outlinePath.setAttribute('fill', 'none');
    outlinePath.setAttribute('stroke', 'rgba(71, 40, 12, 0.55)');
    outlinePath.setAttribute('stroke-width', (pathWidth * 1.25).toString());
    outlinePath.setAttribute('stroke-linecap', 'round');
    outlinePath.setAttribute('stroke-linejoin', 'round');
    outlinePath.setAttribute('opacity', '0.75');
    svg.appendChild(outlinePath);

    const basePath = document.createElementNS(svgNS, 'path');
    basePath.setAttribute('d', pathData);
    basePath.setAttribute('fill', 'none');
    basePath.setAttribute('stroke', `url(#${gradientId})`);
    basePath.setAttribute('stroke-width', pathWidth.toString());
    basePath.setAttribute('stroke-linecap', 'round');
    basePath.setAttribute('stroke-linejoin', 'round');
    basePath.setAttribute('filter', `url(#${textureId})`);
    svg.appendChild(basePath);

    const highlightPath = document.createElementNS(svgNS, 'path');
    highlightPath.setAttribute('d', pathData);
    highlightPath.setAttribute('fill', 'none');
    highlightPath.setAttribute('stroke', 'rgba(255, 244, 214, 0.35)');
    highlightPath.setAttribute('stroke-width', (pathWidth * 0.4).toString());
    highlightPath.setAttribute('stroke-linecap', 'round');
    highlightPath.setAttribute('stroke-linejoin', 'round');
    highlightPath.setAttribute('opacity', '0.6');
    svg.appendChild(highlightPath);

    layer.appendChild(svg);
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

function decorateField(layer, width, height, pathPoints, pathWidth) {
    if (!layer) {
        return;
    }

    layer.innerHTML = '';

    const treeBandWidth = Math.min(width * 0.18, pathWidth * 1.6 + 80);
    const leftBand = [20, Math.max(40, Math.min(treeBandWidth, width / 2 - 20))];
    const rightBand = [Math.min(width - 40, Math.max(width - treeBandWidth, width / 2 + 20)), width - 20];
    const treeCount = Math.max(10, Math.floor(width / 80));
    const grassCount = Math.max(25, Math.floor(width / 30));
    const clearance = (pathWidth / 2) + 30;

    for (let i = 0; i < treeCount; i++) {
        const tree = document.createElement('div');
        tree.className = 'scenery tree';
        const useLeft = i % 2 === 0;
        const band = useLeft ? leftBand : rightBand;
        if (!band || band[1] <= band[0]) {
            continue;
        }
        const x = randomBetween(band[0], band[1]);
        const y = randomBetween(50, height - 50);
        const scale = randomBetween(0.85, 1.25);
        tree.textContent = Math.random() > 0.5 ? '🌳' : '🌲';
        tree.style.left = `${x}px`;
        tree.style.top = `${y}px`;
        tree.style.transform = `translate(-50%, -100%) scale(${scale.toFixed(2)})`;
        layer.appendChild(tree);
    }

    let placedGrass = 0;
    let attempts = 0;
    while (placedGrass < grassCount && attempts < grassCount * 5) {
        attempts++;
        const grass = document.createElement('div');
        grass.className = 'scenery grass';
        const paddingX = Math.min(120, width / 5);
        const paddingY = Math.min(100, height / 5);
        const minX = Math.max(40, paddingX);
        const maxX = Math.max(minX + 5, width - paddingX);
        const minY = Math.max(40, paddingY);
        const maxY = Math.max(minY + 5, height - paddingY);
        const x = randomBetween(minX, maxX);
        const y = randomBetween(minY, maxY);

        if (isPointNearPath({ x, y }, pathPoints, clearance)) {
            continue;
        }

        const rotation = randomBetween(-20, 20);
        const scale = randomBetween(0.7, 1.3);
        grass.style.left = `${x}px`;
        grass.style.top = `${y}px`;
        grass.style.transform = `translate(-50%, -50%) rotate(${rotation.toFixed(1)}deg) scale(${scale.toFixed(2)})`;
        grass.style.filter = `hue-rotate(${randomBetween(-12, 12).toFixed(1)}deg) saturate(${randomBetween(0.9, 1.2).toFixed(2)})`;
        layer.appendChild(grass);
        placedGrass++;
    }
}

function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

function isPointNearPath(point, pathPoints, clearance) {
    if (!Array.isArray(pathPoints) || pathPoints.length < 2) {
        return false;
    }

    for (let i = 0; i < pathPoints.length - 1; i++) {
        const start = pathPoints[i];
        const end = pathPoints[i + 1];
        const distance = distancePointToSegment(point, start, end);
        if (distance < clearance) {
            return true;
        }
    }

    return false;
}

function distancePointToSegment(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (dx === 0 && dy === 0) {
        const px = point.x - start.x;
        const py = point.y - start.y;
        return Math.sqrt(px * px + py * py);
    }

    const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy);
    const clampedT = Math.max(0, Math.min(1, t));
    const closestX = start.x + clampedT * dx;
    const closestY = start.y + clampedT * dy;
    const diffX = point.x - closestX;
    const diffY = point.y - closestY;

    return Math.sqrt(diffX * diffX + diffY * diffY);
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
    const { field, sceneryLayer, pathLayer } = ensureFieldLayers();

    const fieldRect = field.getBoundingClientRect();
    const width = fieldRect.width || field.clientWidth || 800;
    const height = fieldRect.height || field.clientHeight || 500;
    const marginBase = Math.min(width, height) * 0.08;
    const marginX = Math.min(Math.max(40, marginBase), Math.max(width / 2 - 30, 16));
    const marginY = Math.min(Math.max(40, marginBase), Math.max(height / 2 - 30, 16));
    const pathWidth = Math.max(60, Math.min(width, height) * 0.14);

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
    drawDirtPath(pathLayer, basePoints, pathWidth, width, height);
    addPathMarkers(pathLayer, basePoints);

    game.enemyPath = interpolatePath(basePoints, 12);
    game.enemyPathLength = calculatePathLength(game.enemyPath);

    decorateField(sceneryLayer, width, height, game.enemyPath, pathWidth);
}

function clearBattlefieldEntities() {
    const { enemyLayer, projectileLayer } = ensureFieldLayers();
    enemyLayer.innerHTML = '';
    projectileLayer.innerHTML = '';
    game.enemies = [];
    game.projectiles = [];
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

    clearWaveStatusMessage();

    // Generate a fresh randomized path for this wave
    generateDefensePath({ forceNew: true });

    // Ensure we have a valid enemy path
    if (!game.enemyPath || game.enemyPath.length < 2) {
        generateDefensePath();
    }

    clearBattlefieldEntities();

    game.gameRunning = true;
    game.waveInProgress = true;
    game.enemiesSpawned = 0;
    game.enemiesDefeated = 0;
    game.waveStartTime = Date.now();

    document.getElementById('start-wave').textContent = 'Wave in Progress';
    document.getElementById('start-wave').disabled = true;
    document.getElementById('pause-game').textContent = 'Pause';

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
    const enemy = new Enemy(type, game.enemyPath, game.enemyPathLength);
    game.enemies.push(enemy);
    
    const enemyElement = document.createElement('div');
    enemyElement.className = `enemy ${type}`;
    enemyElement.style.left = enemy.x + 'px';
    enemyElement.style.top = enemy.y + 'px';
    enemyElement.textContent = enemy.getIcon();
    const id = game.enemyIdCounter++;
    enemy.domId = `enemy-${id}`;
    enemyElement.id = enemy.domId;

    const healthBar = document.createElement('div');
    healthBar.className = 'enemy-health-bar';
    const healthFill = document.createElement('div');
    healthFill.className = 'enemy-health-fill';
    healthBar.appendChild(healthFill);
    enemyElement.appendChild(healthBar);
    enemy.setHealthBarElement(healthFill);

    const { enemyLayer } = ensureFieldLayers();
    enemyLayer.appendChild(enemyElement);
}

function endWave() {
    game.waveInProgress = false;
    game.gameRunning = false;
    clearBattlefieldEntities();
    game.currentWave++;
    game.consecutiveFailures = 0; // Reset failure counter on success
    game.activePowerUp = null; // Clear any active power-up
    document.getElementById('current-wave').textContent = game.currentWave;
    document.getElementById('start-wave').textContent = 'Start Wave';
    document.getElementById('start-wave').disabled = false;
    document.getElementById('pause-game').textContent = 'Pause';

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
    game.gameRunning = false;
    game.consecutiveFailures++;
    clearBattlefieldEntities();

    // Apply 10% gold penalty
    const penalty = Math.floor(game.resources.gold * 0.1);
    game.resources.gold = Math.max(0, game.resources.gold - penalty);
    game.updateResources();
    document.getElementById('pause-game').textContent = 'Pause';
    
    // Check if player is eligible for power-up
    if (game.consecutiveFailures >= 3) {
        const failureMessage = `Wave failed! -${penalty} gold penalty. Failures: ${game.consecutiveFailures}/3. Power-up unlocked!`;
        showWaveStatusMessage(failureMessage, { type: 'failure', duration: 8000 });
        showPowerUpSelection();
    } else {
        document.getElementById('start-wave').textContent = 'Start Wave';
        document.getElementById('start-wave').disabled = false;
        const failureMessage = `Wave failed! -${penalty} gold penalty. Failures: ${game.consecutiveFailures}/3`;
        showWaveStatusMessage(failureMessage, { type: 'failure', duration: 6000 });
    }

    game.saveGameState();
}

function togglePause() {
    if (!game.waveInProgress && game.enemies.length === 0) {
        return;
    }

    game.gameRunning = !game.gameRunning;
    document.getElementById('pause-game').textContent = game.gameRunning ? 'Pause' : 'Resume';

    if (game.gameRunning) {
        const now = Date.now();
        game.enemies.forEach(enemy => {
            enemy.lastMove = now;
        });
    }
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
        for (let i = game.enemies.length - 1; i >= 0; i--) {
            const enemy = game.enemies[i];
            const result = enemy.move();
            const enemyElement = enemy.domId ? document.getElementById(enemy.domId) : null;

            if (result === 'reached_end') {
                if (enemyElement) {
                    enemyElement.remove();
                }
                game.enemies.splice(i, 1);
                game.lives--;
                document.getElementById('lives').textContent = game.lives;

                if (game.lives <= 0) {
                    alert('Game Over!');
                    game.gameRunning = false;
                    game.waveInProgress = false;
                    clearBattlefieldEntities();
                } else {
                    // Wave failed - apply penalty and check for power-up
                    handleWaveFailure();
                }
                break;
            } else if (enemyElement) {
                enemyElement.style.left = `${enemy.x}px`;
                enemyElement.style.top = `${enemy.y}px`;
            }
        }

        if (!game.gameRunning) {
            requestAnimationFrame(gameLoop);
            return;
        }

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
                projectileElement.style.left = `${projectile.x}px`;
                projectileElement.style.top = `${projectile.y}px`;
                projectileElement.id = projectile.id;
                const { projectileLayer } = ensureFieldLayers();
                projectileLayer.appendChild(projectileElement);
            }
        });

        // Update projectiles
        for (let i = game.projectiles.length - 1; i >= 0; i--) {
            const projectile = game.projectiles[i];
            const result = projectile.update();
            const projectileElement = document.getElementById(projectile.id);

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

                if (projectileElement) {
                    projectileElement.remove();
                }
                game.projectiles.splice(i, 1);
            } else if (projectile.active) {
                if (projectileElement) {
                    projectileElement.style.left = `${projectile.x}px`;
                    projectileElement.style.top = `${projectile.y}px`;
                }
            } else {
                if (projectileElement) {
                    projectileElement.remove();
                }
                game.projectiles.splice(i, 1);
            }
        }
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

function showWaveStatusMessage(text, options = {}) {
    const field = document.getElementById('game-field');
    if (!field) {
        return;
    }

    const { type = 'info', duration = 5000 } = options;
    let messageElement = field.querySelector('.wave-status-message');

    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.className = 'wave-status-message';
        field.appendChild(messageElement);
    }

    if (messageElement.hideTimeout) {
        clearTimeout(messageElement.hideTimeout);
    }

    messageElement.textContent = text;
    messageElement.classList.remove('info', 'success', 'failure');
    messageElement.classList.add(type);
    messageElement.classList.add('visible');

    if (duration !== null) {
        messageElement.hideTimeout = setTimeout(() => {
            messageElement.classList.remove('visible');
        }, duration);
    }
}

function clearWaveStatusMessage() {
    const field = document.getElementById('game-field');
    if (!field) {
        return;
    }

    const messageElement = field.querySelector('.wave-status-message');
    if (messageElement) {
        if (messageElement.hideTimeout) {
            clearTimeout(messageElement.hideTimeout);
            messageElement.hideTimeout = null;
        }
        messageElement.classList.remove('visible');
    }
}

// Start the game loop
gameLoop();
