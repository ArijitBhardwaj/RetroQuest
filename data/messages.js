/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║         A Journey to You — Personal Content              ║
 * ║                  EDIT THIS FILE!                         ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * This is the ONLY file you need to edit to personalise the game.
 *
 * Instructions:
 *   1. Change `playerName` to her name
 *   2. Edit the 5 Love Letter messages (💌)
 *   3. Edit the 4 Golden Star messages (⭐)
 *   4. Edit the 2 Space Power-up messages (🚀) — found in the space level
 *   5. Edit the final birthday message in `ending`
 *   6. Add your photos:
 *      - Drop TWO photos into assets_provided/ folder
 *      - Name them: photo1.jpg and photo2.jpg  (used during the game)
 *      - Name your final photo: final.jpg       (used at the end screen)
 *      (Game plays fine without photos — they just skip)
 *
 * Keep messages under ~200 characters so they fit nicely in the popup card.
 */

const GAME_DATA = {

  // ── Her name (shown on menu + end screen) ────────────────────────────────
  playerName: 'Sandy',

  // ── 5 Love Letters 💌 ─────────────────────────────────────────────────────
  letters: [
    {
      title: 'First One!',
      text:  'Already found one. Keep going — there\'s a lot more ahead.',
    },
    {
      title: 'Look How High!',
      text:  'You climbed all the way up here. Of course you did.',
    },
    {
      title: 'Still Going!',
      text:  'Three down. Act 2 is next — things are about to get interesting.',
    },
    {
      title: 'Welcome to Act 2',
      text:  'Tougher here. But you handle tough just fine.',
    },
    {
      title: 'Quick Hands!',
      text:  'Grabbed it right before it crumbled. That was close.',
    },
  ],

  // ── 2 Golden Stars ⭐ ─────────────────────────────────────────────────────
  stars: [
    {
      title: 'Star Earned!',
      text:  'That jump took nerve. Well earned.',
    },
    {
      title: 'Staircase Peak!',
      text:  'The hardest spot in the whole game. You made it.',
    },
  ],

  // ── 2 Space Power-ups 🚀 ─────────────────────────────────────────────────
  spacePowerups: [
    {
      title: 'Shields Restored!',
      text:  'Good timing. Now finish what you started.',
    },
    {
      title: 'Power Surge!',
      text:  'Fully charged. Make this last push count.',
    },
  ],

  // ── Photo reveals ─────────────────────────────────────────────────────────
  photoReveals: {
    letter3: 'assets_provided/photo1.jpg',
    star1:   'assets_provided/photo2.jpg',
  },

  // ── Final Screen ──────────────────────────────────────────────────────────
  ending: {
    headline: 'Happy Birthday!',

    message:
      'We crossed every gap,\n' +
      'climbed every peak,\n' +
      'and flew through space.\n\n' +
      'I am thankful to this day\n' +
      'that your tindi came here\n' +
      'and met me.\n\n' +
      'Stay happy and stay smiling.\n' +
      'May all your wishes come true.\n\n' +
      'I love youuu  ♥',

    showPhoto:  true,
    finalPhoto: 'assets_provided/final.jpg',
  },

};
