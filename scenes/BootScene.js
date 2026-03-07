'use strict';

/**
 * BootScene
 * Very first scene. Starts immediately, gives the Google Font a moment to
 * load, then hands off to PreloadScene.
 */
class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload() {
    // Nothing to load here — textures are generated programmatically.
    // The font is already linked via <link> in index.html.
  }

  create() {
    // Give the browser ~600ms to apply the Google Font before we render text.
    this.time.delayedCall(600, () => {
      this.scene.start('Preload');
    });
  }
}
