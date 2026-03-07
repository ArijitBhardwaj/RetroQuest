'use strict';

/**
 * GameScene — Main gameplay
 *
 * Level: 8 000px wide × 854px tall (portrait)
 * Three acts with increasing difficulty:
 *   Act 1 "The Beginning"  (x  0–2800):  solid ground, easy platforms
 *   Act 2 "The Adventure"  (x 2800–5500): gaps in ground, moving platforms
 *   Act 3 "The Destination"(x 5500–8000): wide gaps, crumble platform, tight jumps
 *
 * Collectibles (10 total):
 *   5 × Love Letter  💌 — scatter across Acts 1 & 2
 *   4 × Golden Star  ⭐ — scatter across Acts 2 & 3
 *   1 × Crystal Heart 💎 — end of Act 3 (triggers birthday screen)
 */

// ─── Level data ─────────────────────────────────────────────────────────────
// Format: [x_left, y_top, width, height, textureKey]
// y_top is the TOP SURFACE of the platform (where the player lands).
const PLATFORM_DATA = [
  // ═══ ACT 1 — The Beginning ════════════════════════════════════════════════

  // Continuous ground
  [0, 790, 2800, 64, 'ground_tile'],

  // Rising-and-falling platform staircase (all gently reachable from ground)
  [260,  725, 140, 16, 'platform_grass'],
  [480,  690, 120, 16, 'platform_grass'],
  [670,  720, 140, 16, 'platform_grass'],
  [880,  668, 120, 16, 'platform_grass'],  // ← Letter 0 on this one
  [1070, 710, 140, 16, 'platform_grass'],
  [1270, 672, 120, 16, 'platform_grass'],  // ← Letter 1
  [1460, 718, 140, 16, 'platform_grass'],
  [1660, 665, 120, 16, 'platform_grass'],  // ← Letter 2
  [1870, 705, 140, 16, 'platform_grass'],
  [2070, 680, 120, 16, 'platform_grass'],
  [2280, 720, 140, 16, 'platform_grass'],
  [2510, 695, 140, 16, 'platform_grass'],
  [2700, 740, 100, 16, 'platform_grass'],

  // ═══ ACT 2 — The Adventure ════════════════════════════════════════════════

  // Ground with gaps
  [2800, 790, 220, 64, 'ground_tile'],   // gap 3020–3165 (145px — jumpable)
  [3165, 790, 195, 64, 'ground_tile'],   // gap 3360–3535 (175px)
  [3535, 790, 205, 64, 'ground_tile'],   // gap 3740–3935 (195px)
  [3935, 790, 225, 64, 'ground_tile'],   // gap 4160–4330 (170px)
  [4330, 790, 185, 64, 'ground_tile'],   // gap 4515–4690 (175px)
  [4690, 790, 205, 64, 'ground_tile'],   // gap 4895–5080 (185px)
  [5080, 790, 220, 64, 'ground_tile'],   // gap 5300–5500 (200px)

  // Bridge platforms spanning each gap
  [2870, 698, 120, 16, 'platform_stone'],
  [3040, 640, 120, 16, 'platform_stone'],
  [3180, 688, 120, 16, 'platform_stone'],
  [3365, 628, 140, 16, 'platform_stone'],  // ← Letter 3
  [3550, 675, 120, 16, 'platform_stone'],
  // (Moving platform spans 3740–3940 gap — defined in MOVING_DATA)
  [3960, 670, 120, 16, 'platform_stone'],
  [4100, 628, 120, 16, 'platform_stone'],  // ← Star 0
  [4310, 680, 120, 16, 'platform_stone'],
  [4510, 635, 140, 16, 'platform_stone'],  // ← Letter 4
  [4700, 680, 120, 16, 'platform_stone'],
  // (Moving platform spans 4895–5080 gap)
  [5090, 652, 140, 16, 'platform_stone'],  // ← Star 1
  [5300, 700, 120, 16, 'platform_stone'],

  // ═══ ACT 3 — The Destination ══════════════════════════════════════════════

  // Ground with larger gaps
  [5500, 790, 165, 64, 'ground_tile'],   // gap 5665–5860 (195px)
  [5860, 790, 130, 64, 'ground_tile'],   // gap 5990–6200 (210px)
  [6200, 790, 130, 64, 'ground_tile'],   // gap 6330–6570 (240px)
  [6570, 790, 130, 64, 'ground_tile'],   // gap 6700–6940 (240px)
  [6940, 790, 130, 64, 'ground_tile'],   // gap 7070–7310 (240px)
  [7310, 790, 110, 64, 'ground_tile'],   // gap 7420–7680 (260px)
  [7680, 790, 320, 64, 'ground_tile'],   // final solid ground

  // Bridge platforms
  [5515, 705, 120, 16, 'platform_stone'],
  [5685, 648, 120, 16, 'platform_stone'],  // ← Star 2
  [5880, 695, 110, 16, 'platform_stone'],
  [6015, 640, 120, 16, 'platform_stone'],
  // Crumble platform at 6240 defined in CRUMBLE_DATA
  [6450, 660, 110, 16, 'platform_stone'],
  [6610, 588, 120, 16, 'platform_stone'],  // ← Star 3
  // Moving platform at 6760 (vertical)
  [6965, 618, 120, 16, 'platform_stone'],
  [7100, 665, 110, 16, 'platform_stone'],
  // Moving platform at 7290 (horizontal)
  [7420, 685, 110, 16, 'platform_stone'],

  // Final golden platform (crystal heart lives here)
  [7690, 724, 240, 20, 'platform_gold'],
];

// Moving platforms: [startX, startY, width, axis, range, duration]
// axis: 'x' | 'y'  range: px of travel  duration: ms for one leg
const MOVING_DATA = [
  [3740, 610, 120, 'x', 110, 2200],   // Act 2 — bridges first big gap
  [4870, 610, 120, 'x', 100, 1900],   // Act 2 — bridges second big gap
  [6760, 660, 100, 'y', 90,  2000],   // Act 3 — vertical mover
  [7270, 600, 100, 'x', 110, 1700],   // Act 3 — horizontal near end
];

// Crumble platforms: [x_left, y_top, width]
const CRUMBLE_DATA = [
  [6225, 608, 120],
];

// Collectibles: [x_center, y_center, type, msgType, msgIndex]
// type: 'letter' | 'star' | 'crystal'
// msgType: 'letters' | 'stars' | null
const COLLECTIBLE_DATA = [
  // Act 1 — 3 Letters
  [940,  640, 'letter', 'letters', 0],   // above platform at 880,668
  [1330, 644, 'letter', 'letters', 1],   // above platform at 1270,672
  [1720, 637, 'letter', 'letters', 2],   // above platform at 1660,665

  // Act 2 — 2 Letters + 2 Stars
  [3435, 600, 'letter', 'letters', 3],   // above platform at 3365,628
  [4160, 600, 'star',   'stars',   0],   // above platform at 4100,628
  [4580, 607, 'letter', 'letters', 4],   // above platform at 4510,635
  [5160, 624, 'star',   'stars',   1],   // above platform at 5090,652

  // Act 3 — 2 Stars
  [5745, 620, 'star',   'stars',   2],   // above platform at 5685,648
  [6670, 560, 'star',   'stars',   3],   // above platform at 6610,588

  // Final — Crystal Heart
  [7810, 698, 'crystal', null, null],    // on the gold platform
];

// Zone thresholds [x, zoneName, skyColorTop, skyColorBot]
const ZONES = [
  { x: 0,    name: 'dawn',   top: 0xD4B8F0, bot: 0xFFCCE8 },
  { x: 2800, name: 'sunset', top: 0xF4845F, bot: 0xFFCF77 },
  { x: 5500, name: 'night',  top: 0x1A0533, bot: 0x2D1B69 },
];

// ────────────────────────────────────────────────────────────────────────────

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Game' });
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  create() {
    this._initState();
    this._buildBackground();
    this._buildLevel();
    this._buildPlayer();
    this._buildCollectibles();
    this._buildCamera();
    this._buildMobileControls();
    this._buildHUD();
    this._buildDeathZone();
    this._buildKeyboard();
    this._buildActZoneDetection();
  }

  update(time, delta) {
    if (this._popupActive || !this.player) return;

    this._syncKeyboard();
    this.player.update(this._cursors, this._controls);
    this._controls.postUpdate();
    this._updateCrumbles(delta);
    this._checkZoneChange();
    this._updateLastSafe();
  }

  // ─── State initialisation ──────────────────────────────────────────────────

  _initState() {
    this._collected     = 0;
    this._total         = COLLECTIBLE_DATA.length;   // 10
    this._currentZone   = 0;
    this._popupActive   = false;
    this._lastSafe      = { x: 100, y: 770 };
    this._safeTimer     = 0;
    this._popupQueue    = [];
    this._crumbleMap    = new Map(); // platform → crumble state
  }

  // ─── Background ────────────────────────────────────────────────────────────

  _buildBackground() {
    const zone = ZONES[0];

    // Sky gradient — fixed to camera
    this._skyGfx = this.add.graphics().setScrollFactor(0).setDepth(-30);
    this._drawSky(zone.top, zone.bot);

    // Clouds — slow parallax (scrollFactor 0.15)
    this._buildClouds();

    // Star field — visible in night zone, initially hidden
    this._buildStarField();
  }

  _drawSky(topCol, botCol) {
    this._skyGfx.clear();
    this._skyGfx.fillGradientStyle(topCol, topCol, botCol, botCol, 1);
    this._skyGfx.fillRect(0, 0, GAME_W, GAME_H);
  }

  _buildClouds() {
    // Spread clouds across the entire level width
    const cloudPositions = [
      [200,   90],  [700,  60],  [1300, 100], [1900,  70],
      [2600,  90],  [3200, 65],  [3900,  85], [4600,  70],
      [5300,  90],  [5900, 60],  [6600,  80], [7300,  75],
    ];

    this._clouds = cloudPositions.map(([wx, wy]) => {
      const scale = 0.5 + Math.random() * 0.6;
      const c = this.add.image(wx, wy, 'cloud')
        .setScale(scale)
        .setScrollFactor(0.15, 0.05)  // horizontal + slight vertical parallax
        .setAlpha(0.70)
        .setDepth(-20);

      this.tweens.add({
        targets: c,
        x: wx + 20,
        duration: 5000 + Math.random() * 4000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      return c;
    });
  }

  _buildStarField() {
    this._starGfx = this.add.graphics()
      .setScrollFactor(0)
      .setDepth(-25)
      .setAlpha(0);

    // Draw a field of tiny white dots
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, GAME_W);
      const y = Phaser.Math.Between(0, GAME_H * 0.65);
      const r = Math.random() < 0.3 ? 1.5 : 1;
      this._starGfx.fillStyle(0xFFFFFF, 0.6 + Math.random() * 0.4);
      this._starGfx.fillCircle(x, y, r);
    }
  }

  // ─── Level construction ────────────────────────────────────────────────────

  _buildLevel() {
    // Plain array — avoids StaticGroup double-body issue with TileSprites
    this._staticPlatforms = [];
    this._movingPlatforms = [];

    // Static platforms
    PLATFORM_DATA.forEach(([x, y, w, h, tex]) => {
      this._addStaticPlatform(x, y, w, h, tex);
    });

    // Moving platforms
    MOVING_DATA.forEach(([x, y, w, axis, range, dur]) => {
      this._addMovingPlatform(x, y, w, axis, range, dur);
    });

    // Crumble platforms
    CRUMBLE_DATA.forEach(([x, y, w]) => {
      this._addCrumblePlatform(x, y, w);
    });

    // Background level decorations (flowers, bushes — Act 1 only)
    this._drawDecorations();
  }

  _addStaticPlatform(x, y, w, h, tex) {
    // TileSprite tiles the texture, physics.add.existing creates a static body
    const cx = x + w / 2;
    const cy = y + h / 2;
    const tile = this.add.tileSprite(cx, cy, w, h, tex).setDepth(2);
    this.physics.add.existing(tile, true); // true = static body
    this._staticPlatforms.push(tile);
    return tile;
  }

  _addMovingPlatform(x, y, w, axis, range, dur) {
    const cx = x + w / 2;
    const cy = y + 8;  // centre of a 16px tall platform
    const tile = this.add.tileSprite(cx, cy, w, 16, 'platform_stone').setDepth(2);

    // Use STATIC body — the tween moves the sprite, body.reset() syncs the physics body.
    // TileSprite doesn't get refreshBody() mixed in (that's only on Arcade.Sprite/Image),
    // so we call body.reset(x, y) directly — which is exactly what refreshBody() does.
    this.physics.add.existing(tile, true);

    const startVal = axis === 'x' ? cx : cy;
    const endVal   = startVal + range;

    this.tweens.add({
      targets: tile,
      [axis]: endVal,
      duration: dur,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      onUpdate: () => tile.body.reset(tile.x, tile.y), // sync static body to visual
    });

    this._movingPlatforms.push(tile);
    return tile;
  }

  _addCrumblePlatform(x, y, w) {
    const platform = this._addStaticPlatform(x, y, w, 16, 'platform_stone');

    // Tint the crumble platform slightly red as a subtle hint
    platform.setTint(0xFFCCCC);

    this._crumbleMap.set(platform, {
      state: 'solid',   // solid | shaking | fallen
      timer: 0,
      originX: x + w / 2,
      originY: y + 8,
    });

    return platform;
  }

  _drawDecorations() {
    const deco = this.add.graphics().setDepth(1);

    // Small flowers along Act 1 ground
    const flowerColors = [0xFF6B9D, 0xFFD700, 0xFF99BB, 0xFFCC44];
    for (let fx = 80; fx < 2800; fx += 60 + Math.floor(Math.random() * 80)) {
      const col = flowerColors[Math.floor(Math.random() * flowerColors.length)];
      // Stem
      deco.fillStyle(0x559944);
      deco.fillRect(fx, 778, 2, 12);
      // Petals
      deco.fillStyle(col);
      deco.fillCircle(fx + 1, 774, 5);
      deco.fillStyle(0xFFFFCC);
      deco.fillCircle(fx + 1, 774, 2);
    }

    // Small bushes
    for (let bx = 120; bx < 2800; bx += 140 + Math.floor(Math.random() * 100)) {
      deco.fillStyle(0x336622);
      deco.fillEllipse(bx, 784, 28, 14);
      deco.fillStyle(0x44AA44);
      deco.fillEllipse(bx - 6, 780, 18, 12);
      deco.fillStyle(0x55BB55);
      deco.fillEllipse(bx + 6, 781, 16, 10);
    }
  }

  // ─── Player ────────────────────────────────────────────────────────────────

  _buildPlayer() {
    this.player = new Player(this, 80, 770);

    // Collide with all static platforms (array works in Phaser 3.60+)
    this.physics.add.collider(this.player.sprite, this._staticPlatforms);

    // Collide with moving platforms (each individually — dynamic bodies)
    this._movingPlatforms.forEach(mp => {
      this.physics.add.collider(this.player.sprite, mp);
    });
  }

  // ─── Collectibles ──────────────────────────────────────────────────────────

  _buildCollectibles() {
    this._collectibles = [];

    COLLECTIBLE_DATA.forEach(([x, y, type, msgType, msgIdx], i) => {
      const texKey = type === 'letter' ? 'item_letter'
                   : type === 'star'   ? 'item_star'
                   :                     'item_crystal';

      const scale = type === 'crystal' ? 1.8 : 1.5;

      const item = this.physics.add.image(x, y, texKey)
        .setScale(scale)
        .setDepth(5)
        .setImmovable(true);

      // No gravity on collectibles — they float
      item.body.setAllowGravity(false);

      // Floating bob tween (offset per item so they don't all sync)
      this.tweens.add({
        targets: item,
        y: y - 8,
        duration: 1200 + i * 90,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Glow ring pulse
      const glow = this.add.image(x, y, 'glow_ring')
        .setScale(type === 'crystal' ? 2.0 : 1.4)
        .setAlpha(0.5)
        .setDepth(4)
        .setTint(type === 'crystal' ? 0x88FFFF : type === 'star' ? 0xFFDD00 : 0xFF99CC);

      this.tweens.add({
        targets: glow,
        scaleX: glow.scaleX * 1.35,
        scaleY: glow.scaleY * 1.35,
        alpha: 0,
        duration: 1400,
        repeat: -1,
        ease: 'Quad.easeOut',
      });

      // Collect overlap
      this.physics.add.overlap(this.player.sprite, item, () => {
        this._onCollect(item, glow, type, msgType, msgIdx);
      });

      this._collectibles.push({ item, glow, type, msgType, msgIdx });
    });
  }

  _onCollect(item, glow, type, msgType, msgIdx) {
    if (!item.active) return;

    // Disable the collectible immediately
    item.setActive(false).setVisible(false);
    item.body.enable = false;
    glow.destroy();

    this._collected++;
    this._updateHUD();

    // Particle burst at collection point
    this._burstParticles(item.x, item.y, type);

    if (type === 'crystal') {
      // Final collectible — short delay then go to end screen
      this.time.delayedCall(800, () => this._goToEnd());
      return;
    }

    // Build the popup message and push to queue
    const msgList = GAME_DATA[msgType];
    const msg     = msgList && msgList[msgIdx];

    this._popupQueue.push({
      icon:  type === 'letter' ? '💌' : '⭐',
      title: msg ? msg.title : '♥',
      text:  msg ? msg.text  : '...',
    });

    // Show popup if none currently showing
    if (!this._popupActive) {
      this._showNextPopup();
    }
  }

  _burstParticles(x, y, type) {
    const texKey = type === 'letter' ? 'heart_particle'
                 : type === 'star'   ? 'star_particle'
                 :                     'heart_particle';
    const tints  = type === 'crystal'
      ? [0x88FFFF, 0xCCFFFF, 0xFFFFFF]
      : type === 'star'
        ? [0xFFD700, 0xFFEE88, 0xFFFF44]
        : [0xFF6B9D, 0xFFAACC, 0xFF99BB];

    const emitter = this.add.particles(x, y, texKey, {
      speed:    { min: 60, max: 180 },
      angle:    { min: 0, max: 360 },
      scale:    { start: 2.0, end: 0 },
      alpha:    { start: 1,   end: 0 },
      lifespan: { min: 500, max: 900 },
      quantity: 12,
      tint: tints,
      emitting: false,
    });
    emitter.explode(12);

    // Self-destroy after particles fade
    this.time.delayedCall(1000, () => emitter.destroy());
  }

  // ─── Popup Card ────────────────────────────────────────────────────────────

  _showNextPopup() {
    if (this._popupQueue.length === 0) return;

    const { icon, title, text } = this._popupQueue.shift();
    this._popupActive = true;
    this.physics.pause();

    const cx = GAME_W / 2;
    const cy = GAME_H / 2;
    this._popupElements = [];

    const add = obj => { this._popupElements.push(obj); return obj; };

    // Dark overlay
    add(this.add.rectangle(cx, cy, GAME_W, GAME_H, 0x000000, 0.72)
      .setScrollFactor(0).setDepth(200));

    // Card background
    const cardGfx = add(this.add.graphics().setScrollFactor(0).setDepth(201));
    const cw = 370, ch = 340;
    cardGfx.fillStyle(0x1A0533, 1);
    cardGfx.fillRoundedRect(cx - cw/2, cy - ch/2, cw, ch, 18);
    cardGfx.lineStyle(3, 0xFF6B9D, 1);
    cardGfx.strokeRoundedRect(cx - cw/2, cy - ch/2, cw, ch, 18);

    // Inner top decoration bar
    cardGfx.fillStyle(0xFF6B9D, 0.15);
    cardGfx.fillRoundedRect(cx - cw/2 + 3, cy - ch/2 + 3, cw - 6, 60, { tl: 16, tr: 16, bl: 0, br: 0 });

    // Icon
    add(this.add.text(cx, cy - ch/2 + 36, icon, {
      fontSize: '42px',
    }).setScrollFactor(0).setDepth(202).setOrigin(0.5));

    // Title
    add(this.add.text(cx, cy - ch/2 + 86, title, {
      fontFamily: '"Press Start 2P"',
      fontSize:   '11px',
      color:      '#FF99CC',
      align:      'center',
      wordWrap:   { width: cw - 40 },
    }).setScrollFactor(0).setDepth(202).setOrigin(0.5));

    // Divider
    const divGfx = add(this.add.graphics().setScrollFactor(0).setDepth(202));
    divGfx.lineStyle(1, 0xFF6B9D, 0.4);
    divGfx.lineBetween(cx - cw/2 + 24, cy - 46, cx + cw/2 - 24, cy - 46);

    // Message text (word-wrapped)
    add(this.add.text(cx, cy - 32, text, {
      fontFamily: '"Press Start 2P"',
      fontSize:   '9px',
      color:      '#EEE8FF',
      align:      'center',
      lineSpacing: 10,
      wordWrap:   { width: cw - 48 },
    }).setScrollFactor(0).setDepth(202).setOrigin(0.5, 0));

    // "Keep Going" button
    const btnY = cy + ch/2 - 40;
    const btnGfx = add(this.add.graphics().setScrollFactor(0).setDepth(202));
    btnGfx.fillStyle(0xFF6B9D, 1);
    btnGfx.fillRoundedRect(cx - 110, btnY - 22, 220, 44, 12);
    btnGfx.fillStyle(0xFF99BB, 0.6);
    btnGfx.fillRoundedRect(cx - 106, btnY - 18, 140, 14, 6); // highlight sheen
    btnGfx.lineStyle(2, 0xFFCCDD, 1);
    btnGfx.strokeRoundedRect(cx - 110, btnY - 22, 220, 44, 12);

    add(this.add.text(cx, btnY, 'Keep Going  ♥', {
      fontFamily: '"Press Start 2P"',
      fontSize:   '9px',
      color:      '#ffffff',
    }).setScrollFactor(0).setDepth(203).setOrigin(0.5));

    // Slide-in animation for the card
    const allCardEls = this._popupElements.slice(1); // skip overlay
    allCardEls.forEach(el => {
      el.setAlpha(0);
      this.tweens.add({ targets: el, alpha: 1, duration: 260, delay: 60 });
    });

    // ── Input to dismiss ──
    // Wait 400ms before allowing dismiss (avoids accidental instant close)
    this.time.delayedCall(400, () => {
      if (!this._popupActive) return; // guard: popup might have been dismissed already

      let dismissed = false;
      const closePopup = () => {
        if (dismissed) return;
        dismissed = true;
        this.input.off('pointerdown', closePopup);
        this._closePopup();
      };

      // Anywhere tap closes the popup
      this.input.once('pointerdown', closePopup);

      // Spacebar also works
      this.input.keyboard.once('keydown-SPACE', closePopup);
      this.input.keyboard.once('keydown-ENTER', closePopup);
    });
  }

  _closePopup() {
    if (!this._popupActive) return;

    // Fade out
    this.tweens.add({
      targets: this._popupElements,
      alpha: 0,
      duration: 180,
      onComplete: () => {
        this._popupElements.forEach(el => el.destroy());
        this._popupElements = [];
        this._popupActive = false;
        this.physics.resume();

        // Show next queued popup (if any)
        if (this._popupQueue.length > 0) {
          this.time.delayedCall(200, () => this._showNextPopup());
        }
      },
    });

    // Remove input handlers
    this.input.off('pointerdown', this._closePopup, this);
  }

  // ─── Camera ────────────────────────────────────────────────────────────────

  _buildCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, 8000, GAME_H);
    cam.startFollow(this.player.sprite, true, 0.08, 0.12);
    cam.setDeadzone(90, 200);  // horizontal dead zone so camera isn't jittery
    cam.setFollowOffset(-60, 0); // keep player slightly left of center
  }

  // ─── Mobile Controls ───────────────────────────────────────────────────────

  _buildMobileControls() {
    this._controls = new MobileControls(this);
  }

  // ─── HUD ───────────────────────────────────────────────────────────────────

  _buildHUD() {
    // Progress counter (top-left)
    this._hudText = this.add.text(14, 14, this._hudString(), {
      fontFamily: '"Press Start 2P"',
      fontSize:   '9px',
      color:      '#FFCCEE',
      stroke:     '#220011',
      strokeThickness: 3,
    }).setScrollFactor(0).setDepth(180);

    // Zone name (top-right)
    this._zoneText = this.add.text(GAME_W - 14, 14, 'Act 1', {
      fontFamily: '"Press Start 2P"',
      fontSize:   '8px',
      color:      '#DDBBFF',
      stroke:     '#220011',
      strokeThickness: 3,
    }).setScrollFactor(0).setDepth(180).setOrigin(1, 0);
  }

  _hudString() {
    return `♥ ${this._collected} / ${this._total}`;
  }

  _updateHUD() {
    this._hudText.setText(this._hudString());
  }

  // ─── Death Zone ────────────────────────────────────────────────────────────

  _buildDeathZone() {
    // Invisible rectangle at the very bottom of the world
    const dz = this.add.zone(4000, 920, 8000, 40);
    this.physics.add.existing(dz, true);
    this.physics.add.overlap(this.player.sprite, dz, () => this._respawn());
  }

  _respawn() {
    // Brief camera flash
    this.cameras.main.flash(300, 200, 0, 0, true);

    // Reset player to last safe position
    this.player.setPosition(this._lastSafe.x, this._lastSafe.y);
    this.player.body.setVelocity(0, 0);
  }

  // ─── Keyboard ──────────────────────────────────────────────────────────────

  _buildKeyboard() {
    // Standard cursor keys (arrows + space)
    this._rawCursors = this.input.keyboard.createCursorKeys();

    // WASD alternate controls
    this._wasd = this.input.keyboard.addKeys({ up: 'W', left: 'A', right: 'D' });

    // Composite cursors object that merges arrows + WASD
    // Player.update reads .left.isDown / .right.isDown / .up.isDown / .space.isDown
    this._cursors = {
      left:  { isDown: false },
      right: { isDown: false },
      up:    { isDown: false },
      space: this._rawCursors.space,
    };
  }

  // Called each frame to merge arrow keys + WASD into the composite cursors
  _syncKeyboard() {
    const r = this._rawCursors, w = this._wasd;
    this._cursors.left.isDown  = r.left.isDown  || w.left.isDown;
    this._cursors.right.isDown = r.right.isDown || w.right.isDown;
    this._cursors.up.isDown    = r.up.isDown    || w.up.isDown;
  }

  // ─── Zone detection ────────────────────────────────────────────────────────

  _buildActZoneDetection() {
    this._zoneNames = ['Act 1  —  The Beginning', 'Act 2  —  The Adventure', 'Act 3  —  The Destination'];
  }

  _checkZoneChange() {
    const px = this.player.x;
    let newZone = 0;
    if (px >= ZONES[2].x) newZone = 2;
    else if (px >= ZONES[1].x) newZone = 1;

    if (newZone !== this._currentZone) {
      this._currentZone = newZone;
      this._transitionToZone(newZone);
    }
  }

  _transitionToZone(zoneIdx) {
    const zone = ZONES[zoneIdx];

    // Fade camera to black → redraw sky → fade back in
    // NOTE: must use fadeIn (not flash) to reverse the fade.
    // camera.fade() and camera.flash() are separate effect objects — flash does NOT
    // clear the fade overlay, so the screen would stay black permanently.
    // camera.fadeIn() uses the same fadeEffect object and animates alpha back 1→0.
    this.cameras.main.fade(350, 0, 0, 0, false, (cam, progress) => {
      if (progress < 1) return;
      this._drawSky(zone.top, zone.bot);

      // Night zone: fade in stars
      if (zoneIdx === 2) {
        this.tweens.add({ targets: this._starGfx, alpha: 1, duration: 1200 });
        this._clouds.forEach(c => c.setTint(0x8866AA).setAlpha(0.4));
      } else {
        this._starGfx.setAlpha(0);
        this._clouds.forEach(c => c.clearTint().setAlpha(0.7));
      }

      this.cameras.main.fadeIn(350, 0, 0, 0);
    });

    // Update zone HUD text
    this._zoneText.setText(this._zoneNames[zoneIdx] || '');
  }

  // ─── Crumble platform logic ────────────────────────────────────────────────

  _updateCrumbles(delta) {
    this._crumbleMap.forEach((state, platform) => {
      if (state.state === 'fallen') return;

      // Check if player is standing on this platform
      const pBody = this.player.body;
      const touching = pBody.blocked.down &&
        pBody.bottom >= platform.body.top - 2 &&
        pBody.bottom <= platform.body.top + 6 &&
        pBody.right  >= platform.body.left &&
        pBody.left   <= platform.body.right;

      if (touching) {
        if (state.state === 'solid') {
          state.state = 'shaking';
          state.timer = 1500; // ms until fall

          // Shake tween
          this.tweens.add({
            targets: platform,
            x: state.originX + 4,
            duration: 80,
            yoyo: true,
            repeat: 10,
          });

          // Tint red-orange
          this.tweens.add({
            targets: platform,
            alpha: 0.6,
            duration: 1400,
          });
        }
      }

      if (state.state === 'shaking') {
        state.timer -= delta;
        if (state.timer <= 0) {
          state.state = 'fallen';
          platform.setVisible(false);
          platform.body.enable = false;

          // Crumble particles
          this._burstParticles(platform.x, platform.y, 'letter');

          // Respawn platform after 4 seconds
          this.time.delayedCall(4000, () => {
            platform.setVisible(true).setAlpha(1).setTint(0xFFCCCC);
            platform.setX(state.originX);
            platform.body.enable = true;
            platform.body.reset(state.originX, state.originY);
            state.state = 'solid';
          });
        }
      }
    });
  }

  // ─── Safe position tracking ────────────────────────────────────────────────

  _updateLastSafe() {
    if (this.player.body.blocked.down) {
      this._lastSafe = {
        x: this.player.x,
        y: this.player.y,
      };
    }
  }

  // ─── End game ──────────────────────────────────────────────────────────────

  _goToEnd() {
    this.cameras.main.fade(600, 255, 220, 255, false, (cam, progress) => {
      if (progress >= 1) {
        this.scene.start('End');
      }
    });
  }
}
