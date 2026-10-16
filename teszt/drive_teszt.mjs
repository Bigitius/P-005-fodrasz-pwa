// Drive-szinkron teszt mock-Drive-val. Valodi ablakot/halozatot nem nyit:
// az ablak-fuggvenyek hangosan elbuknak, ha barmi meghivja oket.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const DriveSync = require('../drive-sync.js');

for (const n of ['alert', 'confirm', 'prompt', 'open'])
  globalThis[n] = () => { throw new Error('VALODI ABLAK: ' + n); };
const valodiFetch = globalThis.fetch;
globalThis.fetch = () => { throw new Error('VALODI HALOZAT'); };

let ido = new Date('2026-10-16T10:00:00Z');
function mockDrive() {
  const fajlok = []; let szam = 0; let hianyosVissza = false; let kodAuth = null;
  const tick = () => { ido = new Date(ido.getTime() + 1000); return ido.toISOString(); };
  const hivasok = [];
  function szur(qs) {
    return fajlok.filter(f => {
      if (/trashed=false/.test(qs) && f.trashed) return false;
      let m;
      if ((m = qs.match(/name='([^']*)'/)) && f.name !== m[1]) return false;
      if ((m = qs.match(/name contains '([^']*)'/)) && !f.name.includes(m[1])) return false;
      if ((m = qs.match(/'([^']*)' in parents/)) && !(f.parents || []).includes(m[1])) return false;
      if (/mimeType='application\/vnd.google-apps.folder'/.test(qs) && f.mimeType !== 'application/vnd.google-apps.folder') return false;
      return true;
    });
  }
  const valasz = (o, ok = true, status = 200) => ({ ok, status, json: async () => o, text: async () => (typeof o === 'string' ? o : JSON.stringify(o)) });
  async function fetchFn(url, init = {}) {
    hivasok.push((init.method || 'GET') + ' ' + url.split('?')[0]);
    if (kodAuth) return valasz({}, false, kodAuth);
    const u = new URL(url); const metodus = init.method || 'GET';
    const p = u.pathname;
    if (p === '/drive/v3/files' && metodus === 'GET') {
      return valasz({ files: szur(u.searchParams.get('q')).map(f => ({ id: f.id, name: f.name, modifiedTime: f.modifiedTime, appProperties: f.appProperties })) });
    }
    if (p === '/drive/v3/files' && metodus === 'POST') {
      const meta = JSON.parse(init.body); const f = { id: 'id' + (++szam), ...meta, modifiedTime: tick(), tartalom: '' };
      fajlok.push(f); return valasz({ id: f.id });
    }
    let m;
    if ((m = p.match(/^\/upload\/drive\/v3\/files(?:\/(.+))?$/))) {
      const t = init.body; const h = init.headers['Content-Type'].split('boundary=')[1];
      const reszek = t.split('--' + h).filter(x => x.trim() && x.trim() !== '--');
      const meta = JSON.parse(reszek[0].split('\r\n\r\n')[1].replace(/\r\n$/, ''));
      const tart = reszek[1].split('\r\n\r\n')[1].replace(/\r\n$/, '');
      let f;
      if (m[1]) { f = fajlok.find(x => x.id === m[1]); Object.assign(f, meta); }
      else { f = { id: 'id' + (++szam), ...meta }; fajlok.push(f); }
      f.tartalom = tart; f.modifiedTime = tick();
      return valasz({ id: f.id, modifiedTime: f.modifiedTime });
    }
    if ((m = p.match(/^\/drive\/v3\/files\/([^/]+)\/copy$/))) {
      const f = fajlok.find(x => x.id === m[1]); const meta = JSON.parse(init.body);
      const c = { ...f, ...meta, id: 'id' + (++szam), modifiedTime: tick() }; fajlok.push(c); return valasz({ id: c.id });
    }
    if ((m = p.match(/^\/drive\/v3\/files\/([^/]+)$/))) {
      const f = fajlok.find(x => x.id === m[1]);
      if (metodus === 'PATCH') { Object.assign(f, JSON.parse(init.body)); return valasz({ id: f.id }); }
      if (u.searchParams.get('alt') === 'media') return valasz(hianyosVissza ? f.tartalom.slice(0, -3) : f.tartalom);
    }
    throw new Error('Ismeretlen mock hivas: ' + metodus + ' ' + url);
  }
  return { fetchFn, fajlok, hivasok, hianyos: v => { hianyosVissza = v; }, authKod: v => { kodAuth = v; } };
}
function tarolo() { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, m }; }
function keszit(drive, opt = {}) {
  const t = opt.tarolo || tarolo(); const allapotok = [];
  let adat = opt.adat || { bookings: [{ uid: 'a', date: '2026-10-16' }, { uid: 'b', date: '2026-10-17' }], chemicals: [{ code: 'K001', start: 500 }] };
  const ds = DriveSync.create({
    fetch: drive.fetchFn, storage: t, now: () => ido,
    auth: { getToken: async () => (opt.nincsToken ? null : 'tok') },
    getData: () => adat, isOnline: () => (opt.online ? opt.online() : true),
    onStatus: s => allapotok.push(s), setTimer: () => 1, clearTimer: () => {}, debounceMs: 0
  });
  return { ds, t, allapotok, utolso: () => allapotok[allapotok.length - 1], setAdat: a => { adat = a; } };
}

let futott = 0;
async function teszt(nev, f) { try { await f(); futott++; console.log('  OK    ' + nev); } catch (e) { console.log('  BUKIK ' + nev + '\n        ' + e.message); process.exitCode = 1; } }

await teszt('elso mentes: mappa+fajl letrejon, visszaolvasas egyezik, tiszta', async () => {
  const d = mockDrive(); const k = keszit(d);
  k.ds.markDirty(); await k.ds.szinkron();
  assert.equal(k.utolso().kind, 'mentve');
  assert.equal(d.fajlok.filter(f => f.name === 'Fodrasz-adatok').length, 1);
  const fo = d.fajlok.find(f => f.name === 'fodrasz-adatok.json');
  assert.equal(JSON.parse(fo.tartalom).bookings.length, 2);
  assert.equal(k.ds.allapot().dirty, false);
});
await teszt('offline: nincs halozati hivas, "offline" allapot, dirty marad; netre varas utan feltolt', async () => {
  const d = mockDrive(); let on = false; const k = keszit(d, { online: () => on });
  k.ds.markDirty(); await k.ds.szinkron();
  assert.equal(k.utolso().kind, 'offline'); assert.equal(d.hivasok.length, 0); assert.equal(k.ds.allapot().dirty, true);
  on = true; await k.ds.szinkron(); assert.equal(k.utolso().kind, 'mentve');
});
await teszt('nincs token: "belepes" allapot, nincs Drive-hivas, dirty marad', async () => {
  const d = mockDrive(); const k = keszit(d, { nincsToken: true });
  k.ds.markDirty(); await k.ds.szinkron();
  assert.equal(k.utolso().kind, 'belepes'); assert.equal(d.hivasok.length, 0); assert.equal(k.ds.allapot().dirty, true);
});
await teszt('401: "belepes", nem csendes hiba', async () => {
  const d = mockDrive(); const k = keszit(d); d.authKod(401);
  k.ds.markDirty(); await k.ds.szinkron(); assert.equal(k.utolso().kind, 'belepes'); assert.equal(k.ds.allapot().dirty, true);
});
await teszt('500: HANGOS hiba, dirty marad', async () => {
  const d = mockDrive(); const k = keszit(d); d.authKod(500);
  k.ds.markDirty(); await k.ds.szinkron(); assert.equal(k.utolso().kind, 'hiba'); assert.match(k.utolso().text, /HIBA/); assert.equal(k.ds.allapot().dirty, true);
});
await teszt('visszaolvasas elter: hiba, NEM "mentve", dirty marad', async () => {
  const d = mockDrive(); const k = keszit(d); d.hianyos(true);
  k.ds.markDirty(); await k.ds.szinkron(); assert.equal(k.utolso().kind, 'hiba'); assert.equal(k.ds.allapot().dirty, true);
});
await teszt('masik eszkoz mentett utana: KONFLIKTUS, a Drive-fajl nem valtozik', async () => {
  const d = mockDrive(); const a = keszit(d);
  a.ds.markDirty(); await a.ds.szinkron();
  const fo = d.fajlok.find(f => f.name === 'fodrasz-adatok.json');
  fo.tartalom = '{"masik":"eszkoz"}'; fo.modifiedTime = new Date(ido.getTime() + 5000).toISOString();
  a.ds.markDirty(); await a.ds.szinkron();
  assert.equal(a.utolso().kind, 'konfliktus'); assert.equal(fo.tartalom, '{"masik":"eszkoz"}');
});
await teszt('uj/ures tablet, a Drive-on van mentes: KONFLIKTUS, nem irja felul', async () => {
  const d = mockDrive(); const regi = keszit(d); regi.ds.markDirty(); await regi.ds.szinkron();
  const eredeti = d.fajlok.find(f => f.name === 'fodrasz-adatok.json').tartalom;
  const uj = keszit(d, { adat: { bookings: [], chemicals: [] } });
  uj.ds.markDirty(); await uj.ds.szinkron();
  assert.equal(uj.utolso().kind, 'konfliktus'); assert.equal(d.fajlok.find(f => f.name === 'fodrasz-adatok.json').tartalom, eredeti);
});
await teszt('visszatoltes: lista+elonezet+alkalmaz, helyi biztonsagi masolat keszul', async () => {
  const d = mockDrive(); const regi = keszit(d); regi.ds.markDirty(); await regi.ds.szinkron();
  const uj = keszit(d, { adat: { bookings: [], chemicals: [] } });
  const lista = await uj.ds.lista(); assert.equal(lista[0].fo, true);
  const adat = await uj.ds.elonezet(lista[0].id); assert.equal(adat.bookings.length, 2);
  let kapott = null; await uj.ds.visszatolt(lista[0], adat, a => { kapott = a; });
  assert.equal(kapott.bookings.length, 2);
  assert.ok(uj.t.m[uj.ds.BIZTONSAGI_KULCS]);
  assert.equal(uj.utolso().kind, 'mentve');
  uj.ds.markDirty(); await uj.ds.szinkron(); assert.equal(uj.utolso().kind, 'mentve');
});
await teszt('hibas Drive-fajl: nem tolti vissza', async () => {
  const d = mockDrive(); const k = keszit(d); k.ds.markDirty(); await k.ds.szinkron();
  const fo = d.fajlok.find(f => f.name === 'fodrasz-adatok.json'); fo.tartalom = '{"nincs":"bookings"}';
  const lista = await k.ds.lista(); await assert.rejects(() => k.ds.elonezet(lista[0].id), /hib/i);
});
await teszt('napi masolat + legfeljebb 10 marad (a tobbi kukaba, nem torolve)', async () => {
  const d = mockDrive(); const k = keszit(d);
  for (let nap = 0; nap < 14; nap++) {
    ido = new Date(new Date('2026-10-01T10:00:00Z').getTime() + nap * 86400000);
    k.setAdat({ bookings: [{ uid: 'n' + nap }], chemicals: [] });
    k.ds.markDirty(); await k.ds.szinkron(); assert.equal(k.utolso().kind, 'mentve', 'nap ' + nap);
  }
  const elo = d.fajlok.filter(f => f.name.startsWith('fodrasz-mentes-') && !f.trashed);
  assert.equal(elo.length, 10);
  assert.ok(d.fajlok.filter(f => f.name.startsWith('fodrasz-mentes-') && f.trashed).length >= 3);
  assert.equal(d.fajlok.filter(f => f.name === 'fodrasz-adatok.json').length, 1);
});
await teszt('tarolo-hiba az allapotmentesnel: hangos hiba', async () => {
  const d = mockDrive(); const t = tarolo(); const k = keszit(d, { tarolo: t });
  t.setItem = () => { throw new Error('tele'); };
  k.ds.markDirty(); assert.equal(k.utolso().kind, 'hiba');
});

await teszt('felulires (konfliktus-dontes): a Drive-on levo legfrissebb allapot egyedi masolatba kerul, akkor is ha a mai masolat mar letezik', async () => {
  const d = mockDrive(); const a = keszit(d);
  a.ds.markDirty(); await a.ds.szinkron();
  const fo = d.fajlok.find(f => f.name === 'fodrasz-adatok.json');
  fo.tartalom = '{"bookings":[{"uid":"masik-eszkoz"}]}'; fo.modifiedTime = new Date(ido.getTime() + 5000).toISOString();
  a.ds.markDirty(); await a.ds.szinkron(); assert.equal(a.utolso().kind, 'konfliktus');
  await a.ds.szinkron({ kenyszer: true, felulir: true }); assert.equal(a.utolso().kind, 'mentve');
  const masolatok = d.fajlok.filter(f => f.name.includes('-felulirva-'));
  assert.equal(masolatok.length, 1); assert.match(masolatok[0].tartalom, /masik-eszkoz/);
});
await teszt('regi napi masolat visszatoltese: a jelenlegi Drive-fo-fajl elotte masolatba kerul', async () => {
  const d = mockDrive(); const k = keszit(d);
  for (let nap = 0; nap < 3; nap++) {
    ido = new Date(new Date('2026-10-01T10:00:00Z').getTime() + nap * 86400000);
    k.setAdat({ bookings: [{ uid: 'n' + nap }], chemicals: [] }); k.ds.markDirty(); await k.ds.szinkron();
  }
  const lista = await k.ds.lista(); const regi = lista.find(x => !x.fo);
  const adat = await k.ds.elonezet(regi.id);
  await k.ds.visszatolt(regi, adat, () => {}); await k.ds.szinkron();
  assert.equal(k.utolso().kind, 'mentve');
  assert.ok(d.fajlok.some(f => f.name.includes('-felulirva-') && f.tartalom.includes('"n2"')));
});
await teszt('markDirty szinkron KOZBEN: nem lesz tisztanak jelolve, az ujabb modositas nem vész el', async () => {
  const d = mockDrive(); let elenged; const kapu = new Promise(r => { elenged = r; });
  const t = tarolo(); let adat = { bookings: [{ uid: '1' }], chemicals: [] };
  const allapotok = [];
  const ds = DriveSync.create({ fetch: d.fetchFn, storage: t, now: () => ido, auth: { getToken: async () => { await kapu; return 'tok'; } },
    getData: () => adat, onStatus: s => allapotok.push(s), setTimer: () => 1, clearTimer: () => {} });
  ds.markDirty(); const fut = ds.szinkron();
  adat = { bookings: [{ uid: '1' }, { uid: '2' }], chemicals: [] }; ds.markDirty();
  elenged(); await fut;
  assert.equal(ds.allapot().dirty, true, 'a kozben jott modositas miatt piszkos marad');
  await ds.szinkron(); assert.equal(ds.allapot().dirty, false);
  assert.equal(JSON.parse(d.fajlok.find(f => f.name === 'fodrasz-adatok.json').tartalom).bookings.length, 2);
});

await teszt('serult helyi adat (tiltva): nincs feltoltes, hangos hiba, dirty marad', async () => {
  const d = mockDrive(); const t = tarolo(); const allapotok = [];
  const ds = DriveSync.create({ fetch: d.fetchFn, storage: t, now: () => ido, auth: { getToken: async () => 'tok' },
    getData: () => ({ bookings: [], chemicals: [] }), onStatus: s => allapotok.push(s), setTimer: () => 1, clearTimer: () => {},
    tiltva: () => 'serult' });
  ds.markDirty(); await ds.szinkron({ kenyszer: true });
  assert.equal(allapotok[allapotok.length - 1].kind, 'hiba'); assert.match(allapotok[allapotok.length - 1].text, /szünetel/);
  assert.equal(d.hivasok.length, 0); assert.equal(ds.allapot().dirty, true);
});

await teszt('halozati kerelmek szama: egy szokasos (aznapi masodik) mentes legfeljebb 4 keres', async () => {
  const d = mockDrive(); const k = keszit(d);
  ido = new Date('2026-10-20T10:00:00Z');
  k.ds.markDirty(); await k.ds.szinkron();
  ido = new Date('2026-10-20T10:05:00Z');
  k.setAdat({ bookings: [{ uid: 'y' }], chemicals: [] }); k.ds.markDirty(); await k.ds.szinkron();   // a nap elso felulirasa: + napi masolat
  ido = new Date('2026-10-20T10:10:00Z');
  const elotte = d.hivasok.length;
  k.setAdat({ bookings: [{ uid: 'x' }], chemicals: [] }); k.ds.markDirty(); await k.ds.szinkron();
  assert.equal(k.utolso().kind, 'mentve');
  const most = d.hivasok.slice(elotte);
  assert.ok(most.length <= 4, 'kerelmek: ' + most.join(', '));
  console.log('        (kerelmek: ' + most.length + ' -> ' + most.join(', ') + ')');
});

globalThis.fetch = valodiFetch;
console.log(process.exitCode ? 'BUKOTT' : 'MIND ZOLD: ' + futott + ' teszt');
