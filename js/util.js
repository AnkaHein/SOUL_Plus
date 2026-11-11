'use strict';
/* Kleine Hilfsfunktionen */
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(9)) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return e;
}
const SVGNS = 'http://www.w3.org/2000/svg';
function sv(tag, attrs, ...kids) {
  const e = document.createElementNS(SVGNS, tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const c of kids.flat(9)) { if (c == null) continue; e.append(c.nodeType ? c : document.createTextNode(String(c))); }
  return e;
}
function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffled(arr, seed) {
  const r = mulberry(seed || Math.floor(Math.random() * 1e9));
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function shuffledNotSame(arr, seed) {
  if (arr.length < 2) return arr.slice();
  let s = seed || Math.floor(Math.random() * 1e9), a;
  for (let i = 0; i < 20; i++) { a = shuffled(arr, s + i * 7919); if (a.join('\u0001') !== arr.join('\u0001')) return a; }
  return arr.slice().reverse();
}
function hashStr(s) { let x = 5381; for (let i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) | 0; return x >>> 0; }
function pick(a, seed) { return a[(seed >>> 0) % a.length]; }
function fmtDate(ts) {
  if (!ts) return '–';
  const d = new Date(ts);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' +
    d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/* Vorlesen: nur nach Tippen. Erst fertige Aufnahme (audio/<kennung>.mp3), sonst Stimme des Geräts */
function audioKey(text) {
  const t = text.normalize('NFC').replace(/\s+/g, ' ').trim();
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
const Voice = {
  btn: null, audio: null, lang: 'de',
  stop() {
    try { speechSynthesis.cancel(); } catch (e) { }
    if (this.audio) { try { this.audio.pause(); } catch (e) { } this.audio = null; }
    if (this.btn) { this.btn.classList.remove('on'); this.btn = null; }
  },
  ok() { return true; },
  pick() {
    const vs = (typeof speechSynthesis !== 'undefined' ? speechSynthesis.getVoices() : []).filter(v => (this.lang === 'en' ? /^en/i : /^de/i).test(v.lang));
    const gut = vs.find(v => /premium|enhanced|natural|neural|anna|petra|markus|google/i.test(v.name));
    return gut || vs.find(v => v.localService) || vs[0];
  },
  browser(text, btn, tempo) {
    if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') { this.stop(); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = this.lang === 'en' ? 'en-GB' : 'de-DE'; u.rate = Math.min(tempo || 0.9, 0.9);
    const v = this.pick(); if (v) u.voice = v;
    u.onend = u.onerror = () => { if (this.btn === btn) this.stop(); };
    speechSynthesis.speak(u);
  },
  speak(text, btn, tempo) {
    btn = btn || { classList: { add() { }, remove() { } } };
    if (this.btn === btn) { this.stop(); return; }
    this.stop();
    this.btn = btn; btn.classList.add('on');
    const a = new Audio('audio/' + audioKey(text) + '.mp3');
    a.playbackRate = Math.min(1.1, Math.max(0.8, (tempo || 0.9) / 0.9));
    this.audio = a;
    let fallback = false;
    const fb = () => { if (fallback || this.btn !== btn) return; fallback = true; this.audio = null; this.browser(text, btn, tempo); };
    a.addEventListener('error', fb);
    a.addEventListener('ended', () => { if (this.btn === btn) this.stop(); });
    a.play().catch(fb);
  }
};
