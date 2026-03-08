'use strict';

/**
 * AudioManager — procedural Web Audio API sound engine
 * Exposed as global: AUDIO
 * Works offline / file:// — no CORS, no external files.
 *
 * Also exposes: PHOTO_REVEAL
 * DOM overlay for smooth (non-pixelated) photo reveals.
 * Usage: PHOTO_REVEAL.show('assets_provided/photo1.jpg', callbackWhenDone)
 * Gracefully skips if the file doesn't exist.
 */
const AUDIO = (() => {
  let _ctx = null;
  let _musicSrc = null;
  let _musicGain = null;

  function ctx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  // One-shot oscillator helper
  function tone(freq, type, dur, vol, freqEnd) {
    const c = ctx();
    const t = c.currentTime;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    g.connect(c.destination);
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    o.connect(g);
    o.start(t);
    o.stop(t + dur + 0.01);
  }

  // Noise burst helper (explosions, impacts)
  function noiseBurst(dur, vol, filterFreq) {
    const c = ctx();
    const t = c.currentTime;
    const bufSize = Math.ceil(c.sampleRate * dur);
    const nBuf = c.createBuffer(1, bufSize, c.sampleRate);
    const nd = nBuf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) nd[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = nBuf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start(t); src.stop(t + dur);
  }

  // Generate a looping music buffer (8 seconds, then looped seamlessly)
  function _makeMusicBuffer(type) {
    const c = ctx();
    const sr = c.sampleRate;
    const dur = 8;
    const buf = c.createBuffer(1, sr * dur, sr);
    const d = buf.getChannelData(0);

    if (type === 'platform') {
      // Warm C-major pentatonic melody
      const mel = [261,330,392,523,659,523,392,330,261,330,392,523,392,330,196,261];
      const nd  = dur / mel.length;
      for (let i = 0; i < sr * dur; i++) {
        const t   = i / sr;
        const ni  = Math.floor(t / nd) % mel.length;
        const f   = mel[ni];
        const nt  = (t % nd) / nd;
        const env = nt < 0.08 ? nt / 0.08 : nt > 0.70 ? (1 - nt) / 0.30 : 1;
        d[i] = (Math.sin(2 * Math.PI * f * t) * 0.55
              + Math.sin(4 * Math.PI * f * t) * 0.15) * env * 0.07;
      }
      // Bass line
      const bass = [130, 98, 130, 146];
      const bd   = dur / 4;
      for (let i = 0; i < sr * dur; i++) {
        const t  = i / sr;
        const bi = Math.floor(t / bd) % 4;
        const bt = (t % bd) / bd;
        const e  = bt < 0.04 ? bt / 0.04 : bt > 0.86 ? (1 - bt) / 0.14 : 1;
        d[i] += Math.sin(2 * Math.PI * bass[bi] * t) * e * 0.05;
      }
    } else {
      // Dark space drone + minor arpeggio
      for (let i = 0; i < sr * dur; i++) {
        const t = i / sr;
        const lfo = 0.72 + 0.28 * Math.sin(2 * Math.PI * 0.18 * t);
        d[i] = (Math.sin(2 * Math.PI * 55 * t) * 0.10
              + Math.sin(2 * Math.PI * 82 * t) * 0.05) * lfo;
      }
      const mel = [220,261,311,370,311,261,196,220,174,196,233,261,233,196,174,220];
      const nd  = dur / mel.length;
      for (let i = 0; i < sr * dur; i++) {
        const t  = i / sr;
        const ni = Math.floor(t / nd) % mel.length;
        const f  = mel[ni];
        const nt = (t % nd) / nd;
        const env = nt < 0.10 ? nt / 0.10 : nt > 0.60 ? (1 - nt) / 0.40 : 1;
        d[i] += Math.sin(2 * Math.PI * f * t) * env * 0.05;
      }
    }

    return buf;
  }

  return {
    // ── Sound effects ────────────────────────────────────────────────────────

    jump() {
      tone(310, 'square', 0.14, 0.14, 580);
    },

    collect() {
      const c = ctx();
      const t = c.currentTime;
      [523, 659, 784].forEach((f, i) => {
        const g = c.createGain();
        g.gain.setValueAtTime(0.11, t + i * 0.07);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.22);
        g.connect(c.destination);
        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        o.connect(g);
        o.start(t + i * 0.07);
        o.stop(t + i * 0.07 + 0.23);
      });
    },

    collectStar() {
      const c = ctx();
      const t = c.currentTime;
      [523, 659, 784, 1047].forEach((f, i) => {
        const g = c.createGain();
        g.gain.setValueAtTime(0.14, t + i * 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.32);
        g.connect(c.destination);
        const o = c.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        o.connect(g);
        o.start(t + i * 0.06);
        o.stop(t + i * 0.06 + 0.33);
      });
    },

    photoReveal() {
      // Sparkle shimmer — ascending sine wave cascade
      const c = ctx();
      const t = c.currentTime;
      for (let i = 0; i < 8; i++) {
        const g = c.createGain();
        g.gain.setValueAtTime(0.06, t + i * 0.055);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.055 + 0.55);
        g.connect(c.destination);
        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.value = 400 + i * 200;
        o.connect(g);
        o.start(t + i * 0.055);
        o.stop(t + i * 0.055 + 0.56);
      }
    },

    shoot() {
      tone(880, 'sawtooth', 0.09, 0.10, 200);
    },

    explosion(big = false) {
      noiseBurst(big ? 0.50 : 0.25, big ? 0.38 : 0.22, big ? 700 : 420);
      tone(60, 'sine', big ? 0.45 : 0.22, big ? 0.28 : 0.14);
    },

    board() {
      // Rising arpeggio — excitement of boarding the ship
      const c = ctx();
      const t = c.currentTime;
      [261, 330, 392, 523, 659, 784, 1047].forEach((f, i) => {
        const g = c.createGain();
        g.gain.setValueAtTime(0.16, t + i * 0.09);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.45);
        g.connect(c.destination);
        const o = c.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        o.connect(g);
        o.start(t + i * 0.09);
        o.stop(t + i * 0.09 + 0.46);
      });
    },

    victory() {
      // Triumphant fanfare
      const c = ctx();
      const t = c.currentTime;
      [[523,0],[659,0.12],[784,0.24],[1047,0.37],[784,0.56],[1047,0.70],[1047,0.95]].forEach(([f,dt]) => {
        const g = c.createGain();
        g.gain.setValueAtTime(0.20, t + dt);
        g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.55);
        g.connect(c.destination);
        const o = c.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        o.connect(g);
        o.start(t + dt);
        o.stop(t + dt + 0.56);
      });
    },

    // ── Music ────────────────────────────────────────────────────────────────

    startMusic(type) {
      this.stopMusic();
      try {
        const c = ctx();
        const buf = _makeMusicBuffer(type);
        _musicGain = c.createGain();
        _musicGain.gain.setValueAtTime(0, c.currentTime);
        _musicGain.gain.linearRampToValueAtTime(0.55, c.currentTime + 1.8);
        _musicGain.connect(c.destination);
        _musicSrc = c.createBufferSource();
        _musicSrc.buffer = buf;
        _musicSrc.loop = true;
        _musicSrc.connect(_musicGain);
        _musicSrc.start();
      } catch (e) {
        // AudioContext may be blocked before first user gesture — fine, game still works
      }
    },

    stopMusic() {
      try { if (_musicSrc) { _musicSrc.stop(); } } catch (e) {}
      _musicSrc = null;
      if (_musicGain) { _musicGain.disconnect(); _musicGain = null; }
    },

    fadeOutMusic(ms) {
      if (!_musicGain) return;
      const c = ctx();
      _musicGain.gain.setValueAtTime(_musicGain.gain.value, c.currentTime);
      _musicGain.gain.linearRampToValueAtTime(0, c.currentTime + ms / 1000);
      setTimeout(() => this.stopMusic(), ms + 120);
    },
  };
})();

// ─── Photo Reveal — DOM overlay ──────────────────────────────────────────────
const PHOTO_REVEAL = (() => {
  let _overlay = null;
  let _img     = null;
  let _cb      = null;
  let _autoDismissTimer = null;

  function _getEls() {
    if (!_overlay) {
      _overlay = document.getElementById('photo-overlay');
      _img     = _overlay.querySelector('img');
      // Both touchend and click — touchend fires immediately on Samsung,
      // click is the fallback for desktop
      _overlay.addEventListener('touchend', e => { e.preventDefault(); _dismiss(); }, { passive: false });
      _overlay.addEventListener('click', _dismiss);
    }
  }

  function _dismiss() {
    clearTimeout(_autoDismissTimer);
    if (!_overlay || !_overlay.classList.contains('visible')) return;
    _overlay.classList.remove('visible');
    // Wait for CSS fade-out (0.55s) + img scale transition before hiding
    setTimeout(() => {
      _overlay.style.display = 'none';
      _img.src = '';
      const cb = _cb;
      _cb = null;
      if (cb) cb();
    }, 600);
  }

  return {
    show(src, onDone) {
      _getEls();
      _cb = onDone || null;

      // Test if image loads — skip gracefully on 404 / missing file
      const test = new Image();
      test.onload = () => {
        _img.src = src;
        _overlay.style.display = 'flex';
        // Double rAF ensures display:flex is painted before CSS transitions begin
        requestAnimationFrame(() => requestAnimationFrame(() => {
          _overlay.classList.add('visible');
        }));
        if (typeof AUDIO !== 'undefined') AUDIO.photoReveal();
        // Auto-dismiss after 3.5 s (player can tap to dismiss sooner)
        _autoDismissTimer = setTimeout(_dismiss, 3500);
      };
      test.onerror = () => {
        // File missing — skip silently, fire callback immediately
        if (onDone) onDone();
      };
      test.src = src;
    },
  };
})();
