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
 *   2. Write 5 sweet messages for the Love Letters (💌)
 *      — Try real memories, inside jokes, or things you love about her
 *   3. Write 4 messages for the Golden Stars (⭐)
 *      — These could be her qualities, ways she makes you feel, etc.
 *   4. Write the final birthday message in `ending`
 *   5. Drop a photo named `photo.jpg` into the `assets/` folder
 *      (optional — the game works without it too)
 *
 * Keep messages under ~180 characters so they fit nicely in the popup card.
 */

const GAME_DATA = {

  // ── Her name (shown on menu screen and end screen) ──────────────────────
  playerName: 'My Love',

  // ── 5 Love Letters 💌 ───────────────────────────────────────────────────
  // Collected in Act 1 (x3) and Act 2 (x2)
  // Try: shared memories, things she does that make you smile, inside jokes
  letters: [
    {
      title: 'A Sweet Memory',
      text:  'Replace this with your first sweet message. A real memory, an inside joke, or something that made you fall for her.',
    },
    {
      title: 'Something I Love',
      text:  'Write your second message here. Maybe the way she laughs, or something only the two of you would understand.',
    },
    {
      title: 'A Little Moment',
      text:  'Your third message. The little things matter the most — a quiet evening, a look, a moment you never want to forget.',
    },
    {
      title: 'You and Me',
      text:  'Your fourth message. Write something about the two of you together, where you\'ve been, or where you\'re going.',
    },
    {
      title: 'Just Because',
      text:  'Your fifth message. Tell her something you\'ve always wanted to say but never quite found the right moment.',
    },
  ],

  // ── 4 Golden Stars ⭐ ───────────────────────────────────────────────────
  // Collected in Act 2 (x2) and Act 3 (x2)
  // Try: her personality traits, her impact on you, what makes her extraordinary
  stars: [
    {
      title: 'What Makes You Shine',
      text:  'Write something about a quality you admire in her — something specific and true.',
    },
    {
      title: 'The Way You Are',
      text:  'Write about the way she makes you feel — safe, happy, inspired, seen. Be honest.',
    },
    {
      title: 'Your Superpower',
      text:  'Write about something she does effortlessly that amazes you every single time.',
    },
    {
      title: 'Irreplaceable',
      text:  'Write about what makes her uniquely, perfectly, irreplaceably her.',
    },
  ],

  // ── Final Birthday Screen ───────────────────────────────────────────────
  // Shown after collecting the Crystal Heart at the very end of the level
  ending: {
    headline: 'Happy Birthday! 🎂',

    // Your heartfelt birthday message — this is the big moment.
    // Use \n for line breaks. Keep it authentic and from the heart.
    message:
      'Write your birthday message here.\n\n' +
      'She just played through a whole adventure for you.\n\n' +
      'Make these words count. ♥',

    // If you have a photo, place it at: assets/photo.jpg
    // Set this to true to show it, false to skip.
    showPhoto: false,
  },

};
