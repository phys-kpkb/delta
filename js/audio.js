// Музика й звуки генеруються наживо через Web Audio — жодних файлів.

let ac = null, master = null, musicBus = null, sfxBus = null, reverb = null;
let musicOn = true, sfxOn = true;
let timer = null, nextTime = 0, step = 0, mood = 0;

const MOODS = [
  // корінь (MIDI), лад, темп (с на восьму), акорди (ступені)
  { root: 50, scale: [0, 2, 3, 5, 7, 8, 10], spd: 0.42, prog: [0, 5, 2, 6] },   // ре мінор
  { root: 52, scale: [0, 2, 3, 5, 7, 9, 10], spd: 0.40, prog: [0, 3, 6, 4] },   // мі дорійський
  { root: 47, scale: [0, 2, 3, 5, 7, 8, 10], spd: 0.38, prog: [0, 5, 3, 4] },   // сі мінор
  { root: 53, scale: [0, 2, 4, 5, 7, 9, 10], spd: 0.42, prog: [0, 6, 3, 4] },   // фа міксолідійський
  { root: 50, scale: [0, 2, 3, 5, 7, 8, 11], spd: 0.34, prog: [0, 5, 3, 4] },   // ре гармонічний — фінал
];

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

function makeImpulse(sec, decay) {
  const len = Math.floor(ac.sampleRate * sec);
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
  reverb = ac.createConvolver(); reverb.buffer = makeImpulse(3.2, 2.6);
  const wet = ac.createGain(); wet.gain.value = 0.55; reverb.connect(wet); wet.connect(master);
  musicBus = ac.createGain(); musicBus.gain.value = 0; musicBus.connect(master); musicBus.connect(reverb);
  sfxBus = ac.createGain(); sfxBus.gain.value = sfxOn ? 0.5 : 0; sfxBus.connect(master);
  const toRev = ac.createGain(); toRev.gain.value = 0.25; sfxBus.connect(toRev); toRev.connect(reverb);
  if (musicOn) startMusic();
}

export function setMusic(on) {
  musicOn = on;
  if (!ac) return;
  if (on) startMusic(); else stopMusic();
}
export function setSfx(on) {
  sfxOn = on;
  if (sfxBus) sfxBus.gain.setTargetAtTime(on ? 0.5 : 0, ac.currentTime, 0.05);
}
export function setMood(i) { mood = Math.max(0, Math.min(MOODS.length - 1, i)); }

function startMusic() {
  if (timer) return;
  musicBus.gain.cancelScheduledValues(ac.currentTime);
  musicBus.gain.setTargetAtTime(0.22, ac.currentTime, 1.5);
  nextTime = ac.currentTime + 0.1;
  timer = setInterval(schedule, 60);
}
function stopMusic() {
  if (!timer) return;
  clearInterval(timer); timer = null;
  musicBus.gain.setTargetAtTime(0, ac.currentTime, 0.4);
}

function pad(freq, t, dur) {
  for (const det of [-6, 5]) {
    const o = ac.createOscillator(); o.type = 'triangle';
    o.frequency.value = freq; o.detune.value = det;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.045, t + dur * 0.35);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(f); f.connect(g); g.connect(musicBus);
    o.start(t); o.stop(t + dur + 0.05);
  }
}

function pluck(freq, t, vol = 0.12, len = 1.6) {
  const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
  const o2 = ac.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2.003;
  const f = ac.createBiquadFilter(); f.type = 'lowpass';
  f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.5);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  const g2 = ac.createGain(); g2.gain.value = 0.3;
  o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(musicBus);
  o.start(t); o2.start(t); o.stop(t + len + 0.05); o2.stop(t + len + 0.05);
}

function softDrum(t, vol) {
  const o = ac.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.25);
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.45);
}

let melodyDeg = 4;
function schedule() {
  const M = MOODS[mood];
  while (nextTime < ac.currentTime + 0.3) {
    const t = nextTime;
    const bar = Math.floor(step / 8), inBar = step % 8;
    const chordDeg = M.prog[bar % M.prog.length];
    const deg = (d) => {
      const o = Math.floor(d / 7), k = ((d % 7) + 7) % 7;
      return M.root + M.scale[k] + 12 * o;
    };
    if (inBar === 0) {
      const len = M.spd * 8;
      pad(midi(deg(chordDeg) - 12), t, len + 0.6);
      pad(midi(deg(chordDeg + 2)), t, len + 0.6);
      pad(midi(deg(chordDeg + 4)), t, len + 0.6);
      if (mood === 4) softDrum(t, 0.25);
    }
    if (mood === 4 && inBar === 4) softDrum(t, 0.12);
    // арпеджіо лютні з випадковими паузами
    const pattern = [0, 2, 4, 7, 4, 2, 4, 2];
    if (Math.random() < (inBar % 2 ? 0.55 : 0.85)) {
      pluck(midi(deg(chordDeg + pattern[inBar]) + 12), t, 0.06 + Math.random() * 0.04, 1.4);
    }
    // проста мелодія зверху раз на кілька кроків
    if (inBar % 4 === 0 && Math.random() < 0.6) {
      melodyDeg += [-2, -1, 1, 2, 0][Math.floor(Math.random() * 5)];
      melodyDeg = Math.max(chordDeg + 2, Math.min(chordDeg + 9, melodyDeg));
      pluck(midi(deg(melodyDeg) + 24), t + 0.01, 0.05, 2.2);
    }
    nextTime += M.spd * (inBar % 2 ? 0.92 : 1.08); // легкий свінг
    step++;
  }
}

// ---------- звуки ----------

function tone(freq, t, dur, type = 'sine', vol = 0.2, bus = sfxBus) {
  const o = ac.createOscillator(); o.type = type; o.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
  return o;
}

function noise(t, dur, freq, q, vol) {
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = ac.createBufferSource(); s.buffer = buf;
  const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t);
}

export function sfx(name) {
  if (!ac || !sfxOn) return;
  const t = ac.currentTime + 0.01;
  switch (name) {
    case 'step': noise(t, 0.05, 900 + Math.random() * 300, 2, 0.05); break;
    case 'tap': tone(880, t, 0.08, 'triangle', 0.06); break;
    case 'read': noise(t, 0.18, 3000, 0.8, 0.12); noise(t + 0.08, 0.15, 2200, 0.8, 0.08); break;
    case 'open': tone(523, t, 0.2, 'triangle', 0.12); tone(659, t + 0.06, 0.25, 'triangle', 0.1); break;
    case 'right': [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.07, 0.6, 'triangle', 0.13)); break;
    case 'wrong': tone(155, t, 0.35, 'sawtooth', 0.07); tone(146, t + 0.02, 0.35, 'square', 0.04); break;
    case 'door': noise(t, 0.5, 220, 1.5, 0.35); tone(70, t, 0.6, 'sine', 0.3); tone(330, t + 0.15, 0.4, 'triangle', 0.04); break;
    case 'bonus': [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.05, 0.5, 'sine', 0.1)); break;
    case 'key': tone(1319, t, 0.15, 'square', 0.04); tone(1760, t + 0.08, 0.3, 'triangle', 0.08); break;
    case 'smash': noise(t, 0.4, 400, 0.7, 0.5); noise(t + 0.1, 0.3, 160, 1, 0.4); tone(55, t, 0.4, 'sine', 0.35); break;
    case 'meow': {
      const o = ac.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(820, t + 0.12); o.frequency.linearRampToValueAtTime(430, t + 0.45);
      const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 6;
      f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(1700, t + 0.15); f.frequency.linearRampToValueAtTime(800, t + 0.45);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(f); f.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.55);
      break;
    }
    case 'win': {
      const seq = [392, 523, 659, 784, 659, 784, 1047];
      seq.forEach((f, i) => { tone(f, t + i * 0.13, 0.9, 'triangle', 0.13); tone(f / 2, t + i * 0.13, 0.9, 'sine', 0.06); });
      break;
    }
  }
}
