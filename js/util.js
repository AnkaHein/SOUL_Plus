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

/* Vorlesen: nur nach Tippen, keine anderen Töne */
const Voice = {
  btn: null,
  stop() {
    try { speechSynthesis.cancel(); } catch (e) { }
    if (this.btn) { this.btn.classList.remove('on'); this.btn = null; }
  },
  ok() { return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined'; },
  speak(text, btn, tempo) {
    if (!this.ok()) return;
    if (this.btn === btn) { this.stop(); return; }
    this.stop();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    u.rate = tempo || 0.9;
    const vs = speechSynthesis.getVoices().filter(v => /^de/i.test(v.lang));
    if (vs.length) u.voice = vs.find(v => v.localService) || vs[0];
    u.onend = u.onerror = () => { if (this.btn === btn) this.stop(); };
    this.btn = btn; btn.classList.add('on');
    speechSynthesis.speak(u);
  }
};
