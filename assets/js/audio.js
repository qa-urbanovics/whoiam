// assets/js/audio.js
export class MusicEngine {
  constructor() {
    this.enabled = true;
    this._ctx = null;
    this._gain = null;
    this._timer = null;
    this._step = 0;
    this._playing = false;

    // Simple happy loop (notes in Hz)
    this._melody = [
      523.25, 659.25, 783.99, 659.25, // C5 E5 G5 E5
      587.33, 659.25, 880.00, 659.25, // D5 E5 A5 E5
      523.25, 659.25, 783.99, 659.25,
      493.88, 587.33, 659.25, 587.33  // B4 D5 E5 D5
    ];
    this._tempoMs = 160;
  }

  setEnabled(on) {
    this.enabled = !!on;
    if (!this.enabled) this.stop();
    // if enabled and already playing — keep playing
  }

  async start() {
    if (!this.enabled || this._playing) return;

    // Must be created after a user gesture
    if (!this._ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this._ctx = new AudioCtx();
      this._gain = this._ctx.createGain();
      this._gain.gain.value = 0.06; // gentle volume
      this._gain.connect(this._ctx.destination);
    }

    // In some browsers context starts "suspended"
    if (this._ctx.state === "suspended") {
      await this._ctx.resume();
    }

    this._playing = true;
    this._step = 0;

    const playNote = () => {
      if (!this._playing || !this.enabled) return;

      const freq = this._melody[this._step % this._melody.length];
      this._step++;

      const osc = this._ctx.createOscillator();
      const env = this._ctx.createGain();

      osc.type = "triangle";
      osc.frequency.value = freq;

      env.gain.setValueAtTime(0.0001, this._ctx.currentTime);
      env.gain.exponentialRampToValueAtTime(0.25, this._ctx.currentTime + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0001, this._ctx.currentTime + 0.14);

      osc.connect(env);
      env.connect(this._gain);

      osc.start();
      osc.stop(this._ctx.currentTime + 0.16);
    };

    this._timer = window.setInterval(playNote, this._tempoMs);
  }

  stop() {
    this._playing = false;
    if (this._timer) {
      window.clearInterval(this._timer);
      this._timer = null;
    }
  }
}
