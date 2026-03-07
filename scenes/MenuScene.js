'use strict';

/**
 * MenuScene
 * Animated title screen. Sets the emotional tone before gameplay.
 *
 * Layout (portrait, 480×854):
 *   - Soft gradient sky background
 *   - Floating heart particles
 *   - Game title + player name
 *   - Animated idle character
 *   - "Tap to Start" with blinking prompt
 */
class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Menu' });
  }

  create() {
    this._drawBackground();
    this._spawnClouds();
    this._drawTitle();
    this._spawnCharacter();
    this._spawnHeartParticles();
    this._drawStartPrompt();
    this._listenForStart();
  }

  // ─── Background ────────────────────────────────────────────────────────────

  _drawBackground() {
    // Gradient sky — lavender to warm pink
    const gfx = this.add.graphics();
    gfx.fillGradientStyle(0xD4B8F0, 0xD4B8F0, 0xFFCCE8, 0xFFCCE8, 1);
    gfx.fillRect(0, 0, GAME_W, GAME_H);

    // Soft ground plane at bottom
    const ground = this.add.graphics();
    ground.fillGradientStyle(0x88CC88, 0x88CC88, 0x55884A, 0x55884A, 1);
    ground.fillRect(0, GAME_H - 120, GAME_W, 120);

    // Ground highlight strip
    ground.fillStyle(0xAAEE88);
    ground.fillRect(0, GAME_H - 120, GAME_W, 4);
  }

  _spawnClouds() {
    const cloudData = [
      { x: 60,  y: 120, s: 0.6 },
      { x: 310, y: 80,  s: 0.8 },
      { x: 200, y: 160, s: 0.55 },
      { x: 400, y: 140, s: 0.7 },
    ];

    cloudData.forEach(({ x, y, s }) => {
      const c = this.add.image(x, y, 'cloud')
        .setScale(s)
        .setAlpha(0.75);

      this.tweens.add({
        targets: c,
        x: x + 18,
        duration: 4000 + Math.random() * 3000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  // ─── Title + Name ──────────────────────────────────────────────────────────

  _drawTitle() {
    const cx = GAME_W / 2;

    // Decorative hearts row
    const heartsRow = this.add.text(cx, 200, '♥  ♥  ♥', {
      fontFamily: '"Press Start 2P"',
      fontSize: '14px',
      color: '#FF6B9D',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: heartsRow,
      alpha: 0.4,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Main title
    this.add.text(cx, 250, 'A Journey', {
      fontFamily: '"Press Start 2P"',
      fontSize: '22px',
      color: '#ffffff',
      stroke: '#AA44AA',
      strokeThickness: 4,
      shadow: { offsetX: 3, offsetY: 3, color: '#662288', blur: 0, fill: true },
    }).setOrigin(0.5);

    this.add.text(cx, 286, 'to You', {
      fontFamily: '"Press Start 2P"',
      fontSize: '22px',
      color: '#FF6B9D',
      stroke: '#AA0044',
      strokeThickness: 4,
      shadow: { offsetX: 3, offsetY: 3, color: '#660022', blur: 0, fill: true },
    }).setOrigin(0.5);

    // Divider
    this.add.text(cx, 320, '— ♥ —', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#FFAACC',
    }).setOrigin(0.5);

    // Player name — big and welcoming
    const name = GAME_DATA.playerName || 'My Love';
    this.add.text(cx, 350, `For ${name}`, {
      fontFamily: '"Press Start 2P"',
      fontSize: '12px',
      color: '#FFE8FF',
      stroke: '#664466',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Large beating heart
    const bigHeart = this.add.text(cx, 440, '♥', {
      fontFamily: '"Press Start 2P"',
      fontSize: '72px',
      color: '#FF6B9D',
      stroke: '#CC0044',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Heartbeat pulse tween
    this.tweens.add({
      targets: bigHeart,
      scaleX: 1.22,
      scaleY: 1.22,
      duration: 320,
      yoyo: true,
      repeat: -1,
      ease: 'Quad.easeInOut',
    });
  }

  // ─── Animated Character ────────────────────────────────────────────────────

  _spawnCharacter() {
    const char = this.add.sprite(GAME_W / 2, GAME_H - 160, 'player_sheet')
      .setScale(3)
      .setOrigin(0.5, 1);

    // Play idle/walk cycle to show the character off
    if (!this.anims.exists('menu_walk')) {
      this.anims.create({
        key: 'menu_walk',
        frames: this.anims.generateFrameNumbers('player_sheet', { frames: [1, 2, 3, 4] }),
        frameRate: 8,
        repeat: -1,
      });
    }
    char.play('menu_walk');

    // Gentle sway
    this.tweens.add({
      targets: char,
      x: GAME_W / 2 + 14,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ─── Floating Heart Particles ──────────────────────────────────────────────

  _spawnHeartParticles() {
    // Use Phaser 3.60 particle emitter API
    this.add.particles(GAME_W / 2, GAME_H - 130, 'heart_particle', {
      x:         { min: -GAME_W / 2, max: GAME_W / 2 },
      y:         0,
      speedY:    { min: -60, max: -120 },
      speedX:    { min: -25, max: 25 },
      scale:     { start: 2.0, end: 0 },
      alpha:     { start: 0.8, end: 0 },
      lifespan:  { min: 2500, max: 4500 },
      frequency: 450,
      quantity:  1,
      tint:      [0xFF6B9D, 0xFFAACC, 0xFF99BB, 0xFFCCEE],
    });
  }

  // ─── Start Prompt ──────────────────────────────────────────────────────────

  _drawStartPrompt() {
    const cx = GAME_W / 2;

    const prompt = this.add.text(cx, GAME_H - 55, 'Tap to Start  ♥', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#FF6B9D',
      stroke: '#220011',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Blink
    this.tweens.add({
      targets: prompt,
      alpha: 0.15,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  _listenForStart() {
    // Any tap/click/key starts the game
    this.input.once('pointerdown', () => this._startGame());
    this.input.keyboard.once('keydown-SPACE', () => this._startGame());
    this.input.keyboard.once('keydown-ENTER', () => this._startGame());
  }

  _startGame() {
    // Fade out then start
    this.cameras.main.fade(400, 10, 0, 20, false, (cam, progress) => {
      if (progress >= 1) this.scene.start('Game');
    });
  }
}
