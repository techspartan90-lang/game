import { GameSettings, WeatherType } from './types';

export const RADIO_STATIONS = [
  { name: 'Off', track: 'Radio Off', bpm: 0, rootHz: 0 },
  { name: 'Solana Sunset FM', track: 'Palm Horizon (Synth Chill)', bpm: 98, rootHz: 146.83 },
  { name: 'Bayfront Pulse 104.5', track: 'Neon Boulevard (Outrun)', bpm: 118, rootHz: 130.81 },
  { name: 'Marina Breeze 89.2', track: 'Tidewater Groove (Lo-Fi)', bpm: 84, rootHz: 164.81 },
];

export class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain!: GainNode;
  private sfxGain!: GainNode;
  private radioGain!: GainNode;

  // Engine synth
  private engineOsc1!: OscillatorNode;
  private engineOsc2!: OscillatorNode;
  private engineFilter!: BiquadFilterNode;
  private engineGain!: GainNode;

  // Tire screech & rain noise
  private screechGain!: GainNode;
  private rainGain!: GainNode;
  private oceanGain!: GainNode;

  // Police siren
  private sirenOsc!: OscillatorNode;
  private sirenGain!: GainNode;

  private initialized = false;
  private radioStep = 0;
  private radioAccum = 0;
  private settings: GameSettings;

  constructor(settings: GameSettings) {
    this.settings = { ...settings };
  }

  public unlock(): void {
    if (this.initialized) {
      if (this.ctx?.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.radioGain = this.ctx.createGain();

    this.sfxGain.connect(this.masterGain);
    this.radioGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // 1. Dynamic Engine Synthesizer
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc2.type = 'triangle';
    this.engineOsc1.frequency.value = 55;
    this.engineOsc2.frequency.value = 110;

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 260;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);
    this.engineOsc1.start();
    this.engineOsc2.start();

    // 2. Shared Filtered White Noise Buffer (Rain, Ocean, Tire Screech)
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Tire screech bandpass
    const screechSrc = this.ctx.createBufferSource();
    screechSrc.buffer = noiseBuffer;
    screechSrc.loop = true;
    const screechFilter = this.ctx.createBiquadFilter();
    screechFilter.type = 'bandpass';
    screechFilter.frequency.value = 1850;
    screechFilter.Q.value = 6.5;
    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.value = 0;
    screechSrc.connect(screechFilter);
    screechFilter.connect(this.screechGain);
    this.screechGain.connect(this.sfxGain);
    screechSrc.start();

    // Rain ambience
    const rainSrc = this.ctx.createBufferSource();
    rainSrc.buffer = noiseBuffer;
    rainSrc.loop = true;
    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1200;
    rainFilter.Q.value = 0.6;
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0;
    rainSrc.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.sfxGain);
    rainSrc.start();

    // Ocean surf ambience
    const oceanSrc = this.ctx.createBufferSource();
    oceanSrc.buffer = noiseBuffer;
    oceanSrc.loop = true;
    const oceanFilter = this.ctx.createBiquadFilter();
    oceanFilter.type = 'lowpass';
    oceanFilter.frequency.value = 340;
    this.oceanGain = this.ctx.createGain();
    this.oceanGain.gain.value = 0.02;
    oceanSrc.connect(oceanFilter);
    oceanFilter.connect(this.oceanGain);
    this.oceanGain.connect(this.sfxGain);
    oceanSrc.start();

    // 3. Police Siren Synthesizer
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.value = 660;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.sfxGain);
    this.sirenOsc.start();

    this.initialized = true;
    this.applySettings(this.settings);
  }

  public applySettings(settings: GameSettings): void {
    this.settings = { ...settings };
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(settings.masterVolume, now, 0.05);
    this.sfxGain.gain.setTargetAtTime(settings.sfxVolume, now, 0.05);
    this.radioGain.gain.setTargetAtTime(
      settings.radioEnabled && settings.radioStation > 0 ? settings.radioVolume * 0.28 : 0,
      now,
      0.08
    );
  }

  public update(
    dt: number,
    elapsed: number,
    inVehicle: boolean,
    rpm: number,
    drifting: boolean,
    weather: WeatherType,
    distToBeach: number,
    sirenProximity: number // 0..1
  ): void {
    if (!this.initialized || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    // Engine pitch & harmonic filter
    const targetEngineGain = inVehicle ? 0.085 + rpm * 0.075 : 0;
    this.engineGain.gain.setTargetAtTime(targetEngineGain, now, 0.06);
    if (inVehicle) {
      const baseHz = 46 + rpm * 155;
      this.engineOsc1.frequency.setTargetAtTime(baseHz, now, 0.04);
      this.engineOsc2.frequency.setTargetAtTime(baseHz * 2.01, now, 0.04);
      this.engineFilter.frequency.setTargetAtTime(220 + rpm * 1150, now, 0.05);
    }

    // Tire screech
    this.screechGain.gain.setTargetAtTime(inVehicle && drifting ? 0.08 : 0, now, 0.04);

    // Rain & Ocean surf ambience
    const rainLevel = weather === 'storm' ? 0.14 : weather === 'rain' ? 0.08 : 0;
    this.rainGain.gain.setTargetAtTime(rainLevel, now, 0.25);

    const beachFactor = Math.max(0.08, 1 - distToBeach / 130);
    const wavePulse = 0.65 + 0.35 * Math.sin(elapsed * 0.65);
    this.oceanGain.gain.setTargetAtTime(0.055 * beachFactor * wavePulse, now, 0.15);

    // Police siren wail
    const sirenVol = sirenProximity * 0.1;
    this.sirenGain.gain.setTargetAtTime(sirenVol, now, 0.08);
    if (sirenVol > 0.005) {
      const wail = 640 + Math.sin(elapsed * 5.2) * 260;
      this.sirenOsc.frequency.setTargetAtTime(wail, now, 0.03);
    }

    // Procedural In-Car Radio Sequencer
    const station = RADIO_STATIONS[this.settings.radioStation] || RADIO_STATIONS[0];
    if (inVehicle && this.settings.radioEnabled && station.bpm > 0) {
      this.radioGain.gain.setTargetAtTime(this.settings.radioVolume * 0.28, now, 0.12);
      const stepDur = 60 / station.bpm / 2;
      this.radioAccum += dt;
      if (this.radioAccum >= stepDur) {
        this.radioAccum -= stepDur;
        this.playRadioNote(station.rootHz, this.radioStep);
        this.radioStep = (this.radioStep + 1) % 16;
      }
    } else {
      this.radioGain.gain.setTargetAtTime(0, now, 0.15);
    }
  }

  private playRadioNote(rootHz: number, step: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const scale = [0, 3, 5, 7, 10, 12, 15, 7];
    const bassPattern = [0, 0, 0, 0, 5, 5, 3, 3, 7, 7, 5, 5, 3, 3, 2, 0];

    // Warm synth bass
    const semi = bassPattern[step % bassPattern.length];
    const freq = rootHz * Math.pow(2, semi / 12);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(g);
    g.connect(this.radioGain);
    osc.start(now);
    osc.stop(now + 0.28);

    // Coastal synth arpeggio chime on off-beats
    if (step % 2 === 0 || step % 5 === 0) {
      const leadSemi = scale[(step + 2) % scale.length];
      const leadOsc = this.ctx.createOscillator();
      const lg = this.ctx.createGain();
      leadOsc.type = 'sine';
      leadOsc.frequency.setValueAtTime(rootHz * 2 * Math.pow(2, leadSemi / 12), now);
      lg.gain.setValueAtTime(0.11, now);
      lg.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      leadOsc.connect(lg);
      lg.connect(this.radioGain);
      leadOsc.start(now);
      leadOsc.stop(now + 0.37);
    }
  }

  public playHorn(): void {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    for (const freq of [392, 493.88]) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1200;
      g.gain.setValueAtTime(0.12, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.connect(lp);
      lp.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  }

  public playFootstep(isSand: boolean): void {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isSand ? 95 : 145, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.06);
    g.gain.setValueAtTime(isSand ? 0.055 : 0.085, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playImpact(intensity: number): void {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.24);
    g.gain.setValueAtTime(0.24 * Math.min(1, intensity), now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playThunder(): void {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(72, now);
    osc.frequency.exponentialRampToValueAtTime(26, now + 1.4);
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1.6);
  }

  public playChime(isSuccess = true): void {
    if (!this.initialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = isSuccess ? [523.25, 659.25, 783.99] : [330, 261.63];
    notes.forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.08);
      g.gain.setValueAtTime(0.12, now + idx * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.38);
    });
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.initialized = false;
    }
  }
}
