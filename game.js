'use strict';

// ─── Global constants accessible by all scenes ───────────────────────────────
const GAME_W = 480;
const GAME_H = 854;

// Player physics — tuned for satisfying mobile feel
const PLAYER_SPEED    = 220;   // px/s horizontal
const PLAYER_JUMP_VEL = -600;  // px/s upward
const GRAVITY         = 900;   // px/s²

// Computed: max jump height ≈ 600²/(2×900) = 200px  (30% less than the 288px peak)
// Computed: full-speed jump distance ≈ 220 × (2×600/900) ≈ 293px
// Safe gap limit: ~270px (leaving margin for mobile reaction time)

// ─── Phaser configuration ────────────────────────────────────────────────────
const config = {
  type:      Phaser.AUTO,
  parent:    'game-container',   // render into our centering container
  autoFocus: true,               // grab keyboard focus immediately
  backgroundColor: '#1A0533',

  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width:      GAME_W,
    height:     GAME_H,
  },

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: GRAVITY },
      debug:   false,
    },
  },

  // Allow up to 4 simultaneous touch points (move + jump + spare fingers)
  input: {
    activePointers: 4,
  },

  // Scene order = startup order
  scene: [BootScene, PreloadScene, MenuScene, GameScene, SpaceScene, EndScene],
};

window.addEventListener('load', () => {
  const game = new Phaser.Game(config);

  // Ensure keyboard works on Chrome (including file://) by focusing the canvas
  game.events.once('ready', () => {
    game.canvas.setAttribute('tabindex', '0');
    game.canvas.focus();
  });

  // Re-focus if user clicks anywhere on the page
  document.addEventListener('pointerdown', () => game.canvas.focus(), { passive: true });
});
