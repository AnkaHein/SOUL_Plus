'use strict';
/* SOUL Plus: Bildschirme und Ablauf */
const $app = document.getElementById('app'), $bg = document.getElementById('bg'), $modal = document.getElementById('modal');
const FACH = {
  deutsch: { name: 'Deutsch', farbe: '#E97063', tint: 'rgba(255,240,236,.95)', pic: 'assets/kachel/deutsch.webp' },
  englisch: { name: 'Englisch', farbe: '#FFFF00', tint: 'rgba(255,255,226,.96)', pic: 'assets/kachel/englisch.webp' },
  mathe: { name: 'Mathe', farbe: '#00B0F0', tint: 'rgba(232,247,255,.95)', pic: 'assets/kachel/mathe.webp' },
  bio: { name: 'Biologie', farbe: '#92D050', tint: 'rgba(240,250,230,.95)', pic: 'assets/kachel/bio.webp' },
  geo: { name: 'Geografie', farbe: '#F2CEED', tint: 'rgba(252,239,250,.95)', pic: 'assets/kachel/geo.webp' },
  lern: { name: 'Lernwerkstatt', farbe: '#00967C', tint: 'rgba(235,248,245,.95)', pic: 'assets/kachel/lern.webp' }
};
const STUFEN = ['leicht', 'mittel', 'schwer'];
const S = { P: null, screen: 'name', params: {}, cache: {}, run: null, tok: 0, bgName: 'start', lastB: 'd1' };

/* ---------- Daten laden ---------- */
async function J(path) {
  if (S.cache[path]) return S.cache[path];
  const r = await fetch(path);
  if (!r.ok) throw new Error('Datei fehlt: ' + path);
  const j = await r.json(); S.cache[path] = j; return j;
}
const bpath = id => `content/${id[0] === 'l' ? 'lern' : id[0] === 'e' ? 'englisch' : 'deutsch'}/${id}/`;
async function Bz(id) { const j = await J(bpath(id) + 'baustein.json'); return j; }

/* ---------- Darstellung ---------- */
function fachVars(f) {
  const x = FACH[f] || FACH.deutsch;
  const r = document.documentElement.style;
  r.setProperty('--fach', x.farbe); r.setProperty('--tint', x.tint);
}
function setBg(name) {
  S.bgName = name || S.bgName;
  const n = S.bgName, fr = document.getElementById('frame');
  const m = /^([dle]\d)-/.exec(n || '');
  const portrait = innerHeight > innerWidth;
  if (m && fr) {
    fr.classList.add('themed'); document.body.dataset.theme = m[1];
    fr.style.setProperty('--framebg', m[1][0] === 'l' ? 'linear-gradient(#f1f8f5,#e4f1ec)' : `url("${new URL(`assets/bg/${n}-${portrait ? 'p' : 'l'}.webp`, document.baseURI).href}")`);
  } else if (fr) {
    fr.classList.remove('themed'); delete document.body.dataset.theme; fr.style.removeProperty('--framebg');
  }
}
addEventListener('resize', () => { setBg(); if (window.__drawSpur) window.__drawSpur(); });
function applySettings() {
  const e = (S.P && S.P.einst) || { schrift: 1, zeilen: 0, ruhig: false };
  const r = document.documentElement.style;
  r.setProperty('--fs', [0.92, 1.08, 1.28][e.schrift] || 1.08);
  r.setProperty('--lh', [1.55, 1.8, 2.05][e.zeilen] || 1.55);
  document.body.classList.toggle('calm', !!e.ruhig);
}
function save() { if (S.P) Store.save(S.P); }
function go(screen, params) {
  Voice.stop(); S.screen = screen; S.params = params || {}; render(); window.scrollTo(0, 0); { const f = document.getElementById("frame"); if (f) f.scrollTop = 0; }
}
function updateHead() {
  const hr = document.getElementById('hr');
  if (hr && !hr.firstChild) hr.appendChild(logoBtn());
  const hm = document.getElementById('hm');
  if (hm) hm.textContent = S.P && S.P.name ? `Willkommen, ${S.P.name}!` : 'Willkommen!';
}
async function render() {
  updateHead();
  const tok = ++S.tok;
  try {
    const fn = SCREENS[S.screen];
    const node = await fn();
    if (tok !== S.tok) return;
    $app.replaceChildren(...[].concat(node).filter(Boolean));
  } catch (e) {
    console.error(e);
    if (tok !== S.tok) return;
    $app.replaceChildren(h('div', { class: 'card plain' }, h('h2', null, 'Das hat leider nicht geklappt.'),
      h('p', null, 'Beim ersten Start braucht die App einmal Internet, damit alle Inhalte geladen werden. ' + (e.message || '')),
      h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => go('start') }, 'Zur Startseite'))));
  }
}
function toast(msg) {
  const t = h('div', { class: 'toast' }, msg);
  Object.assign(t.style, { position: 'fixed', left: '50%', bottom: '110px', transform: 'translateX(-50%)', background: '#1d2928', color: '#fff', padding: '12px 20px', borderRadius: '14px', zIndex: 60, boxShadow: '0 8px 24px rgba(0,0,0,.5)', maxWidth: '90vw' });
  document.body.append(t); setTimeout(() => t.remove(), 2600);
}
function modal(content) { $modal.replaceChildren(h('div', { class: 'dialog' }, content)); $modal.hidden = false; }
function closeModal() { $modal.hidden = true; $modal.replaceChildren(); }
$modal.addEventListener('click', e => { if (e.target === $modal) closeModal(); });

/* ---------- gemeinsame Teile ---------- */
function logoBtn() {
  let t = null;
  const b = h('button', { class: 'logo', type: 'button', 'aria-label': 'SOUL' }, h('img', { src: 'assets/logo/soul-logo.webp', alt: 'SOUL', draggable: 'false' }));
  const start = () => { t = setTimeout(() => { t = null; pinDialog(); }, 1200); };
  const stop = () => { if (t) { clearTimeout(t); t = null; } };
  b.addEventListener('pointerdown', start);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, stop));
  b.addEventListener('contextmenu', e => e.preventDefault());
  return b;
}
function stufeSeg(readonly) {
  return h('div', { class: 'seg' + (readonly ? ' ro' : ''), role: 'group', 'aria-label': 'Schwierigkeit' },
    STUFEN.map(s => h('button', {
      type: 'button', class: S.P.stufe === s ? 'on' : '', onclick: () => {
        if (readonly) return; S.P.stufe = s; save(); render();
      }
    }, s)));
}
function punktePill() { return h('div', { class: 'pill', title: 'Deine Punkte' }, '⭐ ', h('span', null, S.P.punkte)); }
function topbar(opts) {
  opts = opts || {};
  return h('div', { class: 'topbar' },
    opts.back ? h('button', { class: 'back', type: 'button', onclick: opts.back }, '← Zurück') : null,
    opts.noStufe ? null : stufeSeg(opts.readonlyStufe),
    h('span', { class: 'spacer' }),
    punktePill(),
    opts.noSettings ? null : h('button', { class: 'iconbtn', type: 'button', onclick: () => go('einst'), 'aria-label': 'Einstellungen' }, '⚙️'));
}
function progressToNext() {
  const nx = Punkte.naechste(S.P);
  if (!nx) return h('div', { class: 'punktekarte' }, h('b', null, 'Alle Spiele sind freigeschaltet! 🎉'));
  const von = Punkte.vorige(S.P), pct = Math.max(4, Math.min(100, (S.P.punkte - von) / (nx.schwelle - von) * 100));
  return h('div', { class: 'punktekarte' },
    h('div', null, h('b', null, `${S.P.punkte} Punkte`), ` · noch ${nx.schwelle - S.P.punkte} bis „${nx.name}“`),
    h('div', { class: 'bar' }, h('i', { style: { width: pct + '%' } })));
}
function img(src, alt, cls, fallback) {
  const i = h('img', { src, alt: alt || '', class: cls || '', loading: 'lazy' });
  i.addEventListener('error', () => { if (fallback) i.replaceWith(fallback); else i.style.display = 'none'; });
  return i;
}

/* ---------- Anleitung / PIN ---------- */
function anleitung(first) {
  modal([
    h('h2', null, 'Wichtig: Zum Home-Bildschirm!'),
    h('p', null, 'Damit deine Punkte nicht verloren gehen, speicherst du die App einmal auf dem Home-Bildschirm deines iPads:'),
    h('ol', { class: 'steps' },
      h('li', null, h('span', null, 'Tippe in Safari auf das ', h('b', null, 'Teilen-Symbol'), ' (Quadrat mit Pfeil nach oben).')),
      h('li', null, h('span', null, 'Wähle ', h('b', null, '„Zum Home-Bildschirm“'), '.')),
      h('li', null, h('span', null, 'Tippe auf ', h('b', null, '„Hinzufügen“'), ' und öffne die App ab jetzt immer über dieses Symbol.'))),
    h('p', { class: 'small' }, 'Wenn du dir das nicht merkst, kann es sein, dass dein Spielstand nach längerer Zeit gelöscht wird. Verlorene Punkte können nicht wiederhergestellt werden.'),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: () => { closeModal(); if (first) { S.P.anleitung = true; save(); go('start'); } } }, first ? 'Verstanden, los!' : 'Schließen'))
  ]);
}
function pinDialog() {
  const inp = h('input', { type: 'password', inputmode: 'numeric', autocomplete: 'off', placeholder: 'PIN', 'aria-label': 'PIN' });
  const msg = h('p', { class: 'small' }, '');
  const ok = () => { if (inp.value === Admin.pin()) { closeModal(); go('lehrer', { tab: 'profile' }); } else { msg.textContent = 'Falsche PIN.'; inp.value = ''; } };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); });
  modal([h('h2', null, 'Lehrkraft-Bereich'), h('p', null, 'Bitte die PIN eingeben.'), inp, msg,
    h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: ok }, 'Öffnen'), h('button', { class: 'btn sec', onclick: closeModal }, 'Abbrechen'))]);
  setTimeout(() => inp.focus(), 50);
}

/* ---------- Bildschirme ---------- */
const SCREENS = {};

SCREENS.name = function () {
  setBg('start'); fachVars('lern');
  const inp = h('input', { type: 'text', id: 'vorname', placeholder: 'Dein Vorname', autocomplete: 'off', autocapitalize: 'words', maxlength: 24, 'aria-label': 'Vorname' });
  const msg = h('p', { class: 'small' }, '');
  const go1 = () => {
    const n = inp.value.trim().replace(/\s+/g, ' ');
    if (n.length < 2) { msg.textContent = 'Bitte gib deinen Vornamen ein.'; return; }
    S.P = Store.load(n) || Store.create(n);
    Store.setActive(S.P.name); applySettings(); save();
    if (!S.P.anleitung) { go('start'); anleitung(true); } else go('start');
  };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') go1(); });
  return h('div', { class: 'namebox' }, h('div', { class: 'card plain' },
    h('h1', null, 'Willkommen bei SOUL Plus'),
    h('p', null, 'Zusatzbausteine für alle, die schon fertig sind. Wie heißt du?'),
    inp, msg,
    h('p', { class: 'small' }, 'Nur dein Vorname. Gib beim nächsten Mal genau denselben Namen ein, dann geht es dort weiter, wo du aufgehört hast.'),
    h('div', { class: 'btnrow', style: { justifyContent: 'center' } }, h('button', { class: 'btn big', onclick: go1 }, "Los geht's"))));
};

SCREENS.start = async function () {
  setBg('start'); fachVars('lern');
  const fa = await J('content/faecher.json');
  const tiles = ['deutsch', 'englisch', 'mathe', 'bio', 'geo', 'lern'].map(k => {
    const f = FACH[k], n = (fa[k] && fa[k].bausteine || []).length;
    return h('button', { class: 'tile' + (k === 'lern' ? ' regenbogen' : '') + (n ? '' : ' soon'), type: 'button', onclick: () => go('fach', { fach: k }) },
      !n && k !== 'lern' ? h('span', { class: 'ribbon' }, 'bald mehr') : null,
      h('div', { class: 'pic' }, h('img', { src: f.pic, alt: '' })),
      h('div', { class: 'lab', style: k !== 'lern' ? { borderTop: `10px solid ${f.farbe}` } : null }, h('span', null, f.name),
        h('small', null, k === 'lern' ? 'für den I-Bereich' : n ? n + (n === 1 ? ' Baustein' : ' Bausteine') : '')));
  });
  const z = S.P.zuletzt;
  return [topbar(),
  h('div', { class: 'hero' }, h('h1', null, `Hallo, ${S.P.name}!`), h('p', null, 'Such dir ein Fach aus und beginne dein Rätselabenteuer.')),
  progressToNext(),
  z ? h('div', { class: 'btnrow' }, h('button', { class: 'btn big', onclick: () => openKapitel(z.b, z.k) }, '▶ Weitermachen')) : null,
  h('div', { class: 'tiles' }, tiles),
  h('div', { class: 'btnrow' },
    h('button', { class: 'btn sec', onclick: () => go('lounge') }, '🎮 Spielelounge'),
    h('button', { class: 'btn sec', onclick: () => go('stand') }, '📊 Mein Stand'))];
};

SCREENS.fach = async function () {
  const k = S.params.fach, f = FACH[k];
  setBg('start'); fachVars(k);
  const fa = await J('content/faecher.json');
  const ids = ((fa[k] && fa[k].bausteine) || []).filter(id => !Admin.data.ausgeblendet.includes(id));
  const out = [topbar({ back: () => go('start') }), h('div', { class: 'hero' }, h('h1', null, f.name))];
  if (k === 'lern' && !ids.length) {
    out.push(h('div', { class: 'card plain' }, h('h2', null, 'Lernwerkstatt'),
      h('p', null, 'Hier entstehen Bausteine mit einfacheren Aufgaben und vielen Bildern, für Kinder im I-Bereich. Sie laufen im selben Konto, deine Punkte zählen mit.'),
      h('p', { class: 'small' }, 'Die Inhalte folgen, sobald Deutsch geprüft ist.')));
    return out;
  }
  if (!ids.length) {
    out.push(h('div', { class: 'card' }, h('h2', null, 'Hier kommen bald neue Bausteine ✨'), h('p', null, 'Schau später noch einmal vorbei. In Deutsch kannst du schon loslegen.')));
    return out;
  }
  const cards = await Promise.all(ids.map(Bz));
  out.push(h('div', { class: 'bausteine' }, cards.map(b => {
    const done = b.kapitel.filter(c => S.P.kapDone[b.id + '/' + c.nr]).length, pct = done / b.kapitel.length * 100;
    return h('button', { class: 'bk', type: 'button', onclick: () => go('baustein', { b: b.id }) },
      img(b.kachel, b.titel), h('div', { class: 't' }, h('h3', null, b.titel), h('p', null, b.untertitel),
        h('p', null, `${done} von ${b.kapitel.length} Kapiteln`), h('div', { class: 'bar' }, h('i', { style: { width: pct + '%', background: 'var(--fach)' } }))));
  })));
  return out;
};

SCREENS.baustein = async function () {
  const b = await Bz(S.params.b);
  S.lastB = b.kurz; setBg(b.kurz + '-haupt'); fachVars(b.fach);
  const nextK = (() => { for (const c of b.kapitel) if (!S.P.kapDone[b.id + '/' + c.nr]) return c.nr; return 0; })();
  const kaps = b.kapitel.map((c, i) => {
    const done = !!S.P.kapDone[b.id + '/' + c.nr], locked = c.nr > 1 && !S.P.kapDone[b.id + '/' + (c.nr - 1)];
    const cls = 'stat ' + (i % 2 ? 'r' : 'l') + (locked ? ' locked' : '') + (done ? ' done' : '') + (c.nr === nextK ? ' next' : '');
    return h('button', {
      class: cls, type: 'button',
      onclick: () => locked ? toast(`Schließe zuerst Kapitel ${c.nr - 1} ab, die Geschichte geht dort weiter.`) : openKapitel(b.id, c.nr)
    },
      h('div', { class: 'node' }, img(c.bild, '', '', h('span', null, c.nr)),
        h('i', { class: 'nr' }, c.nr), h('span', { class: 'st' }, done ? '✅' : locked ? '🔒' : c.nr === nextK ? '▶️' : '')),
      h('div', { class: 'slab' }, h('h3', null, `Kapitel ${c.nr}: ${c.titel}`), h('p', null, c.teaser)));
  });
  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svgEl.setAttribute('class', 'spursvg'); svgEl.setAttribute('aria-hidden', 'true');
  const spur = h('div', { class: 'spur' }, svgEl, kaps);
  const drawSpur = () => {
    const sv = svgEl; if (!spur.isConnected) return;
    const R = spur.getBoundingClientRect(), pts = [...spur.querySelectorAll('.node')].map(n => { const r = n.getBoundingClientRect(); return [r.left - R.left + r.width / 2, r.top - R.top + r.height / 2]; });
    if (pts.length < 2) return;
    sv.setAttribute('viewBox', `0 0 ${R.width} ${R.height}`); sv.setAttribute('width', R.width); sv.setAttribute('height', R.height);
    let all = '', doneD = '';
    const stats = [...spur.querySelectorAll('.stat')];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], my = (y1 + y2) / 2;
      const seg = `M${x1} ${y1} C${x1} ${my}, ${x2} ${my}, ${x2} ${y2} `;
      all += seg; if (stats[i].classList.contains('done')) doneD += seg;
    }
    sv.innerHTML = `<path d="${all}" class="trail"/><path d="${doneD}" class="trail got"/>`;
  };
  setTimeout(drawSpur, 0); setTimeout(drawSpur, 400);
  window.__drawSpur = drawSpur;
  const team = Object.values(b.figuren).map(f => h('div', { class: 'pcard' },
    f.img ? img(f.img, '', 'avatar lg') : h('div', { class: 'avatar lg ph' }, f.name.replace(/^(Frau|Herr|Opa|Hausmeister)\s+/, '').charAt(0)),
    h('div', null, h('b', null, f.name), h('small', null, f.rolle))));
  return [topbar({ back: () => go('fach', { fach: b.fach }), noStufe: b.fach === 'lern' }),
  h('div', { class: 'hero' }, h('h1', null, b.titel), h('p', null, b.untertitel)),
  h('div', { class: 'card glass', style: { marginBottom: '16px' } }, h('p', { style: { margin: 0 } }, b.einleitung), h('div', { class: 'team' }, team)),
  spur];
};

/* ---------- Kapitel starten ---------- */
const key = (b, k, st, i) => `${b}/${k}/${st}/${i}`;
async function openKapitel(bid, k) {
  try {
    const bz = await Bz(bid), st = bz.fach === 'lern' ? 'leicht' : S.P.stufe;
    const data = await J(`${bpath(bid)}kap${k}-${st}.json`);
    const unsolved = data.raetsel.findIndex((_, i) => !S.P.solved[key(bid, k, st, i)]);
    S.lastB = bz.kurz;
    S.run = { b: bid, k, stufe: st, bz, data, idx: unsolved < 0 ? 0 : unsolved, replay: unsolved < 0, earned: 0, vorher: S.P.punkte, greeted: false };
    S.P.zuletzt = { b: bid, k }; save();
    go('raetsel');
  } catch (e) { console.error(e); toast('Dieses Kapitel konnte nicht geladen werden.'); }
}

/* ---------- Rätselansicht ---------- */
SCREENS.raetsel = function () {
  const R = S.run; if (!R) return SCREENS.start();
  const { bz, data } = R, kap = bz.kapitel[R.k - 1];
  Voice.lang = bz.sprache === 'en' ? 'en' : 'de';
  setBg(bz.kurz + '-raetsel'); fachVars(bz.fach);
  const e = S.P.einst;
  R.mat = Material(data.material, bz.figuren, [0.75, 0.9, 1.1][e.tempo] || 0.9, e.vorlesen !== false && R.stufe === 'leicht' && bz.fach !== 'lern');
  const dots = h('div', { class: 'dots' });
  const puzzleBox = h('div', { class: 'card' });
  const tierWrap = h('div', { class: 'tier' });
  R.ui = null; R.tierWrap = tierWrap;
  const matCard = h('div', { class: 'card sticky' },
    data.auftrag ? h('p', { class: 'auftrag' }, data.auftrag) : null, R.mat.el);

  function drawDots(i) { dots.replaceChildren(...data.raetsel.map((_, k) => h('i', { class: k < i ? 'd' : k === i ? 'c' : '' }))); }

  function tierBtn(open) {
    const t = bz.hilfe;
    return h('button', { class: 'tierbtn', type: 'button', 'aria-label': 'Hilfe von ' + t.name, onclick: () => { R.bubbleOpen = !R.bubbleOpen; drawTier(); } },
      img(t.img, t.name, '', h('span', null, t.emoji || '🐾')));
  }
  function drawTier() {
    const p = R.puz, t = bz.hilfe, maxH = R.stufe === 'schwer' ? 1 : 2;
    const kids = [];
    if (R.bubbleOpen) {
      let body;
      if (R.bubbleText) body = [h('p', null, R.bubbleText)];
      else if (R.solvedNow) body = [h('p', null, 'Gut gemacht! Weiter zum nächsten Rätsel.')];
      else {
        body = [];
        if (R.hints === 0) body.push(h('p', null, `Hallo, ich bin ${t.name}. Brauchst du einen Tipp?`));
        if (R.hints >= 1) body.push(h('p', null, '💡 ' + p.hilfe1));
        if (R.hints >= 2 && p.hilfe2) body.push(h('p', null, '💡 ' + p.hilfe2));
        const more = R.hints < maxH && (R.hints === 0 || p.hilfe2);
        if (more) body.push(h('button', { class: 'btn', type: 'button', onclick: useHint }, R.hints === 0 ? 'Tipp holen' : 'Noch ein Tipp'),
          bz.keinAbzug ? null : h('div', { class: 'cost' }, `Jeder Tipp kostet ${Cfg.punkte.hilfeAbzug} Punkte.`));
      }
      kids.push(h('div', { class: 'bubble' }, h('button', { class: 'x', type: 'button', 'aria-label': 'Schließen', onclick: () => { R.bubbleOpen = false; R.bubbleText = ''; drawTier(); } }, '×'), body));
    }
    kids.push(tierBtn());
    tierWrap.replaceChildren(...kids);
  }
  function useHint() {
    const p = R.puz; R.hints++;
    if (R.hints === 1 && p.hl && p.hl.length) R.mat.hl(new Set(p.hl), 'hl');
    drawTier();
  }
  function say(text) { R.bubbleText = text; R.bubbleOpen = true; drawTier(); }

  function showPuzzle(i) {
    const p = data.raetsel[i]; R.i = i; R.puz = p; R.mist = 0; R.hints = 0; R.solvedNow = false; R.bubbleText = ''; R.bubbleOpen = false;
    R.mat.disableMark(); R.mat.clearHL();
    drawDots(i);
    const k = key(R.b, R.k, R.stufe, i);
    const alreadyDone = !!S.P.solved[k];
    const fb = h('div'), actions = h('div', { class: 'actions' });
    let ui, checkBtn, nextBtn, over = false;
    const ctx = {
      mat: R.mat, seed: hashStr(k), tries: 1,
      changed() { if (checkBtn) checkBtn.disabled = !ui.ready(); },
      mistake(msg) { return mistake(msg); },
      solved() { finish(true); }
    };
    ui = PZ[p.typ](p, ctx); R.ui = ui; R.ctx = ctx;
    const meta = h('div', { class: 'meta' },
      h('span', { class: 'badge' + (p.spur ? ' spur' : '') }, p.spur ? 'Spurensicherung' : `Rätsel ${i + 1} von ${data.raetsel.length}`),
      h('span', null, p.rtyp || ''), alreadyDone ? h('span', null, '· schon gelöst, keine Punkte') : null);
    function mistake(msg) {
      if (over) return true;
      R.mist++; ctx.tries = R.mist + 1;
      if (R.mist >= (bz.maxFehler || 3)) {
        ui.reveal(); ui.lock(); over = true; finish(false, true); return true;
      }
      fb.replaceChildren(h('div', { class: 'fb no' }, (msg || 'Das passt noch nicht. Schau noch einmal genau hin.') + ` (Noch ${(bz.maxFehler || 3) - R.mist} ${(bz.maxFehler || 3) - R.mist === 1 ? 'Versuch' : 'Versuche'})`));
      if (ui.wrong) ui.wrong();
      if (checkBtn) checkBtn.disabled = !ui.ready();
      return false;
    }
    function finish(correct, revealed) {
      over = true; R.solvedNow = true; R.bubbleOpen = false; R.bubbleText = '';
      let pts = revealed ? 0 : Punkte.wert(R.mist, bz.keinAbzug ? 0 : R.hints);
      const first = !S.P.solved[k];
      if (!first || R.replay) pts = 0;
      if (first && !R.replay) {
        S.P.solved[k] = { p: pts, m: R.mist, h: R.hints, t: Date.now() };
        S.P.punkte += pts; R.earned += pts;
        S.P.log.push({ k, typ: p.rtyp || p.typ, m: R.mist, h: R.hints, p: pts, ts: Date.now(), rev: !!revealed });
        save();
      }
      ui.lock && ui.lock();
      const jub = bz.hilfe.jubel || ['Gut gemacht!'];
      const msg = revealed
        ? h('div', { class: 'fb info' }, 'Das war knifflig. So ist es richtig: ' + (p.erklaerung || 'Die richtige Lösung ist jetzt markiert.') + ' Weiter geht es mit dem nächsten Rätsel.')
        : h('div', { class: 'fb ok' }, `${pick(jub, hashStr(k))} ${first && !R.replay ? '+' + pts + ' Punkte' : 'Keine Punkte (schon gelöst)'}` + (p.erklaerung ? ' ' + p.erklaerung : ''));
      fb.replaceChildren(msg);
      if (checkBtn) checkBtn.remove();
      const last = i === data.raetsel.length - 1;
      actions.append(h('button', { class: 'btn big', type: 'button', onclick: () => last ? finishChapter() : showPuzzle(i + 1) }, last ? 'Kapitel abschließen' : 'Weiter ▶'));
      drawTier(); $app.querySelector('.rpuzzle') && actions.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (!ui.auto) {
      checkBtn = h('button', {
        class: 'btn', type: 'button', disabled: true, onclick: () => {
          const res = ui.check(); if (res.ok) finish(true); else mistake(res.msg);
        }
      }, 'Prüfen');
      actions.append(checkBtn);
    }
    puzzleBox.className = 'card rpuzzle';
    puzzleBox.replaceChildren(meta, h('div', { class: 'frage' }, p.frage), ui.el, actions, fb);
    R.checkBtn = () => checkBtn;
    R.actions = actions;
    R.finishNow = finish;
    if (!R.greeted && kap.begruessung) { R.greeted = true; R.bubbleText = kap.begruessung; R.bubbleOpen = p.typ !== 'lesespur'; }
    drawTier();
  }

  async function finishChapter() {
    const bid = R.b, k = R.k;
    let bonus = 0, bausteinBonus = 0;
    if (!S.P.kapDone[bid + '/' + k]) { S.P.kapDone[bid + '/' + k] = true; bonus = Cfg.punkte.kapitelBonus; S.P.punkte += bonus; }
    if (!S.P.bausteinDone[bid] && bz.kapitel.every(c => S.P.kapDone[bid + '/' + c.nr])) { S.P.bausteinDone[bid] = true; bausteinBonus = Cfg.punkte.bausteinBonus; S.P.punkte += bausteinBonus; }
    S.P.zuletzt = { b: bid, k: k < bz.kapitel.length ? k + 1 : k };
    if (k >= bz.kapitel.length && S.P.bausteinDone[bid]) S.P.zuletzt = null;
    save();
    go('geschafft', { bonus, bausteinBonus, earned: R.earned, vorher: R.vorher });
  }

  showPuzzle(R.idx);
  return [
    h('div', { class: 'topbar' }, h('button', { class: 'back', type: 'button', onclick: () => go('baustein', { b: R.b }) }, '← Kapitel'),
      h('div', { class: 'seg ro' }, h('button', { class: 'on', type: 'button' }, R.stufe)), h('span', { class: 'spacer' }), punktePill()),
    h('div', { class: 'rhead' }, h('h2', null, `Kapitel ${R.k}: ${kap.titel}`), dots),
    h('div', { class: 'rlayout' + ((data.material || []).length ? '' : ' solo') }, (data.material || []).length ? matCard : null, puzzleBox),
    tierWrap];
};

SCREENS.geschafft = function () {
  const R = S.run, bz = R.bz, P = S.params, kap = bz.kapitel[R.k - 1];
  setBg(bz.kurz + '-geschafft'); fachVars(bz.fach);
  const neu = Punkte.spieleStatus(S.P).filter(g => g.offen && g.schwelle > P.vorher);
  const hasNext = R.k < bz.kapitel.length;
  const baustein = P.bausteinBonus > 0;
  return [topbar({ back: () => go('baustein', { b: R.b }), noStufe: true }),
  h('div', { class: 'geschafft' }, h('h1', null, baustein ? 'Baustein geschafft! 🏆' : 'Kapitel geschafft! ⭐')),
  h('div', { class: 'card' },
    h('h2', null, `Kapitel ${R.k}: ${kap.titel}`),
    kap.ende ? h('p', null, kap.ende) : null,
    baustein ? h('div', { class: 'fb ok' }, h('b', null, bz.abschluss.titel), h('div', null, bz.abschluss.text)) : null,
    h('div', { class: 'stats' },
      h('div', { class: 'stat' }, h('b', null, '+' + P.earned), 'Rätselpunkte'),
      P.bonus ? h('div', { class: 'stat' }, h('b', null, '+' + P.bonus), 'Kapitel-Bonus') : null,
      P.bausteinBonus ? h('div', { class: 'stat' }, h('b', null, '+' + P.bausteinBonus), 'Baustein-Bonus') : null,
      h('div', { class: 'stat' }, h('b', null, S.P.punkte), 'Punkte gesamt')),
    neu.length ? h('div', { class: 'fb ok' }, '🎉 Neu freigeschaltet: ' + neu.map(g => g.name).join(', ')) : null,
    h('div', { class: 'btnrow' },
      hasNext ? h('button', { class: 'btn big', onclick: () => openKapitel(R.b, R.k + 1) }, `Weiter mit Kapitel ${R.k + 1} ▶`) : null,
      h('button', { class: 'btn sec', onclick: () => go('baustein', { b: R.b }) }, 'Zur Übersicht'),
      neu.length ? h('button', { class: 'btn sec', onclick: () => go('lounge') }, '🎮 Spielelounge') : null))];
};

SCREENS.lounge = function () {
  setBg((S.lastB || 'd1') + '-spiel'); fachVars('lern');
  const gs = Punkte.spieleStatus(S.P);
  return [topbar({ back: () => go('start'), noStufe: true }),
  h('div', { class: 'hero' }, h('h1', null, 'Spielelounge'), h('p', null, 'Deine Punkte schalten Spiele frei. Sie bleiben dann offen.')),
  progressToNext(),
  h('div', { class: 'games' }, gs.map(g => h('div', { class: 'game' + (g.offen ? '' : ' locked') },
    h('div', { class: 'gi' }, g.offen ? g.icon : '🔒'), h('h3', null, g.name), h('p', { class: 'small' }, g.text),
    g.offen ? h('button', { class: 'btn', onclick: () => modal([h('h2', null, g.name), h('p', null, 'Dieses Spiel wird im nächsten Bauabschnitt eingebaut.'), h('div', { class: 'btnrow' }, h('button', { class: 'btn', onclick: closeModal }, 'OK'))]) }, 'Spielen')
      : h('p', null, h('b', null, `Ab ${g.schwelle} Punkten`), h('br'), h('span', { class: 'small' }, `noch ${g.schwelle - S.P.punkte} Punkte`)))))];
};

SCREENS.stand = async function () {
  setBg('start'); fachVars('lern');
  const fa = await J('content/faecher.json');
  const ids = (fa.deutsch && fa.deutsch.bausteine) || [];
  const bs = await Promise.all(ids.map(Bz));
  const kd = Object.keys(S.P.kapDone).length, gs = Punkte.spieleStatus(S.P);
  return [topbar({ back: () => go('start'), noStufe: true }),
  h('div', { class: 'hero' }, h('h1', null, 'Mein Stand')),
  h('div', { class: 'card plain' },
    h('div', { class: 'stats' },
      h('div', { class: 'stat' }, h('b', null, S.P.punkte), 'Punkte'),
      h('div', { class: 'stat' }, h('b', null, kd), 'Kapitel geschafft'),
      h('div', { class: 'stat' }, h('b', null, Object.keys(S.P.bausteinDone).length), 'Bausteine geschafft'),
      h('div', { class: 'stat' }, h('b', null, gs.filter(g => g.offen).length + '/' + gs.length), 'Spiele frei')),
    h('h3', null, 'Deutsch'),
    bs.map(b => { const d = b.kapitel.filter(c => S.P.kapDone[b.id + '/' + c.nr]).length; return h('div', { style: { margin: '8px 0' } }, h('b', null, b.titel), ` · ${d}/${b.kapitel.length}`, h('div', { class: 'bar', style: { background: '#e4e8e7' } }, h('i', { style: { width: d / b.kapitel.length * 100 + '%', background: '#E97063' } }))); }),
    h('h3', null, 'Freigeschaltete Spiele'),
    h('p', null, gs.filter(g => g.offen).map(g => g.icon + ' ' + g.name).join(' · ') || 'Noch keins, sammle Punkte!'))];
};

SCREENS.einst = function () {
  setBg('start'); fachVars('lern');
  const e = S.P.einst;
  const segm = (arr, cur, fn) => h('div', { class: 'seg' }, arr.map((t, i) => h('button', { type: 'button', class: cur === i ? 'on' : '', onclick: () => { fn(i); save(); applySettings(); render(); } }, t)));
  return [topbar({ back: () => go('start'), noStufe: true, noSettings: true }),
  h('div', { class: 'hero' }, h('h1', null, 'Einstellungen')),
  h('div', { class: 'card plain' },
    h('div', { class: 'set' }, h('label', null, 'Schriftgröße'), segm(['klein', 'mittel', 'groß'], e.schrift, i => e.schrift = i)),
    h('div', { class: 'set' }, h('label', null, 'Zeilenabstand'), segm(['normal', 'weit', 'sehr weit'], e.zeilen, i => e.zeilen = i)),
    h('div', { class: 'set' }, h('label', null, 'Ruhiger Modus (weniger Bewegung)'), segm(['aus', 'an'], e.ruhig ? 1 : 0, i => e.ruhig = i === 1)),
    h('div', { class: 'set' }, h('label', null, 'Vorlesetempo'), segm(['langsam', 'normal', 'schnell'], e.tempo, i => e.tempo = i)),
    h('div', { class: 'set' }, h('label', null, 'Anleitung „Zum Home-Bildschirm“'), h('button', { class: 'btn sec', onclick: () => anleitung(false) }, 'Ansehen')),
    h('div', { class: 'set' }, h('label', null, 'App aktualisieren (neue Kapitel holen)'), h('button', { class: 'btn sec', onclick: updateApp }, 'Aktualisieren')),
    h('div', { class: 'set' }, h('label', null, 'Abmelden'), h('button', { class: 'btn warn', onclick: () => { Store.setActive(''); S.P = null; S.run = null; applyDefaults(); go('name'); } }, 'Abmelden')),
    h('p', { class: 'small' }, 'Version ' + Cfg.version))];
};
function applyDefaults() { document.documentElement.style.setProperty('--fs', 1.08); document.documentElement.style.setProperty('--lh', 1.55); document.body.classList.remove('calm'); }
async function updateApp() {
  try {
    if ('serviceWorker' in navigator) { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister())); }
    if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); }
  } catch (e) { }
  toast('Aktualisiere …'); setTimeout(() => location.reload(), 600);
}

/* ---------- Lehrkraft-Bereich ---------- */
SCREENS.lehrer = async function () {
  setBg('start'); fachVars('lern');
  const tab = S.params.tab || 'profile';
  const head = [h('div', { class: 'topbar' }, h('button', { class: 'back', onclick: () => go(S.P ? 'start' : 'name') }, '← Beenden'), h('span', { class: 'spacer' }), h('div', { class: 'pill' }, '🔐 Lehrkraft-Bereich')),
  h('div', { class: 'tabs' },
    ['profile', 'allgemein'].map(t => h('button', { class: 'btn' + (tab === t ? '' : ' sec'), onclick: () => go('lehrer', { tab: t }) }, t === 'profile' ? 'Profile' : 'Allgemein')))];
  if (tab === 'allgemein') return head.concat([await lehrerAllgemein()]);
  if (S.params.name) return head.concat([lehrerDetail(S.params.name)]);
  const ps = Store.all().sort((a, b) => a.name.localeCompare(b.name, 'de'));
  return head.concat([h('div', { class: 'card plain' }, h('h2', null, `Profile auf diesem Tablet (${ps.length})`),
    ps.length ? h('table', null, h('thead', null, h('tr', null, ['Vorname', 'Punkte', 'Kapitel', 'Stufe', 'zuletzt aktiv'].map(t => h('th', null, t)))),
      h('tbody', null, ps.map(p => h('tr', { class: 'click', onclick: () => go('lehrer', { tab: 'profile', name: p.name }) },
        h('td', null, p.name), h('td', null, p.punkte), h('td', null, Object.keys(p.kapDone).length), h('td', null, p.stufe), h('td', null, fmtDate(p.aktiv)))))) : h('p', null, 'Noch keine Profile.'),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn sec', onclick: () => exportCsv(ps) }, '⬇ Alle als Tabelle (CSV)')))]);
};
function stats(p) {
  const byTyp = {}, byKap = {};
  p.log.forEach(l => {
    const t = byTyp[l.typ] = byTyp[l.typ] || { n: 0, ok1: 0, m: 0, h: 0 };
    t.n++; if (l.m === 0 && !l.rev) t.ok1++; t.m += l.m; t.h += l.h;
    const kk = l.k.split('/').slice(0, 3).join('/'); const c = byKap[kk] = byKap[kk] || { n: 0, m: 0, h: 0, p: 0 };
    c.n++; c.m += l.m; c.h += l.h; c.p += l.p;
  });
  return { byTyp, byKap };
}
function lehrerDetail(name) {
  const p = Store.load(name); if (!p) return h('p', null, 'Profil nicht gefunden.');
  const st = stats(p);
  const sel = (opts, cur, fn) => { const s = h('select', null, opts.map(([v, t]) => h('option', { value: v, selected: String(v) === String(cur) }, t))); s.addEventListener('change', () => { fn(s.value); Store.save(p); render(); }); return s; };
  return h('div', { class: 'card plain' },
    h('div', { class: 'btnrow' }, h('button', { class: 'btn sec', onclick: () => go('lehrer', { tab: 'profile' }) }, '← Alle Profile')),
    h('h2', null, p.name),
    h('div', { class: 'stats' }, h('div', { class: 'stat' }, h('b', null, p.punkte), 'Punkte'), h('div', { class: 'stat' }, h('b', null, Object.keys(p.kapDone).length), 'Kapitel'),
      h('div', { class: 'stat' }, h('b', null, p.log.length), 'gelöste Rätsel'), h('div', { class: 'stat' }, h('b', null, p.stufe), 'Stufe')),
    h('h3', null, 'Welche Rätseltypen fallen leicht oder schwer?'),
    Object.keys(st.byTyp).length ? h('table', null, h('thead', null, h('tr', null, ['Rätseltyp', 'Anzahl', 'sofort richtig', 'Fehler gesamt', 'Hilfen'].map(t => h('th', null, t)))),
      h('tbody', null, Object.entries(st.byTyp).sort((a, b) => (a[1].ok1 / a[1].n) - (b[1].ok1 / b[1].n)).map(([t, v]) => h('tr', null, h('td', null, t), h('td', null, v.n), h('td', null, Math.round(v.ok1 / v.n * 100) + ' %'), h('td', null, v.m), h('td', null, v.h))))) : h('p', { class: 'small' }, 'Noch keine Daten.'),
    h('h3', null, 'Je Kapitel und Stufe'),
    Object.keys(st.byKap).length ? h('table', null, h('thead', null, h('tr', null, ['Kapitel (Baustein/Nr./Stufe)', 'Rätsel', 'Fehler', 'Hilfen', 'Punkte'].map(t => h('th', null, t)))),
      h('tbody', null, Object.entries(st.byKap).map(([k, v]) => h('tr', null, h('td', null, k), h('td', null, v.n), h('td', null, v.m), h('td', null, v.h), h('td', null, v.p))))) : null,
    h('h3', null, 'Einstellungen für dieses Kind'),
    h('div', { class: 'set' }, h('label', null, 'Stufe'), sel(STUFEN.map(s => [s, s]), p.stufe, v => p.stufe = v)),
    h('div', { class: 'set' }, h('label', null, 'Vorlese-Knopf anzeigen'), sel([[1, 'ja'], [0, 'nein']], p.einst.vorlesen === false ? 0 : 1, v => p.einst.vorlesen = v === '1')),
    h('div', { class: 'set' }, h('label', null, 'Schriftgröße'), sel([[0, 'klein'], [1, 'mittel'], [2, 'groß']], p.einst.schrift, v => p.einst.schrift = +v)),
    h('div', { class: 'set' }, h('label', null, 'Spiele manuell freischalten'), h('div', null, Cfg.spiele.map(g => { const cb = h('input', { type: 'checkbox', checked: (p.extraSpiele || []).includes(g.id), style: { width: 'auto', marginRight: '6px' } }); cb.addEventListener('change', () => { p.extraSpiele = (p.extraSpiele || []).filter(x => x !== g.id); if (cb.checked) p.extraSpiele.push(g.id); Store.save(p); }); return h('label', { style: { display: 'block', fontWeight: 400 } }, cb, g.name); }))),
    h('div', { class: 'btnrow' },
      h('button', { class: 'btn sec', onclick: () => exportCsv([p]) }, '⬇ Tabelle (CSV)'),
      h('button', { class: 'btn sec', onclick: () => { const n = prompt('Neuer Vorname:', p.name); if (n && n.trim().length > 1) { Store.rename(p.name, n); if (S.P && Store.norm(S.P.name) === Store.norm(p.name)) { S.P = Store.load(n); Store.setActive(S.P.name); } go('lehrer', { tab: 'profile', name: n.trim() }); } } }, '✏ Umbenennen'),
      h('button', { class: 'btn warn', onclick: () => { if (confirm(`Profil „${p.name}“ endgültig löschen?`)) { Store.del(p.name); if (S.P && Store.norm(S.P.name) === Store.norm(p.name)) { S.P = null; Store.setActive(''); } go('lehrer', { tab: 'profile' }); } } }, '🗑 Löschen')));
}
async function lehrerAllgemein() {
  const fa = await J('content/faecher.json');
  const ids = (fa.deutsch && fa.deutsch.bausteine) || [];
  const bs = await Promise.all(ids.map(Bz));
  return h('div', { class: 'card plain' }, h('h2', null, 'Allgemein'),
    h('h3', null, 'Bausteine zeitweise ausblenden'),
    bs.map(b => { const cb = h('input', { type: 'checkbox', checked: Admin.data.ausgeblendet.includes(b.id), style: { width: 'auto', marginRight: '6px' } }); cb.addEventListener('change', () => { Admin.data.ausgeblendet = Admin.data.ausgeblendet.filter(x => x !== b.id); if (cb.checked) Admin.data.ausgeblendet.push(b.id); Admin.save(); }); return h('label', { style: { display: 'block' } }, cb, `${b.titel} ausblenden`); }),
    h('h3', null, 'Freischalt-Schwellen (Punkte)'),
    Cfg.spiele.map(g => { const i = h('input', { type: 'number', min: 0, value: Admin.schwelle(g), style: { width: '110px' } }); i.addEventListener('change', () => { Admin.data.schwellen[g.id] = Math.max(0, +i.value || 0); Admin.save(); }); return h('div', { class: 'set' }, h('label', null, g.name), i); }),
    h('h3', null, 'PIN ändern'),
    (() => { const i = h('input', { type: 'text', inputmode: 'numeric', placeholder: 'neue PIN (mind. 4 Ziffern)', style: { maxWidth: '260px' } }); return h('div', { class: 'set' }, i, h('button', { class: 'btn', onclick: () => { if (/^\d{4,8}$/.test(i.value)) { Admin.data.pin = i.value; Admin.save(); toast('PIN geändert.'); i.value = ''; } else toast('Bitte 4 bis 8 Ziffern.'); } }, 'Speichern')); })(),
    h('h3', null, 'Zum Schuljahresende'),
    h('div', { class: 'btnrow' }, h('button', { class: 'btn warn', onclick: () => { if (confirm('ALLE Profile auf diesem Tablet endgültig löschen?')) { Store.wipeAll(); S.P = null; toast('Alle Profile gelöscht.'); go('lehrer', { tab: 'profile' }); } } }, '🗑 Alle Profile löschen')),
    h('p', { class: 'small' }, `Version ${Cfg.version}. Es werden nur Vornamen gespeichert, alles bleibt auf diesem Tablet.`));
}
function exportCsv(ps) {
  const rows = [['Vorname', 'Baustein', 'Kapitel', 'Stufe', 'Rätsel', 'Rätseltyp', 'Fehlversuche', 'Hilfen', 'Punkte', 'Zeit']];
  ps.forEach(p => p.log.forEach(l => { const [b, k, st, i] = l.k.split('/'); rows.push([p.name, b, k, st, (+i) + 1, l.typ, l.m, l.h, l.p, new Date(l.ts).toISOString()]); }));
  const csv = '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
  const a = h('a', { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'soul-zusatz-auswertung.csv' });
  document.body.append(a); a.click(); a.remove();
}

/* ---------- Start ---------- */
async function boot() {
  try { Object.assign(Cfg, await (await fetch('config/einstellungen.json')).json()); } catch (e) { }
  Admin.load();
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => { });
  const n = Store.active();
  const p = n && Store.load(n);
  if (p) { S.P = p; applySettings(); go('start'); } else go('name');
}
window.SOULDBG = {
  S, go, openKapitel, Store,
  step() { // Testhilfe: löst das aktuelle Rätsel richtig bzw. geht weiter
    const R = S.run; if (!R || S.screen !== 'raetsel') return 'nicht im Rätsel';
    const cb = R.checkBtn && R.checkBtn();
    if (R.solvedNow) { const b = [...document.querySelectorAll('.rpuzzle .actions button')].pop(); b && b.click(); return 'weiter'; }
    R.ui.fill(); if (R.ui.auto) { R.ctx.solved(); return 'auto'; }
    if (R.ctx.changed) R.ctx.changed(); const c = R.checkBtn(); if (c) { c.click(); return 'geprueft'; } return 'kein Knopf';
  }
};
boot();
