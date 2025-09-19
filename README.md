# 🏰 Medieval Kingdom Defense

A medieval-themed browser game that combines city management and tower defense mechanics across three distinct screens.

## 🎮 Game Features

### Three Main Screens:

1. **⚙️ Settings & Shop**
   - Adjust game volume and difficulty
   - Purchase buildings and upgrades
   - Manage your resources (Gold, Wood, Stone)

2. **🏘️ City Management**
   - Build and manage your medieval city
   - Construct houses, lumber mills, quarries, and barracks
   - Generate resources over time
   - Plan your city layout on a grid system

3. **⚔️ Tower Defense**
   - Defend your kingdom from waves of enemies
   - Place and upgrade different types of towers
   - Fight goblins, orcs, and dragons
   - Earn gold by defeating enemies

## 🎯 How to Play

### Getting Started
1. Open `index.html` in your web browser
2. Start with the Settings & Shop screen to familiarize yourself with the interface
3. Use the navigation buttons to switch between screens

### City Management
1. Click on a building type in the building panel
2. Click on an empty tile in the city grid to place the building
3. Buildings will automatically generate resources over time:
   - **Houses**: Generate gold
   - **Lumber Mills**: Generate wood
   - **Quarries**: Generate stone
   - **Barracks**: Train soldiers (future feature)

### Tower Defense
1. Select a tower type from the tower panel
2. Click on the game field to place the tower
3. Click "Start Wave" to begin defending against enemies
4. Towers will automatically target and shoot at enemies
5. Click on towers to upgrade them (costs gold)
6. Defeat all enemies in a wave to earn rewards

### Resource Management
- **Gold**: Used for purchasing buildings and towers
- **Wood**: Required for certain buildings
- **Stone**: Required for certain buildings
- Resources are shared across all screens

## 🏗️ Building Types

| Building | Cost | Effect |
|----------|------|--------|
| 🏠 House | 100 Gold, 50 Wood | +5 Gold per minute |
| 🏭 Lumber Mill | 200 Gold, 100 Wood | +10 Wood per minute |
| ⛏️ Stone Quarry | 300 Gold, 50 Stone | +8 Stone per minute |
| 🏰 Barracks | 500 Gold, 200 Wood | Train soldiers (future) |

## 🏹 Tower Types

| Tower | Cost | Damage | Range | Fire Rate |
|-------|------|--------|-------|-----------|
| 🏹 Archer Tower | 150 Gold | 25 | Medium | Fast |
| 💣 Cannon Tower | 300 Gold | 50 | Long | Slow |
| 🔮 Magic Tower | 250 Gold | 40 | Short | Medium |

## 👹 Enemy Types

| Enemy | Health | Speed | Reward |
|-------|--------|-------|--------|
| 👹 Goblin | 50 | Fast | 10 Gold |
| 👺 Orc | 100 | Medium | 25 Gold |
| 🐉 Dragon | 200 | Slow | 50 Gold |

## 🎮 Controls

- **Navigation**: Use the top navigation bar to switch between screens
- **Building Placement**: Click building type, then click empty tile
- **Tower Placement**: Click tower type, then click on game field
- **Tower Upgrades**: Click on placed towers to upgrade them
- **Wave Control**: Use "Start Wave" and "Pause" buttons

## 🛠️ Technical Details

- **Pure HTML/CSS/JavaScript**: No external dependencies
- **Responsive Design**: Works on desktop and mobile devices
- **Local Storage**: Game state persists during session
- **Real-time Updates**: Resources and combat update automatically

## 🚀 Future Enhancements

- Save/load game functionality
- More building and tower types
- Multiplayer features
- Sound effects and music
- Advanced enemy AI
- Special abilities and spells
- Campaign mode with story

## 📱 Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## 🎨 Customization

The game uses CSS custom properties and can be easily themed by modifying the color scheme in `styles.css`. The medieval theme uses warm browns, golds, and earth tones to create an authentic medieval atmosphere.

Enjoy building your medieval kingdom and defending it from the forces of evil! 🏰⚔️
