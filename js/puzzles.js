'use strict';
/* Rätseltypen. Jeder Typ wird einmal programmiert, die Inhalte kommen aus den JSON-Dateien.
   Jede Funktion bekommt (p, ctx) und liefert { el, ready(), check(), reveal(), fill(), lock(), auto? }.
   ctx: { mat, seed, persons, mistake(msg), solved(), changed() } */
const PZ = {};

/* ---------- Material (Texte, Briefe, Aussagen ...) ---------- */
function Material(cards, persons, tempo, vorlesenAn) {
  const sel = new Set();
  let markCb = null;
  const spans = [];
  let n = 0;
  const el = h('div', { class: 'mat' });
  cards.forEach((c, ci) => {
    const body = h('div', { class: 'matbody' });
    (c.saetze || []).forEach((par, pi) => {
      const p = h('p');
      if (c.art === 'brief' && pi === 0 && par.length === 1 && par[0].length < 45 && /\d{4}/.test(par[0])) p.className = 'ortdatum';
      par.forEach(s => {
        const sp = h('span', { class: 's', 'data-i': n }, s + ' ');
        const idx = n++;
        sp.addEventListener('click', () => { if (markCb) { if (sel.has(idx)) sel.delete(idx); else sel.add(idx); paint(); markCb(new Set(sel)); } });
        spans[idx] = sp; p.append(sp);
      });
      body.append(p);
    });
    const per = c.person && persons && persons[c.person];
    const txt = (c.kopf ? c.kopf + '. ' : '') + (c.saetze || []).flat().join(' ');
    const head = h('div', { class: 'matkopf' },
      per && per.img ? h('img', { class: 'avatar', src: per.img, alt: '' }) : null,
      h('div', { class: 'matt' }, h('strong', null, c.kopf || ''), per ? h('small', null, per.name) : null),
      vorlesenAn ? h('button', {
        class: 'speak', type: 'button', 'aria-label': 'Vorlesen',
        onclick: e => Voice.speak(txt, e.currentTarget, tempo)
      }, '🔊') : null);
    el.append(h('article', { class: 'matcard ' + (c.art || 'text') }, head, body));
  });
  function paint() { spans.forEach((s, i) => s.classList.toggle('sel', sel.has(i))); }
  return {
    el, count: n,
    text() { return cards.map(c => (c.kopf ? c.kopf + '. ' : '') + (c.saetze || []).flat().join(' ')).join(' '); },
    hl(set, cls) { spans.forEach((s, i) => s.classList.toggle(cls || 'hl', set.has(i))); },
    clearHL() { spans.forEach(s => s.classList.remove('hl', 'good', 'bad')); },
    enableMark(cb) { markCb = cb; el.classList.add('markable'); },
    disableMark() { markCb = null; sel.clear(); paint(); el.classList.remove('markable'); },
    setSel(set) { sel.clear(); set.forEach(i => sel.add(i)); paint(); }
  };
}

const eqSet = (a, b) => a.size === b.size && [...a].every(x => b.has(x));

/* ---------- Auswahl (eine Antwort) ---------- */
PZ.auswahl = function (p, ctx) {
  let sel = -1, locked = false;
  const bildOpts = p.optionen.some(o => o && o.img);
  const btns = p.optionen.map((o, i) => h('button', {
    class: 'opt' + (o && o.img ? ' imgopt' : ''), type: 'button',
    onclick: () => { if (locked) return; sel = i; upd(); ctx.changed(); if (o && o.t && !o.img && p.sprichOpt) Voice.speak(o.t, null, 0.9); }
  }, o && o.img ? [h('img', { src: o.img, alt: '' }), o.t ? h('span', null, o.t) : null] : o));
  function upd() { btns.forEach((b, i) => b.classList.toggle('sel', i === sel)); }
  const head = (p.bild || p.sprich) ? h('div', { class: 'bildkopf' },
    p.bild ? h('img', { class: 'frageBild', src: p.bild, alt: '' }) : null,
    p.sprich ? h('button', { class: 'speak big', type: 'button', 'aria-label': 'Vorlesen', onclick: e => Voice.speak(p.sprich, e.currentTarget, 0.85) }, '🔊') : null,
    p.wort ? h('div', { class: 'wortgross' }, p.wort) : null) : null;
  return {
    el: h('div', { class: 'auswahlwrap' }, head, h('div', { class: 'opts' + (bildOpts ? ' bildopts' : '') }, btns)),
    ready: () => sel >= 0,
    check: () => ({ ok: sel === p.richtig }),
    reveal() { btns.forEach((b, i) => { b.classList.remove('sel'); b.classList.toggle('good', i === p.richtig); }); },
    fill() { sel = p.richtig; upd(); },
    lock() { locked = true; btns.forEach(b => b.disabled = true); },
    wrong() { btns.forEach((b, i) => { if (i === sel) { b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 500); } }); sel = -1; upd(); }
  };
};

/* ---------- Paare: Bild und Wort verbinden (Tippen, Tippen) ---------- */
PZ.paare = function (p, ctx) {
  let cur = -1, locked = false; const done = new Set();
  const L = p.links.map((o, i) => h('button', { class: 'pbild', type: 'button', onclick: () => pickL(i) }, h('img', { src: o.img, alt: '' })));
  const Rr = p.rechts.map((w, j) => h('button', { class: 'pwort', type: 'button', onclick: () => pickR(j) }, w));
  const rIdx = i => p.paare[i];
  function upd() { L.forEach((b, i) => { b.classList.toggle('sel', i === cur); b.classList.toggle('good', done.has(i)); b.disabled = done.has(i) || locked; }); Rr.forEach((b, j) => { const d = [...done].some(i => rIdx(i) === j); b.classList.toggle('good', d); b.disabled = d || locked; }); }
  function pickL(i) { if (locked || done.has(i)) return; cur = i; upd(); }
  function pickR(j) {
    if (locked || cur < 0) return;
    if (rIdx(cur) === j) { done.add(cur); cur = -1; upd(); if (done.size === p.links.length) ctx.solved(); }
    else { const b = Rr[j]; b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 500); cur = -1; upd(); ctx.mistake(); }
  }
  return {
    el: h('div', { class: 'paare' }, h('div', { class: 'pcol' }, L), h('div', { class: 'pcol' }, Rr)),
    auto: true, ready: () => true, check: () => ({ ok: done.size === p.links.length }),
    reveal() { p.links.forEach((_, i) => done.add(i)); cur = -1; upd(); },
    fill() { p.links.forEach((_, i) => done.add(i)); upd(); },
    lock() { locked = true; upd(); },
    wrong() { }
  };
};

/* ---------- Sortieren: Bilder antippen, dann den richtigen Korb antippen ---------- */
PZ.sortieren = function (p, ctx) {
  const place = p.items.map(() => -1); let cur = -1, locked = false;
  const poolEl = h('div', { class: 'spool' });
  const korbEls = p.koerbe.map((n, k) => h('button', { class: 'korb', type: 'button', onclick: () => drop(k) }, h('b', null, n), h('div', { class: 'kin' })));
  function drop(k) { if (locked || cur < 0) return; place[cur] = k; cur = -1; draw(); ctx.changed(); }
  function back(i) { if (locked) return; place[i] = -1; cur = -1; draw(); ctx.changed(); }
  const tile = (it, i, inKorb) => h('button', { class: 'sitem' + (cur === i ? ' sel' : ''), type: 'button', onclick: e => { e.stopPropagation(); inKorb ? back(i) : (cur = cur === i ? -1 : i, draw()); } },
    h('img', { src: it.img, alt: '' }), it.t ? h('span', null, it.t) : null);
  function draw() {
    poolEl.replaceChildren(...p.items.map((it, i) => place[i] < 0 ? tile(it, i, false) : null).filter(Boolean));
    korbEls.forEach((b, k) => b.querySelector('.kin').replaceChildren(...p.items.map((it, i) => place[i] === k ? tile(it, i, true) : null).filter(Boolean)));
    korbEls.forEach(b => b.classList.toggle('bereit', cur >= 0));
  }
  draw();
  return {
    el: h('div', { class: 'sortieren' }, h('p', { class: 'small' }, 'Tippe ein Bild an. Tippe dann den passenden Korb an.'), poolEl, h('div', { class: 'koerbe' }, korbEls)),
    ready: () => place.every(x => x >= 0),
    check: () => ({ ok: place.every((x, i) => x === p.loesung[i]) }),
    reveal() { p.loesung.forEach((k, i) => place[i] = k); cur = -1; draw(); korbEls.forEach(b => b.classList.add('good')); },
    fill() { p.loesung.forEach((k, i) => place[i] = k); cur = -1; draw(); },
    lock() { locked = true; },
    wrong() { p.items.forEach((_, i) => { if (place[i] !== p.loesung[i]) place[i] = -1; }); cur = -1; draw(); }
  };
};

/* ---------- Mehrfach (z. B. Widerspruch: zwei Aussagen wählen) ---------- */
PZ.mehrfach = function (p, ctx) {
  const sel = new Set(); let locked = false;
  const need = p.richtig.length;
  const btns = p.optionen.map((o, i) => h('button', {
    class: 'opt multi', type: 'button',
    onclick: () => { if (locked) return; if (sel.has(i)) sel.delete(i); else if (sel.size < need) sel.add(i); upd(); ctx.changed(); }
  }, o));
  function upd() { btns.forEach((b, i) => b.classList.toggle('sel', sel.has(i))); }
  return {
    el: h('div', null, h('p', { class: 'hinweis' }, `Wähle ${need === 1 ? 'eine Antwort' : need + ' Antworten'}.`), h('div', { class: 'opts' }, btns)),
    ready: () => sel.size === need,
    check: () => ({ ok: eqSet(sel, new Set(p.richtig)) }),
    reveal() { btns.forEach((b, i) => { b.classList.remove('sel'); b.classList.toggle('good', p.richtig.includes(i)); }); },
    fill() { sel.clear(); p.richtig.forEach(i => sel.add(i)); upd(); },
    lock() { locked = true; btns.forEach(b => b.disabled = true); },
    wrong() { sel.clear(); upd(); }
  };
};

/* ---------- Markieren (Beweis im Text antippen) ---------- */
PZ.markieren = function (p, ctx) {
  let sel = new Set();
  const need = p.richtig.length;
  ctx.mat.enableMark(s => { sel = s; ctx.changed(); });
  return {
    el: h('div', null, h('p', { class: 'hinweis' }, `Tippe im Text ${need === 1 ? 'auf den passenden Satz' : 'auf die ' + need + ' passenden Sätze'}. Du kannst nach oben scrollen.`)),
    ready: () => sel.size > 0,
    check: () => ({ ok: eqSet(sel, new Set(p.richtig)) }),
    reveal() { ctx.mat.disableMark(); ctx.mat.hl(new Set(p.richtig), 'good'); },
    fill() { sel = new Set(p.richtig); ctx.mat.setSel(sel); },
    lock() { ctx.mat.disableMark(); },
    wrong() { sel = new Set(); ctx.mat.setSel(sel); }
  };
};

/* ---------- Zuordnen (Wer sagt was? / Zeitform) ---------- */
PZ.zuordnen = function (p, ctx) {
  const ans = p.aussagen.map(() => -1); let locked = false;
  const rows = p.aussagen.map((a, i) => {
    const chips = p.personen.map((per, j) => h('button', {
      class: 'chip pers', type: 'button',
      onclick: () => { if (locked) return; ans[i] = j; upd(); ctx.changed(); }
    }, per.img ? h('img', { class: 'avatar sm', src: per.img, alt: '' }) : null, per.name));
    return { chips, row: h('div', { class: 'zrow' }, h('div', { class: 'ztext' }, a.text), h('div', { class: 'zchips' }, chips)) };
  });
  function upd() { rows.forEach((r, i) => r.chips.forEach((c, j) => c.classList.toggle('sel', ans[i] === j))); }
  return {
    el: h('div', { class: 'zuordnen' }, rows.map(r => r.row)),
    ready: () => ans.every(x => x >= 0),
    check: () => ({ ok: p.aussagen.every((a, i) => ans[i] === a.richtig) }),
    reveal() { rows.forEach((r, i) => r.chips.forEach((c, j) => { c.classList.remove('sel'); c.classList.toggle('good', j === p.aussagen[i].richtig); })); },
    fill() { p.aussagen.forEach((a, i) => ans[i] = a.richtig); upd(); },
    lock() { locked = true; rows.forEach(r => r.chips.forEach(c => c.disabled = true)); },
    wrong() { ans.fill(-1); upd(); }
  };
};

/* ---------- Reihenfolge (Zeitleiste, Satzbau, Aussagen ordnen) ---------- */
PZ.reihenfolge = function (p, ctx) {
  const order = p.items.map((t, i) => i);
  let pool = shuffledNotSame(order, ctx.seed), answer = [], locked = false;
  const poolEl = h('div', { class: 'pool' }), ansEl = h('div', { class: 'answerline' });
  const word = p.art === 'satz';
  function draw() {
    poolEl.replaceChildren(...pool.map(i => h('button', { class: 'chip item' + (word ? ' w' : ''), type: 'button', onclick: () => { if (locked) return; pool = pool.filter(x => x !== i); answer.push(i); draw(); ctx.changed(); } }, p.items[i])));
    ansEl.replaceChildren(...(answer.length ? answer.map((i, k) => h('button', { class: 'chip item placed' + (word ? ' w' : ''), type: 'button', onclick: () => { if (locked) return; answer.splice(k, 1); pool.push(i); draw(); ctx.changed(); } }, word ? p.items[i] : h('span', null, h('b', { class: 'nr' }, k + 1), p.items[i]))) : [h('span', { class: 'leer' }, word ? 'Tippe die Teile in der richtigen Reihenfolge an.' : 'Tippe die Ereignisse in der richtigen Reihenfolge an.')]));
  }
  draw();
  return {
    el: h('div', { class: 'reihenfolge' }, ansEl, h('p', { class: 'hinweis' }, 'Zum Zurücknehmen tippst du auf ein Teil in deiner Reihe.'), poolEl),
    ready: () => pool.length === 0,
    check: () => ({ ok: [order, ...(p.alt || [])].some(o => answer.length === o.length && answer.every((v, k) => v === o[k])) }),
    reveal() { pool = []; answer = order.slice(); locked = true; draw(); ansEl.classList.add('good'); },
    fill() { pool = []; answer = order.slice(); draw(); },
    lock() { locked = true; },
    wrong() { pool = shuffledNotSame(order, ctx.seed + 13 * (ctx.tries || 1)); answer = []; draw(); }
  };
};

/* ---------- Fehlerteufel (Fehler im Text finden und verbessern) ---------- */
PZ.fehler = function (p, ctx) {
  const errs = [];
  const box = h('div', { class: 'fehlertext' });
  const panel = h('div', { class: 'fpanel', hidden: true });
  let active = null, locked = false;
  p.text.split(/(\[\[.*?\]\])/).forEach(part => {
    const m = part.match(/^\[\[(.*?)\]\]$/);
    if (m) {
      const a = m[1].split('|');
      const e = { falsch: a[0], richtig: a[1], opts: shuffled([a[1], ...a.slice(2)], ctx.seed + errs.length * 31), done: false };
      e.el = h('span', { class: 'tok err', onclick: () => tapErr(e) }, a[0]);
      errs.push(e); box.append(e.el);
    } else {
      part.split(/(\s+)/).forEach(t => {
        if (!t) return;
        if (/^\s+$/.test(t)) box.append(t);
        else if (/^[\p{P}\p{S}]+$/u.test(t)) box.append(t);
        else { const s = h('span', { class: 'tok', onclick: () => tapOk(s) }, t); box.append(s); }
      });
    }
  });
  function close() { panel.hidden = true; active = null; box.querySelectorAll('.tok.act').forEach(x => x.classList.remove('act')); }
  function tapOk(s) {
    if (locked) return;
    close(); s.classList.add('flash'); setTimeout(() => s.classList.remove('flash'), 600);
    ctx.mistake('Dieses Wort ist richtig geschrieben.');
  }
  function tapErr(e) {
    if (locked || e.done) return;
    close(); active = e; e.el.classList.add('act');
    panel.hidden = false;
    panel.replaceChildren(h('strong', null, 'Wie schreibt man es richtig?'),
      h('div', { class: 'fopts' }, e.opts.map(o => h('button', {
        class: 'chip', type: 'button', onclick: () => {
          if (o === e.richtig) { e.done = true; e.el.textContent = e.richtig; e.el.classList.remove('act'); e.el.classList.add('ok'); close(); if (errs.every(x => x.done)) { locked = true; ctx.solved(); } }
          else { close(); ctx.mistake('Das ist es nicht. Schau noch einmal genau hin.'); }
        }
      }, o))));
  }
  return {
    auto: true,
    el: h('div', null, h('p', { class: 'hinweis' }, `Im Text sind ${errs.length} Fehler. Tippe auf ein Wort, das du für falsch hältst.`), box, panel),
    ready: () => false, check: () => ({ ok: false }),
    reveal() { locked = true; close(); errs.forEach(e => { e.done = true; e.el.textContent = e.richtig; e.el.classList.add('ok'); }); },
    fill() { errs.forEach(e => { e.done = true; e.el.textContent = e.richtig; e.el.classList.add('ok'); }); locked = true; },
    lock() { locked = true; }, wrong() { }
  };
};

/* ---------- Lückentext ---------- */
PZ.luecke = function (p, ctx) {
  const parts = p.text.split('___');
  const val = p.luecken.map(() => -1); let locked = false, act = -1;
  const opts = p.luecken.map((l, i) => shuffled(l.optionen.map((o, k) => k), ctx.seed + i * 17));
  const box = h('div', { class: 'luecketext' });
  const panel = h('div', { class: 'fpanel', hidden: true });
  const gaps = [];
  parts.forEach((t, i) => {
    box.append(t);
    if (i < p.luecken.length) {
      const b = h('button', { class: 'gap', type: 'button', onclick: () => open(i) }, '      ');
      gaps[i] = b; box.append(b);
    }
  });
  function open(i) {
    if (locked) return; act = i;
    gaps.forEach((g, k) => g.classList.toggle('act', k === i));
    panel.hidden = false;
    panel.replaceChildren(h('strong', null, 'Welches Wort passt?'),
      h('div', { class: 'fopts' }, opts[i].map(k => h('button', {
        class: 'chip', type: 'button',
        onclick: () => { val[i] = k; gaps[i].textContent = p.luecken[i].optionen[k]; gaps[i].classList.add('filled'); gaps[i].classList.remove('act'); panel.hidden = true; ctx.changed(); }
      }, p.luecken[i].optionen[k]))));
  }
  return {
    el: h('div', null, h('p', { class: 'hinweis' }, 'Tippe auf eine Lücke und wähle das passende Wort.'), box, panel),
    ready: () => val.every(v => v >= 0),
    check: () => ({ ok: p.luecken.every((l, i) => val[i] === l.richtig) }),
    reveal() { panel.hidden = true; gaps.forEach((g, i) => { g.textContent = p.luecken[i].optionen[p.luecken[i].richtig]; g.classList.add('filled', 'good'); g.classList.remove('act'); }); },
    fill() { p.luecken.forEach((l, i) => { val[i] = l.richtig; gaps[i].textContent = l.optionen[l.richtig]; gaps[i].classList.add('filled'); }); },
    lock() { locked = true; gaps.forEach(g => g.disabled = true); },
    wrong() { val.fill(-1); gaps.forEach(g => { g.textContent = '      '; g.classList.remove('filled', 'act'); }); panel.hidden = true; }
  };
};

/* ---------- Karte nach Text ---------- */
PZ.karte = function (p, ctx) {
  const W = 100, H = 70;
  let sel = null, locked = false;
  const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'karte', role: 'img', 'aria-label': 'Karte' });
  svg.append(sv('rect', { x: 0, y: 0, width: W, height: H, rx: 3, fill: '#cfe2b0' }));
  svg.append(sv('rect', { x: 1, y: 1, width: W - 2, height: H - 2, rx: 2.5, fill: 'none', stroke: '#8aa76a', 'stroke-width': .6, 'stroke-dasharray': '2 1.2' }));
  const byId = {}; p.orte.forEach(o => byId[o.id] = o);
  (p.wege || []).forEach(w => {
    const a = byId[w[0]], b = byId[w[1]]; if (!a || !b) return;
    svg.append(sv('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#a68d5e', 'stroke-width': 3.2, 'stroke-linecap': 'round' }));
    svg.append(sv('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#ead9ae', 'stroke-width': 2.2, 'stroke-linecap': 'round' }));
  });
  const syms = {
    tor: (x, y) => [sv('rect', { x: x - 3.2, y: y - 2, width: 1.5, height: 4, fill: '#6b5333' }), sv('rect', { x: x + 1.7, y: y - 2, width: 1.5, height: 4, fill: '#6b5333' }), sv('rect', { x: x - 3.2, y: y - 2.6, width: 6.4, height: 1, fill: '#6b5333' })],
    pavillon: (x, y) => [sv('polygon', { points: `${x - 4},${y - .5} ${x},${y - 4.5} ${x + 4},${y - .5}`, fill: '#9c4b3f' }), sv('rect', { x: x - 3.2, y: y - .5, width: 6.4, height: 3.6, fill: '#f2ead8', stroke: '#9b8e74', 'stroke-width': .3 })],
    brunnen: (x, y) => [sv('circle', { cx: x, cy: y, r: 3.6, fill: '#7fb8d8', stroke: '#6a6a6a', 'stroke-width': .7 }), sv('circle', { cx: x, cy: y, r: 1.1, fill: '#d9eef8' })],
    teich: (x, y) => [sv('ellipse', { cx: x, cy: y, rx: 6, ry: 3.8, fill: '#7fb8d8', stroke: '#5b97b8', 'stroke-width': .5 })],
    baum: (x, y) => [sv('rect', { x: x - .5, y: y, width: 1, height: 2.2, fill: '#6b4a2a' }), sv('circle', { cx: x, cy: y - .8, r: 3, fill: '#4f8a3c' })],
    bank: (x, y) => [sv('rect', { x: x - 2.2, y: y - .9, width: 4.4, height: 1.8, rx: .4, fill: '#7b5a35' })],
    kiosk: (x, y) => [sv('rect', { x: x - 2.8, y: y - .6, width: 5.6, height: 3.2, fill: '#f4e3c0', stroke: '#9b8e74', 'stroke-width': .3 }), sv('polygon', { points: `${x - 3.4},${y - .6} ${x},${y - 3.2} ${x + 3.4},${y - .6}`, fill: '#c9553f' })],
    beet: (x, y) => [sv('circle', { cx: x - 1.4, cy: y, r: 1.8, fill: '#d86a8d' }), sv('circle', { cx: x + 1.4, cy: y - .6, r: 1.8, fill: '#e58aa6' }), sv('circle', { cx: x, cy: y + 1.2, r: 1.8, fill: '#c9507a' })],
    spielplatz: (x, y) => [sv('rect', { x: x - 3.4, y: y - 3, width: 6.8, height: 6, rx: 1, fill: '#f0d36a', stroke: '#c7a93b', 'stroke-width': .4 }), sv('circle', { cx: x, cy: y, r: 1.1, fill: '#d8593f' })],
    haus: (x, y) => [sv('rect', { x: x - 3, y: y - 1, width: 6, height: 3.6, fill: '#d9c9a8', stroke: '#9b8e74', 'stroke-width': .3 }), sv('polygon', { points: `${x - 3.8},${y - 1} ${x},${y - 4} ${x + 3.8},${y - 1}`, fill: '#7c5a45' })],
    stein: (x, y) => [sv('polygon', { points: `${x - 2.6},${y + 1.6} ${x - 1.8},${y - 1.6} ${x + 1.6},${y - 2} ${x + 2.8},${y + 1.6}`, fill: '#9a9a9a', stroke: '#6f6f6f', 'stroke-width': .4 })]
  };
  const gs = p.orte.map(o => {
    const g = sv('g', { class: 'ort', tabindex: 0, role: 'button', 'aria-label': o.label, onclick: () => { if (locked) return; sel = o.id; upd(); ctx.changed(); } });
    g.append(sv('circle', { class: 'ring', cx: o.x, cy: o.y, r: 6.2, fill: 'rgba(255,255,255,.01)' }));
    (syms[o.sym] || syms.baum)(o.x, o.y).forEach(x => g.append(x));
    const lab = sv('text', { x: o.x, y: o.y + 7.4, 'text-anchor': 'middle', class: 'olabel' }, o.label);
    g.append(lab); svg.append(g); return g;
  });
  svg.append(sv('g', { transform: 'translate(91 8)' }, sv('circle', { r: 4.6, fill: '#fff', stroke: '#777', 'stroke-width': .4 }), sv('polygon', { points: '0,-3.6 1.2,0 0,3.6 -1.2,0', fill: '#c9553f' }), sv('text', { y: -5.2, 'text-anchor': 'middle', class: 'olabel', style: 'font-size:2.6px' }, 'N')));
  function upd() { gs.forEach((g, i) => g.classList.toggle('sel', p.orte[i].id === sel)); }
  return {
    el: h('div', { class: 'kartebox' }, h('p', { class: 'hinweis' }, 'Tippe auf den Ort auf der Karte.'), svg),
    ready: () => sel != null,
    check: () => ({ ok: sel === p.richtig }),
    reveal() { gs.forEach((g, i) => { g.classList.remove('sel'); g.classList.toggle('good', p.orte[i].id === p.richtig); }); },
    fill() { sel = p.richtig; upd(); },
    lock() { locked = true; }, wrong() { sel = null; upd(); }
  };
};

/* ---------- Lesespur: Abschnitt lesen, Ort auf der Karte antippen ---------- */
PZ.lesespur = function (p, ctx) {
  let cur = p.start, locked = false, msg = null, finished = false;
  const visited = [p.start];
  const nrOf = i => p.orte[i].nr;
  const card = h('div', { class: 'lscard' });
  const spurEl = h('div', { class: 'lsspur', 'aria-label': 'Meine Lesespur' });
  const box = h('div', { class: 'lsmap' }, h('img', { class: 'lsimg', src: p.karte, alt: 'Karte' }));
  const spots = p.orte.map((o, i) => {
    const b = h('button', { class: 'lsspot', type: 'button', 'aria-label': o.name, onclick: () => tap(i),
      style: { left: o.x * 100 + '%', top: o.y * 100 + '%', width: o.w * 100 + '%', height: o.h * 100 + '%' } },
      p.nrImBild ? null : h('span', { class: 'lsnr' }, String(o.nr)));
    box.append(b); return b;
  });
  function tap(i) {
    if (locked || finished) return;
    const c = p.orte[cur];
    if (c.next === i) { cur = i; msg = null; visited.push(i); if (!p.orte[i].next && p.orte[i].ende) { finished = true; } draw(); if (finished) setTimeout(() => ctx.solved(), 900); }
    else if (i === cur) { msg = null; draw(); }
    else if (p.orte[i].falsch) { msg = { i, text: p.orte[i].falsch }; draw(); }
    else { msg = { i, text: null }; draw(); }
  }
  function para(arr) { return arr.map(t => h('p', null, t)); }
  function draw() {
    const o = p.orte[cur];
    const kids = [];
    if (msg) {
      const m = msg.text;
      kids.push(h('div', { class: 'lsfalsch' },
        h('div', { class: 'lsnum bad' }, p.nrImBild ? String(p.orte[msg.i].nr) : String(p.orte[msg.i].nr)),
        ...(m ? para(m) : [h('p', null, 'Das ist nicht der richtige Ort.')]),
        h('p', null, h('strong', null, m ? p.falsch[0] : 'Hier ist es falsch.')),
        h('p', null, p.falsch[1]),
        h('button', { class: 'lsback', type: 'button', onclick: () => { msg = null; draw(); } }, `Zurück zu Nr. ${nrOf(cur)}`)));
    } else {
      kids.push(h('div', { class: 'lsnum' }, String(o.nr)), ...para(o.text));
      if (o.suche) kids.push(h('p', { class: 'lssuche' }, o.suche));
      if (o.ende) kids.push(...para(o.ende).map(e => { e.classList.add('lsende'); return e; }));
    }
    card.replaceChildren(...kids);
    spurEl.replaceChildren(h('span', { class: 'lsspurl' }, 'Meine Lesespur:'), ...visited.map(i => h('span', { class: 'lschip' }, String(nrOf(i)))));
    spots.forEach((b, i) => { b.classList.toggle('lsgut', visited.includes(i) && i !== cur); b.classList.toggle('lsjetzt', i === cur); });
  }
  draw();
  return {
    el: h('div', { class: 'lesespur' }, h('div', { class: 'lscol' }, card, spurEl), box),
    auto: true, ready: () => false, check: () => ({ ok: finished }),
    reveal() { locked = true; }, fill() { finished = true; locked = true; },
    lock() { locked = true; }, wrong() { }
  };
};
