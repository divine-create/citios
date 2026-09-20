/**
 * Web Audio API Chime & Sound Synthesizer
 *
 * Generates pleasant audio chimes using pure browser oscillators and gain envelopes.
 * Zero external audio files, zero 404s, 100% offline capability, zero network latency.
 * Handles modern browser autoplay policy gracefully via user interaction resumption.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    // Attempt resume
    audioCtx.resume().catch(() => {
      // Browsers require a user gesture first
    });
  }
  return audioCtx;
}

// Ensure audio context resumes on the very first user interaction anywhere
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  };
  window.addEventListener('click', unlockAudio, { once: true, passive: true });
  window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
  window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
}

export function isAudioMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('cityconnect_audio_muted') === 'true';
  } catch {
    return false;
  }
}

export function setAudioMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('cityconnect_audio_muted', muted ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('cityconnect_audio_muted_changed', { detail: { muted } }));
  } catch {}
}

export function toggleAudioMute(): boolean {
  const next = !isAudioMuted();
  setAudioMuted(next);
  return next;
}

/**
 * Play a bell-like tone with attack and exponential decay
 */
function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  gainLevel = 0.35,
  type: OscillatorType = 'sine'
) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    // Envelope: quick attack, natural exponential decay
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainLevel, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  } catch (err) {
    console.debug('Audio tone playback ignored:', err);
  }
}

/**
 * Incoming Order Chime
 * Distinct 3-tone ascending chime (C5 -> E5 -> G5) to alert staff of an incoming order.
 */
export function playOrderChime(): void {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Tone 1: C5 (523.25 Hz)
  playTone(ctx, 523.25, now, 0.3, 0.3, 'triangle');
  // Tone 2: E5 (659.25 Hz)
  playTone(ctx, 659.25, now + 0.12, 0.3, 0.35, 'triangle');
  // Tone 3: G5 (783.99 Hz) with longer sustain
  playTone(ctx, 783.99, now + 0.24, 0.6, 0.4, 'sine');
}

/**
 * Cash Register / Sale Completed Chime
 * Bright dual-tone "ka-ching" metallic chime for checkout completion.
 */
export function playCashRegisterChime(): void {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Metallic high frequencies
  playTone(ctx, 987.77, now, 0.18, 0.25, 'triangle'); // B5
  playTone(ctx, 1318.51, now + 0.08, 0.45, 0.35, 'sine'); // E6
  playTone(ctx, 1760.0, now + 0.14, 0.5, 0.25, 'sine'); // A6
}

/**
 * Resident / Customer Notification Ping
 * Gentle 2-tone chime for in-app notifications.
 */
export function playNotificationChime(): void {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  playTone(ctx, 587.33, now, 0.15, 0.2, 'sine'); // D5
  playTone(ctx, 880.0, now + 0.1, 0.35, 0.25, 'sine'); // A5
}

/**
 * Alert / Warning Tone
 * Double tone for urgent notifications or cancellations.
 */
export function playAlertChime(): void {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  playTone(ctx, 440.0, now, 0.15, 0.3, 'sawtooth');
  playTone(ctx, 349.23, now + 0.18, 0.25, 0.3, 'sawtooth');
}
