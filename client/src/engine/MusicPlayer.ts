/* ============================================
   SHADOW NINJA - Music Player
   C64-style chiptune background music
   ============================================ */

// Last Ninja-inspired melody notes (C64 SID style)
// Notes in MIDI-like format: [note, duration in beats]
const MELODY = [
  // Main theme - mysterious and oriental
  [64, 0.5], [67, 0.5], [69, 1], [67, 0.5], [64, 0.5], [62, 1],
  [64, 0.5], [67, 0.5], [72, 1], [71, 0.5], [69, 0.5], [67, 1],
  [64, 0.5], [67, 0.5], [69, 1], [67, 0.5], [64, 0.5], [62, 1],
  [60, 0.5], [62, 0.5], [64, 1], [62, 0.5], [60, 0.5], [57, 2],
];

const BASS = [
  // Simple bass line
  [40, 1], [40, 1], [43, 1], [43, 1],
  [45, 1], [45, 1], [43, 1], [43, 1],
  [40, 1], [40, 1], [43, 1], [43, 1],
  [36, 1], [36, 1], [38, 1], [38, 1],
];

const ARPEGGIO = [
  // Arpeggiated background chords
  [52, 0.25], [55, 0.25], [59, 0.25], [55, 0.25],
  [52, 0.25], [55, 0.25], [59, 0.25], [55, 0.25],
  [55, 0.25], [59, 0.25], [62, 0.25], [59, 0.25],
  [55, 0.25], [59, 0.25], [62, 0.25], [59, 0.25],
  [57, 0.25], [60, 0.25], [64, 0.25], [60, 0.25],
  [57, 0.25], [60, 0.25], [64, 0.25], [60, 0.25],
  [55, 0.25], [59, 0.25], [62, 0.25], [59, 0.25],
  [55, 0.25], [59, 0.25], [62, 0.25], [59, 0.25],
  [48, 0.25], [52, 0.25], [55, 0.25], [52, 0.25],
  [48, 0.25], [52, 0.25], [55, 0.25], [52, 0.25],
  [50, 0.25], [53, 0.25], [57, 0.25], [53, 0.25],
  [50, 0.25], [53, 0.25], [57, 0.25], [53, 0.25],
];

class MusicPlayer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private tempo: number = 100; // BPM
  private volume: number = 0.03; // Very low volume for ambient music

  private melodyIndex: number = 0;
  private bassIndex: number = 0;
  private arpeggioIndex: number = 0;

  private nextMelodyTime: number = 0;
  private nextBassTime: number = 0;
  private nextArpeggioTime: number = 0;

  private schedulerInterval: number | null = null;

  init(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
  }

  private ensureInitialized(): boolean {
    if (!this.ctx) {
      this.init();
    }

    // Resume context if suspended (requires user gesture)
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    return this.ctx !== null;
  }

  play(): void {
    if (!this.ensureInitialized() || this.isPlaying || !this.ctx) return;

    this.isPlaying = true;
    this.melodyIndex = 0;
    this.bassIndex = 0;
    this.arpeggioIndex = 0;

    const now = this.ctx.currentTime;
    this.nextMelodyTime = now;
    this.nextBassTime = now;
    this.nextArpeggioTime = now;

    // Start scheduler
    this.schedulerInterval = window.setInterval(() => {
      this.schedule();
    }, 50);
  }

  stop(): void {
    this.isPlaying = false;
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }

  private schedule(): void {
    if (!this.ctx || !this.masterGain || !this.isPlaying) return;

    const lookAhead = 0.2; // Schedule 200ms ahead
    const now = this.ctx.currentTime;

    // Schedule melody
    while (this.nextMelodyTime < now + lookAhead) {
      const [note, duration] = MELODY[this.melodyIndex];
      this.playNote(note, this.nextMelodyTime, this.beatToSeconds(duration), 'square', 0.4);
      this.nextMelodyTime += this.beatToSeconds(duration);
      this.melodyIndex = (this.melodyIndex + 1) % MELODY.length;
    }

    // Schedule bass
    while (this.nextBassTime < now + lookAhead) {
      const [note, duration] = BASS[this.bassIndex];
      this.playNote(note, this.nextBassTime, this.beatToSeconds(duration), 'triangle', 0.5);
      this.nextBassTime += this.beatToSeconds(duration);
      this.bassIndex = (this.bassIndex + 1) % BASS.length;
    }

    // Schedule arpeggio
    while (this.nextArpeggioTime < now + lookAhead) {
      const [note, duration] = ARPEGGIO[this.arpeggioIndex];
      this.playNote(note, this.nextArpeggioTime, this.beatToSeconds(duration) * 0.8, 'sawtooth', 0.15);
      this.nextArpeggioTime += this.beatToSeconds(duration);
      this.arpeggioIndex = (this.arpeggioIndex + 1) % ARPEGGIO.length;
    }
  }

  private playNote(
    midiNote: number,
    time: number,
    duration: number,
    waveform: OscillatorType,
    velocity: number
  ): void {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const freq = this.midiToFreq(midiNote);

    osc.type = waveform;
    osc.frequency.setValueAtTime(freq, time);

    // ADSR envelope
    const attack = 0.01;
    const decay = duration * 0.3;
    const sustain = 0.5;
    const release = duration * 0.2;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(velocity, time + attack);
    gain.gain.linearRampToValueAtTime(velocity * sustain, time + attack + decay);
    gain.gain.setValueAtTime(velocity * sustain, time + duration - release);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration + 0.1);
  }

  private midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  private beatToSeconds(beats: number): number {
    return (60 / this.tempo) * beats;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }

    // Auto-start music when volume is set (user interaction with settings)
    if (!this.isPlaying && this.volume > 0) {
      this.play();
    }
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  toggle(): void {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.play();
    }
  }
}

export const musicPlayer = new MusicPlayer();
