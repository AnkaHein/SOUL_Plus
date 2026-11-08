'use strict';
/* Speicher: alles nur im Browser des Tablets, nur Vornamen */
const LS = 'soulzusatz:';
const Cfg = { pin: '4711', spiele: [], punkte: { ersteAntwort: 10, zweite: 6, dritte: 3, hilfeAbzug: 2, kapitelBonus: 20, bausteinBonus: 50 }, version: '' };
const Admin = {
  data: { pin: null, schwellen: {}, ausgeblendet: [] },
  load() { try { Object.assign(this.data, JSON.parse(localStorage.getItem(LS + 'admin') || '{}')); } catch (e) { } },
  save() { try { localStorage.setItem(LS + 'admin', JSON.stringify(this.data)); } catch (e) { } },
  pin() { return this.data.pin || Cfg.pin; },
  schwelle(g) { return this.data.schwellen[g.id] != null ? this.data.schwellen[g.id] : g.schwelle; }
};
const Store = {
  norm(n) { return String(n || '').trim().replace(/\s+/g, ' ').toLowerCase(); },
  names() { try { return JSON.parse(localStorage.getItem(LS + 'profiles') || '[]'); } catch (e) { return []; } },
  setNames(a) { try { localStorage.setItem(LS + 'profiles', JSON.stringify(a)); } catch (e) { } },
  key(name) { return LS + 'p:' + this.norm(name); },
  load(name) {
    try { const s = localStorage.getItem(this.key(name)); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  },
  create(name) {
    const nm = name.trim().replace(/\s+/g, ' ');
    const p = {
      name: nm, stufe: 'leicht', punkte: 0, kapDone: {}, bausteinDone: {}, solved: {}, log: [], lauf: {},
      zuletzt: null, einst: { schrift: 1, zeilen: 0, ruhig: false, tempo: 1, vorlesen: true },
      extraSpiele: [], erstellt: Date.now(), aktiv: Date.now(), anleitung: false
    };
    this.save(p);
    const ns = this.names(); if (!ns.some(x => this.norm(x) === this.norm(nm))) { ns.push(nm); this.setNames(ns); }
    return p;
  },
  save(p) { try { p.aktiv = Date.now(); localStorage.setItem(this.key(p.name), JSON.stringify(p)); } catch (e) { } },
  del(name) { try { localStorage.removeItem(this.key(name)); } catch (e) { } this.setNames(this.names().filter(n => this.norm(n) !== this.norm(name))); },
  all() { return this.names().map(n => this.load(n)).filter(Boolean); },
  rename(old, nw) {
    const p = this.load(old); if (!p) return null;
    this.del(old); p.name = nw.trim().replace(/\s+/g, ' ');
    this.save(p);
    const ns = this.names(); ns.push(p.name); this.setNames(ns); return p;
  },
  active() { try { return localStorage.getItem(LS + 'aktiv') || ''; } catch (e) { return ''; } },
  setActive(n) { try { if (n) localStorage.setItem(LS + 'aktiv', n); else localStorage.removeItem(LS + 'aktiv'); } catch (e) { } },
  wipeAll() { Object.keys(localStorage).filter(k => k.startsWith(LS + 'p:')).forEach(k => localStorage.removeItem(k)); this.setNames([]); this.setActive(''); }
};
/* Punkte-Logik */
const Punkte = {
  base(fehler) { const c = Cfg.punkte; return fehler === 0 ? c.ersteAntwort : fehler === 1 ? c.zweite : fehler === 2 ? c.dritte : 0; },
  wert(fehler, hilfen) { return Math.max(0, this.base(fehler) - hilfen * Cfg.punkte.hilfeAbzug); },
  spieleStatus(p) {
    return Cfg.spiele.map(g => {
      const s = Admin.schwelle(g);
      return Object.assign({}, g, { schwelle: s, offen: p.punkte >= s || (p.extraSpiele || []).includes(g.id) });
    });
  },
  naechste(p) {
    const l = this.spieleStatus(p).filter(g => !g.offen).sort((a, b) => a.schwelle - b.schwelle);
    return l[0] || null;
  },
  vorige(p) {
    const l = this.spieleStatus(p).filter(g => g.schwelle <= p.punkte).sort((a, b) => b.schwelle - a.schwelle);
    return l[0] ? l[0].schwelle : 0;
  }
};
