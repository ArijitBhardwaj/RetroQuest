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

    // ── Jump hint ♥ (right zone) — always visible, subtle pulse ──────────
    this._jumpHint = s.add.text(W - 68, H - 90, '♥', {
      fontFamily: '"Press Start 2P"',
      fontSize:   '36px',
      color:      '#FF6B9D',
      stroke:     '#660022',
      strokeThickness: 3,
      shadow: { offsetX: 2, offsetY: 2, color: '#330011', blur: 0, fill: true },
    }).setScrollFactor(0).setDepth(150).setAlpha(0.45).setOrigin(0.5);

    s.tweens.add({
      targets:  this._jumpHint,
      scaleX:   1.18,
      scaleY:   1.18,
      duration: 720,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });

    // ── Text hints — fade away after 5 s so they don't clutter gameplay ──
    const leftHint = s.add.text(W * 0.25, H - 18,
      '\u2190 drag  /  \u2191 swipe jump', {
      fontFamily: '"Press Start 2P"',
      fontSize:   '6px',
      color:      '#FFFFFF',
    }).setScrollFactor(0).setDepth(150).setAlpha(0.22).setOrigin(0.5);

    const rightHint = s.add.text(W * 0.77, H - 18, 'tap jump', {
      fontFamily: '"Press Start 2P"',
      fontSize:   '6px',
      color:      '#FFAACC',
    }).setScrollFactor(0).setDepth(150).setAlpha(0.22).setOrigin(0.5);

    // Faint divider line between zones
    const divGfx = s.add.graphics().setScrollFactor(0).setDepth(148);
    divGfx.lineStyle(1, 0xFFFFFF, 0.06);
    divGfx.lineBetween(W * 0.5, H - 150, W * 0.5, H - 4);

    // Fade hints + divider out after 5 s
    s.time.delayedCall(5000, () => {
      s.tweens.add({
        targets:  [leftHint, rightHint, divGfx],
        alpha:    0,
        duration: 1500,
      });
    });
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
