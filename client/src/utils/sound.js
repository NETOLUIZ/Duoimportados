/**
 * Plays a short two-tone alert beep using the Web Audio API.
 * No external audio file needed; fails silently if audio is blocked.
 */
export function playAlertSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const playTone = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.25, now + start + 0.02);
      gain.gain.linearRampToValueAtTime(0, now + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.05);
    };

    playTone(880, 0, 0.18);
    playTone(660, 0.22, 0.24);

    setTimeout(() => ctx.close().catch(() => {}), 1000);
  } catch (err) {
    console.warn('Não foi possível tocar o alerta sonoro:', err);
  }
}
