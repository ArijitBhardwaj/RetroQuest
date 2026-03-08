'use strict';

/**
 * PreloadScene
 * Generates every game texture programmatically — no external image files needed.
 * All pixel art is drawn with Phaser's Graphics API, then baked into named textures.
 *
 * Textures created:
 *   player_sheet   — 256×32 sprite sheet (8 frames × 32px)
 *   platform_grass — 32×16 grassy platform tile
 *   platform_stone — 32×16 stone platform tile
 *   platform_gold  — 32×20 golden platform tile (final platform)
 *   ground_tile    — 32×64 ground tile
 *   item_letter    — 24×18 envelope collectible
 *   item_star      — 24×24 star collectible
 *   item_crystal   — 28×26 crystal heart collectible (final)
 *   heart_particle — 8×7  tiny heart for particle effects
 *   star_particle  — 8×8  tiny star for particle effects
 *   cloud          — 96×40 fluffy cloud
 *   btn_left       — 72×72 left button
 *   btn_right      — 72×72 right button
 *   btn_jump       — 88×88 jump button
 *   glow_ring      — 40×40 pulsing glow ring for collectibles
 */
class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#1A0533');
    this._showLoadingUI();

    // Generate all textures synchronously
    this._genPlayerSheet();
    this._genPlatformTiles();
    this._genGroundTile();
    this._genCollectibles();
    this._genParticles();
    this._genCloud();
    this._genButtons();
    this._genGlowRing();

    // New textures for Act 2 boarding ship + SpaceScene
    this._genBoardingShip();
    this._genPlayerShip();
    this._genEnemyShip();
    this._genBullet();
    this._genAsteroid();
    this._genSpacePowerup();
    this._genMountainsBg();
    this._genPlatformCrystal();

    // Short delay so the loading bar animation plays fully
    this.time.delayedCall(900, () => {
      this.scene.start('Menu');
    });
  }

  // ─── Loading UI ────────────────────────────────────────────────────────────

  _showLoadingUI() {
    const cx = GAME_W / 2;
    const cy = GAME_H / 2;

    // Pulsing heart icon
    const heart = this.add.text(cx, cy - 80, '♥', {
      fontFamily: '"Press Start 2P"',
      fontSize: '40px',
      color: '#FF6B9D',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: heart,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Loading label
    this.add.text(cx, cy - 20, 'Loading...', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Progress bar background
    const barBg = this.add.graphics();
    barBg.fillStyle(0xffffff, 0.12);
    barBg.fillRoundedRect(cx - 130, cy + 10, 260, 18, 9);

    // Animated fill bar
    const fill = this.add.graphics();
    let t = 0;
    this.time.addEvent({
      delay: 18,
      repeat: 48,
      callback: () => {
        t += 1 / 48;
        fill.clear();
        fill.fillStyle(0xFF6B9D, 1);
        fill.fillRoundedRect(cx - 128, cy + 12, 256 * Math.min(t, 1), 14, 7);
      },
    });

    // Tagline
    this.add.text(cx, cy + 44, 'preparing your adventure...', {
      fontFamily: '"Press Start 2P"',
      fontSize: '7px',
      color: '#AA88CC',
    }).setOrigin(0.5);
  }

  // ─── Helper: make.graphics → generateTexture → destroy ────────────────────

  _gfx() {
    return this.make.graphics({ add: false });
  }

  // ─── Player Sprite Sheet ───────────────────────────────────────────────────
  // 8 frames × 32px wide × 32px tall = 256×32 total texture
  //
  // Frame index:  0=idle  1=walk1  2=walk2  3=walk3  4=walk4  5=jump  6=fall  7=land
  //
  // Palette:
  //   SKIN  #FFCBA4  HAIR  #4A2E0C  SHIRT #4A90D9  HEART #FF6B9D
  //   PANTS #2C3E7A  SHOE  #1A100A  EYE   #1A0A00  MOUTH #CC5533
  //   BELT  #1A2040

  _genPlayerSheet() {
    const FW = 32, FH = 32, FRAMES = 8;

    const SKIN  = 0xFFCBA4;
    const HAIR  = 0x4A2E0C;
    const SHIRT = 0x4A90D9;
    const HEART = 0xFF6B9D;
    const PANTS = 0x2C3E7A;
    const SHOE  = 0x1A100A;
    const EYE   = 0x1A0A00;
    const MOUTH = 0xCC5533;
    const BELT  = 0x1A2040;

    // Per-frame: [leftLegX, leftLegY, rightLegX, rightLegY, leftArmDY, rightArmDY]
    //   Leg size: 6×7px.  Shoe: 8×3px at (legX-1, legY+7).
    //   Arm columns: left=3-7, right=24-28, 5px wide 9px tall + 2px hand.
    const frames = [
      // 0 idle
      [8, 19, 18, 19,   0,  0],
      // 1 walk1 — left leg forward/up, right back/down
      [6, 18, 20, 20,   2, -2],
      // 2 walk2 neutral
      [8, 19, 18, 19,   0,  0],
      // 3 walk3 — right leg forward/up, left back/down
      [10, 20, 16, 18, -2,  2],
      // 4 walk4 neutral
      [8, 19, 18, 19,   0,  0],
      // 5 jump — legs tucked up
      [7, 17, 19, 17,  -3,  3],
      // 6 fall — legs hanging
      [8, 20, 18, 20,   2, -2],
      // 7 land — wide squat
      [6, 20, 20, 20,   0,  0],
    ];

    const g = this._gfx();

    frames.forEach(([lx, ly, rx, ry, laDY, raDY], f) => {
      const ox = f * FW; // x-offset in sheet

      // ── Hair ──
      g.fillStyle(HAIR);
      g.fillRect(ox + 10, 0,  13, 3);  // top band
      g.fillRect(ox + 8,  2,  3,  4);  // left flop
      g.fillRect(ox + 22, 2,  3,  4);  // right flop

      // ── Head ──
      g.fillStyle(SKIN);
      g.fillRect(ox + 9, 3, 14, 10);

      // ── Eyes ──
      g.fillStyle(EYE);
      g.fillRect(ox + 11, 7, 2, 3);
      g.fillRect(ox + 19, 7, 2, 3);

      // ── Rosy cheeks ──
      g.fillStyle(0xFFAABB);
      g.fillRect(ox + 10, 10, 2, 1);
      g.fillRect(ox + 20, 10, 2, 1);

      // ── Mouth (smile) ──
      g.fillStyle(MOUTH);
      g.fillRect(ox + 14, 11, 5,  1);  // bottom lip
      g.fillRect(ox + 13, 10, 1,  1);  // left dimple
      g.fillRect(ox + 19, 10, 1,  1);  // right dimple

      // ── Neck ──
      g.fillStyle(SKIN);
      g.fillRect(ox + 14, 13, 4, 3);

      // ── Shirt / Body ──
      g.fillStyle(SHIRT);
      g.fillRect(ox + 7, 14, 18, 11);

      // ── Heart on shirt ──
      g.fillStyle(HEART);
      g.fillRect(ox + 12, 16, 3, 2);   // left bump
      g.fillRect(ox + 17, 16, 3, 2);   // right bump
      g.fillRect(ox + 11, 17, 10, 3);  // middle band
      g.fillRect(ox + 12, 20, 8,  2);  // lower
      g.fillRect(ox + 13, 22, 6,  1);  // taper
      g.fillRect(ox + 14, 23, 4,  1);  // tip

      // ── Left arm ──
      g.fillStyle(SHIRT);
      g.fillRect(ox + 3, 15 + laDY, 5, 9);
      g.fillStyle(SKIN);
      g.fillRect(ox + 3, 22 + laDY, 5, 2); // hand

      // ── Right arm ──
      g.fillStyle(SHIRT);
      g.fillRect(ox + 24, 15 + raDY, 5, 9);
      g.fillStyle(SKIN);
      g.fillRect(ox + 24, 22 + raDY, 5, 2); // hand

      // ── Belt ──
      g.fillStyle(BELT);
      g.fillRect(ox + 7, 25, 18, 2);

      // ── Left leg ──
      g.fillStyle(PANTS);
      g.fillRect(ox + lx, ly, 6, 7);

      // ── Right leg ──
      g.fillStyle(PANTS);
      g.fillRect(ox + rx, ry, 6, 7);

      // ── Left shoe ──
      g.fillStyle(SHOE);
      g.fillRect(ox + lx - 1, ly + 7, 8, 3);

      // ── Right shoe ──
      g.fillStyle(SHOE);
      g.fillRect(ox + rx - 1, ry + 7, 8, 3);
    });

    g.generateTexture('player_sheet', FW * FRAMES, FH);
    g.destroy();

    // ── Register individual frames so Phaser's animation system can reference them ──
    // generateTexture() creates a plain image — we must add frame metadata manually.
    const tex = this.textures.get('player_sheet');
    for (let i = 0; i < FRAMES; i++) {
      tex.add(i, 0, i * FW, 0, FW, FH);
    }
  }

  // ─── Platform Tiles ────────────────────────────────────────────────────────

  _genPlatformTiles() {
    // Grass platform (Act 1)
    this._drawPlatformTile('platform_grass',
      0x7CB87A, 0xA8E08C, 0x9ED68C,  // top, highlight, mid-top
      0x7B5A45, 0x6A4A38,            // body, shadow body
    );
    // Stone platform (Act 2+3)
    this._drawPlatformTile('platform_stone',
      0x9BA5B8, 0xC4D0E0, 0xB0BCCC,
      0x6E7A8A, 0x5C6878,
    );
    // Gold platform (final)
    this._drawPlatformTileGold();
  }

  _drawPlatformTile(key, topCol, hlCol, midCol, bodyCol, shadowCol) {
    const W = 32, H = 16;
    const g = this._gfx();

    // Grass/stone top cap
    g.fillStyle(topCol);
    g.fillRect(0, 0, W, 5);

    // Highlight strip
    g.fillStyle(hlCol);
    g.fillRect(0, 0, W, 2);

    // Mid strip
    g.fillStyle(midCol);
    g.fillRect(0, 2, W, 2);

    // Body
    g.fillStyle(bodyCol);
    g.fillRect(0, 5, W, 9);

    // Shadow body (bottom 2px of body)
    g.fillStyle(shadowCol);
    g.fillRect(0, 13, W, 3);

    // Body dirt/stone detail pixels (give texture)
    g.fillStyle(shadowCol);
    g.fillRect(5,  7, 4, 2);
    g.fillRect(14, 9, 5, 2);
    g.fillRect(24, 7, 3, 2);

    g.generateTexture(key, W, H);
    g.destroy();
  }

  _drawPlatformTileGold() {
    const W = 32, H = 20;
    const g = this._gfx();

    // Top glowing gold
    g.fillStyle(0xFFE566);
    g.fillRect(0, 0, W, 5);

    // Bright highlight
    g.fillStyle(0xFFF5AA);
    g.fillRect(0, 0, W, 2);

    // Gold mid
    g.fillStyle(0xFFD700);
    g.fillRect(0, 5, W, 7);

    // Shadow gold
    g.fillStyle(0xCC9900);
    g.fillRect(0, 12, W, 8);

    // Sparkle dots on top
    g.fillStyle(0xFFFFFF);
    g.fillRect(4,  1, 2, 2);
    g.fillRect(16, 0, 2, 2);
    g.fillRect(26, 1, 2, 2);

    g.generateTexture('platform_gold', W, H);
    g.destroy();
  }

  // ─── Ground Tile ───────────────────────────────────────────────────────────

  _genGroundTile() {
    const W = 32, H = 64;
    const g = this._gfx();

    // Grass top
    g.fillStyle(0x6B8C5A);
    g.fillRect(0, 0, W, 6);

    g.fillStyle(0x88AA70);
    g.fillRect(0, 0, W, 2);

    // Earth body
    g.fillStyle(0x6B4C3B);
    g.fillRect(0, 6, W, H - 6);

    // Earth texture stripes
    g.fillStyle(0x5A3D2E);
    g.fillRect(0,  14, W, 2);
    g.fillRect(0,  28, W, 2);
    g.fillRect(0,  42, W, 2);
    g.fillRect(0,  56, W, 2);

    // Random dirt pebbles
    g.fillStyle(0x7A5545);
    g.fillRect(6,  10, 3, 2);
    g.fillRect(18,  8, 4, 2);
    g.fillRect(26, 16, 3, 2);
    g.fillRect(10, 24, 5, 2);
    g.fillRect(22, 32, 3, 2);

    g.generateTexture('ground_tile', W, H);
    g.destroy();
  }

  // ─── Collectibles ──────────────────────────────────────────────────────────

  _genCollectibles() {
    this._genLetter();
    this._genStar();
    this._genCrystalHeart();
  }

  _genLetter() {
    // 24×18 — pink-trimmed cream envelope with sealed wax
    const W = 24, H = 18;
    const g = this._gfx();

    // Envelope body (cream)
    g.fillStyle(0xFFF8E7);
    g.fillRect(0, 0, W, H);

    // Pink flap (closed V at top)
    g.fillStyle(0xFFCCEE);
    g.fillTriangle(0, 0, W, 0, W / 2, H / 2);

    // Envelope fold lines (bottom V)
    g.fillStyle(0xFFDDCC);
    g.fillTriangle(0, H, W, H, W / 2, H / 2);

    // Left and right triangles
    g.fillStyle(0xFFEEDD);
    g.fillTriangle(0, 0, 0, H, W / 2, H / 2);
    g.fillStyle(0xFFEEDD);
    g.fillTriangle(W, 0, W, H, W / 2, H / 2);

    // Pink wax seal (center)
    g.fillStyle(0xFF6B9D);
    g.fillCircle(W / 2, H / 2 + 2, 4);
    g.fillStyle(0xFF99BB);
    g.fillCircle(W / 2 - 1, H / 2, 2);

    // Border
    g.lineStyle(1, 0xFFAABB);
    g.strokeRect(0, 0, W, H);

    g.generateTexture('item_letter', W, H);
    g.destroy();
  }

  _genStar() {
    // 24×24 — golden 5-pointed star
    const W = 24, H = 24;
    const g = this._gfx();

    const cx = W / 2, cy = H / 2;
    const outerR = 11, innerR = 5;

    // Build star polygon points
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r     = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
    }

    // Outer star (gold)
    g.fillStyle(0xFFD700);
    g.fillPoints(pts, true);

    // Inner star (bright highlight)
    const innerPts = [];
    for (let i = 0; i < 10; i++) {
      const r     = i % 2 === 0 ? 5 : 2;
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      innerPts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
    }
    g.fillStyle(0xFFEE88);
    g.fillPoints(innerPts, true);

    // Top-left glint
    g.fillStyle(0xFFFFCC);
    g.fillRect(cx - 3, cy - 7, 2, 2);

    g.generateTexture('item_star', W, H);
    g.destroy();
  }

  _genCrystalHeart() {
    // 28×26 — glowing cyan crystal heart (final collectible)
    const W = 28, H = 26;
    const g = this._gfx();

    // Outer glow (pale cyan — solid fill, alpha param ignored in generateTexture)
    g.fillStyle(0xAAEEFF);
    g.fillCircle(9,  9,  9);
    g.fillCircle(19, 9,  9);
    g.fillTriangle(1, 10, 27, 10, 14, 25);

    // Main heart (cyan-white)
    g.fillStyle(0x88FFFF);
    g.fillCircle(9,  9, 7);
    g.fillCircle(19, 9, 7);
    g.fillTriangle(2, 10, 26, 10, 14, 24);

    // Inner lighter heart
    g.fillStyle(0xCCFFFF);
    g.fillCircle(8,  8, 4);
    g.fillCircle(18, 8, 4);
    g.fillTriangle(6, 10, 22, 10, 14, 20);

    // Sparkle dots
    g.fillStyle(0xFFFFFF);
    g.fillRect(6,  5, 2, 2);
    g.fillRect(16, 5, 2, 2);
    g.fillRect(13, 2, 2, 2);
    g.fillRect(22, 3, 2, 2);
    g.fillRect(3,  3, 2, 2);

    g.generateTexture('item_crystal', W, H);
    g.destroy();
  }

  // ─── Particles ─────────────────────────────────────────────────────────────

  _genParticles() {
    // Heart particle (8×7)
    {
      const g = this._gfx();
      g.fillStyle(0xFF6B9D);
      g.fillRect(1, 0, 2, 2);
      g.fillRect(5, 0, 2, 2);
      g.fillRect(0, 1, 8, 3);
      g.fillRect(1, 4, 6, 2);
      g.fillRect(2, 6, 4, 1);
      g.fillRect(3, 7, 2, 1);
      g.generateTexture('heart_particle', 8, 8);
      g.destroy();
    }

    // Star particle (8×8)
    {
      const g = this._gfx();
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const r     = i % 2 === 0 ? 4 : 2;
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        pts.push({ x: 4 + Math.cos(angle) * r, y: 4 + Math.sin(angle) * r });
      }
      g.fillStyle(0xFFD700);
      g.fillPoints(pts, true);
      g.generateTexture('star_particle', 8, 8);
      g.destroy();
    }

    // Confetti square (6×4) — end screen. White base so any tint colour renders cleanly.
    {
      const g = this._gfx();
      g.fillStyle(0xFFFFFF);
      g.fillRect(0, 0, 6, 4);
      g.generateTexture('confetti', 6, 4);
      g.destroy();
    }
  }

  // ─── Cloud ─────────────────────────────────────────────────────────────────

  _genCloud() {
    const W = 96, H = 40;
    const g = this._gfx();

    g.fillStyle(0xFFFFFF);
    g.fillEllipse(48, 30, 90, 22);  // base
    g.fillEllipse(28, 24, 48, 26);  // left bump
    g.fillEllipse(62, 20, 44, 28);  // right bump
    g.fillEllipse(48, 16, 32, 22);  // top

    // Soft shadow underneath
    g.fillStyle(0xDDCCEE);
    g.fillEllipse(48, 35, 80, 12);

    g.generateTexture('cloud', W, H);
    g.destroy();
  }

  // ─── Mobile Control Buttons ────────────────────────────────────────────────

  _genButtons() {
    // Left arrow button (72×72)
    // Note: the image itself is fully opaque white; alpha is applied on the
    // Image game-object in MobileControls (setAlpha) so it appears translucent in-game.
    {
      const g = this._gfx();
      g.fillStyle(0x444466);           // dark circle background
      g.fillCircle(36, 36, 34);
      g.lineStyle(2, 0xCCCCFF);
      g.strokeCircle(36, 36, 34);
      g.fillStyle(0xFFFFFF);
      g.fillTriangle(18, 36, 42, 20, 42, 52); // left arrow
      g.generateTexture('btn_left', 72, 72);
      g.destroy();
    }

    // Right arrow button (72×72)
    {
      const g = this._gfx();
      g.fillStyle(0x444466);
      g.fillCircle(36, 36, 34);
      g.lineStyle(2, 0xCCCCFF);
      g.strokeCircle(36, 36, 34);
      g.fillStyle(0xFFFFFF);
      g.fillTriangle(54, 36, 30, 20, 30, 52); // right arrow
      g.generateTexture('btn_right', 72, 72);
      g.destroy();
    }

    // Jump button (88×88) — pink with heart
    {
      const g = this._gfx();
      g.fillStyle(0x882255);           // dark pink circle
      g.fillCircle(44, 44, 42);
      g.lineStyle(2, 0xFF6B9D);
      g.strokeCircle(44, 44, 42);
      // Heart icon on button
      g.fillStyle(0xFFCCDD);
      g.fillCircle(38, 38, 6);
      g.fillCircle(50, 38, 6);
      g.fillTriangle(30, 40, 58, 40, 44, 56);
      g.generateTexture('btn_jump', 88, 88);
      g.destroy();
    }
  }

  // ─── Glow Ring (for collectible pulse effect) ──────────────────────────────

  _genGlowRing() {
    const W = 48, H = 48;
    const g = this._gfx();

    g.lineStyle(3, 0xFFFFFF, 0.6);
    g.strokeCircle(24, 24, 20);
    g.lineStyle(1, 0xFFFFFF, 0.3);
    g.strokeCircle(24, 24, 22);

    g.generateTexture('glow_ring', W, H);
    g.destroy();
  }

  // ─── Boarding Ship (end of Act 2) ──────────────────────────────────────────
  // 80×110 — large pixel-art spaceship with landing glow
  _genBoardingShip() {
    const W = 80, H = 110;
    const g = this._gfx();

    // Engine glow (bottom)
    g.fillStyle(0x4466FF, 0.6);
    g.fillEllipse(40, 104, 44, 14);
    g.fillStyle(0x88AAFF);
    g.fillEllipse(40, 104, 22, 8);

    // Main hull — dark metallic grey
    g.fillStyle(0x445566);
    g.fillTriangle(40, 4, 12, 80, 68, 80);

    // Hull centre panel
    g.fillStyle(0x556677);
    g.fillTriangle(40, 12, 22, 74, 58, 74);

    // Cockpit window
    g.fillStyle(0x88CCFF);
    g.fillEllipse(40, 38, 20, 26);
    g.fillStyle(0xCCEEFF);
    g.fillEllipse(37, 34, 8, 10);

    // Cockpit border
    g.lineStyle(2, 0x2244AA);
    g.strokeEllipse(40, 38, 20, 26);

    // Left wing
    g.fillStyle(0x334455);
    g.fillTriangle(22, 62, 4, 82, 22, 82);
    g.fillStyle(0x223344);
    g.fillRect(4, 80, 18, 4);

    // Right wing
    g.fillStyle(0x334455);
    g.fillTriangle(58, 62, 76, 82, 58, 82);
    g.fillStyle(0x223344);
    g.fillRect(58, 80, 18, 4);

    // Engine nozzles
    g.fillStyle(0x223344);
    g.fillRect(28, 78, 10, 12);
    g.fillRect(42, 78, 10, 12);

    // Engine fire
    g.fillStyle(0xFF6633);
    g.fillEllipse(33, 92, 10, 8);
    g.fillEllipse(47, 92, 10, 8);
    g.fillStyle(0xFFCC44);
    g.fillEllipse(33, 91, 5, 5);
    g.fillEllipse(47, 91, 5, 5);

    // Wing accent lights
    g.fillStyle(0xFF4444);
    g.fillCircle(8, 81, 3);
    g.fillCircle(72, 81, 3);

    // Hull detail lines
    g.lineStyle(1, 0x667788);
    g.lineBetween(30, 45, 30, 72);
    g.lineBetween(50, 45, 50, 72);

    // Top antenna
    g.fillStyle(0x88AACC);
    g.fillRect(38, 0, 4, 8);
    g.fillStyle(0xFF4444);
    g.fillCircle(40, 1, 3);

    g.generateTexture('boarding_ship', W, H);
    g.destroy();
  }

  // ─── Player Ship (SpaceScene) ───────────────────────────────────────────────
  // 36×48 — sleek player fighter
  _genPlayerShip() {
    const W = 36, H = 48;
    const g = this._gfx();

    // Engine trail
    g.fillStyle(0x4488FF, 0.5);
    g.fillEllipse(18, 46, 14, 10);

    // Main hull
    g.fillStyle(0x4A90D9);
    g.fillTriangle(18, 0, 4, 38, 32, 38);

    // Centre stripe
    g.fillStyle(0x66AAEE);
    g.fillTriangle(18, 4, 12, 36, 24, 36);

    // Cockpit
    g.fillStyle(0xCCEEFF);
    g.fillEllipse(18, 18, 10, 14);
    g.fillStyle(0xFFFFFF);
    g.fillEllipse(16, 14, 4, 5);

    // Wings
    g.fillStyle(0x2C3E7A);
    g.fillTriangle(4, 28, 0, 40, 12, 36);
    g.fillTriangle(32, 28, 36, 40, 24, 36);

    // Engine glow
    g.fillStyle(0x88CCFF);
    g.fillEllipse(18, 40, 10, 6);
    g.fillStyle(0xFF6B9D);
    g.fillCircle(18, 41, 3);

    // Wing cannons
    g.fillStyle(0x445577);
    g.fillRect(2, 32, 4, 6);
    g.fillRect(30, 32, 4, 6);

    g.generateTexture('player_ship', W, H);
    g.destroy();
  }

  // ─── Enemy Ship ────────────────────────────────────────────────────────────
  // 32×32 — menacing alien fighter
  _genEnemyShip() {
    const W = 32, H = 32;
    const g = this._gfx();

    // Hull (inverted "V" shape — enemies come from top so they face down)
    g.fillStyle(0x882244);
    g.fillTriangle(16, 30, 2, 4, 30, 4);

    // Inner panel
    g.fillStyle(0xAA3355);
    g.fillTriangle(16, 24, 6, 6, 26, 6);

    // Eye/sensor
    g.fillStyle(0xFF3366);
    g.fillEllipse(16, 14, 12, 10);
    g.fillStyle(0xFF6699);
    g.fillCircle(16, 13, 4);
    g.fillStyle(0xFFCCDD);
    g.fillCircle(14, 12, 2);

    // Side wings
    g.fillStyle(0x661133);
    g.fillTriangle(2, 4, 0, 16, 8, 10);
    g.fillTriangle(30, 4, 32, 16, 24, 10);

    // Weapon tips
    g.fillStyle(0xFF4477);
    g.fillCircle(3, 16, 3);
    g.fillCircle(29, 16, 3);

    g.generateTexture('enemy_ship', W, H);
    g.destroy();
  }

  // ─── Bullet (player projectile) ────────────────────────────────────────────
  _genBullet() {
    const W = 6, H = 18;
    const g = this._gfx();

    g.fillStyle(0x88EEFF);
    g.fillRect(1, 0, 4, 18);
    g.fillStyle(0xFFFFFF);
    g.fillRect(2, 0, 2, 10);
    g.fillStyle(0x4488FF, 0.6);
    g.fillRect(0, 12, 6, 6);

    g.generateTexture('bullet', W, H);
    g.destroy();
  }

  // ─── Asteroid ─────────────────────────────────────────────────────────────
  _genAsteroid() {
    const W = 40, H = 38;
    const g = this._gfx();

    g.fillStyle(0x556677);
    g.fillEllipse(20, 19, 38, 34);

    g.fillStyle(0x667788);
    g.fillEllipse(14, 13, 16, 14);
    g.fillEllipse(26, 24, 12, 10);

    g.fillStyle(0x445566);
    g.fillCircle(10, 20, 5);
    g.fillCircle(28, 10, 4);
    g.fillCircle(22, 28, 4);

    g.fillStyle(0x778899);
    g.fillRect(18, 6, 3, 3);
    g.fillRect(8, 14, 2, 2);
    g.fillRect(28, 22, 2, 2);

    g.generateTexture('asteroid', W, H);
    g.destroy();
  }

  // ─── Mountain silhouette strip (480×160) — used as tiling parallax bg ─────
  _genMountainsBg() {
    const W = 480, H = 160;
    const g = this._gfx();

    // Dark silhouette — will show against the sunset sky gradient
    const col = 0x18082A;
    g.fillStyle(col);

    // Mountain range — designed to tile seamlessly (left/right edges match)
    // Big central peak
    g.fillTriangle(170, H, 310, H - 148, 450, H);
    // Left peak (bleeds left edge = right side of previous tile)
    g.fillTriangle(-30, H, 70,  H - 118, 200, H);
    // Right peek (bleeds right edge = left side of next tile)
    g.fillTriangle(310, H, 435, H - 132, 560, H);
    // Secondary ridges — give depth
    g.fillTriangle(0,   H, 40,  H - 58,  90,  H);
    g.fillTriangle(100, H, 145, H - 44,  200, H);
    g.fillTriangle(360, H, 410, H - 62,  470, H);
    g.fillTriangle(440, H, 480, H - 38,  530, H);
    // Solid ground strip at bottom (ties mountains to ground)
    g.fillRect(0, H - 18, W, 18);

    // Slightly lighter layer on top of first range — adds depth
    g.fillStyle(0x22103A);
    g.fillTriangle(50,  H - 12, 140, H - 78,  260, H - 12);
    g.fillTriangle(240, H - 12, 370, H - 68,  480, H - 12);

    g.generateTexture('mountains_bg', W, H);
    g.destroy();
  }

  // ─── Crystal Platform — glowing purple for staircase ───────────────────────
  _genPlatformCrystal() {
    const W = 32, H = 16;
    const g = this._gfx();

    // Top glow strip
    g.fillStyle(0xDDAEFF);
    g.fillRect(0, 0, W, 2);
    g.fillStyle(0xCC88FF);
    g.fillRect(0, 2, W, 3);

    // Body
    g.fillStyle(0x7733BB);
    g.fillRect(0, 5, W, 8);
    // Shadow
    g.fillStyle(0x4A1A88);
    g.fillRect(0, 13, W, 3);

    // Crystal facets — bright vertical streaks
    g.fillStyle(0xEECCFF);
    g.fillRect(5,  5, 2, 5);
    g.fillRect(14, 6, 2, 4);
    g.fillRect(23, 5, 2, 5);

    // Top sparkle dots
    g.fillStyle(0xFFFFFF);
    g.fillRect(7,  0, 2, 1);
    g.fillRect(18, 0, 2, 1);
    g.fillRect(28, 0, 2, 1);

    g.generateTexture('platform_crystal', W, H);
    g.destroy();
  }

  // ─── Space Power-up collectible ────────────────────────────────────────────
  // 24×24 — glowing pink star heart hybrid
  _genSpacePowerup() {
    const W = 24, H = 24;
    const g = this._gfx();

    // Outer glow ring
    g.fillStyle(0xFF6B9D, 0.35);
    g.fillCircle(12, 12, 12);

    // Star shape
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r     = i % 2 === 0 ? 9 : 4;
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      pts.push({ x: 12 + Math.cos(angle) * r, y: 12 + Math.sin(angle) * r });
    }
    g.fillStyle(0xFF6B9D);
    g.fillPoints(pts, true);

    // Inner highlight
    const inner = [];
    for (let i = 0; i < 10; i++) {
      const r     = i % 2 === 0 ? 4 : 2;
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      inner.push({ x: 12 + Math.cos(angle) * r, y: 12 + Math.sin(angle) * r });
    }
    g.fillStyle(0xFFCCEE);
    g.fillPoints(inner, true);

    g.fillStyle(0xFFFFFF);
    g.fillRect(10, 5, 2, 2);
    g.fillRect(14, 7, 2, 2);

    g.generateTexture('space_powerup', W, H);
    g.destroy();
  }
}
