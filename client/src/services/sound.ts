/**
 * SoundManager - Web Audio synthesiser (no audio files needed for the MVP).
 *
 * Sounds: engine, countdown, go, typing, error, combo, nitro, finish, victory.
 * To use real files instead, drop them in public/assets/sounds and map them in
 * SOUND_FILES below - loaded files automatically replace the synthesised version.
 */
export type SoundName = 'type' | 'error' | 'combo' | 'nitro' | 'countdown' | 'go' | 'finish' | 'victory' | 'click' | 'join';

export const SOUND_FILES: Record<SoundName, string | null> = {
  type: null,
  error: null,
  combo: null,
  nitro: null,
  countdown: null,
  go: null,
  finish: null,
  victory: null,
  click: null,
  join: null,
};

interface EngineNodes {
  low: OscillatorNode;
  high: OscillatorNode;
  filter: BiquadFilterNode;
  gain: GainNode;
}

class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private volume = 0.6;
  private readonly buffers = new Map<SoundName, AudioBuffer>();
  private noiseBuffer: AudioBuffer | null = null;
  private engine: EngineNodes | null = null;
  private lastTypeAt = 0;

  configure(enabled: boolean, volume: number): void {
    this.enabled = enabled;
    this.volume = volume;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(enabled ? volume : 0, this.ctx.currentTime, 0.03);
    }
    if (!enabled) this.stopEngine();
  }

  /** Browsers only allow audio after a user gesture - call this from click/keydown. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? this.volume : 0;
      this.master.connect(this.ctx.destination);
      void this.loadFiles();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private async loadFiles(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx) return;
    for (const [name, path] of Object.entries(SOUND_FILES) as [SoundName, string | null][]) {
      if (!path) continue;
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
        if (!response.ok) continue;
        this.buffers.set(name, await ctx.decodeAudioData(await response.arrayBuffer()));
      } catch {
        // keep the synthesised fallback
      }
    }
  }

  play(name: SoundName): void {
    const ctx = this.ctx;
    if (!this.enabled || !ctx || !this.master || ctx.state !== 'running') return;

    const file = this.buffers.get(name);
    if (file) {
      const source = ctx.createBufferSource();
      source.buffer = file;
      source.connect(this.master);
      source.start();
      return;
    }

    const t = ctx.currentTime;
    switch (name) {
      case 'type': {
        if (t - this.lastTypeAt < 0.025) return;
        this.lastTypeAt = t;
        this.blip(t, 1500 + Math.random() * 500, 0.025, 'square', 0.025);
        break;
      }
      case 'error':
        this.blip(t, 180, 0.13, 'sawtooth', 0.09, 90);
        break;
      case 'combo':
        this.blip(t, 880, 0.08, 'triangle', 0.1);
        this.blip(t + 0.07, 1320, 0.12, 'triangle', 0.1);
        break;
      case 'nitro':
        this.whoosh(t, 0.75, 0.3);
        this.blip(t, 180, 0.55, 'sawtooth', 0.08, 720);
        break;
      case 'countdown':
        this.blip(t, 660, 0.2, 'square', 0.1);
        break;
      case 'go':
        this.blip(t, 1320, 0.45, 'square', 0.12);
        break;
      case 'finish':
        [784, 988, 1175].forEach((f, i) => this.blip(t + i * 0.09, f, 0.18, 'triangle', 0.12));
        break;
      case 'victory':
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.blip(t + i * 0.12, f, 0.3, 'triangle', 0.13));
        break;
      case 'click':
        this.blip(t, 900, 0.05, 'triangle', 0.05);
        break;
      case 'join':
        this.blip(t, 600, 0.08, 'sine', 0.09);
        this.blip(t + 0.08, 900, 0.12, 'sine', 0.09);
        break;
    }
  }

  private blip(at: number, freq: number, duration: number, type: OscillatorType, gain: number, slideTo?: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + duration);
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(gain, at + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(env).connect(this.master);
    osc.start(at);
    osc.stop(at + duration + 0.03);
  }

  private whoosh(at: number, duration: number, gain: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    if (!this.noiseBuffer) {
      const length = Math.floor(ctx.sampleRate * 1.2);
      this.noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(400, at);
    filter.frequency.exponentialRampToValueAtTime(3200, at + duration * 0.6);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(gain, at + 0.05);
    env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter).connect(env).connect(this.master);
    source.start(at);
    source.stop(at + duration + 0.05);
  }

  startEngine(): void {
    const ctx = this.ctx;
    if (!this.enabled || !ctx || !this.master || this.engine || ctx.state !== 'running') return;
    const low = ctx.createOscillator();
    const high = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    low.type = 'sawtooth';
    high.type = 'square';
    low.frequency.value = 48;
    high.frequency.value = 97;
    filter.type = 'lowpass';
    filter.frequency.value = 380;
    gain.gain.value = 0.0001;
    low.connect(filter);
    high.connect(filter);
    filter.connect(gain).connect(this.master);
    low.start();
    high.start();
    gain.gain.setTargetAtTime(0.025, ctx.currentTime, 0.2);
    this.engine = { low, high, filter, gain };
  }

  /** speed: 0 (idle) .. ~1.5 (very fast). */
  setEngine(speed: number, nitro: boolean): void {
    const ctx = this.ctx;
    if (!ctx || !this.engine) return;
    const t = ctx.currentTime;
    const s = Math.max(0, Math.min(1.5, speed));
    const base = 48 + s * 70 + (nitro ? 45 : 0);
    this.engine.low.frequency.setTargetAtTime(base, t, 0.12);
    this.engine.high.frequency.setTargetAtTime(base * 2.02, t, 0.12);
    this.engine.filter.frequency.setTargetAtTime(380 + s * 900 + (nitro ? 700 : 0), t, 0.12);
    this.engine.gain.gain.setTargetAtTime(0.022 + Math.min(1, s) * 0.03 + (nitro ? 0.02 : 0), t, 0.15);
  }

  stopEngine(): void {
    const ctx = this.ctx;
    const engine = this.engine;
    if (!ctx || !engine) return;
    this.engine = null;
    engine.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08);
    engine.low.stop(ctx.currentTime + 0.4);
    engine.high.stop(ctx.currentTime + 0.4);
  }
}

export const sound = new SoundManager();
