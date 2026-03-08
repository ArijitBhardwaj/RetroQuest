'use strict';

/**
 * SpaceScene — Vertical Space Shooter (Act 3)
 *
 * Design principles:
 *   • ONE wave — focused and dramatic, not exhausting
 *   • ALL action pauses when a message popup appears (read without distraction)
 *   • Crystal Heart descends via tween only (no physics — avoids velocity/tween conflict)
 *   • Player is never stuck: death respawns at full shields, game always finishable
 *   • Hyperspace intro effect (2 s) before enemies appear
 *
 * Flow:
 *   Entry (hyperspace) → Enemies descend in V-formation → Battle
 *   → Power-up drops mid-battle (popup pauses everything)
 *   → All enemies cleared → Crystal Heart descends → Collect → EndScene
 *
 * Controls:
 *   Keyboard: arrow / WASD — move ship freely
 *   Touch:    drag finger — ship follows smoothly (any part of screen)
 *   Auto-fire: every 285 ms automatically
 */

class SpaceScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Space' });
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  create() {
    this._initState();
    this._buildBg();
    this._buildPlayer();
    this._buildHUD();
    this._buildInput();

    if (typeof AUDIO !== 'undefined') AUDIO.startMusic('space');

    // Hyperspace entry — fast stars for 2.2 s, then battle starts
    this._hyperspace   = true;
    this._hyperspaceMs = 2200;

    this.cameras.main.fadeIn(500, 0, 0, 15);

    this.time.delayedCall(this._hyperspaceMs, () => {
      this._hyperspace = false;
      this._showBanner('Wave Incoming!', 1400);
      this.time.delayedCall(1600, () => this._spawnWave());
      // Power-up drops 9 s after enemies appear — guaranteed mid-battle moment
      this.time.delayedCall(9000, () => this._dropPowerup());
    });
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  update(time, delta) {
    // Always: starfield + engine glow
    this._updateStarfield(delta);
    this._updateEngineTrail();

    // When paused (popup showing) or scene done — freeze everything else
    if (this._paused || this._state !== 'playing') return;

    this._updatePlayer(delta);
    this._updateAutoFire(delta);
    this._updateEnemies(delta);
    this._updateBullets(delta);
    this._updatePowerup(delta);
    this._checkCrystal();
  }

  // ─── Init ──────────────────────────────────────────────────────────────────

  _initState() {
    this._state         = 'playing';
    this._paused        = false;
    this._shields       = 3;
    this._invincible    = false;
    this._fireTimer     = 0;
    this._enemies       = [];
    this._bullets       = [];
    this._enemyBullets  = [];
    this._powerupSprite = null;
    this._crystal       = null;
    this._crystalGlow   = null;
    this._waveCleared   = false;
    this._waveStarted   = false;
    this._popupQueue    = [];
    this._touchX        = null;
    this._touchY        = null;
  }

  // ─── Background ────────────────────────────────────────────────────────────

  _buildBg() {
    // Deep space gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x000510, 0x000510, 0x080020, 0x080020, 1);
    bg.fillRect(0, 0, GAME_W, GAME_H);

    // Large faint planet (top-right area) — adds depth and beauty
    const planet = this.add.graphics().setAlpha(0.28).setDepth(-4);
    // Base
    planet.fillStyle(0x1A5078);
    planet.fillCircle(390, 170, 130);
    // Lighter band
    planet.fillStyle(0x2A7A9A);
    planet.fillEllipse(390, 195, 190, 70);
    // Crescent highlight
    planet.fillStyle(0x55AABB);
    planet.fillCircle(345, 125, 75);
    // Ring
    planet.lineStyle(4, 0x2A7A9A, 0.5);
    planet.strokeEllipse(390, 170, 340, 60);
    // Ring shadow (inner)
    planet.lineStyle(8, 0x000510, 0.5);
    planet.strokeEllipse(390, 170, 240, 42);

    // Nebula wisps
    const neb = this.add.graphics().setAlpha(0.07).setDepth(-5);
    neb.fillStyle(0x8844FF); neb.fillEllipse(80,  220, 200, 120);
    neb.fillStyle(0xFF4488); neb.fillEllipse(370, 520, 180, 100);
    neb.fillStyle(0x4488FF); neb.fillEllipse(230, 740, 220, 100);

    // Static distant stars
    const stars = this.add.graphics().setDepth(-6);
    for (let i = 0; i < 140; i++) {
      const x = Phaser.Math.Between(0, GAME_W);
      const y = Phaser.Math.Between(0, GAME_H);
      const r = Math.random() < 0.18 ? 1.5 : 1;
      stars.fillStyle(0xFFFFFF, 0.12 + Math.random() * 0.55);
      stars.fillCircle(x, y, r);
    }

    // Scrolling star layers (two speeds = parallax)
    this._starLayers = [];
    [[28, 55], [22, 115]].forEach(([count, speed]) => {
      const layer = [];
      for (let i = 0; i < count; i++) {
        const s = this.add.graphics().setDepth(-3);
        const x = Phaser.Math.Between(0, GAME_W);
        const y = Phaser.Math.Between(0, GAME_H);
        s.fillStyle(0xFFFFFF, speed > 80 ? 0.55 : 0.30);
        s.fillCircle(0, 0, speed > 80 ? 1.5 : 1);
        s.x = x; s.y = y; s._speed = speed;
        layer.push(s);
      }
      this._starLayers.push(layer);
    });

    // Engine glow graphics (updated each frame)
    this._engineGfx = this.add.graphics().setDepth(19);
  }

  _updateStarfield(delta) {
    const dt = delta / 1000;
    // In hyperspace, stars fly by 10× faster — dramatic warp effect
    const mult = this._hyperspace ? 10 : 1;

    this._starLayers.forEach(layer => {
      layer.forEach(s => {
        s.y += s._speed * dt * mult;
        if (s.y > GAME_H + 4) {
          s.y = -4;
          s.x = Phaser.Math.Between(0, GAME_W);
        }
      });
    });

    // Hyperspace white flash vignette
    if (this._hyperspace) {
      if (!this._hyperGfx) {
        this._hyperGfx = this.add.graphics().setDepth(-1);
        this._hyperGfx.fillStyle(0x8899FF, 0.08);
        this._hyperGfx.fillRect(0, 0, GAME_W, GAME_H);
      }
    } else if (this._hyperGfx) {
      this._hyperGfx.destroy();
      this._hyperGfx = null;
    }
  }

  // ─── Player ship ───────────────────────────────────────────────────────────

  _buildPlayer() {
    this._playerShip = this.physics.add.image(GAME_W / 2, GAME_H - 110, 'player_ship')
      .setScale(1.7).setDepth(20).setCollideWorldBounds(true);
    this._playerShip.body.setAllowGravity(false);
    this._playerShip.body.setSize(24, 38);
  }

  _updateEngineTrail() {
    const s = this._playerShip;
    this._engineGfx.clear();
    this._engineGfx.fillStyle(0x4488FF, 0.55);
    this._engineGfx.fillEllipse(s.x, s.y + 36, 14, 10);
    this._engineGfx.fillStyle(0x88CCFF, 0.30);
    this._engineGfx.fillEllipse(s.x, s.y + 40, 8, 6);
    this._engineGfx.fillStyle(0xFF6B9D, 0.70);
    this._engineGfx.fillCircle(s.x, s.y + 38, 3);
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  _buildInput() {
    this._cursors = this.input.keyboard.createCursorKeys();
    this._wasd    = this.input.keyboard.addKeys({ up: 'W', left: 'A', right: 'D', down: 'S' });

    this.input.on('pointerdown', p => { this._touchX = p.x; this._touchY = p.y; });
    this.input.on('pointermove', p => { if (p.isDown) { this._touchX = p.x; this._touchY = p.y; } });
    this.input.on('pointerup',   () => { this._touchX = null; this._touchY = null; });
  }

  _updatePlayer(delta) {
    if (this._paused) return;

    const s     = this._playerShip;
    const speed = 290;
    const r     = this._cursors;
    const w     = this._wasd;
    let vx = 0, vy = 0;

    // Keyboard
    if (r.left.isDown  || w.left.isDown)  vx = -speed;
    if (r.right.isDown || w.right.isDown) vx =  speed;
    if (r.up.isDown    || w.up.isDown)    vy = -speed;
    if (r.down.isDown  || w.down.isDown)  vy =  speed;

    // Touch — smooth follow (works anywhere on screen)
    if (this._touchX !== null) {
      const tx = Phaser.Math.Clamp(this._touchX, 28, GAME_W - 28);
      const ty = Phaser.Math.Clamp(this._touchY, GAME_H * 0.30, GAME_H - 55);
      const dx = tx - s.x, dy = ty - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 8) {
        const fac = Math.min(dist / 55, 1) * speed;
        vx = (dx / dist) * fac;
        vy = (dy / dist) * fac;
      }
    }

    s.body.setVelocity(vx, vy);
    // Restrict player to bottom 65% of screen
    s.y = Phaser.Math.Clamp(s.y, GAME_H * 0.35, GAME_H - 55);
  }

  // ─── Auto-fire ─────────────────────────────────────────────────────────────

  _updateAutoFire(delta) {
    this._fireTimer += delta;
    if (this._fireTimer >= 285) {
      this._fireTimer = 0;
      this._fireBullet();
    }
  }

  _fireBullet() {
    if (this._bullets.length > 8) return; // cap
    const s = this._playerShip;
    const b = this.physics.add.image(s.x, s.y - 34, 'bullet').setDepth(15).setScale(1.2);
    b.body.setAllowGravity(false);
    b.body.setVelocityY(-680);
    this._bullets.push(b);
    if (typeof AUDIO !== 'undefined') AUDIO.shoot();
  }

  _updateBullets(delta) {
    for (let i = this._bullets.length - 1; i >= 0; i--) {
      const b = this._bullets[i];
      if (!b.active || b.y < -24) {
        if (b.active) b.destroy();
        this._bullets.splice(i, 1);
        continue;
      }

      // Check hits on enemies
      let hit = false;
      for (let j = this._enemies.length - 1; j >= 0; j--) {
        const e = this._enemies[j];
        if (!e.active) continue;
        if (Phaser.Geom.Intersects.RectangleToRectangle(b.getBounds(), e.getBounds())) {
          this._destroyEnemy(e, j);
          b.destroy();
          this._bullets.splice(i, 1);
          hit = true;
          break;
        }
      }
      if (hit) continue;
    }

    // Enemy bullets vs player
    for (let i = this._enemyBullets.length - 1; i >= 0; i--) {
      const eb = this._enemyBullets[i];
      if (!eb.active || eb.y > GAME_H + 24) {
        if (eb.active) eb.destroy();
        this._enemyBullets.splice(i, 1);
        continue;
      }
      if (!this._invincible) {
        if (Phaser.Geom.Intersects.RectangleToRectangle(eb.getBounds(), this._playerShip.getBounds())) {
          eb.destroy();
          this._enemyBullets.splice(i, 1);
          this._hitPlayer();
        }
      }
    }
  }

  // ─── Enemy wave ────────────────────────────────────────────────────────────

  _spawnWave() {
    if (this._state !== 'playing') return;

    // Arrow-formation: 12 enemies, 5 shooters
    //   row1 [0], row2 [1,2], row3 [3,4,5], row4 [6,7,8,9], row5 [10,11]
    const cx = GAME_W / 2;
    const formation = [
      { x: cx,       y: -90,  shootMs: 1800 },   // tip — fires
      { x: cx - 72,  y: -58,  shootMs: 2400 },   // row2 left — fires
      { x: cx + 72,  y: -58,  shootMs: 2400 },   // row2 right — fires
      { x: cx - 144, y: -26,  shootMs: 2900 },   // row3 left — fires
      { x: cx,       y: -26,  shootMs: 2900 },   // row3 center — fires
      { x: cx + 144, y: -26,  shootMs: 0 },       // row3 right
      { x: cx - 210, y:   6,  shootMs: 0 },       // row4 far-left
      { x: cx - 70,  y:   6,  shootMs: 0 },       // row4 left
      { x: cx + 70,  y:   6,  shootMs: 0 },       // row4 right
      { x: cx + 210, y:   6,  shootMs: 0 },       // row4 far-right
      { x: cx - 140, y:  34,  shootMs: 0 },       // row5 left
      { x: cx + 140, y:  34,  shootMs: 0 },       // row5 right
    ];

    formation.forEach((cfg, i) => {
      this.time.delayedCall(i * 120, () => {
        if (this._state !== 'playing') return;
        this._spawnEnemy(cfg.x, cfg.y, cfg.shootMs);
        this._waveStarted = true;
      });
    });
  }

  _spawnEnemy(x, y, shootMs) {
    const e = this.physics.add.image(x, y, 'enemy_ship')
      .setDepth(18).setScale(1.5);
    e.body.setAllowGravity(false);
    e.body.setVelocityY(88);
    e._dirY        = 1;         // bounce direction
    e._phase       = Math.random() * Math.PI * 2; // sin-wave phase
    e._shootMs     = shootMs;   // 0 = doesn't shoot
    e._shootTimer  = shootMs * (0.6 + Math.random() * 0.4); // offset first shot
    this._enemies.push(e);
  }

  _updateEnemies(delta) {
    for (let i = this._enemies.length - 1; i >= 0; i--) {
      const e = this._enemies[i];
      if (!e.active) { this._enemies.splice(i, 1); continue; }

      // Side-to-side drift (sin wave, each enemy slightly offset)
      e._phase += delta * 0.00055;
      const vx = Math.sin(e._phase) * 70;

      // Bounce off ceiling/floor so they stay in the upper battle zone
      if (e.y < 70) {
        e._dirY = 1;
      } else if (e.y > GAME_H * 0.58) {
        e._dirY = -1;
      }
      e.body.setVelocity(vx, e._dirY * 88);

      // Collision with player ship
      if (!this._invincible &&
          Phaser.Geom.Intersects.RectangleToRectangle(e.getBounds(), this._playerShip.getBounds())) {
        this._destroyEnemy(e, i);
        this._hitPlayer();
        continue;
      }

      // Shooting
      if (e._shootMs > 0) {
        e._shootTimer -= delta;
        if (e._shootTimer <= 0) {
          e._shootTimer = e._shootMs * (0.85 + Math.random() * 0.3);
          this._spawnEnemyBullet(e.x, e.y + 20);
        }
      }
    }

    // Check wave cleared
    if (this._waveStarted && !this._waveCleared && this._enemies.length === 0) {
      this._waveCleared = true;

      // NOTE: do NOT destroy the powerup here. _collectPowerup already guards
      // against photo8 appearing post-wave via the `this._waveCleared` check —
      // and _updateEnemies always runs before _updatePowerup in the same tick,
      // so the flag is set before any collection overlap is evaluated.
      // Destroying it here would pop it off-screen the instant the last enemy dies.

      this._showBanner('✦ Wave Cleared! ✦', 1600);
      this.time.delayedCall(2500, () => this._spawnCrystal());
    }
  }

  _spawnEnemyBullet(x, y) {
    if (this._enemyBullets.length > 10) return;
    const eb = this.physics.add.image(x, y, 'bullet')
      .setDepth(14).setScale(0.85).setTint(0xFF3355).setFlipY(true);
    eb.body.setAllowGravity(false);
    eb.body.setVelocityY(420);
    this._enemyBullets.push(eb);
  }

  _destroyEnemy(e, idx) {
    const ex = e.x, ey = e.y;
    e.destroy();
    this._enemies.splice(idx, 1);
    if (typeof AUDIO !== 'undefined') AUDIO.explosion(false);

    const emit = this.add.particles(ex, ey, 'star_particle', {
      speed: { min: 55, max: 170 }, angle: { min: 0, max: 360 },
      scale: { start: 1.8, end: 0 }, alpha: { start: 1, end: 0 },
      lifespan: { min: 380, max: 680 }, quantity: 8,
      tint: [0xFF3366, 0xFF8844, 0xFFCC44], emitting: false,
    });
    emit.explode(8);
    this.time.delayedCall(750, () => emit.destroy());
  }

  // ─── Player hit ────────────────────────────────────────────────────────────

  _hitPlayer() {
    if (this._invincible) return;
    this._shields = Math.max(0, this._shields - 1);
    this._updateHUD();
    if (typeof AUDIO !== 'undefined') AUDIO.explosion(false);

    if (this._shields <= 0) {
      this._playerDeath();
    } else {
      this._invincible = true;
      this.tweens.add({
        targets: this._playerShip, alpha: 0.2,
        duration: 110, yoyo: true, repeat: 9,
        onComplete: () => { this._playerShip.setAlpha(1); this._invincible = false; },
      });
    }
  }

  _playerDeath() {
    this._state = 'dead';
    if (typeof AUDIO !== 'undefined') AUDIO.explosion(true);

    const emit = this.add.particles(this._playerShip.x, this._playerShip.y, 'heart_particle', {
      speed: { min: 70, max: 220 }, angle: { min: 0, max: 360 },
      scale: { start: 2, end: 0 }, alpha: { start: 1, end: 0 },
      lifespan: { min: 600, max: 1100 }, quantity: 16,
      tint: [0xFF6B9D, 0x4488FF, 0xFFDD44], emitting: false,
    });
    emit.explode(16);
    this._playerShip.setAlpha(0);
    this.cameras.main.flash(200, 255, 100, 180);

    this.time.delayedCall(1400, () => {
      this._shields    = 3;
      this._invincible = true;
      this._state      = 'playing';
      this._updateHUD();
      this._playerShip.setPosition(GAME_W / 2, GAME_H - 110).setAlpha(1);
      emit.destroy();
      this.time.delayedCall(2200, () => { this._invincible = false; });
    });
  }

  // ─── Power-up ──────────────────────────────────────────────────────────────

  _dropPowerup() {
    if (this._state !== 'playing' || this._waveCleared) return;

    const x = Phaser.Math.Between(70, GAME_W - 70);
    const pu = this.physics.add.image(x, -30, 'space_powerup')
      .setDepth(17).setScale(1.7);
    pu.body.setAllowGravity(false);
    pu.body.setVelocityY(75);
    this.tweens.add({ targets: pu, scaleX: 2.1, scaleY: 2.1, alpha: 0.55,
      duration: 680, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this._powerupSprite = pu;
  }

  _updatePowerup(delta) {
    const pu = this._powerupSprite;
    if (!pu || !pu.active) return;

    if (pu.y > GAME_H + 40) {
      pu.destroy();
      this._powerupSprite = null;
      return;
    }

    const dx = pu.x - this._playerShip.x;
    const dy = pu.y - this._playerShip.y;
    if (Math.sqrt(dx * dx + dy * dy) < 40) {
      this._collectPowerup(pu);
    }
  }

  _collectPowerup(pu) {
    // Block collection once the crystal is on screen.
    // If collected in the same tick the crystal overlaps the player, both
    // _updatePowerup and _checkCrystal run — this guard ensures photo8 can
    // never fire after photo9 has already been triggered.
    // During the 2.5 s window between wave-clear and crystal spawn, _crystal
    // is null, so the player CAN still collect the powerup normally.
    if (this._crystal || this._state !== 'playing') return;

    const ex = pu.x, ey = pu.y;
    pu.destroy();
    this._powerupSprite = null;
    if (typeof AUDIO !== 'undefined') AUDIO.collectStar();

    const emit = this.add.particles(ex, ey, 'heart_particle', {
      speed: { min: 40, max: 140 }, angle: { min: 0, max: 360 },
      scale: { start: 1.5, end: 0 }, alpha: { start: 1, end: 0 },
      lifespan: { min: 400, max: 700 }, quantity: 10,
      tint: [0xFF6B9D, 0xFFCCEE, 0xCC88FF], emitting: false,
    });
    emit.explode(10);
    this.time.delayedCall(800, () => emit.destroy());

    // Photo reveal — pause everything, no text card after
    if (typeof PHOTO_REVEAL !== 'undefined') {
      this._paused = true;
      this.physics.pause();
      PHOTO_REVEAL.show('assets_provided/photo8.jpg', () => {
        this._paused = false;
        this.physics.resume();
      });
    }
  }

  // ─── Crystal Heart — tween only, NO physics velocity ──────────────────────

  _spawnCrystal() {
    if (this._state !== 'playing') return;
    if (typeof AUDIO !== 'undefined') AUDIO.board();

    this._showBanner('✦  Collect the Crystal Heart  ✦', 2600);

    const targetY = GAME_H * 0.38;

    // ── Regular image — no physics body, no velocity ────────────────────────
    this._crystal = this.add.image(GAME_W / 2, -80, 'item_crystal')
      .setDepth(22).setScale(2.6);

    // Glow ring (follows crystal via tween)
    this._crystalGlow = this.add.image(GAME_W / 2, -80, 'glow_ring')
      .setScale(3.2).setAlpha(0.7).setDepth(21).setTint(0x88FFFF);
    this.tweens.add({ targets: this._crystalGlow,
      scaleX: 4.4, scaleY: 4.4, alpha: 0,
      duration: 1100, repeat: -1, ease: 'Quad.easeOut' });

    // Second brighter glow
    const innerGlow = this.add.image(GAME_W / 2, -80, 'glow_ring')
      .setScale(2.0).setAlpha(0.5).setDepth(21).setTint(0xCCFFFF);

    // Phase 1: dramatic descent from top
    this.tweens.add({
      targets: [this._crystal, innerGlow],
      y: targetY,
      duration: 2400,
      ease: 'Back.easeOut',
      onUpdate: () => {
        // Keep glow rings synced to crystal position
        this._crystalGlow.setPosition(this._crystal.x, this._crystal.y);
        innerGlow.setPosition(this._crystal.x, this._crystal.y);
      },
      onComplete: () => {
        // Phase 2: gentle bob in place
        this.tweens.add({
          targets: [this._crystal, innerGlow],
          y: targetY - 16,
          duration: 1300,
          yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          onUpdate: () => {
            this._crystalGlow.setPosition(this._crystal.x, this._crystal.y);
            innerGlow.setPosition(this._crystal.x, this._crystal.y);
          },
        });
      },
    });

    // Particle shower around crystal as it settles
    this.time.delayedCall(2400, () => {
      const sparkle = this.add.particles(GAME_W / 2, targetY, 'heart_particle', {
        tint: [0x88FFFF, 0xCCFFFF, 0xFFFFFF, 0x88CCFF],
        scale: { start: 1.2, end: 0 }, alpha: { start: 0.8, end: 0 },
        speedX: { min: -60, max: 60 }, speedY: { min: -80, max: -180 },
        lifespan: { min: 800, max: 1400 }, frequency: 120, quantity: 1,
      }).setDepth(23);
      // Destroy sparkles after 6 seconds (by then player has likely collected it)
      this.time.delayedCall(6000, () => sparkle.destroy());
    });
  }

  _checkCrystal() {
    if (!this._crystal || !this._crystal.active) return;
    if (this._crystal.y < 0) return;

    const dx = this._crystal.x - this._playerShip.x;
    const dy = this._crystal.y - this._playerShip.y;
    // Generous hit radius (50px) — feels good on mobile
    if (Math.sqrt(dx * dx + dy * dy) < 50) {
      this._onVictory();
    }
  }

  _onVictory() {
    if (this._state === 'done') return;
    this._state = 'done';

    this._crystal.destroy();
    if (this._crystalGlow?.active) this._crystalGlow.destroy();

    if (typeof AUDIO !== 'undefined') {
      AUDIO.victory();
      AUDIO.fadeOutMusic(2000);
    }

    // Massive multi-colour burst
    [0xFF6B9D, 0x88FFFF, 0xFFD700, 0xCCFFFF, 0xFF99CC].forEach((tint, i) => {
      this.time.delayedCall(i * 90, () => {
        const e = this.add.particles(GAME_W / 2, GAME_H * 0.38, 'heart_particle', {
          speed: { min: 80, max: 300 }, angle: { min: 0, max: 360 },
          scale: { start: 2.8, end: 0 }, alpha: { start: 1, end: 0 },
          lifespan: { min: 900, max: 1700 }, quantity: 14,
          tint: tint, emitting: false,
        });
        e.explode(14);
        this.time.delayedCall(1800, () => e.destroy());
      });
    });

    this.cameras.main.flash(500, 255, 230, 255);

    this.time.delayedCall(1800, () => {
      const goToEnd = () => {
        this.cameras.main.fade(800, 255, 230, 255, false, (cam, p) => {
          if (p >= 1) this.scene.start('End');
        });
      };
      if (typeof PHOTO_REVEAL !== 'undefined') {
        PHOTO_REVEAL.show('assets_provided/photo9.jpg', goToEnd);
      } else {
        goToEnd();
      }
    });
  }

  // ─── HUD ───────────────────────────────────────────────────────────────────

  _buildHUD() {
    this._shieldText = this.add.text(14, 14, this._shieldStr(), {
      fontFamily: '"Press Start 2P"', fontSize: '10px',
      color: '#88CCFF', stroke: '#001133', strokeThickness: 3,
    }).setDepth(100);

    this._statusText = this.add.text(GAME_W - 14, 14, 'Clear the Wave', {
      fontFamily: '"Press Start 2P"', fontSize: '8px',
      color: '#AABBFF', stroke: '#001133', strokeThickness: 3,
    }).setDepth(100).setOrigin(1, 0);

    this._bannerText = this.add.text(GAME_W / 2, GAME_H / 2 - 50, '', {
      fontFamily: '"Press Start 2P"', fontSize: '11px',
      color: '#FFD700', stroke: '#443300', strokeThickness: 4, align: 'center',
    }).setDepth(115).setOrigin(0.5).setAlpha(0);
  }

  _shieldStr() {
    return '🛡  ' + '♥ '.repeat(this._shields).trim();
  }

  _updateHUD() {
    this._shieldText.setText(this._shieldStr());
  }

  _showBanner(text, duration) {
    this._bannerText.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this._bannerText);
    this.tweens.add({
      targets: this._bannerText, alpha: 0, duration: 500, delay: duration,
    });
  }

  // ─── Popup — ALL gameplay pauses while message is shown ───────────────────

  _showPopup({ icon, title, text }) {
    this._paused = true;
    this.physics.pause();

    const cx = GAME_W / 2, cy = GAME_H / 2;
    this._popupEls = [];
    const reg = el => { this._popupEls.push(el); return el; };

    // Dark overlay
    reg(this.add.rectangle(cx, cy, GAME_W, GAME_H, 0x000000, 0.72).setDepth(200));

    // Card — space theme (deep blue)
    const cw = 360, ch = 300;
    const cg = reg(this.add.graphics().setDepth(201));
    cg.fillStyle(0x020D22, 1);
    cg.fillRoundedRect(cx - cw/2, cy - ch/2, cw, ch, 18);
    cg.lineStyle(3, 0x4488FF, 1);
    cg.strokeRoundedRect(cx - cw/2, cy - ch/2, cw, ch, 18);
    cg.fillStyle(0x4488FF, 0.10);
    cg.fillRoundedRect(cx - cw/2 + 3, cy - ch/2 + 3, cw - 6, 54, { tl: 15, tr: 15, bl: 0, br: 0 });

    reg(this.add.text(cx, cy - ch/2 + 32, icon, { fontSize: '36px' })
      .setDepth(202).setOrigin(0.5));

    reg(this.add.text(cx, cy - ch/2 + 72, title, {
      fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#88CCFF',
      align: 'center', wordWrap: { width: cw - 40 },
    }).setDepth(202).setOrigin(0.5));

    const dg = reg(this.add.graphics().setDepth(202));
    dg.lineStyle(1, 0x4488FF, 0.4);
    dg.lineBetween(cx - cw/2 + 24, cy - 32, cx + cw/2 - 24, cy - 32);

    reg(this.add.text(cx, cy - 22, text, {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#CCEEFF',
      align: 'center', lineSpacing: 10, wordWrap: { width: cw - 44 },
    }).setDepth(202).setOrigin(0.5, 0));

    const btnY = cy + ch/2 - 36;
    const bg2  = reg(this.add.graphics().setDepth(202));
    bg2.fillStyle(0x1155CC, 1);
    bg2.fillRoundedRect(cx - 100, btnY - 20, 200, 40, 10);
    bg2.fillStyle(0x4488FF, 0.5);
    bg2.fillRoundedRect(cx - 96, btnY - 16, 130, 12, 6);
    bg2.lineStyle(2, 0x88CCFF, 1);
    bg2.strokeRoundedRect(cx - 100, btnY - 20, 200, 40, 10);

    reg(this.add.text(cx, btnY, 'Keep Flying  ✦', {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#ffffff',
    }).setDepth(203).setOrigin(0.5));

    // Fade in
    this._popupEls.forEach(el => { el.setAlpha(0); this.tweens.add({ targets: el, alpha: 1, duration: 240 }); });

    this.time.delayedCall(380, () => {
      let done = false;
      const dismiss = () => {
        if (done) return; done = true;
        this.input.off('pointerdown', dismiss);
        this.tweens.add({
          targets: this._popupEls, alpha: 0, duration: 180,
          onComplete: () => {
            this._popupEls.forEach(el => el.destroy());
            this._popupEls = [];
            this._paused = false;
            this.physics.resume();
          },
        });
      };
      this.input.once('pointerdown', dismiss);
      this.input.keyboard.once('keydown-SPACE', dismiss);
    });
  }
}
