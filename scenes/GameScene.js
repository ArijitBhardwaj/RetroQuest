'use strict';

/**
 * GameScene — Main platformer gameplay
 *
 * Level: ~5600px wide × 854px tall
 * Two acts leading to a spaceship boarding sequence:
 *
 *   Act 1 "The Beginning"  (x    0–2800): rolling hills, easy platforms
 *   Act 2 "The Adventure"  (x 2800–5300): canyon gaps, moving bridge,
 *                                          then a crystal staircase gauntlet
 *   Boarding Zone          (x ~5390):     hovering ship → walk in → SpaceScene
 *
 * Collectibles (7 in platformer):
 *   5 × Love Letter  💌 — Act 1 (×3) + Act 2 (×2)
 *   2 × Golden Star  ⭐ — Act 2
 *       Star 0: on a midway platform (moderate)
 *       Star 1: above the hardest staircase peak (photo reveal)
 */

// ─── Level data ──────────────────────────────────────────────────────────────
//
// Physics recap (from game.js):
//   PLAYER_SPEED    = 220 px/s   PLAYER_JUMP_VEL = -630 px/s   GRAVITY = 900 px/s²
//   Max jump height ≈ 220 px     Safe horizontal gap ≤ 270 px
//   From a platform at y=P, player can reach y = P − 220 in one jump.
//
// ─── Physics reference ────────────────────────────────────────────────────────
// PLAYER_SPEED=220 px/s  JUMP_VEL=-630  GRAVITY=900
// Max jump height ≈ 220 px   Max jump horizontal ≈ 308 px at full speed
// Platform width: 100 px,  horizontal gap between adjacent platforms: 120 px
// ─────────────────────────────────────────────────────────────────────────────

const PLATFORM_DATA = [

  // ═══ ACT 1 — The Beginning ════════════════════════════════════════════════
  // Design: uniform 100 px wide platforms, 120 px gaps, dramatic vertical arc.
  // Shape: gentle ramp UP → valley → higher ramp UP → ramp DOWN → bridge
  //
  [0, 790, 2800, 64, 'ground_tile'],

  // ── Intro ramp: y 752 → 520, uniform +66 px each step ──
  [210,  752, 100, 16, 'platform_grass'],
  [430,  706, 100, 16, 'platform_grass'],
  [650,  652, 100, 16, 'platform_grass'],   // ← Letter 0 floats 36 px above
  [870,  590, 100, 16, 'platform_grass'],
  [1090, 520, 100, 16, 'platform_grass'],   // PEAK 1  (270 px above ground)

  // ── Valley: intentional drop to feel the altitude change ──
  [1280, 748, 100, 16, 'platform_grass'],   // low valley floor

  // ── Second climb: y 666 → 490, higher than first peak ──
  [1480, 666, 100, 16, 'platform_grass'],   // ← Letter 1 floats 36 px above
  [1700, 578, 100, 16, 'platform_grass'],
  [1920, 490, 100, 16, 'platform_grass'],   // PEAK 2  (300 px above ground)

  // ── Descent: smooth staircase down ──
  [2120, 578, 100, 16, 'platform_grass'],   // ← Letter 2 floats 36 px above
  [2340, 672, 100, 16, 'platform_grass'],
  [2540, 742, 100, 16, 'platform_grass'],
  [2720, 762, 100, 16, 'platform_grass'],   // bridge step into Act 2

  // ═══ ACT 2 — The Adventure ════════════════════════════════════════════════
  // Three ground sections separated by two canyons, then the staircase gauntlet.
  //
  //   GAP A: x 3200–3440  (240 px — requires the moving bridge)
  //   GAP B: x 3880–4160  (280 px — requires the elevator or a near-max jump)
  //
  [2800, 790, 400, 64, 'ground_tile'],   // 2800–3200
  [3440, 790, 440, 64, 'ground_tile'],   // 3440–3880
  [4160, 790, 140, 64, 'ground_tile'],   // 4160–4300
  [5260, 790, 360, 64, 'ground_tile'],   // 5260–5620  boarding zone

  // ── Approach to GAP A: two clear stepping stones ──
  [2950, 706, 110, 16, 'platform_stone'],  // first ledge up from ground
  [3110, 638, 110, 16, 'platform_stone'],  // ← Letter 3 floats 34 px above

  // ── Between GAPs: three distinct heights (LOW → MID → HIGH) ──
  // Direct MID→HIGH jump = 124 px (doable).
  // Or use CRUMBLE A [3800,550] as a gentler two-step bridge (see CRUMBLE_DATA).
  [3530, 724, 110, 16, 'platform_stone'],  // LOW  landing after bridge
  [3700, 614, 100, 16, 'platform_stone'],  // MID  (110 px above LOW)
  [3860, 490, 100, 16, 'platform_stone'],  // HIGH (124 px above MID) ← Star 0 above

  // ── Pre-staircase: see CRUMBLE_DATA for CRUMBLE B (Letter 4 ledge) ──
  // No additional static platforms — crumble B overlaps P1 for a direct jump-off.
];

// Regular moving platforms — [startX_left, startY_top, width, axis, range_px, dur_ms]
const MOVING_DATA = [
  // BRIDGE — horizontal, spans GAP A.
  // Teaches moving platforms. At rightmost position it's only 30 px from ground.
  [3200, 660, 110, 'x', 100, 1600],

  // ELEVATOR — vertical, rises 255 px.
  // Sits squarely inside GAP B (3880–4160).  Cleanly separated from the HIGH ledge.
  // At peak it also lets the player access Star 0 from the left (if they can time it).
  [4000, 724, 110, 'y', -255, 1800],
];

// Crystal staircase — vertical oscillators
// 6 platforms · 90–140 px horizontal gaps · moderate range, readable rhythm
// Arc: climbs from P1→P3 (summit), then descends P4→P6 (exit runway)
const STAIRCASE_DATA = [
  [4310, 730, 110, -130, 2100],   // P1 — y 730 → 600  (entry step)
  [4510, 660, 110, -130, 1950],   // P2 — y 660 → 530  (climbing)
  [4720, 580, 110, -140, 2250],   // P3 — y 580 → 440  SUMMIT  ← Star 1 above
  [4970, 660, 110, -130, 2050],   // P4 — y 660 → 530  (descending)
  [5140, 718, 110, -110, 2150],   // P5 — y 718 → 608
  [5260, 760,  95,  -90, 2350],   // P6 — y 760 → 670  exit onto boarding ground
];

// Crumble platforms — "seep-through" ledges that reward fast, decisive play
//
//   CRUMBLE A  [3800, 550] — MID-to-HIGH shortcut in the mid-canyon section.
//              Sits at the right edge of the MID platform and overlaps the left
//              edge of the HIGH platform.  Jump from MID (+64 px) → land on
//              crumble → jump to HIGH (+60 px).  Gives a gentler two-step
//              alternative to the direct 124 px MID→HIGH leap.  If it crumbles
//              while the player is on it they drop to the second ground section
//              (safe) — no pit below.
//
//   CRUMBLE B  [4220, 648] — Pre-staircase ledge where Letter 4 waits.
//              Grab the letter then jump straight to P1.  Falls into the
//              third small ground section (x 4160-4300) — survivable.
const CRUMBLE_DATA = [
  [3800, 550,  80],   // A — MID→HIGH bridge shortcut
  [4220, 648, 120],   // B — Letter 4 lives here, grab and leap!
];

// Collectibles — [x_center, y_center, type, msgKey, msgIdx, photoSrc?]
//
// Each collect: photo fades in (3.5 s or tap), then fades out — no text popup.
// Heights are chosen so items float visibly above their platform but are reachable.
//
const COLLECTIBLE_DATA = [
  // Act 1 — floats 36 px above platform top
  [ 700, 616, 'letter', 'letters', 0, 'assets_provided/photo3.jpg'],
  [1530, 630, 'letter', 'letters', 1, 'assets_provided/photo4.jpg'],
  [2170, 542, 'letter', 'letters', 2, 'assets_provided/photo5.jpg'],

  // Act 2
  [3165, 604, 'letter', 'letters', 3, 'assets_provided/photo6.jpg'],  // above [3110,638]
  [3910, 454, 'star',   'stars',   0, 'assets_provided/photo7.jpg'],  // above HIGH [3860,490]; 36 px float
  [4280, 612, 'letter', 'letters', 4, 'assets_provided/photo1.jpg'],  // above CRUMBLE B [4220,648]; 36 px float
  [4775, 372, 'star',   'stars',   1, 'assets_provided/photo2.jpg'],  // above P3 summit y≈440; 68 px float
];

// Sky zones
const ZONES = [
  { x: 0,    name: 'Act 1  —  The Beginning', top: 0xD4B8F0, bot: 0xFFCCE8 },
  { x: 2800, name: 'Act 2  —  The Adventure', top: 0xF4845F, bot: 0xFFCF77 },
];

// ─────────────────────────────────────────────────────────────────────────────

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
    this._buildBoardingShip();
    this._buildCamera();
    this._buildMobileControls();
    this._buildHUD();
    this._buildDeathZone();
    this._buildKeyboard();

    if (typeof AUDIO !== 'undefined') AUDIO.startMusic('platform');
  }

  update(time, delta) {
    if (this._popupActive || !this.player) return;

    this._syncKeyboard();
    this.player.update(this._cursors, this._controls);
    this._controls.postUpdate();
    this._updateCrumbles(delta);
    this._checkZoneChange();
    this._updateLastSafe();
    this._updateBoardingShip();
    this._updateBackground();
  }

  // ─── State ─────────────────────────────────────────────────────────────────

  _initState() {
    this._collected   = 0;
    this._total       = COLLECTIBLE_DATA.length;
    this._currentZone = 0;
    this._popupActive = false;
    this._lastSafe    = { x: 100, y: 770 };
    this._popupQueue  = [];
    this._crumbleMap  = new Map();
    this._boarded     = false;
    this._mountainStrip = null;
  }

  // ─── Background ────────────────────────────────────────────────────────────

  _buildBackground() {
    const zone = ZONES[0];
    this._skyGfx = this.add.graphics().setScrollFactor(0).setDepth(-30);
    this._drawSky(zone.top, zone.bot);

    // ── Parallax mountain strip (Act 2) ────────────────────────────────────
    // TileSprite fixed to camera; tilePositionX updated each frame for parallax
    this._mountainStrip = this.add.tileSprite(GAME_W / 2, GAME_H - 68, GAME_W, 160, 'mountains_bg')
      .setScrollFactor(0)
      .setDepth(-18)
      .setAlpha(0);   // hidden until Act 2

    this._buildClouds();
  }

  _drawSky(topCol, botCol) {
    this._skyGfx.clear();
    this._skyGfx.fillGradientStyle(topCol, topCol, botCol, botCol, 1);
    this._skyGfx.fillRect(0, 0, GAME_W, GAME_H);
  }

  _buildClouds() {
    const positions = [
      [200, 88], [700, 58], [1300, 98], [1900, 68],
      [2600, 88], [3200, 62], [3900, 82], [4600, 68], [5200, 88],
    ];
    this._clouds = positions.map(([wx, wy]) => {
      const scale = 0.5 + Math.random() * 0.6;
      const c = this.add.image(wx, wy, 'cloud')
        .setScale(scale).setScrollFactor(0.15, 0.04).setAlpha(0.68).setDepth(-20);
      this.tweens.add({ targets: c, x: wx + 20, duration: 5000 + Math.random() * 4000,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return c;
    });
  }

  _updateBackground() {
    // Scroll mountain strip at 30% camera speed = parallax
    if (this._mountainStrip) {
      this._mountainStrip.tilePositionX = this.cameras.main.scrollX * 0.30;
    }
  }

  // ─── Level construction ────────────────────────────────────────────────────

  _buildLevel() {
    this._staticPlatforms = [];
    this._movingPlatforms = [];

    PLATFORM_DATA.forEach(([x, y, w, h, tex]) => this._addStaticPlatform(x, y, w, h, tex));
    MOVING_DATA.forEach(([x, y, w, axis, range, dur]) => this._addMovingPlatform(x, y, w, axis, range, dur));

    // Crumble platform (replaces static at same position)
    CRUMBLE_DATA.forEach(([x, y, w]) => this._addCrumblePlatform(x, y, w));

    // Crystal staircase — special visual treatment
    this._buildStaircase();

    this._drawDecorations();
    this._buildAct2Crystals();
  }

  _addStaticPlatform(x, y, w, h, tex) {
    const cx = x + w / 2, cy = y + h / 2;
    const tile = this.add.tileSprite(cx, cy, w, h, tex).setDepth(2);
    this.physics.add.existing(tile, true);
    this._staticPlatforms.push(tile);
    return tile;
  }

  _addMovingPlatform(x, y, w, axis, range, dur, tex) {
    tex = tex || 'platform_stone';
    const cx = x + w / 2, cy = y + 8;
    const tile = this.add.tileSprite(cx, cy, w, 16, tex).setDepth(2);
    this.physics.add.existing(tile, true);

    const startVal = axis === 'x' ? cx : cy;
    const endVal   = startVal + range;

    this.tweens.add({
      targets: tile, [axis]: endVal, duration: dur,
      ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
      onUpdate: () => tile.body.reset(tile.x, tile.y),
    });

    this._movingPlatforms.push(tile);
    return tile;
  }

  _addCrumblePlatform(x, y, w) {
    const platform = this._addStaticPlatform(x, y, w, 16, 'platform_stone');
    platform.setTint(0xFFCCCC);
    this._crumbleMap.set(platform, {
      state: 'solid', timer: 0,
      originX: x + w / 2, originY: y + 8,
    });
    return platform;
  }

  _buildStaircase() {
    // Crystal platforms with glow particles — the centrepiece of Act 2
    STAIRCASE_DATA.forEach(([x, y, w, range, dur], idx) => {
      const tile = this._addMovingPlatform(x, y, w, 'y', range, dur, 'platform_crystal');

      // Static crystal tint — rich violet that reads clearly against the sunset sky.
      // NOTE: We intentionally avoid tweening `tint` in Phaser 3 because it
      // interpolates the raw integer value, which causes ugly RGB cross-contamination
      // (e.g. purple→lavender passes through greenish-grey artefacts mid-transition).
      // The particle emitters below handle all the "alive / sparkling" visual feedback.
      tile.setTint(0xCC99FF);

      // Ambient crystal particle emitter — gentle upward sparks
      const px = x + w / 2;
      const py = y + 8;
      this.add.particles(px, py, 'heart_particle', {
        tint: [0xCC88FF, 0xEECCFF, 0xFFAAFF],
        scale:    { start: 0.5, end: 0 },
        alpha:    { start: 0.7, end: 0 },
        speedY:   { min: -35, max: -75 },
        speedX:   { min: -18, max: 18 },
        lifespan: { min: 800, max: 1400 },
        frequency: 400,
        quantity:  1,
      }).setDepth(3);
    });
  }

  _drawDecorations() {
    // Act 1: flowers + bushes
    const deco = this.add.graphics().setDepth(1);
    const fc = [0xFF6B9D, 0xFFD700, 0xFF99BB, 0xFFCC44];
    for (let fx = 80; fx < 2800; fx += 60 + Math.floor(Math.random() * 80)) {
      const col = fc[Math.floor(Math.random() * fc.length)];
      deco.fillStyle(0x559944); deco.fillRect(fx, 778, 2, 12);
      deco.fillStyle(col);      deco.fillCircle(fx + 1, 774, 5);
      deco.fillStyle(0xFFFFCC); deco.fillCircle(fx + 1, 774, 2);
    }
    for (let bx = 120; bx < 2800; bx += 140 + Math.floor(Math.random() * 100)) {
      deco.fillStyle(0x336622); deco.fillEllipse(bx, 784, 28, 14);
      deco.fillStyle(0x44AA44); deco.fillEllipse(bx - 6, 780, 18, 12);
      deco.fillStyle(0x55BB55); deco.fillEllipse(bx + 6, 781, 16, 10);
    }

    // Act 2 ground: scattered glowing rocks between gaps
    const rocks = this.add.graphics().setDepth(1);
    [[3330,785],[3380,782],[3870,783],[4140,786],[4260,784],[5360,785],[5450,783]].forEach(([rx, ry]) => {
      rocks.fillStyle(0x6644AA); rocks.fillEllipse(rx, ry, 18, 10);
      rocks.fillStyle(0x9966DD); rocks.fillEllipse(rx - 2, ry - 2, 10, 6);
    });
  }

  _buildAct2Crystals() {
    // Decorative crystal formations hanging from upper world space in Act 2
    // These are purely visual, no physics
    const crystalGfx = this.add.graphics().setDepth(-10);
    const positions = [3080, 3560, 4090, 4520]; // x positions
    positions.forEach(x => {
      const h = 40 + Math.random() * 60;
      crystalGfx.fillStyle(0x6633AA, 0.35);
      crystalGfx.fillTriangle(x - 8, 0, x + 8, 0, x, h);
      crystalGfx.fillStyle(0xAA66FF, 0.20);
      crystalGfx.fillTriangle(x - 5, 0, x + 5, 0, x, h * 0.7);
      crystalGfx.fillStyle(0xCCAEFF, 0.45);
      crystalGfx.fillRect(x - 2, 0, 4, 6);
    });
  }

  // ─── Player ────────────────────────────────────────────────────────────────

  _buildPlayer() {
    this.player = new Player(this, 80, 770);
    this.physics.add.collider(this.player.sprite, this._staticPlatforms);
    this._movingPlatforms.forEach(mp => this.physics.add.collider(this.player.sprite, mp));
  }

  // ─── Collectibles ──────────────────────────────────────────────────────────

  _buildCollectibles() {
    this._collectibles = [];

    COLLECTIBLE_DATA.forEach(([x, y, type, msgType, msgIdx, photo], i) => {
      const texKey = type === 'star' ? 'item_star' : 'item_letter';

      const item = this.physics.add.image(x, y, texKey)
        .setScale(1.5).setDepth(5).setImmovable(true);
      item.body.setAllowGravity(false);

      this.tweens.add({ targets: item, y: y - 8, duration: 1200 + i * 90,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

      const glowTint = type === 'star' ? 0xFFDD00 : 0xFF99CC;
      const glow = this.add.image(x, y, 'glow_ring')
        .setScale(1.4).setAlpha(0.5).setDepth(4).setTint(glowTint);
      this.tweens.add({ targets: glow, scaleX: glow.scaleX * 1.35, scaleY: glow.scaleY * 1.35,
        alpha: 0, duration: 1400, repeat: -1, ease: 'Quad.easeOut' });

      this.physics.add.overlap(this.player.sprite, item, () => {
        this._onCollect(item, glow, type, msgType, msgIdx, photo);
      });

      this._collectibles.push({ item, glow, type });
    });
  }

  _onCollect(item, glow, type, msgType, msgIdx, photo) {
    if (!item.active) return;

    item.setActive(false).setVisible(false);
    item.body.enable = false;
    glow.destroy();
    this._collected++;
    this._updateHUD();
    this._burstParticles(item.x, item.y, type);

    if (typeof AUDIO !== 'undefined') {
      type === 'star' ? AUDIO.collectStar() : AUDIO.collect();
    }

    if (photo && typeof PHOTO_REVEAL !== 'undefined') {
      this._popupActive = true;
      this.physics.pause();
      PHOTO_REVEAL.show(photo, () => {
        this.physics.resume();
        this._popupActive = false;
        // reset() clears MobileControls state AND frees Phaser pointer slots
        // that got stuck while the DOM overlay was covering the canvas.
        if (this._controls) this._controls.reset();
        // Re-focus the canvas so Samsung browser routes touch events back to it.
        // The DOM overlay steals browser focus; without this, subsequent touches
        // can be silently swallowed by the browser before reaching the canvas.
        try { this.game.canvas.focus(); } catch (e) {}
      });
    }
  }

  _burstParticles(x, y, type) {
    const tex   = type === 'star' ? 'star_particle' : 'heart_particle';
    const tints = type === 'star'
      ? [0xFFD700, 0xFFEE88, 0xFFFF44]
      : [0xFF6B9D, 0xFFAACC, 0xFF99BB];

    const e = this.add.particles(x, y, tex, {
      speed: { min: 60, max: 180 }, angle: { min: 0, max: 360 },
      scale: { start: 2.0, end: 0 }, alpha: { start: 1, end: 0 },
      lifespan: { min: 500, max: 900 }, quantity: 12, tint: tints, emitting: false,
    });
    e.explode(12);
    this.time.delayedCall(1000, () => e.destroy());
  }

  // ─── Boarding Ship ─────────────────────────────────────────────────────────

  _buildBoardingShip() {
    const sx = 5430, sy = 685;

    this._boardingShip = this.add.image(sx, sy, 'boarding_ship')
      .setDepth(6).setOrigin(0.5, 1).setScale(1.1);

    // Landing glow halo
    this._landingGlow = this.add.graphics().setDepth(5);
    this._drawLandingGlow(sx, sy);
    this.tweens.add({ targets: this._landingGlow, alpha: 0.25,
      duration: 900, yoyo: true, repeat: -1 });

    // Ship hover
    this.tweens.add({ targets: this._boardingShip, y: sy - 10,
      duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Engine fire pulse
    const engineGfx = this.add.graphics().setDepth(5);
    this._drawEngineFlame(sx, sy, engineGfx);
    this.tweens.add({ targets: engineGfx, alpha: 0.3,
      duration: 220, yoyo: true, repeat: -1 });

    // Ground trigger zone — player walks toward ship
    this._boardingZone = this.add.zone(sx, 785, 120, 70);
    this.physics.add.existing(this._boardingZone, true);
    this.physics.add.overlap(this.player.sprite, this._boardingZone, () => this._boardShip());

    // Blinking prompt
    this._boardPrompt = this.add.text(sx, sy - 130, '▲  Board Ship', {
      fontFamily: '"Press Start 2P"', fontSize: '7px',
      color: '#88CCFF', stroke: '#001133', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10).setAlpha(0);
    this.tweens.add({ targets: this._boardPrompt, alpha: 0.85,
      duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  _drawLandingGlow(x, y) {
    this._landingGlow.clear();
    this._landingGlow.fillStyle(0x4488FF, 0.55);
    this._landingGlow.fillEllipse(x, y + 6, 100, 22);
    this._landingGlow.fillStyle(0x88CCFF, 0.25);
    this._landingGlow.fillEllipse(x, y + 6, 140, 30);
  }

  _drawEngineFlame(x, y, gfx) {
    gfx.fillStyle(0xFF6633, 0.8);
    gfx.fillEllipse(x - 14, y + 4, 10, 14);
    gfx.fillEllipse(x + 14, y + 4, 10, 14);
    gfx.fillStyle(0xFFCC44, 0.9);
    gfx.fillEllipse(x - 14, y + 2, 5, 8);
    gfx.fillEllipse(x + 14, y + 2, 5, 8);
  }

  _updateBoardingShip() {
    if (this._boarded) return;
    const near = this.player.x > 5080;
    this._boardPrompt.setVisible(near);
  }

  _boardShip() {
    if (this._boarded) return;
    this._boarded = true;

    if (typeof AUDIO !== 'undefined') {
      AUDIO.fadeOutMusic(1200);
      AUDIO.board();
    }

    // Ship flies up dramatically
    this.tweens.add({
      targets: this._boardingShip,
      y: this._boardingShip.y - 400,
      alpha: 0, duration: 2000, ease: 'Cubic.easeIn',
    });

    // Player fades into ship
    this.tweens.add({ targets: this.player.sprite, alpha: 0, duration: 600 });

    this.time.delayedCall(900, () => {
      this.cameras.main.fade(900, 0, 0, 20, false, (cam, p) => {
        if (p >= 1) this.scene.start('Space');
      });
    });
  }

  // ─── Popup ─────────────────────────────────────────────────────────────────

  _showNextPopup() {
    if (this._popupQueue.length === 0) return;

    const { icon, title, text } = this._popupQueue.shift();
    this._popupActive = true;
    this.physics.pause();

    const cx = GAME_W / 2, cy = GAME_H / 2;
    this._popupEls = [];
    const reg = el => { this._popupEls.push(el); return el; };

    // Overlay
    reg(this.add.rectangle(cx, cy, GAME_W, GAME_H, 0x000000, 0.74)
      .setScrollFactor(0).setDepth(200));

    // Card
    const cw = 370, ch = 340;
    const cg = reg(this.add.graphics().setScrollFactor(0).setDepth(201));
    cg.fillStyle(0x140328, 1);
    cg.fillRoundedRect(cx - cw/2, cy - ch/2, cw, ch, 18);
    cg.lineStyle(3, 0xFF6B9D, 1);
    cg.strokeRoundedRect(cx - cw/2, cy - ch/2, cw, ch, 18);
    cg.fillStyle(0xFF6B9D, 0.12);
    cg.fillRoundedRect(cx - cw/2 + 3, cy - ch/2 + 3, cw - 6, 58, { tl: 16, tr: 16, bl: 0, br: 0 });

    reg(this.add.text(cx, cy - ch/2 + 34, icon, { fontSize: '40px' })
      .setScrollFactor(0).setDepth(202).setOrigin(0.5));

    reg(this.add.text(cx, cy - ch/2 + 84, title, {
      fontFamily: '"Press Start 2P"', fontSize: '11px', color: '#FF99CC',
      align: 'center', wordWrap: { width: cw - 44 },
    }).setScrollFactor(0).setDepth(202).setOrigin(0.5));

    const dg = reg(this.add.graphics().setScrollFactor(0).setDepth(202));
    dg.lineStyle(1, 0xFF6B9D, 0.4);
    dg.lineBetween(cx - cw/2 + 24, cy - 48, cx + cw/2 - 24, cy - 48);

    reg(this.add.text(cx, cy - 34, text, {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#EEE8FF',
      align: 'center', lineSpacing: 10, wordWrap: { width: cw - 48 },
    }).setScrollFactor(0).setDepth(202).setOrigin(0.5, 0));

    // Button
    const btnY = cy + ch/2 - 40;
    const bg2 = reg(this.add.graphics().setScrollFactor(0).setDepth(202));
    bg2.fillStyle(0xFF6B9D, 1);
    bg2.fillRoundedRect(cx - 110, btnY - 22, 220, 44, 12);
    bg2.fillStyle(0xFF99BB, 0.55);
    bg2.fillRoundedRect(cx - 106, btnY - 18, 140, 14, 6);
    bg2.lineStyle(2, 0xFFCCDD, 1);
    bg2.strokeRoundedRect(cx - 110, btnY - 22, 220, 44, 12);

    reg(this.add.text(cx, btnY, 'Keep Going  ♥', {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#ffffff',
    }).setScrollFactor(0).setDepth(203).setOrigin(0.5));

    // Fade in card elements
    this._popupEls.slice(1).forEach(el => {
      el.setAlpha(0);
      this.tweens.add({ targets: el, alpha: 1, duration: 240, delay: 55 });
    });

    this.time.delayedCall(420, () => {
      if (!this._popupActive) return;
      let done = false;
      const close = () => {
        if (done) return; done = true;
        this.input.off('pointerdown', close);
        this._closePopup();
      };
      this.input.once('pointerdown', close);
      this.input.keyboard.once('keydown-SPACE', close);
      this.input.keyboard.once('keydown-ENTER', close);
    });
  }

  _closePopup() {
    if (!this._popupActive) return;
    this.tweens.add({
      targets: this._popupEls, alpha: 0, duration: 180,
      onComplete: () => {
        this._popupEls.forEach(el => el.destroy());
        this._popupEls = [];
        this._popupActive = false;
        this.physics.resume();
        // Reset ALL mobile control state after any popup dismisses
        if (this._controls) this._controls.reset();
        if (this._popupQueue.length > 0) this.time.delayedCall(180, () => this._showNextPopup());
      },
    });
    this.input.off('pointerdown', this._closePopup, this);
  }

  // ─── Camera ────────────────────────────────────────────────────────────────

  _buildCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, 5620, GAME_H);
    cam.startFollow(this.player.sprite, true, 0.08, 0.12);
    cam.setDeadzone(90, 200);
    cam.setFollowOffset(-60, 0);
  }

  // ─── Controls ──────────────────────────────────────────────────────────────

  _buildMobileControls() {
    this._controls = new MobileControls(this);
  }

  _buildKeyboard() {
    this._rawCursors = this.input.keyboard.createCursorKeys();
    this._wasd = this.input.keyboard.addKeys({ up: 'W', left: 'A', right: 'D' });
    this._cursors = {
      left:  { isDown: false }, right: { isDown: false },
      up:    { isDown: false }, space: this._rawCursors.space,
    };
  }

  _syncKeyboard() {
    const r = this._rawCursors, w = this._wasd;
    this._cursors.left.isDown  = r.left.isDown  || w.left.isDown;
    this._cursors.right.isDown = r.right.isDown || w.right.isDown;
    this._cursors.up.isDown    = r.up.isDown    || w.up.isDown;
  }

  // ─── HUD ───────────────────────────────────────────────────────────────────

  _buildHUD() {
    this._hudText = this.add.text(14, 14, this._hudString(), {
      fontFamily: '"Press Start 2P"', fontSize: '9px',
      color: '#FFCCEE', stroke: '#220011', strokeThickness: 3,
    }).setScrollFactor(0).setDepth(180);

    this._zoneText = this.add.text(GAME_W - 14, 14, ZONES[0].name, {
      fontFamily: '"Press Start 2P"', fontSize: '8px',
      color: '#DDBBFF', stroke: '#220011', strokeThickness: 3,
    }).setScrollFactor(0).setDepth(180).setOrigin(1, 0);
  }

  _hudString()  { return `♥ ${this._collected} / ${this._total}`; }
  _updateHUD()  { this._hudText.setText(this._hudString()); }

  // ─── Death zone ────────────────────────────────────────────────────────────

  _buildDeathZone() {
    const dz = this.add.zone(2810, 930, 5620, 40);
    this.physics.add.existing(dz, true);
    this.physics.add.overlap(this.player.sprite, dz, () => this._respawn());
  }

  _respawn() {
    this.cameras.main.flash(280, 200, 0, 0, true);
    this.player.setPosition(this._lastSafe.x, this._lastSafe.y);
    this.player.body.setVelocity(0, 0);
  }

  // ─── Zone detection ────────────────────────────────────────────────────────

  _checkZoneChange() {
    const newZone = this.player.x >= ZONES[1].x ? 1 : 0;
    if (newZone !== this._currentZone) {
      this._currentZone = newZone;
      this._transitionToZone(newZone);
    }
  }

  _transitionToZone(idx) {
    const zone = ZONES[idx];
    this.cameras.main.fade(350, 0, 0, 0, false, (cam, p) => {
      if (p < 1) return;
      this._drawSky(zone.top, zone.bot);
      this._clouds.forEach(c => c.clearTint().setAlpha(0.7));
      this.cameras.main.fadeIn(350, 0, 0, 0);
    });
    this._zoneText.setText(zone.name);

    // Reveal mountain backdrop when entering Act 2
    if (idx === 1) {
      this.tweens.add({ targets: this._mountainStrip, alpha: 0.85,
        duration: 1800, ease: 'Sine.easeIn' });
    } else {
      this._mountainStrip.setAlpha(0);
    }
  }

  // ─── Crumble platforms ─────────────────────────────────────────────────────

  _updateCrumbles(delta) {
    this._crumbleMap.forEach((state, platform) => {
      if (state.state === 'fallen') return;

      const pb = this.player.body;
      const touching = pb.blocked.down
        && pb.bottom >= platform.body.top - 2
        && pb.bottom <= platform.body.top + 6
        && pb.right  >= platform.body.left
        && pb.left   <= platform.body.right;

      if (touching && state.state === 'solid') {
        state.state = 'shaking';
        state.timer = 1400;
        this.tweens.add({ targets: platform, x: state.originX + 3,
          duration: 70, yoyo: true, repeat: 12 });
        this.tweens.add({ targets: platform, alpha: 0.55, duration: 1300 });
      }

      if (state.state === 'shaking') {
        state.timer -= delta;
        if (state.timer <= 0) {
          state.state = 'fallen';
          platform.setVisible(false);
          platform.body.enable = false;
          this._burstParticles(platform.x, platform.y, 'letter');
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

  // ─── Safe position ─────────────────────────────────────────────────────────

  _updateLastSafe() {
    if (this.player.body.blocked.down) {
      this._lastSafe = { x: this.player.x, y: this.player.y };
    }
  }
}
