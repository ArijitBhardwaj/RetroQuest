'use strict';

/**
 * EndScene — Birthday Celebration
 *
 * Triggered when the Crystal Heart is collected.
 * Features:
 *   - Full-screen confetti + heart particle explosion
 *   - Animated "Happy Birthday!" headline
 *   - Your personal message
 *   - Optional photo frame (drop photo.jpg in assets/)
 *   - Replay button
 */
class EndScene extends Phaser.Scene {
  constructor() {
    super({ key: 'End' });
  }

  // ─── Preload ───────────────────────────────────────────────────────────────

  preload() {
    // Try to load the personal photo if the user has provided one
    if (GAME_DATA.ending && GAME_DATA.ending.showPhoto) {
      this.load.image('end_photo', 'assets/photo.jpg');
    }
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  create() {
    this._drawBackground();
    this._launchConfetti();
    this._launchHeartExplosion();
    this._drawContent();
    this._drawReplayButton();

    // Animate content in after a brief firework moment
    this._animateIn();
  }

  // ─── Background ────────────────────────────────────────────────────────────

  _drawBackground() {
    // Deep twilight gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1A0533, 0x1A0533, 0x3D1066, 0x3D1066, 1);
    bg.fillRect(0, 0, GAME_W, GAME_H);

    // Star field
    for (let i = 0; i < 120; i++) {
      const x = Phaser.Math.Between(0, GAME_W);
      const y = Phaser.Math.Between(0, GAME_H);
      const r = Math.random() < 0.25 ? 1.5 : 1;
      bg.fillStyle(0xFFFFFF, 0.3 + Math.random() * 0.7);
      bg.fillCircle(x, y, r);
    }

    // Twinkling stars (animated)
    this._addTwinkles();
  }

  _addTwinkles() {
    for (let i = 0; i < 18; i++) {
      const x = Phaser.Math.Between(20, GAME_W - 20);
      const y = Phaser.Math.Between(10, GAME_H * 0.7);

      const dot = this.add.graphics();
      dot.fillStyle(0xFFFFFF, 1);
      dot.fillCircle(x, y, 2);

      this.tweens.add({
        targets: dot,
        alpha: 0.1,
        duration: 800 + Math.random() * 1400,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 1000,
        ease: 'Sine.easeInOut',
      });
    }
  }

  // ─── Confetti explosion ────────────────────────────────────────────────────

  _launchConfetti() {
    const colors = [0xFF6B9D, 0xFFD700, 0x88FFFF, 0xFFCC44, 0xAA88FF, 0xFF99BB, 0x44FFCC];

    colors.forEach((tint, i) => {
      this.time.delayedCall(i * 60, () => {
        this.add.particles(GAME_W / 2, GAME_H / 2, 'confetti', {
          speed:    { min: 120, max: 380 },
          angle:    { min: 0, max: 360 },
          scale:    { start: 2.5, end: 0.5 },
          alpha:    { start: 1, end: 0 },
          lifespan: { min: 1200, max: 2400 },
          quantity: 14,
          tint: tint,
          emitting: false,
          gravityY: 200,
        }).explode(14);
      });
    });

    // Second wave from corners after 600ms
    this.time.delayedCall(600, () => {
      [[0, 0], [GAME_W, 0], [0, GAME_H * 0.3], [GAME_W, GAME_H * 0.3]].forEach(([x, y]) => {
        this.add.particles(x, y, 'confetti', {
          speed:    { min: 100, max: 300 },
          angle:    { min: 0, max: 360 },
          scale:    { start: 2, end: 0 },
          alpha:    { start: 0.9, end: 0 },
          lifespan: 1800,
          quantity: 10,
          tint: [0xFF6B9D, 0xFFD700, 0x88FFFF, 0xFFCC44],
          emitting: false,
          gravityY: 180,
        }).explode(10);
      });
    });
  }

  _launchHeartExplosion() {
    // Big heart burst from center
    this.add.particles(GAME_W / 2, GAME_H * 0.38, 'heart_particle', {
      speed:    { min: 80, max: 250 },
      angle:    { min: 0, max: 360 },
      scale:    { start: 3.0, end: 0 },
      alpha:    { start: 1, end: 0 },
      lifespan: { min: 1000, max: 2000 },
      quantity: 20,
      tint: [0xFF6B9D, 0xFFAACC, 0xFF3388, 0xFFCCEE],
      emitting: false,
    }).explode(20);

    // Continuous gentle heart rain (stays running)
    this.add.particles(GAME_W / 2, -10, 'heart_particle', {
      x:        { min: -GAME_W / 2, max: GAME_W / 2 },
      y:        0,
      speedY:   { min: 60, max: 140 },
      speedX:   { min: -30, max: 30 },
      scale:    { start: 1.8, end: 0 },
      alpha:    { start: 0.7, end: 0 },
      lifespan: { min: 3000, max: 5000 },
      frequency: 300,
      quantity: 1,
      tint: [0xFF6B9D, 0xFFAACC, 0xFF99BB],
      gravityY: 40,
    });
  }

  // ─── Main content ──────────────────────────────────────────────────────────

  _drawContent() {
    const cx   = GAME_W / 2;
    const data = GAME_DATA.ending || {};

    this._contentGroup = [];
    const reg = obj => { this._contentGroup.push(obj); return obj; };

    // Cake emoji or star row
    reg(this.add.text(cx, 120, '🎂  ★  🎂', {
      fontSize: '30px',
    }).setOrigin(0.5).setAlpha(0));

    // Headline
    reg(this.add.text(cx, 188, data.headline || 'Happy Birthday!', {
      fontFamily: '"Press Start 2P"',
      fontSize:   '16px',
      color:      '#FFD700',
      stroke:     '#884400',
      strokeThickness: 4,
      shadow: { offsetX: 3, offsetY: 3, color: '#442200', blur: 0, fill: true },
      align:      'center',
      wordWrap:   { width: GAME_W - 40 },
    }).setOrigin(0.5).setAlpha(0));

    // Player name
    const name = GAME_DATA.playerName || 'My Love';
    reg(this.add.text(cx, 228, `for ${name}  ♥`, {
      fontFamily: '"Press Start 2P"',
      fontSize:   '10px',
      color:      '#FF99CC',
      stroke:     '#440022',
      strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0));

    // Divider row
    reg(this.add.text(cx, 258, '— ♥ ♥ ♥ —', {
      fontFamily: '"Press Start 2P"',
      fontSize:   '9px',
      color:      '#AA66CC',
    }).setOrigin(0.5).setAlpha(0));

    // Personal message
    const msg = (data.message || '').replace(/\\n/g, '\n');
    const msgObj = reg(this.add.text(cx, 290, msg, {
      fontFamily: '"Press Start 2P"',
      fontSize:   '8px',
      color:      '#EEE8FF',
      align:      'center',
      lineSpacing: 12,
      wordWrap:   { width: GAME_W - 50 },
    }).setOrigin(0.5, 0).setAlpha(0));

    // Photo frame (optional)
    if (data.showPhoto && this.textures.exists('end_photo')) {
      const yPhoto = msgObj.y + msgObj.height + 32;
      this._addPhotoFrame(cx, yPhoto, reg);
    }
  }

  _addPhotoFrame(cx, y, reg) {
    // Pixel-art border frame
    const fw = 200, fh = 160;
    const frameGfx = reg(this.add.graphics().setAlpha(0));

    // Outer frame (gold)
    frameGfx.fillStyle(0xFFD700);
    frameGfx.fillRect(cx - fw/2 - 6, y - 6, fw + 12, fh + 12);

    // Inner frame (dark)
    frameGfx.fillStyle(0x220033);
    frameGfx.fillRect(cx - fw/2 - 3, y - 3, fw + 6, fh + 6);

    // Photo
    const photo = reg(this.add.image(cx, y + fh/2, 'end_photo')
      .setAlpha(0));

    // Fit photo to frame
    const scaleX = fw / photo.width;
    const scaleY = fh / photo.height;
    photo.setScale(Math.min(scaleX, scaleY));

    // Corner decorations
    [[cx - fw/2 - 6, y - 6], [cx + fw/2 + 6, y - 6],
     [cx - fw/2 - 6, y + fh + 6], [cx + fw/2 + 6, y + fh + 6]].forEach(([hx, hy]) => {
      reg(this.add.text(hx, hy, '♥', {
        fontSize: '10px', color: '#FF6B9D',
      }).setOrigin(0.5).setAlpha(0));
    });
  }

  // ─── Replay button ─────────────────────────────────────────────────────────

  _drawReplayButton() {
    const cx  = GAME_W / 2;
    const y   = GAME_H - 70;

    const gfx = this.add.graphics().setAlpha(0);
    gfx.fillStyle(0xFF6B9D);
    gfx.fillRoundedRect(cx - 110, y - 22, 220, 44, 12);
    gfx.lineStyle(2, 0xFFCCDD);
    gfx.strokeRoundedRect(cx - 110, y - 22, 220, 44, 12);
    this._contentGroup.push(gfx);

    const label = this.add.text(cx, y, 'Play Again  ♥', {
      fontFamily: '"Press Start 2P"',
      fontSize:   '10px',
      color:      '#ffffff',
    }).setOrigin(0.5).setAlpha(0);
    this._contentGroup.push(label);

    // Hit zone
    const zone = this.add.zone(cx, y, 240, 50)
      .setInteractive({ useHandCursor: true });

    zone.on('pointerdown', () => {
      this.cameras.main.fade(400, 10, 0, 20, false, (cam, p) => {
        if (p >= 1) this.scene.start('Menu');
      });
    });

    // Hover effect
    zone.on('pointerover', () => {
      gfx.clear();
      gfx.fillStyle(0xFF99BB);
      gfx.fillRoundedRect(cx - 110, y - 22, 220, 44, 12);
      gfx.lineStyle(2, 0xFFCCDD);
      gfx.strokeRoundedRect(cx - 110, y - 22, 220, 44, 12);
    });

    zone.on('pointerout', () => {
      gfx.clear();
      gfx.fillStyle(0xFF6B9D);
      gfx.fillRoundedRect(cx - 110, y - 22, 220, 44, 12);
      gfx.lineStyle(2, 0xFFCCDD);
      gfx.strokeRoundedRect(cx - 110, y - 22, 220, 44, 12);
    });
  }

  // ─── Animation ─────────────────────────────────────────────────────────────

  _animateIn() {
    // Stagger-fade all content elements in (alpha only — no y tween on Graphics objects)
    this._contentGroup.forEach((el, i) => {
      this.tweens.add({
        targets:  el,
        alpha:    1,
        duration: 500,
        delay:    500 + i * 120,
        ease:     'Quad.easeOut',
      });
    });

    // Pulse the headline gold
    this.time.delayedCall(1800, () => {
      if (this._contentGroup[1]) {
        this.tweens.add({
          targets:  this._contentGroup[1],
          scaleX:   1.05,
          scaleY:   1.05,
          duration: 700,
          yoyo:     true,
          repeat:   -1,
          ease:     'Sine.easeInOut',
        });
      }
    });
  }
}
