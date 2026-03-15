let audioCtx: AudioContext | null = null;

const getCtx = (): AudioContext | null => {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      console.warn('Web Audio API not available');
      return null;
    }
  }
  return audioCtx;
};

const playTone = (freq: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) => {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
};

const playSweep = (startFreq: number, endFreq: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) => {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
};

const playNoise = (duration: number, volume: number = 0.15) => {
  const ctx = getCtx();
  if (!ctx) return;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(ctx.currentTime);
};

export const SynthSounds = {
  hit: () => playTone(880, 0.08, 'sine', 0.25),
  miss: () => playTone(220, 0.15, 'triangle', 0.2),
  score: () => playSweep(440, 880, 0.12, 'sine', 0.25),
  launch: () => playNoise(0.05, 0.12),
  gameOver: () => playSweep(440, 110, 0.4, 'sawtooth', 0.15),
  victory: () => {
    playTone(523, 0.3, 'sine', 0.2); // C
    setTimeout(() => playTone(659, 0.3, 'sine', 0.2), 100); // E
    setTimeout(() => playTone(784, 0.4, 'sine', 0.2), 200); // G
  },
  tick: () => playTone(1200, 0.02, 'square', 0.1),

  // Resume AudioContext after user gesture (required by browsers)
  resume: () => {
    const ctx = getCtx();
    if (ctx?.state === 'suspended') ctx.resume();
  },
};
