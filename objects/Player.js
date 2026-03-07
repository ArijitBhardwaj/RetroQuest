'use strict';

/**
 * Player
 * Handles the player character: physics, animation state machine,
 * and movement logic including coyote time + jump buffer (game-feel polish).
 *
 * Usage (in GameScene.create):
 *   this.player = new Player(this, x, y);
 *
 * Usage (in GameScene.update):
 *   this.player.update(this.cursors, this.mobileControls);
 */
class Player {
  constructor(scene, x, y) {
    this.scene = scene;

    // ── Spawn the physics sprite ──────────────────────────────────────────
    this.sprite = scene.physics.add.sprite(x, y, 'player_sheet');
    this.sprite.setOrigin(0.5, 1);      // anchor to bottom-center (feet)
    this.sprite.setScale(1.5);          // 32→48px display size

    // Physics body — narrower than visual for forgiving collision.
    // With scale=1.5 and origin(0.5,1): body bottom must align with sprite.y (the feet).
    // Formula: offsetY = frameH - bodyH  →  32 - 30 = 2  (works out to feet-aligned)
    this.sprite.body.setSize(20, 30);
    this.sprite.body.setOffset(6, 2);
    this.sprite.body.setMaxVelocityX(PLAYER_SPEED * 1.1);
    this.sprite.body.setMaxVelocityY(900);

    this._buildAnimations();

    // ── Game-feel timers ──────────────────────────────────────────────────
    // Coyote time: allow jump for N ms after walking off a ledge
    this._coyoteTime   = 120;  // ms
    this._coyoteTimer  = 0;

    // Jump buffer: if jump pressed N ms before landing, fire on touch
    this._jumpBuffer   = 140;  // ms
    this._jumpTimer    = 0;

    // Internal state
    this._wasOnGround  = false;
    this._facingRight  = true;
    this._state        = 'idle'; // idle | run | jump | fall | land
    this._landTimer    = 0;      // how long to hold landing animation
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  get x()      { return this.sprite.x; }
  get y()      { return this.sprite.y; }
  get body()   { return this.sprite.body; }
  get active() { return this.sprite.active; }

  setPosition(x, y) {
    this.sprite.setPosition(x, y);
    this.sprite.body.reset(x, y);
  }

  // Called every frame from GameScene.update()
  update(cursors, mobileControls) {
    if (!this.sprite.active) return;

    const body      = this.sprite.body;
    const onGround  = body.blocked.down;
    const dt        = this.scene.game.loop.delta; // ms since last frame

    // ── Coyote time tracking ──
    if (onGround) {
      this._coyoteTimer = this._coyoteTime;
    } else if (this._coyoteTimer > 0) {
      this._coyoteTimer -= dt;
    }

    // ── Jump buffer tracking ──
    const jumpPressed = this._readJump(cursors, mobileControls);
    if (jumpPressed) {
      this._jumpTimer = this._jumpBuffer;
    } else if (this._jumpTimer > 0) {
      this._jumpTimer -= dt;
    }

    // ── Horizontal movement ──
    const left  = (cursors && cursors.left.isDown)  || (mobileControls && mobileControls.leftDown);
    const right = (cursors && cursors.right.isDown) || (mobileControls && mobileControls.rightDown);

    if (left && !right) {
      body.setVelocityX(-PLAYER_SPEED);
      this._facingRight = false;
    } else if (right && !left) {
      body.setVelocityX(PLAYER_SPEED);
      this._facingRight = true;
    } else {
      // Friction-based deceleration (feels snappier than instant stop)
      body.setVelocityX(body.velocity.x * 0.72);
      if (Math.abs(body.velocity.x) < 5) body.setVelocityX(0);
    }

    // Flip sprite to face movement direction
    this.sprite.setFlipX(!this._facingRight);

    // ── Jump ──
    const canJump = this._coyoteTimer > 0;
    if (this._jumpTimer > 0 && canJump) {
      body.setVelocityY(PLAYER_JUMP_VEL);
      this._jumpTimer  = 0;
      this._coyoteTimer = 0;
    }

    // ── Variable jump height (release early = shorter jump) ──
    const jumpHeld = (cursors && cursors.up.isDown) || (cursors && cursors.space.isDown)
                  || (mobileControls && mobileControls.jumpHeld);
    if (!jumpHeld && body.velocity.y < -200) {
      body.setVelocityY(body.velocity.y * 0.88);
    }

    // ── Animation state machine ──
    this._updateState(onGround, left || right, dt);

    this._wasOnGround = onGround;
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  _readJump(cursors, mobile) {
    const kb = cursors && (cursors.up.isDown || cursors.space.isDown);
    const mb = mobile  && mobile.jumpPressed;
    // Phaser cursor keys fire isDown every frame — detect rising edge
    if (kb && !this._kbJumpWas) { this._kbJumpWas = true;  return true; }
    if (!kb)                     { this._kbJumpWas = false; }
    if (mb)                                                  return true;
    return false;
  }

  _updateState(onGround, moving, dt) {
    const vy = this.sprite.body.velocity.y;

    if (this._landTimer > 0) {
      this._landTimer -= dt;
      this._playAnim('land');
      return;
    }

    if (!onGround && this._wasOnGround) {
      // Just left the ground (walked off ledge, not a jump)
    }

    if (!onGround) {
      if (vy < -50) {
        this._playAnim('jump');
        this._state = 'jump';
      } else {
        this._playAnim('fall');
        this._state = 'fall';
      }
    } else {
      if (!this._wasOnGround && this._state === 'fall') {
        // Just landed
        this._landTimer = 100;
        this._playAnim('land');
        this._state = 'land';
      } else if (moving) {
        this._playAnim('walk');
        this._state = 'run';
      } else {
        this._playAnim('idle');
        this._state = 'idle';
      }
    }
  }

  _playAnim(key) {
    if (this.sprite.anims.currentAnim?.key !== key) {
      this.sprite.play(key, true);
    }
  }

  _buildAnimations() {
    const anims = this.scene.anims;

    // Guard: don't re-register if already created (scene restarts)
    if (anims.exists('idle')) return;

    const make = (key, frames, frameRate, repeat) => {
      anims.create({
        key,
        frames: anims.generateFrameNumbers('player_sheet', { frames }),
        frameRate,
        repeat,
      });
    };

    make('idle', [0],          4,  -1);   // single idle frame, gentle pulse rate
    make('walk', [1, 2, 3, 4], 10, -1);   // 4-frame walk cycle
    make('jump', [5],          1,   0);   // ascending
    make('fall', [6],          1,   0);   // falling
    make('land', [7],          8,   0);   // landing squish (plays once)
  }
}
