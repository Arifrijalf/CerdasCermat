let audioCtx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType,
  volume: number
): void {
  try {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = type;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio unavailable
  }
}

const sounds = {
  winner(volume: number) {
    playTone(523, 0.15, 'sine', volume);
    setTimeout(() => playTone(659, 0.15, 'sine', volume), 100);
    setTimeout(() => playTone(784, 0.3, 'sine', volume), 200);
    setTimeout(() => playTone(1047, 0.5, 'sine', volume), 350);
  },
  ready(volume: number) {
    playTone(440, 0.15, 'sine', volume * 0.7);
    setTimeout(() => playTone(660, 0.2, 'sine', volume * 0.7), 120);
  },
  connect(volume: number) {
    playTone(880, 0.08, 'sine', volume * 0.4);
  },
};

export function playSound(
  type: 'winner' | 'ready' | 'connect',
  enabled: boolean,
  volume: number
): void {
  if (!enabled) return;
  sounds[type](Math.min(1, Math.max(0, volume)));
}
