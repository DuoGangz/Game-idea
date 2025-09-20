import SceneKeys from '../config/SceneKeys.js';

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.MainMenu);
  }

  create() {
    this.gameState = this.registry.get('gameState');

    const { width, height } = this.scale;
    const background = this.add.rectangle(width / 2, height / 2, width * 0.9, height * 0.85, 0x111b2b, 0.92);
    background.setStrokeStyle(4, 0xc89b3c, 0.5);

    this.add
      .text(width / 2, height / 2 - 220, 'Kingdoms Last Stand', {
        fontFamily: 'Cinzel',
        fontSize: '54px',
        color: '#f8f4e3'
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 160, 'A Phaser-powered strategy prototype', {
        fontFamily: 'Cinzel',
        fontSize: '24px',
        color: '#d5c6a1'
      })
      .setOrigin(0.5);

    const buttonStyle = {
      fontFamily: 'Cinzel',
      fontSize: '28px',
      color: '#111b2b',
      backgroundColor: '#c89b3c',
      padding: { left: 28, right: 28, top: 12, bottom: 12 }
    };

    this.createButton(width / 2, height / 2 - 40, 'Enter City Management', buttonStyle, () => {
      this.launchUIScene('city');
      this.wakeOrLaunch(SceneKeys.City);
      this.scene.bringToTop(SceneKeys.UI);
      this.scene.stop(SceneKeys.MainMenu);
    });

    this.createButton(width / 2, height / 2 + 40, 'Enter Tower Defense', buttonStyle, () => {
      this.launchUIScene('defense');
      this.wakeOrLaunch(SceneKeys.Defense);
      this.scene.bringToTop(SceneKeys.UI);
      this.scene.stop(SceneKeys.MainMenu);
    });

    this.createButton(width / 2, height / 2 + 150, 'Reset Kingdom', buttonStyle, () => {
      this.gameState.reset();
      this.gameState.notify('The kingdom has been restored.');
    });

    this.add
      .text(width / 2, height - 60, 'Tip: Use the top HUD to jump between modes.', {
        fontFamily: 'Cinzel',
        fontSize: '20px',
        color: '#f8f4e3'
      })
      .setOrigin(0.5)
      .setAlpha(0.8);
  }

  launchUIScene(mode) {
    const manager = this.scene;

    if (manager.isSleeping(SceneKeys.UI)) {
      const ui = manager.get(SceneKeys.UI);
      ui.scene.wake();
      if (ui.setMode) {
        ui.setMode(mode);
      }
      return;
    }

    if (manager.isActive(SceneKeys.UI)) {
      const ui = manager.get(SceneKeys.UI);
      if (ui.setMode) {
        ui.setMode(mode);
      }
      return;
    }

    manager.launch(SceneKeys.UI, { mode });
  }

  createButton(x, y, label, style, callback) {
    const button = this.add.text(x, y, label, style).setOrigin(0.5).setInteractive({ useHandCursor: true });
    button.on('pointerover', () => {
      button.setStyle({ backgroundColor: '#d9b45a' });
    });
    button.on('pointerout', () => {
      button.setStyle({ backgroundColor: '#c89b3c' });
    });
    button.on('pointerup', () => {
      callback();
    });
    return button;
  }

  wakeOrLaunch(key) {
    if (this.scene.isSleeping(key)) {
      this.scene.wake(key);
      return;
    }

    if (this.scene.isActive(key)) {
      return;
    }

    this.scene.launch(key);
  }
}
