// Cast reveal fanfare: Web Audio chime + canvas-confetti burst.
import { SHOW } from "../config";

export function playAudibleFanfare() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const notes = [
      { freqs: [466.16], delay: 0.00, dur: 0.12 },
      { freqs: [466.16], delay: 0.14, dur: 0.12 },
      { freqs: [466.16], delay: 0.28, dur: 0.12 },
      { freqs: [587.33, 700], delay: 0.44, dur: 0.35 },
      { freqs: [700], delay: 0.82, dur: 0.18 },
      { freqs: [466.16, 587.33, 932.33], delay: 1.05, dur: 1.3 }
    ];

    const now = ctx.currentTime;
    notes.forEach(note => {
      note.freqs.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + note.delay);
        gain.gain.setValueAtTime(0.0001, now + note.delay);
        gain.gain.exponentialRampToValueAtTime(0.18, now + note.delay + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + note.delay + note.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + note.delay);
        osc.stop(now + note.delay + note.dur + 0.05);
      });
    });
  } catch (err) {}
}

export function launchFanfareCelebration() {
  playAudibleFanfare();
  if (typeof confetti === 'function') {
    const colors = SHOW.theme.confetti;
    confetti({ particleCount: 65, angle: 60, spread: 70, origin: { x: 0.1, y: 0.7 }, colors });
    confetti({ particleCount: 65, angle: 120, spread: 70, origin: { x: 0.9, y: 0.7 }, colors });
    setTimeout(() => {
      confetti({ particleCount: 95, spread: 100, origin: { y: 0.55 }, colors });
    }, 250);
  }
}
