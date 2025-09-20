import BootScene from './scenes/BootScene.js';
import MainMenuScene from './scenes/MainMenuScene.js';
import CityScene from './scenes/CityScene.js';
import TowerDefenseScene from './scenes/TowerDefenseScene.js';
import UIScene from './scenes/UIScene.js';

const GAME_WIDTH = 1024;
const GAME_HEIGHT = 704;

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#05070d',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, MainMenuScene, CityScene, TowerDefenseScene, UIScene]
};

window.addEventListener('load', () => {
  new Phaser.Game(config);
});
