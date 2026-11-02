// ==============================================================================
// Generative Web Audio Soundscape Engine
// Synthesizes ambient generative music and genre tone overlays using native Web Audio API
// ==============================================================================

import { Web3Genre } from "../types";

export interface GenreSoundscapeConfig {
  bpm: number;
  volume: number; // 0 to 1
  activeGenres: Record<Web3Genre, boolean>;
  isMuted: boolean;
}

class GenreSoundscapeEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isRunning: boolean = false;
  private timerId: any = null;

  // Genre specific gain nodes for layering
  private genreGains: Record<Web3Genre, GainNode | null> = {
    defi_liquidity: null,
    onchain_identity: null,
    gaming_media: null,
    depin_infra: null,
  };

  private activeGenres: Record<Web3Genre, boolean> = {
    defi_liquidity: true,
    onchain_identity: false,
    gaming_media: false,
    depin_infra: false,
  };

  private masterVolume: number = 0.35;
  private isMuted: boolean = false;
  private bpm: number = 72;
  private step: number = 0;

  private listeners: Set<(state: { isPlaying: boolean; activeGenres: Record<Web3Genre, boolean>; volume: number; isMuted: boolean }) => void> = new Set();

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      // Create individual genre gain stages
      (Object.keys(this.genreGains) as Web3Genre[]).forEach((genre) => {
        if (!this.ctx || !this.masterGain) return;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(this.activeGenres[genre] ? 0.7 : 0, this.ctx.currentTime);
        g.connect(this.masterGain);
        this.genreGains[genre] = g;
      });
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    return this.ctx;
  }

  public togglePlay(): boolean {
    if (this.isRunning) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public start(): void {
    if (this.isRunning) return;
    try {
      const ctx = this.initContext();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      this.isRunning = true;
      this.scheduleLoop();
      this.notify();
    } catch (e) {
      console.warn("Could not start Web Audio soundscape:", e);
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.notify();
  }

  public getIsPlaying(): boolean {
    return this.isRunning;
  }

  public setVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime, 0.05);
    }
    this.notify();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime, 0.05);
    }
    this.notify();
    return this.isMuted;
  }

  public toggleGenreLayer(genre: Web3Genre, forceState?: boolean): void {
    const nextState = forceState !== undefined ? forceState : !this.activeGenres[genre];
    this.activeGenres[genre] = nextState;

    if (this.genreGains[genre] && this.ctx) {
      this.genreGains[genre]!.gain.setTargetAtTime(nextState ? 0.7 : 0, this.ctx.currentTime, 0.1);
    }

    // If starting any genre while not running, auto-start
    if (nextState && !this.isRunning) {
      this.start();
    }

    this.notify();
  }

  public setSoleGenre(genre: Web3Genre): void {
    (Object.keys(this.activeGenres) as Web3Genre[]).forEach((g) => {
      const active = g === genre;
      this.activeGenres[g] = active;
      if (this.genreGains[g] && this.ctx) {
        this.genreGains[g]!.gain.setTargetAtTime(active ? 0.8 : 0, this.ctx.currentTime, 0.1);
      }
    });

    if (!this.isRunning) {
      this.start();
    }
    this.notify();
  }

  public getActiveGenres(): Record<Web3Genre, boolean> {
    return { ...this.activeGenres };
  }

  public getAudioFrequencyData(): Uint8Array {
    if (!this.analyser) {
      return new Uint8Array(16);
    }
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  public subscribe(cb: (state: { isPlaying: boolean; activeGenres: Record<Web3Genre, boolean>; volume: number; isMuted: boolean }) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    const state = {
      isPlaying: this.isRunning,
      activeGenres: { ...this.activeGenres },
      volume: this.masterVolume,
      isMuted: this.isMuted,
    };
    this.listeners.forEach((cb) => cb(state));
  }

  // Synthesis engine step scheduler
  private scheduleLoop(): void {
    if (!this.isRunning) return;

    const secondsPerBeat = 60.0 / this.bpm;
    const stepDuration = (secondsPerBeat / 2) * 1000; // 8th note steps

    this.playStepNotes(this.step);
    this.step = (this.step + 1) % 16;

    this.timerId = setTimeout(() => {
      this.scheduleLoop();
    }, stepDuration);
  }

  private playStepNotes(step: number): void {
    if (!this.ctx || this.isMuted) return;

    const time = this.ctx.currentTime;

    // 1. DeFi Liquidity & Vaults (Resonant AMM Swell & Deep Harmonic Sub-Bass)
    if (this.activeGenres.defi_liquidity && this.genreGains.defi_liquidity) {
      const defiNotes = [110, 130.81, 146.83, 164.81, 196.0]; // A2, C3, D3, E3, G3
      if (step % 4 === 0) {
        const rootFreq = defiNotes[(step / 4) % defiNotes.length];
        this.synthWarmPad(rootFreq, 1.8, this.genreGains.defi_liquidity, time);
      }
      if (step % 8 === 0) {
        // Sub-bass root
        this.synthSubBass(55, 2.2, this.genreGains.defi_liquidity, time);
      }
    }

    // 2. On-Chain Identity & ENS/Vanity IDs (Cryptographic Chime & Pentatonic Hash Arp)
    if (this.activeGenres.onchain_identity && this.genreGains.onchain_identity) {
      const identityScale = [440, 523.25, 587.33, 659.25, 783.99, 880]; // A4, C5, D5, E5, G5, A5
      if (step % 2 === 0) {
        const noteIdx = (step * 3 + 2) % identityScale.length;
        this.synthCrystalBell(identityScale[noteIdx], 0.35, this.genreGains.onchain_identity, time);
      }
    }

    // 3. Gaming & Generative Digital Media (Dynamic 8-bit / Multiverse Chime Arpeggiator)
    if (this.activeGenres.gaming_media && this.genreGains.gaming_media) {
      const gamingScale = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99]; // C4, E4, G4, C5, E5, G5
      const noteIdx = (step * 5) % gamingScale.length;
      this.synthArpBlip(gamingScale[noteIdx], 0.18, this.genreGains.gaming_media, time);
    }

    // 4. Decentralized Physical Infrastructure (DePIN) (Pulsing Hardware Telemetry & Sensor Pings)
    if (this.activeGenres.depin_infra && this.genreGains.depin_infra) {
      if (step % 4 === 0) {
        // Hardware heartbeat
        this.synthTelemetryPulse(75, 0.22, this.genreGains.depin_infra, time);
      }
      if (step === 2 || step === 10) {
        // Sensor ping radio chirp
        this.synthRadioPing(1200, 0.08, this.genreGains.depin_infra, time);
      }
    }
  }

  // --- Voice Synthesizers ---

  private synthWarmPad(freq: number, duration: number, targetNode: GainNode, time: number): void {
    if (!this.ctx) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(freq * 1.004, time); // slight detune for warmth

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(450, time);
    filter.frequency.exponentialRampToValueAtTime(750, time + duration * 0.5);
    filter.frequency.exponentialRampToValueAtTime(300, time + duration);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.16, time + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(targetNode);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
  }

  private synthSubBass(freq: number, duration: number, targetNode: GainNode, time: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.22, time + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(targetNode);

    osc.start(time);
    osc.stop(time + duration);
  }

  private synthCrystalBell(freq: number, duration: number, targetNode: GainNode, time: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(targetNode);

    osc.start(time);
    osc.stop(time + duration);
  }

  private synthArpBlip(freq: number, duration: number, targetNode: GainNode, time: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, time);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freq * 1.5, time);
    filter.Q.setValueAtTime(3.0, time);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(targetNode);

    osc.start(time);
    osc.stop(time + duration);
  }

  private synthTelemetryPulse(freq: number, duration: number, targetNode: GainNode, time: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + duration);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(targetNode);

    osc.start(time);
    osc.stop(time + duration);
  }

  private synthRadioPing(freq: number, duration: number, targetNode: GainNode, time: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.2, time + duration);

    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(targetNode);

    osc.start(time);
    osc.stop(time + duration);
  }
}

export const soundscapeEngine = new GenreSoundscapeEngine();
export const genreSoundscapeEngine = soundscapeEngine;
