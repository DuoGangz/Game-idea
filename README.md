# 🏰 Kingdoms Last Stand — Phaser Edition

Kingdoms Last Stand now runs fully inside Phaser 3 with bespoke scenes for the menu, user interface, city building, and tower defense layers. All rendering, input, and layout happens in the canvas, so the experience matches the original prototype while benefiting from Phaser's game loop and scene management.

## 🚀 Getting Started

1. Open `index.html` in any modern desktop browser.
2. From the main menu choose **City Management** or **Tower Defense** to jump straight into either mode.
3. The top HUD bar (powered by the `UIScene`) is always active and lets you swap panels, monitor resources, adjust audio, and start waves.

> 💡 No build steps are required. Textures are generated at runtime, so the project runs offline out of the box.

### If you see only a blue screen

Phaser must be available before the game boots. This project now attempts to load Phaser from a local file first, then falls back to the CDN.

- Recommended (offline): download Phaser 3.60 and place it at `libs/phaser.js` (or `libs/phaser.min.js`), then open `index.html` again.
- Online: ensure the CDN `https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.js` is reachable (no blockers), then reload the page.

When Phaser loads successfully, the canvas initializes and the Main Menu appears.

## 🎮 Core Scenes

| Scene | Purpose |
| --- | --- |
| `BootScene` | Generates procedural textures and bootstraps the shared `GameState`. |
| `MainMenuScene` | Title screen with entry points into gameplay and a full kingdom reset. |
| `CityScene` | 8×5 grid city builder that produces resources based on staffed structures every few seconds. |
| `TowerDefenseScene` | Runs combat waves, tower placement, targeting, projectiles, leaks, and rewards. |
| `UIScene` | Persistent overlay for navigation, resource/health display, settings, shop purchases, and wave control. |

## 🧭 HUD & Navigation

The HUD contains five panels that mirror the original UI flow:

- **Main Menu** — Return to the title scene and reset/continue a campaign.
- **Settings** — Adjust music/effects volume and reset the entire kingdom.
- **Shop** — Buy new building contracts or shard bundles using gold.
- **City** — Inspect citizens, food upkeep, and building stats while selecting structures to place.
- **Defense** — Select tower types, check barracks support, start waves, and tweak the global game speed (1×–5×).

Notifications surface in the center of the HUD to report purchases, production, combat rewards, and warnings.

## 🏗️ City Management

- Place buildings on an 8×5 grid; each tile tracks level, staffing, and citizen requirements.
- Houses raise population capacity, while farms, lumber mills, quarries, barracks, and hospitals provide distinct bonuses.
- Citizens auto-assign to structures in priority order. Staffing levels influence production output and hospital health bonuses.
- Every 6 seconds `processCityTick` grants resource income, consumes food per citizen, and can grow population if stores are plentiful.
- Buildings can be upgraded up to Tier 5 (paying scaled resource + shard costs) or demolished for partial refunds via the popup menu.

## ⚔️ Tower Defense

- Deploy Archer, Cannon, or Magic towers on non-path tiles; each one requires available barracks support.
- Towers acquire targets automatically, fire Arcade Physics projectiles, and respect the global game-speed multiplier.
- Enemies travel a handcrafted path. If a unit reaches the keep it damages kingdom health; dropping to zero triggers a game over.
- Waves scale composition and reward gold on victory, with bonus resource drops (wood/stone/shards) coming from defeated foes.

## 📊 Resources & Progression

- **Resources:** Gold, Wood, Stone, Food, and Shards are persistent across scenes. HUD readouts and notifications update instantly.
- **Population:** Track total citizens, housing capacity, and unassigned workers. Barracks require sufficient citizens and grant tower slots.
- **Health:** The keep starts at 100 health and can be boosted by staffed hospitals. Enemy leaks deal configurable damage per wave.
- **Waves:** Each cleared wave awards gold based on the wave number and advances the counter for the next assault.

## 🛠️ Settings & Shop

- Volume buttons adjust music/effects in 10-point increments (values emit through `GameState` for future audio hooks).
- The reset button wipes resources, buildings, towers, and waves, restoring the starting state.
- Shop cards let you spend gold on building schematics or shard bundles used for higher-tier upgrades.

## 🕹️ Controls

- **HUD Buttons:** Use the top navigation to swap panels, open the shop/settings, or return to the Main Menu.
- **City:** Select a building card in the HUD and click an empty city tile to construct it. Use the popup to upgrade or demolish.
- **Defense:** Select a tower card, click an empty defense tile, and press **Start Wave** to launch the next attack. Adjust speed with the 1×–5× buttons.

Enjoy defending the realm with this Phaser-driven reimagining of Kingdoms Last Stand! 🛡️
