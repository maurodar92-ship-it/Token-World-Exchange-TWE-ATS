/**
 * Solfeggio & Fibonacci Sacred Harmonics Web Audio Synthesis Engine
 * 
 * Synthesizes pure microtonal frequencies, Fibonacci sequence ratios,
 * 9 classical Solfeggio tones, Pythagorean 432 Hz tuning, and binaural beat entrainment.
 */

export interface SolfeggioFrequency {
  hz: number;
  name: string;
  ancientSyllable: string;
  chakra: string;
  chakraColor: string;
  description: string;
  benefits: string[];
}

export interface FibonacciFrequency {
  index: number;
  fibNumber: number;
  hz: number;
  name: string;
  phiRatio: number;
  description: string;
  spectralColor: string;
}

export const SOLFEGGIO_FREQUENCIES: SolfeggioFrequency[] = [
  {
    hz: 174,
    name: "Foundation & Pain Alleviation",
    ancientSyllable: "Nu",
    chakra: "Sub-Physical / Earth Star",
    chakraColor: "#8E9299",
    description: "Natural anesthetic frequency. Relieves somatic tension and provides a secure foundation.",
    benefits: ["Pain reduction", "Emotional grounding", "Stress relief", "Bio-field stabilization"],
  },
  {
    hz: 285,
    name: "Cellular Restructuring & Quantum Field",
    ancientSyllable: "Xi",
    chakra: "Auric Field / Root Support",
    chakraColor: "#A855F7",
    description: "Encourages cellular rejuvenation, tissue balance, and bio-energetic realignment.",
    benefits: ["Cellular regeneration", "Rapid recovery", "Energetic restructuring", "Auric clearing"],
  },
  {
    hz: 396,
    name: "Liberating Guilt & Overcoming Fear",
    ancientSyllable: "Ut",
    chakra: "Root Chakra (Muladhara)",
    chakraColor: "#EF4444",
    description: "Cleanses subconscious fear, anxiety, and remorse. Grounds spiritual energy into physical form.",
    benefits: ["Dissolves fear & guilt", "Deep emotional security", "Overcomes past grief", "Grounds intent"],
  },
  {
    hz: 417,
    name: "Undoing Situations & Facilitating Change",
    ancientSyllable: "Re",
    chakra: "Sacral Chakra (Svadhisthana)",
    chakraColor: "#F97316",
    description: "Clears traumatic experiences and facilitates positive transformation, breaking negative habit loops.",
    benefits: ["Dissolves trauma", "Sparks creative flow", "Encourages adaptivity", "Clears stagnation"],
  },
  {
    hz: 528,
    name: "Transformation, Miracles & DNA Repair",
    ancientSyllable: "Mi",
    chakra: "Solar Plexus (Manipura)",
    chakraColor: "#EAB308",
    description: "The 'Miracle Tone' or 'Love Frequency'. Used in biochemistry and sound therapy to restore natural equilibrium.",
    benefits: ["DNA resonance", "Deep inner peace", "Life force amplification", "Transformation catalyst"],
  },
  {
    hz: 639,
    name: "Harmonizing Relationships & Connection",
    ancientSyllable: "Fa",
    chakra: "Heart Chakra (Anahata)",
    chakraColor: "#10B981",
    description: "Enhances interpersonal harmony, empathy, communication, and heart-centered coherence.",
    benefits: ["Empathy expansion", "Heals relationship strain", "Heart-brain coherence", "Compassionate clarity"],
  },
  {
    hz: 741,
    name: "Awakening Intuition & Conscious Expression",
    ancientSyllable: "Sol",
    chakra: "Throat Chakra (Vishuddha)",
    chakraColor: "#06B6D4",
    description: "Promotes authentic self-expression, mental clarity, and cleansing of electromagnetic toxic load.",
    benefits: ["Intuition activation", "Clear vocal expression", "Removes electromagnetic fog", "Problem solving"],
  },
  {
    hz: 852,
    name: "Returning to Spiritual Order & Clarity",
    ancientSyllable: "La",
    chakra: "Third Eye Chakra (Ajna)",
    chakraColor: "#6366F1",
    description: "Opens inner vision, dreams, telepathic connection, and dissolves psychological illusions.",
    benefits: ["Pineal stimulation", "Inner visionary clarity", "Spiritual alignment", "Lucid awareness"],
  },
  {
    hz: 963,
    name: "Cosmic Consciousness & Crown Awakening",
    ancientSyllable: "Si",
    chakra: "Crown Chakra (Sahasrara)",
    chakraColor: "#EC4899",
    description: "Connects individual awareness to the unified cosmic grid. Pure oneness and transcendent peace.",
    benefits: ["Crown chakra awakening", "Oneness experience", "Cosmic grid resonance", "Transcendental stillness"],
  },
];

export const FIBONACCI_FREQUENCIES: FibonacciFrequency[] = [
  {
    index: 8,
    fibNumber: 34,
    hz: 34,
    name: "Primordial Sub-Bass",
    phiRatio: 34 / 21,
    description: "34 Hz deep somatic pulse. Connects bodily rhythm to fundamental planetary resonance.",
    spectralColor: "#78350F",
  },
  {
    index: 9,
    fibNumber: 55,
    hz: 55,
    name: "Golden Bass Foundation",
    phiRatio: 55 / 34,
    description: "55 Hz rich low A fundamental. Golden ratio sub-harmonic that anchors sound therapy meditations.",
    spectralColor: "#9A3412",
  },
  {
    index: 10,
    fibNumber: 89,
    hz: 89,
    name: "Sacred Pulse Rhythm",
    phiRatio: 89 / 55,
    description: "89 Hz warmth tone. Fosters alpha brainwave synchrony and rhythmic grounding.",
    spectralColor: "#C2410C",
  },
  {
    index: 11,
    fibNumber: 144,
    hz: 144,
    name: "Sacred Octave (12² Light Key)",
    phiRatio: 144 / 89,
    description: "144 Hz (12x12). Sacred geometric harmonic connected to solar geometry and mental coherence.",
    spectralColor: "#EAB308",
  },
  {
    index: 12,
    fibNumber: 233,
    hz: 233,
    name: "Golden Heart Ratio",
    phiRatio: 233 / 144,
    description: "233 Hz heart opening tone. Natural bridge between lower physical and higher cognitive centers.",
    spectralColor: "#10B981",
  },
  {
    index: 13,
    fibNumber: 377,
    hz: 377,
    name: "Spiral Wave Harmonic",
    phiRatio: 377 / 233,
    description: "377 Hz golden spiral resonance. Modulates cerebral hemispheres into unified flow state.",
    spectralColor: "#06B6D4",
  },
  {
    index: 14,
    fibNumber: 610,
    hz: 610,
    name: "Crystalline Chime",
    phiRatio: 610 / 377,
    description: "610 Hz crystalline clarity tone. Cleanses perceptual stagnation and sharpens cognitive acuity.",
    spectralColor: "#3B82F6",
  },
  {
    index: 15,
    fibNumber: 987,
    hz: 987,
    name: "Pineal Light Vector",
    phiRatio: 987 / 610,
    description: "987 Hz high golden frequency. Calms emotional turmoil and encourages profound focus.",
    spectralColor: "#8B5CF6",
  },
  {
    index: 16,
    fibNumber: 1597,
    hz: 1597,
    name: "Celestial Golden Overtone",
    phiRatio: 1597 / 987,
    description: "1597 Hz celestial shimmer. Creates pristine spatial depth and expansive acoustic clarity.",
    spectralColor: "#D946EF",
  },
  {
    index: 17,
    fibNumber: 2584,
    hz: 2584,
    name: "Hyper-Harmonic Brilliance",
    phiRatio: 2584 / 1597,
    description: "2584 Hz cosmic acoustic shimmer. High-frequency energetic cleansing.",
    spectralColor: "#F43F5E",
  },
];

// Special Sacred Tuning Frequencies
export const SPECIAL_SACRED_TUNINGS = [
  { hz: 432, name: "Pythagorean Verdi 432 Hz", description: "Natural sacred geometry water-crystalline pitch (A=432Hz)" },
  { hz: 528, name: "Solfeggio Miracle 528 Hz", description: "Universal love frequency & molecular biological harmony" },
  { hz: 108, name: "Vedic Cosmic Constant 108 Hz", description: "Sun-Earth-Moon distance ratio harmonic" },
  { hz: 111, name: "Temple Acoustic 111 Hz", description: "Ancient temple chamber resonance triggering cellular stillness" },
];

export type HarmonicsSoundMode =
  | "pure_sine"
  | "harmonic_rich"
  | "binaural_beats"
  | "fibonacci_arpeggiator"
  | "solfeggio_cascade"
  | "ambient_drone";

export type BinauralBrainwaveState = "delta" | "theta" | "alpha" | "beta" | "gamma";

export interface HarmonicsEngineState {
  isPlaying: boolean;
  activeFrequency: number;
  activeLabel: string;
  mode: HarmonicsSoundMode;
  volume: number; // 0 to 1
  isMuted: boolean;
  binauralBeatHz: number; // e.g. 7.83 Hz (Schumann)
  binauralBrainwave: BinauralBrainwaveState;
  noiseLayerActive: boolean;
  arpeggiatorSpeedMs: number;
  currentArpStep: number;
}

class HarmonicsAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Primary oscillators & gains
  private oscLeft: OscillatorNode | null = null;
  private oscRight: OscillatorNode | null = null;
  private oscHarmonic: OscillatorNode | null = null;
  private pannerLeft: StereoPannerNode | null = null;
  private pannerRight: StereoPannerNode | null = null;

  // Pink noise / bed generator
  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;

  // Arpeggiator timer
  private arpTimer: any = null;
  private arpStep: number = 0;

  // Current engine parameters
  private state: HarmonicsEngineState = {
    isPlaying: false,
    activeFrequency: 528,
    activeLabel: "528 Hz • Transformation & Miracles",
    mode: "harmonic_rich",
    volume: 0.35,
    isMuted: false,
    binauralBeatHz: 7.83, // Schumann Resonance
    binauralBrainwave: "theta",
    noiseLayerActive: false,
    arpeggiatorSpeedMs: 600,
    currentArpStep: 0,
  };

  private listeners: Set<(state: HarmonicsEngineState) => void> = new Set();

  private initAudioContext(): AudioContext {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.state.isMuted ? 0 : this.state.volume, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.85;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    return this.ctx;
  }

  public getState(): HarmonicsEngineState {
    return { ...this.state };
  }

  public subscribe(callback: (state: HarmonicsEngineState) => void): () => void {
    this.listeners.add(callback);
    callback(this.getState());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((cb) => {
      try {
        cb(s);
      } catch (err) {
        console.warn("Error in harmonics listener", err);
      }
    });
  }

  /**
   * Set playback frequency in Hertz
   */
  public setFrequency(hz: number, label?: string) {
    const clamped = Math.max(20, Math.min(3000, hz));
    this.state.activeFrequency = clamped;
    this.state.activeLabel = label || `${clamped} Hz Sacred Tone`;

    if (this.state.isPlaying) {
      this.applyFrequencyToNodes();
    }

    this.notify();
  }

  /**
   * Set operational sound mode
   */
  public setMode(mode: HarmonicsSoundMode) {
    this.state.mode = mode;
    if (this.state.isPlaying) {
      this.rebuildAudioChain();
    }
    this.notify();
  }

  /**
   * Set master volume (0.0 to 1.0)
   */
  public setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.state.volume = clamped;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.state.isMuted ? 0 : clamped, this.ctx.currentTime);
    }
    this.notify();
  }

  /**
   * Toggle mute
   */
  public toggleMute() {
    this.state.isMuted = !this.state.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.state.isMuted ? 0 : this.state.volume,
        this.ctx.currentTime
      );
    }
    this.notify();
  }

  /**
   * Set binaural beat difference frequency (e.g. 7.83 Hz Theta / Schumann)
   */
  public setBinauralBeatHz(deltaHz: number, stateName?: BinauralBrainwaveState) {
    this.state.binauralBeatHz = Math.max(0.1, Math.min(40, deltaHz));
    if (stateName) {
      this.state.binauralBrainwave = stateName;
    } else {
      if (deltaHz <= 4) this.state.binauralBrainwave = "delta";
      else if (deltaHz <= 8) this.state.binauralBrainwave = "theta";
      else if (deltaHz <= 13) this.state.binauralBrainwave = "alpha";
      else if (deltaHz <= 30) this.state.binauralBrainwave = "beta";
      else this.state.binauralBrainwave = "gamma";
    }

    if (this.state.isPlaying && this.state.mode === "binaural_beats") {
      this.applyFrequencyToNodes();
    }

    this.notify();
  }

  /**
   * Toggle ambient pink noise bed
   */
  public toggleNoiseBed() {
    this.state.noiseLayerActive = !this.state.noiseLayerActive;
    if (this.state.isPlaying) {
      if (this.state.noiseLayerActive) {
        this.startNoiseBed();
      } else {
        this.stopNoiseBed();
      }
    }
    this.notify();
  }

  /**
   * Play or Pause master toggle
   */
  public togglePlay(): boolean {
    if (this.state.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  /**
   * Start playback
   */
  public start() {
    try {
      const ctx = this.initAudioContext();
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      this.state.isPlaying = true;
      this.rebuildAudioChain();
      this.notify();
    } catch (err) {
      console.warn("Could not start Harmonics Audio Engine:", err);
    }
  }

  /**
   * Stop playback
   */
  public stop() {
    this.state.isPlaying = false;
    this.stopOscillators();
    this.stopArpeggiator();
    this.stopNoiseBed();
    this.notify();
  }

  private stopOscillators() {
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      // Fade out smoothly over 50ms to prevent clicking
      if (this.oscLeft) {
        try { this.oscLeft.stop(now + 0.05); } catch {}
        this.oscLeft = null;
      }
      if (this.oscRight) {
        try { this.oscRight.stop(now + 0.05); } catch {}
        this.oscRight = null;
      }
      if (this.oscHarmonic) {
        try { this.oscHarmonic.stop(now + 0.05); } catch {}
        this.oscHarmonic = null;
      }
    }
  }

  private rebuildAudioChain() {
    this.stopOscillators();
    this.stopArpeggiator();

    if (!this.state.isPlaying) return;

    const ctx = this.initAudioContext();
    const now = ctx.currentTime;

    if (this.state.mode === "fibonacci_arpeggiator") {
      this.startFibonacciArpeggiator();
      return;
    }

    if (this.state.mode === "solfeggio_cascade") {
      this.startSolfeggioCascade();
      return;
    }

    // 1. Left Channel Oscillator
    const oscL = ctx.createOscillator();
    const gainL = ctx.createGain();
    const pannerL = ctx.createStereoPanner();
    pannerL.pan.value = -0.7;

    // 2. Right Channel Oscillator
    const oscR = ctx.createOscillator();
    const gainR = ctx.createGain();
    const pannerR = ctx.createStereoPanner();
    pannerR.pan.value = 0.7;

    // Set wave type based on mode
    if (this.state.mode === "pure_sine") {
      oscL.type = "sine";
      oscR.type = "sine";
    } else if (this.state.mode === "harmonic_rich" || this.state.mode === "ambient_drone") {
      oscL.type = "sine";
      oscR.type = "triangle";
    } else {
      oscL.type = "sine";
      oscR.type = "sine";
    }

    const baseFreq = this.state.activeFrequency;
    const delta = this.state.mode === "binaural_beats" ? this.state.binauralBeatHz : 0;

    oscL.frequency.setValueAtTime(baseFreq, now);
    oscR.frequency.setValueAtTime(baseFreq + delta, now);

    gainL.gain.setValueAtTime(0.001, now);
    gainL.gain.exponentialRampToValueAtTime(0.4, now + 0.1);

    gainR.gain.setValueAtTime(0.001, now);
    gainR.gain.exponentialRampToValueAtTime(0.4, now + 0.1);

    oscL.connect(gainL);
    gainL.connect(pannerL);
    pannerL.connect(this.masterGain!);

    oscR.connect(gainR);
    gainR.connect(pannerR);
    pannerR.connect(this.masterGain!);

    oscL.start(now);
    oscR.start(now);

    this.oscLeft = oscL;
    this.oscRight = oscR;
    this.pannerLeft = pannerL;
    this.pannerRight = pannerR;

    // Optional third golden ratio overtone
    if (this.state.mode === "harmonic_rich" || this.state.mode === "ambient_drone") {
      const oscH = ctx.createOscillator();
      const gainH = ctx.createGain();
      oscH.type = "sine";
      // Golden ratio microtonal overtone
      const phiOvertone = baseFreq * 1.6180339887;
      oscH.frequency.setValueAtTime(phiOvertone <= 2400 ? phiOvertone : baseFreq * 0.618, now);

      gainH.gain.setValueAtTime(0.001, now);
      gainH.gain.exponentialRampToValueAtTime(0.12, now + 0.2);

      oscH.connect(gainH);
      gainH.connect(this.masterGain!);
      oscH.start(now);
      this.oscHarmonic = oscH;
    }

    if (this.state.noiseLayerActive) {
      this.startNoiseBed();
    }
  }

  private applyFrequencyToNodes() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const baseFreq = this.state.activeFrequency;
    const delta = this.state.mode === "binaural_beats" ? this.state.binauralBeatHz : 0;

    if (this.oscLeft) {
      this.oscLeft.frequency.setTargetAtTime(baseFreq, now, 0.05);
    }
    if (this.oscRight) {
      this.oscRight.frequency.setTargetAtTime(baseFreq + delta, now, 0.05);
    }
    if (this.oscHarmonic) {
      const phiOvertone = baseFreq * 1.6180339887;
      this.oscHarmonic.frequency.setTargetAtTime(phiOvertone <= 2400 ? phiOvertone : baseFreq * 0.618, now, 0.05);
    }
  }

  // Fibonacci Golden Spiral Sequencer
  private startFibonacciArpeggiator() {
    this.stopArpeggiator();
    this.arpStep = 0;

    const playStep = () => {
      if (!this.state.isPlaying || this.state.mode !== "fibonacci_arpeggiator") {
        this.stopArpeggiator();
        return;
      }

      const item = FIBONACCI_FREQUENCIES[this.arpStep % FIBONACCI_FREQUENCIES.length];
      this.state.activeFrequency = item.hz;
      this.state.activeLabel = `Fibonacci F_${item.index} = ${item.fibNumber} (${item.hz} Hz)`;
      this.state.currentArpStep = this.arpStep % FIBONACCI_FREQUENCIES.length;

      // Synthesize note chime
      this.triggerBellChime(item.hz, item.spectralColor);
      this.arpStep++;
      this.notify();

      this.arpTimer = setTimeout(playStep, this.state.arpeggiatorSpeedMs);
    };

    playStep();
  }

  // Solfeggio 9-tone meditative cascade
  private startSolfeggioCascade() {
    this.stopArpeggiator();
    this.arpStep = 0;

    const playStep = () => {
      if (!this.state.isPlaying || this.state.mode !== "solfeggio_cascade") {
        this.stopArpeggiator();
        return;
      }

      const item = SOLFEGGIO_FREQUENCIES[this.arpStep % SOLFEGGIO_FREQUENCIES.length];
      this.state.activeFrequency = item.hz;
      this.state.activeLabel = `${item.hz} Hz • ${item.name}`;
      this.state.currentArpStep = this.arpStep % SOLFEGGIO_FREQUENCIES.length;

      this.triggerWarmChord(item.hz);
      this.arpStep++;
      this.notify();

      this.arpTimer = setTimeout(playStep, 2400); // 2.4s peaceful meditative breaths
    };

    playStep();
  }

  private triggerBellChime(hz: number, _color?: string) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(hz, now);

    // Bell chime envelope (instant attack, exponential decay)
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (this.state.arpeggiatorSpeedMs / 1000) * 1.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + (this.state.arpeggiatorSpeedMs / 1000) * 1.6);
  }

  private triggerWarmChord(rootHz: number) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const frequencies = [rootHz, rootHz * 1.5, rootHz * 2]; // Root + Fifth + Octave
    frequencies.forEach((f, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(f, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18 / (i + 1), now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.3);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 2.35);
    });
  }

  private stopArpeggiator() {
    if (this.arpTimer) {
      clearTimeout(this.arpTimer);
      this.arpTimer = null;
    }
  }

  // Pink noise / Oceanic backdrop
  private startNoiseBed() {
    this.stopNoiseBed();
    if (!this.ctx || !this.masterGain) return;

    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Generate pink noise approximation (1/f)
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
        b6 = white * 0.115926;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(480, this.ctx.currentTime); // gentle warm lowpass

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      noiseSource.start();
      this.noiseNode = noiseSource;
      this.noiseGain = noiseGain;
    } catch (e) {
      console.warn("Could not generate pink noise bed:", e);
    }
  }

  private stopNoiseBed() {
    if (this.noiseNode) {
      try { this.noiseNode.stop(); } catch {}
      this.noiseNode = null;
    }
    this.noiseGain = null;
  }

  /**
   * Get real-time waveform byte data for canvas oscilloscope
   */
  public getWaveformData(): Uint8Array | null {
    if (!this.analyser) return null;
    const data = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(data);
    return data;
  }

  /**
   * Get real-time frequency data for audio bars
   */
  public getFrequencyData(): Uint8Array | null {
    if (!this.analyser) return null;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }
}

export const harmonicsAudioEngine = new HarmonicsAudioEngine();
