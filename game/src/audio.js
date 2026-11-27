// Gobble Dash — synthesized sound, one job: every beep, gobble and fanfare
// is made here with WebAudio oscillators. No audio files, no network.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this._musicTimer = 0;
    this._melodyStep = 0;
    this._musicOn = false;
  }

  unlock() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
      } catch (err) {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.muted = muted;
  }

  _tone(freq, seconds, type, volume, when = 0, slideTo = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + seconds);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  _noise(seconds, volume, when = 0, lowpass = 1200) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(t0);
  }

  // The turkey's signature: three quick low gobbles, rising at the end.
  gobble() {
    this._tone(180, 0.09, 'square', 0.16, 0, 140);
    this._tone(170, 0.09, 'square', 0.16, 0.1, 130);
    this._tone(220, 0.14, 'square', 0.18, 0.2, 300);
  }

  flap() {
    this._noise(0.12, 0.2, 0, 900);
    this._tone(320, 0.08, 'sine', 0.1, 0, 520);
  }

  jump() {
    this._tone(300, 0.12, 'sine', 0.14, 0, 560);
  }

  pickupCorn() {
    this._tone(660, 0.09, 'triangle', 0.2);
    this._tone(990, 0.12, 'triangle', 0.2, 0.07);
  }

  pickupFeather() {
    this._tone(880, 0.08, 'sine', 0.16);
    this._tone(1174, 0.08, 'sine', 0.16, 0.06);
    this._tone(1568, 0.14, 'sine', 0.16, 0.12);
  }

  hit() {
    this._noise(0.18, 0.3, 0, 500);
    this._tone(140, 0.22, 'sawtooth', 0.22, 0, 60);
  }

  spotted() {
    this._tone(1100, 0.07, 'square', 0.12);
    this._tone(1100, 0.07, 'square', 0.12, 0.1);
  }

  stageHorn() {
    this._tone(392, 0.16, 'triangle', 0.2);
    this._tone(523, 0.16, 'triangle', 0.2, 0.12);
    this._tone(659, 0.28, 'triangle', 0.22, 0.24);
  }

  caught() {
    // Sad trombone: four descending notes, comic and final.
    const notes = [392, 370, 349, 311];
    notes.forEach((freq, i) => {
      this._tone(freq, 0.34, 'sawtooth', 0.14, i * 0.3, freq * 0.94);
    });
    this._tone(233, 0.7, 'sawtooth', 0.12, 1.25, 180);
  }

  escaped() {
    // Little Thanksgiving fanfare: a rising major arpeggio, twice.
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((freq, i) => {
      this._tone(freq, 0.18, 'triangle', 0.2, i * 0.11);
    });
    this.gobble();
  }

  click() {
    this._tone(700, 0.05, 'sine', 0.12);
  }

  // A sleepy banjo-ish pluck loop, one note per beat, scheduled from the game loop.
  startMusic() {
    this._musicOn = true;
  }

  stopMusic() {
    this._musicOn = false;
  }

  updateMusic(dt) {
    if (!this.ctx || this.muted || !this._musicOn) return;
    this._musicTimer -= dt;
    if (this._musicTimer > 0) return;
    this._musicTimer = 0.42;
    const melody = [262, 330, 392, 330, 294, 392, 440, 392, 330, 294, 262, 0];
    const note = melody[this._melodyStep % melody.length];
    this._melodyStep++;
    if (note > 0) this._tone(note, 0.32, 'triangle', 0.045);
  }
}
