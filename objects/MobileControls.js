'use strict';

/**
 * MobileControls — Virtual Joystick + Tap-to-Jump
 *
 * LEFT half of screen:
 *   • Touch anywhere → anchor point appears (ghost ring)
 *   • Drag left/right from that anchor → walk
 *   • Quick upward swipe (dy < −55 px) → jump
 *   • Release → stop
 *
 * RIGHT half of screen:
 *   • Tap → jump (single consistent height — no variable mechanic)
 *   • A pulsing ♥ marks the zone at all times
 *
 * No visible hard buttons. The ring appears at the exact spot you touch,
 * so there's nothing to aim for — just touch and go.
 *
 * Text hints ("← drag / ↑ swipe  |  tap jump") fade after 5 s.
 */
class MobileControls {
  constructor(scene) {
    this.scene = scene;

    // ── Public flags — read by Player.update() every frame ──────────────────
    this.leftDown    = false;
    this.rightDown   = false;
    this.jumpPressed = false;   // one-frame rising-edge pulse
    this.jumpHeld    = false;   // true while jump is being held (variable height)

    // ── Internal state ───────────────────────────────────────────────────────
    this._moveTouchId      = null;   // pointer id currently driving movement
    this._jumpTouchId      = null;   // pointer id currently driving jump (right side)
    this._originX          = 0;      // drag anchor X (game coords)
    this._originY          = 0;      // drag anchor Y (game coords)
    this._rightJumpWasDown = false;  // rising-edge guard for right-side tap
    this._swipeJumpActive  = false;  // true after swipe-up, until movement finger lifts

    this._DRAG_MIN = 18;    // px dead-zone before left/right movement registers
    this._SWIPE_UP = -55;   // dy threshold (negative = upward) that fires a jump

    this._buildUI();
    this._setupInput();
  }

  // ── Called by GameScene AFTER Player.update() — clears one-frame flags ────
  postUpdate() {
    this.jumpPressed = false;
  }

  // ── Called when a photo overlay dismisses — resets ALL touch state ────────
  // The DOM photo overlay (z-index:9999) intercepts touchend events while it
  // is visible. Phaser's canvas never sees those touchend events, so its
  // internal Pointer objects stay stuck: active=true, isDown=true. Each stuck
  // pointer occupies a slot in Phaser's pool. Once the pool is full, Phaser
  // silently drops new touchstart events — no pointerdown fires, player freezes.
  // This method:
  //   1. Clears MobileControls' own bookkeeping
  //   2. Force-releases all Phaser touch pointer slots so they can be reused
  reset() {
    // ── MobileControls state ─────────────────────────────────────────────────
    this.leftDown          = false;
    this.rightDown         = false;
    this.jumpPressed       = false;
    this.jumpHeld          = false;
    this._moveTouchId      = null;
    this._jumpTouchId      = null;
    this._rightJumpWasDown = false;
    this._swipeJumpActive  = false;
    this._hideRing();
    this._jumpHint.setAlpha(0.45);

    // ── Phaser internal pointer pool ─────────────────────────────────────────
    // Skip pointers[0] — that is always the mouse pointer, never a touch.
    // For every touch pointer that is still "active" (stuck because its touchend
    // was swallowed by the DOM overlay), mark it free so Phaser can reuse the slot.
    try {
      const ptrs = this.scene.input.manager.pointers;
      for (let i = 1; i < ptrs.length; i++) {
        if (ptrs[i] && ptrs[i].active) {
          ptrs[i].isDown = false;
          ptrs[i].active = false;
        }
      }
    } catch (e) {
      // Defensive — if Phaser's internals differ across builds, fail silently.
    }
  }

  // ── UI ───────────────────────────────────────────────────────────────────

  _buildUI() {
    const s = this.scene;
    const W = s.scale.width;
    const H = s.scale.height;

    // ── Drag ring (left zone) — hidden until touched ──────────────────────
    this._dragGfx = s.add.graphics()
      .setScrollFactor(0)
      .setDepth(150)
      .setAlpha(0);

    // ── Jump hint ♥ (right zone) — always visible, pulses ────────────────
    this._jumpHint = s.add.text(W - 68, H - 90, '♥', {
      fontFamily: '"Press Start 2P"',
      fontSize:   '42px',
      color:      '#FF6B9D',
      stroke:     '#660022',
      strokeThickness: 4,
      shadow: { offsetX: 2, offsetY: 2, color: '#330011', blur: 0, fill: true },
    }).setScrollFactor(0).setDepth(150).setAlpha(0.65).setOrigin(0.5);

    s.tweens.add({
      targets:  this._jumpHint,
      scaleX:   1.22,
      scaleY:   1.22,
      duration: 720,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });

    // ── Permanent zone labels (readable but unobtrusive) ──────────────────
    const leftLabel = s.add.text(W * 0.25, H - 22,
      '\u2190 DRAG  /  \u2191 SWIPE', {
      fontFamily: '"Press Start 2P"',
      fontSize:   '7px',
      color:      '#CCDDFF',
      stroke:     '#000033',
      strokeThickness: 2,
    }).setScrollFactor(0).setDepth(150).setAlpha(0.55).setOrigin(0.5);

    const rightLabel = s.add.text(W * 0.77, H - 22, 'TAP \u2665', {
      fontFamily: '"Press Start 2P"',
      fontSize:   '7px',
      color:      '#FFAACC',
      stroke:     '#330011',
      strokeThickness: 2,
    }).setScrollFactor(0).setDepth(150).setAlpha(0.55).setOrigin(0.5);

    // Divider line between zones
    const divGfx = s.add.graphics().setScrollFactor(0).setDepth(148);
    divGfx.lineStyle(1, 0xFFFFFF, 0.10);
    divGfx.lineBetween(W * 0.5, H - 170, W * 0.5, H - 4);

    // Fade zone labels + divider out after 8 s
    s.time.delayedCall(8000, () => {
      s.tweens.add({
        targets:  [leftLabel, rightLabel, divGfx],
        alpha:    0,
        duration: 1800,
      });
    });

    // ── Tutorial overlay — shown at game start, dismissed on first touch ──
    this._buildTutorial(W, H);
  }

  _buildTutorial(W, H) {
    const s = this.scene;
    const depth = 300;  // above everything else in the game
    const els   = [];   // track all elements for clean removal

    const addGfx = () => {
      const g = s.add.graphics().setScrollFactor(0).setDepth(depth + 1);
      els.push(g);
      return g;
    };
    const addTxt = (x, y, str, style) => {
      const t = s.add.text(x, y, str, style)
        .setScrollFactor(0).setDepth(depth + 1).setOrigin(0.5);
      els.push(t);
      return t;
    };

    // Dark semi-transparent backdrop
    const bg = s.add.graphics().setScrollFactor(0).setDepth(depth);
    bg.fillStyle(0x000000, 0.72);
    bg.fillRect(0, 0, W, H);
    els.push(bg);

    // ── Left zone panel ────────────────────────────────────────────────────
    const lx = W * 0.25;
    const ly = H * 0.48;

    const ringGfx = addGfx();
    ringGfx.lineStyle(2, 0xAABBFF, 0.7);
    ringGfx.strokeCircle(lx, ly + 20, 44);
    ringGfx.fillStyle(0xFFFFFF, 0.55);
    ringGfx.fillCircle(lx, ly + 20, 11);

    addTxt(lx, ly - 56, 'MOVE', {
      fontFamily: '"Press Start 2P"', fontSize: '13px',
      color: '#AACCFF', stroke: '#000033', strokeThickness: 3,
    });
    addTxt(lx, ly + 76, 'drag anywhere', {
      fontFamily: '"Press Start 2P"', fontSize: '7px',
      color: '#CCDDFF', stroke: '#000033', strokeThickness: 2,
    });
    addTxt(lx, ly + 96, 'swipe \u2191 to jump', {
      fontFamily: '"Press Start 2P"', fontSize: '7px',
      color: '#CCDDFF', stroke: '#000033', strokeThickness: 2,
    });

    // ── Divider ────────────────────────────────────────────────────────────
    const dv = addGfx();
    dv.lineStyle(1, 0xFFFFFF, 0.20);
    dv.lineBetween(W * 0.5, H * 0.28, W * 0.5, H * 0.72);

    // ── Right zone panel ───────────────────────────────────────────────────
    const rx = W * 0.75;
    const ry = H * 0.48;

    addTxt(rx, ry - 56, 'JUMP', {
      fontFamily: '"Press Start 2P"', fontSize: '13px',
      color: '#FFAACC', stroke: '#330011', strokeThickness: 3,
    });
    addTxt(rx, ry + 20, '♥', {
      fontFamily: '"Press Start 2P"', fontSize: '52px',
      color: '#FF6B9D', stroke: '#660022', strokeThickness: 4,
    });
    addTxt(rx, ry + 76, 'tap anywhere', {
      fontFamily: '"Press Start 2P"', fontSize: '7px',
      color: '#FFCCDD', stroke: '#330011', strokeThickness: 2,
    });
    addTxt(rx, ry + 96, 'on this side', {
      fontFamily: '"Press Start 2P"', fontSize: '7px',
      color: '#FFCCDD', stroke: '#330011', strokeThickness: 2,
    });

    // ── Tap to start prompt ────────────────────────────────────────────────
    const prompt = addTxt(W * 0.5, H * 0.80, 'TAP TO START', {
      fontFamily: '"Press Start 2P"', fontSize: '11px',
      color: '#FFFFFF', stroke: '#000000', strokeThickness: 3,
    });
    s.tweens.add({
      targets: prompt, alpha: 0.2, duration: 600,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // ── Dismiss logic ──────────────────────────────────────────────────────
    this._tutorialActive = true;

    const dismiss = () => {
      if (!this._tutorialActive) return;
      this._tutorialActive = false;
      s.input.off('pointerdown', dismiss);
      els.forEach(el => {
        s.tweens.add({
          targets: el, alpha: 0, duration: 350,
          onComplete: () => { if (el && el.destroy) el.destroy(); },
        });
      });
    };

    // Wait 400 ms before accepting input (prevents instant auto-dismiss)
    s.time.delayedCall(400, () => s.input.once('pointerdown', dismiss));
    // Auto-dismiss after 10 s
    s.time.delayedCall(10000, dismiss);
  }

  // ── Input ────────────────────────────────────────────────────────────────

  _setupInput() {
    const s = this.scene;
    s.input.on('pointerdown',      p => this._onDown(p));
    s.input.on('pointermove',      p => this._onMove(p));
    s.input.on('pointerup',        p => this._onUp(p));
    s.input.on('pointerupoutside', p => this._onUp(p));
  }

  _onDown(pointer) {
    const W = this.scene.scale.width;

    if (pointer.x <= W * 0.5) {
      // ── Left half: movement ──────────────────────────────────────────────
      if (this._moveTouchId !== null) return;   // already tracking one finger
      this._moveTouchId     = pointer.id;
      this._originX         = pointer.x;
      this._originY         = pointer.y;
      this._swipeJumpActive = false;
      this._drawRing(pointer.x, pointer.y, pointer.x, pointer.y);

    } else {
      // ── Right half: jump ─────────────────────────────────────────────────
      if (this._jumpTouchId !== null) return;   // already tracking one finger
      this._jumpTouchId = pointer.id;
      if (!this._rightJumpWasDown) {
        this.jumpPressed       = true;
        this._rightJumpWasDown = true;
      }
      this.jumpHeld = true;
      this._jumpHint.setAlpha(0.95);
    }
  }

  _onMove(pointer) {
    if (pointer.id !== this._moveTouchId) return;

    const dx = pointer.x - this._originX;
    const dy = pointer.y - this._originY;

    // Horizontal movement — dead-zone prevents accidental triggers
    this.leftDown  = dx < -this._DRAG_MIN;
    this.rightDown = dx >  this._DRAG_MIN;

    // Upward swipe → jump
    if (dy < this._SWIPE_UP && Math.abs(dx) < 60) {
      this.jumpPressed      = true;
      this.jumpHeld         = true;
      this._swipeJumpActive = true;          // keep jumpHeld true while finger stays down
      this._jumpHint.setAlpha(0.9);
      this._originY = pointer.y;             // reset so swipe can't re-fire next frame
    }

    this._drawRing(this._originX, this._originY, pointer.x, pointer.y);
  }

  _onUp(pointer) {
    if (pointer.id === this._moveTouchId) {
      this._moveTouchId     = null;
      this.leftDown         = false;
      this.rightDown        = false;
      this._swipeJumpActive = false;
      this._hideRing();
    }

    if (pointer.id === this._jumpTouchId) {
      this._jumpTouchId      = null;
      this._rightJumpWasDown = false;
      this._jumpHint.setAlpha(0.45);
    }

    // Recompute jumpHeld from live touch state
    this.jumpHeld = (this._jumpTouchId !== null) || this._swipeJumpActive;
  }

  // ── Drag ring rendering ───────────────────────────────────────────────────

  _drawRing(ox, oy, cx, cy) {
    const g    = this._dragGfx;
    const dx   = cx - ox;
    const dy   = cy - oy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const R    = 40;   // ring radius in game pixels

    g.clear();

    // Outer anchor ring
    g.lineStyle(2, 0xFFFFFF, 0.28);
    g.strokeCircle(ox, oy, R);

    // Clamp the finger indicator to the ring edge
    const clamp = Math.min(dist, R);
    const ang   = dist > 0 ? Math.atan2(dy, dx) : 0;
    const tx    = ox + Math.cos(ang) * clamp;
    const ty    = oy + Math.sin(ang) * clamp;

    // Line from anchor to finger dot
    g.lineStyle(1.5, 0xFFFFFF, 0.30);
    g.lineBetween(ox, oy, tx, ty);

    // Finger dot — tinted pink when moving
    const isMoving = Math.abs(dx) > this._DRAG_MIN;
    g.fillStyle(isMoving ? 0xFFCCEE : 0xFFFFFF, 0.65);
    g.fillCircle(tx, ty, 12);

    // Direction pip on ring edge — blue for left, pink for right
    if (isMoving) {
      const ex = ox + Math.cos(ang) * R;
      const ey = oy + Math.sin(ang) * R;
      g.fillStyle(dx < 0 ? 0x88CCFF : 0xFFCCDD, 0.80);
      g.fillCircle(ex, ey, 5);
    }

    g.setAlpha(0.75);
  }

  _hideRing() {
    this._dragGfx.clear();
    this._dragGfx.setAlpha(0);
  }
}
