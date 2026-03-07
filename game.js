'use strict';

// ─── Global constants accessible by all scenes ───────────────────────────────
const GAME_W = 480;
const GAME_H = 854;

// Player physics — tuned for satisfying mobile feel
const PLAYER_SPEED    = 220;   // px/s horizontal
const PLAYER_JUMP_VEL = -630;  // px/s upward
const GRAVITY         = 900;   // px/s²

// Computed: max jump height ≈ 630²/(2×900) ≈ 220px
// Computed: full-speed jump distance ≈ 220 × (2×630/900) ≈ 308px
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

  // Scene order = startup order
  scene: [BootScene, PreloadScene, MenuScene, GameScene, EndScene],
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
