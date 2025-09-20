# 🏰 Kingdoms Last Stand — Phaser Edition

Kingdoms Last Stand is now a Phaser-powered prototype that blends serene city building with frantic tower defense. Everything is rendered inside a single Phaser game instance with modular scenes for each phase of play.

## 🚀 Getting Started

1. Open `index.html` in any modern desktop browser.
2. The main menu lets you jump straight into **City Management** or **Tower Defense**.
3. The HUD bar (rendered by the `UIScene`) is always available for switching scenes, monitoring resources, and triggering waves.

> 💡 No build steps are required. All textures are generated at runtime, so the project works offline.

## 🎮 Core Scenes

| Scene | Purpose |
| --- | --- |
| `BootScene` | Generates procedural textures and bootstraps the shared `GameState`. |
| `MainMenuScene` | Title screen with entry points into gameplay and a kingdom reset option. |
| `CityScene` | Grid-based city builder that produces resources every few seconds based on the structures you place. |
| `TowerDefenseScene` | Handles waves, tower placement, targeting, projectiles, and enemy movement along a handcrafted path. |
| `UIScene` | Persistent overlay that shows resources, lives, and wave state while providing navigation and build menus. |

## 🏗️ City Management

- Place buildings on an 8×5 grid. Structures cost a mix of gold, wood, and stone.
- Production ticks every 6 seconds. Houses yield gold, lumber mills produce wood, quarries mine stone, and barracks offer mixed income.
- Building placement is governed by the shared `GameState`, so your city persists between visits.

## ⚔️ Tower Defense

- Deploy Archer Towers, Cannon Towers, and Mystic Spires on valid tiles beside the enemy path.
- Press **Start Wave** in the HUD to spawn the next assault. Waves scale in length and difficulty and reward gold when cleared.
- Towers fire automatically using Phaser Arcade Physics projectiles. Enemies follow a spline path; if they reach the keep you lose a life.

## 📊 Resources & Progression

- **Resources:** Gold, Wood, and Stone are global. Spend them in either gameplay mode and watch the HUD update instantly.
- **Lives:** You begin with 20 hearts. When they reach zero, a game-over notice fires and the kingdom resets.
- **Waves:** Surviving a wave grants bonus gold and increments the wave counter for the next challenge.

## 🧱 Technical Structure

- `src/state/GameState.js` centralises economy values, city grid data, tower placements, and emits events that scenes subscribe to.
- Scenes are organised under `src/scenes/`, each derived from `Phaser.Scene` with clearly scoped responsibilities.
- `src/main.js` wires all scenes into a single Phaser configuration with Arcade Physics enabled for projectiles.
- Textures are generated in `BootScene` using `Graphics.generateTexture`, so no external spritesheets are required.
- The HUD relies on Phaser containers and interactive geometry rather than DOM overlays, keeping the entire experience on the canvas.

## 🕹️ Controls

- **HUD Buttons:** Use the top bar to swap between City and Defense or return to the Main Menu.
- **City:** Select a building card from the HUD, then click an empty tile to construct it.
- **Defense:** Select a tower card and click a valid tile near the path. Press **Start Wave** to launch the next attack.

Enjoy defending the realm with this refreshed Phaser architecture! 🛡️
