// XSS-teszt (2026-10-24): rosszindulatú ügyfél-/vegyszer-/mentésfájl-adattal megrajzolja a fő nézeteket
// (Főoldal, Névjegyzék, Leltár, Foglalás 1-4. lépés, Dupla ablak), és minden innerHTML-be írt szöveget
// ellenőriz: nem lehet benne nyers <img>/<script> vagy bármi, ami az adatból címkévé/eseménykezelővé válik.
// Valódi ablakot NEM nyit: elszigetelt vm-környezet, hamis DOM; az alert/confirm/prompt csak gyűjt,
// és ha a teszt közben bármelyik meghívódik, az hangos hiba.
// Futtatás: node teszt/xss_teszt.mjs            (a mostani index.html)
//           node teszt/xss_teszt.mjs <fájl>     (pl. egy régebbi változat, összehasonlításhoz)
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const forras = process.argv[2] || new URL('../index.html', import.meta.url);
const html = readFileSync(forras, 'utf8').replace(/\r\n/g, '\n');
const k0 = html.indexOf('const SZOLGALTATASOK');
const k = html.lastIndexOf('<script>', k0) + '<script>'.length;
const v = html.indexOf('</script>', k0);
if (k0 < 0 || v < 0) throw new Error('Nem található a fő szkript');
const fo = html.slice(k, v);

let jo = 0, rossz = 0;
function ellenoriz(nev, feltetel, reszlet = '') {
  if (feltetel) { jo++; console.log('OK   ' + nev); } else { rossz++; console.log('HIBA ' + nev + (reszlet ? '  -> ' + reszlet : '')); }
}

// ---- hamis DOM ----
let naplo = [];   // {id, html}
function elem(id) {
  let belso = '';
  const e = {
    id, value: '', textContent: '', style: {}, dataset: {}, disabled: false, checked: false, firstChild: null,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, removeEventListener() {}, appendChild(x) { return x; }, insertBefore(x) { return x; },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {}, click() {}, focus() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
  };
  Object.defineProperty(e, 'innerHTML', { get: () => belso, set: (s) => { belso = String(s); naplo.push({ id, html: belso }); } });
  return e;
}
const elemek = {};
const ablakHivas = [];
const tarolo = {};
const ctx = {
  console, Date, Math, JSON, Object, Array, String, Number, Set, Map, Promise, RegExp, Error, isNaN, isFinite, parseInt, parseFloat,
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  alert: (m) => ablakHivas.push('alert: ' + m), confirm: (m) => { ablakHivas.push('confirm: ' + m); return false; },
  prompt: (m) => { ablakHivas.push('prompt: ' + m); return null; },
  navigator: { userAgent: 'teszt' }, location: { protocol: 'https:', href: 'https://teszt/' },
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  addEventListener() {},
  localStorage: {
    getItem: (x) => (x in tarolo ? tarolo[x] : null), setItem: (x, y) => { tarolo[x] = String(y); },
    removeItem: (x) => { delete tarolo[x]; }, key: (i) => Object.keys(tarolo)[i] ?? null, get length() { return Object.keys(tarolo).length; },
  },
  document: {
    getElementById: (id) => (elemek[id] ||= elem(id)),
    createElement: (t) => elem('<' + t + '>'),
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {},
    body: elem('body'), head: elem('head'), documentElement: elem('html'),
  },
};
ctx.window = ctx; ctx.self = ctx;

// ---- rosszindulatú adat (ügyfélnév, telefon, vegyszer, és a mentésfájlból jöhető mezők: idő, dátum, hossz, gramm, uid) ----
const NAP = '2026-11-02';
const X = (n) => '<img src=x onerror=alert(' + n + ')>';
const NEV = 'Anna' + X(1);                         // A betűs, hogy a névjegyzék-listákban is megjelenjen
const NEV2 = 'Zoli"' + X(14);
const UID_A = "u');alert(5);//";
const foglalasok = [
  { date: NAP, time: '10:00', dur: 140, service: 'Festés — Balayage / Ombre (90g)', name: NEV,
    phone: '"><img src=x onerror=alert(2)>', chemCode: "K'" + X(3), chemGram: X(4), done: true, uid: UID_A,
    serviceObj: { cat: 'Festés', name: 'Balayage / Ombre (90g)', dur: 140,
      seg: [{ t: 'm', d: '35' + X(6) }, { t: 'p', d: 40 }, { t: 'm', d: 65 }] } },
  { date: NAP, time: '13:00' + X(7), dur: '30' + X(8), service: 'Vágás & Szárítás — Száraz hajvágás',
    name: 'Béla', phone: "'><img src=x onerror=alert(15)>", uid: 'u2' },
  { date: X(9), time: '09:00', dur: 30, service: 'Vágás & Szárítás — ' + X(16), name: NEV, phone: X(17), uid: 'u3' },
  { date: NAP, time: '08:00', dur: 30, service: 'Vágás & Szárítás — Száraz hajvágás', name: NEV2, phone: '1', uid: 'u4' },
];
const vegyszerek = [
  { code: 'K001' + X(10), name: '"><img src=x onerror=alert(11)>', start: X(12) },
  { code: "K'" + X(3), name: 'x', start: 500 },
];
tarolo['fodrasz_vegyszerek_v1'] = JSON.stringify(vegyszerek);

vm.createContext(ctx);
vm.runInContext(fo, ctx, { filename: 'index.html-fo-szkript' });
const STORAGE_KEY = vm.runInContext('STORAGE_KEY', ctx);
tarolo[STORAGE_KEY] = JSON.stringify(foglalasok);
vm.runInContext('CHEMICALS = loadChemicals();', ctx);

// ---- ellenőrző: egy innerHTML-szöveg biztonságos-e ----
const ENGEDETT_CIMKE = new Set(['div', 'span', 'button', 'option', 'select', 'input', 'label', 'p', 'b']);
const ENGEDETT_ATTR = new Set(['class', 'id', 'style', 'title', 'type', 'value', 'selected', 'min', 'step', 'placeholder',
  'onclick', 'data-date', 'data-t', 'data-c', 'data-n', 'data-p', 'data-l', 'data-code', 'role', 'aria-label']);
const ENGEDETT_FV = new Set(['openEditById', 'deleteById', 'openDuplaById', 'editContact', 'deleteContact', 'confirmDupla', 'confirmSimaRest']);
const dekod = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function biztonsagos(h) {
  const hibak = [];
  const cimkeRe = /<\/?([a-zA-Z][\w-]*)((?:\s+[^\s=>\/"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+))?)*)\s*\/?>/g;
  const maradek = h.replace(cimkeRe, (teljes, nev, attrok) => {
    nev = nev.toLowerCase();
    if (!ENGEDETT_CIMKE.has(nev)) hibak.push('tiltott címke: <' + nev + '>');
    const attrRe = /\s+([^\s=>\/"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+)))?/g;
    let m;
    while ((m = attrRe.exec(attrok))) {
      const an = m[1].toLowerCase(), ertek = m[2] ?? m[3] ?? m[4] ?? '';
      if (!ENGEDETT_ATTR.has(an)) hibak.push('tiltott attribútum: ' + an);
      if (an === 'onclick') {
        // az onclick-et ténylegesen lefuttatjuk egy üres környezetben: csak EGY ismert függvényhívás lehet
        const hivasok = [];
        const sb = {};
        ENGEDETT_FV.forEach((f) => { sb[f] = (...a) => hivasok.push([f, a]); });
        try { vm.runInNewContext(dekod(ertek), sb, { timeout: 100 }); }
        catch (e) { hibak.push('onclick hiba (' + e.message + '): ' + ertek); continue; }
        if (hivasok.length !== 1) hibak.push('onclick ' + hivasok.length + ' hívás: ' + ertek);
        else if (hivasok[0][1].some((a) => typeof a !== 'string' && typeof a !== 'number')) hibak.push('onclick furcsa argumentum: ' + ertek);
      }
      if (an === 'style' && /url\(|expression|javascript:/i.test(dekod(ertek))) hibak.push('gyanús style: ' + ertek);
    }
    return '';
  });
  if (maradek.includes('<')) hibak.push('nyers "<" a szövegben: ' + maradek.slice(Math.max(0, maradek.indexOf('<') - 30), maradek.indexOf('<') + 50));
  return hibak;
}
function nezet(nev, fv, elvart) {
  naplo = [];
  try { vm.runInContext(fv, ctx); }
  catch (e) { ellenoriz(nev + ': lefut', false, e.stack.split('\n').slice(0, 3).join(' | ')); return; }
  const osszes = naplo.map((x) => x.html).join('\n');
  const hibak = naplo.flatMap((x) => biztonsagos(x.html).map((h) => '#' + x.id + ' ' + h));
  ellenoriz(nev + ': nincs befecskendezett HTML/JS (' + naplo.length + ' innerHTML-írás)', hibak.length === 0, hibak.slice(0, 4).join(' || '));
  // ne legyen üres a próba: a rosszindulatú adatnak tényleg (kódolt szövegként) meg kell jelennie
  const hianyzik = elvart.filter((n) => !osszes.includes('alert(' + n + ')'));
  ellenoriz(nev + ': a rosszindulatú adat szövegként látszik (' + elvart.join(',') + ')', hianyzik.length === 0, 'hiányzik: ' + hianyzik.join(','));
}

const napAllit = 'foMainDate=new Date(2026,10,2); foView=new Date(2026,10,1);';
nezet('Főoldal', napAllit + 'renderFooldal();', [1, 2, 3, 4, 7, 14, 15]);
nezet('Névjegyzék (lista)', 'regName=null; renderNevjegyzek();', [1, 14]);
nezet('Névjegyzék (kiválasztott név)', 'regName=' + JSON.stringify(NEV) + '; renderNevjegyzek();', [1, 9, 16, 17]);
nezet('Leltár', 'renderLeltar();', [3, 10, 11, 12]);
nezet('Foglalás 1. lépés', napAllit + 'bookingStep=1; renderFoglalas();', []);
nezet('Foglalás 2. lépés', 'selDate="' + NAP + '"; bookingStep=2; renderFoglalas();', [1, 2, 3, 4, 7]);
nezet('Foglalás 3. lépés (kategóriák)', 'selTime="11:00"; foCat=null; bookingStep=3; renderFoglalas();', []);
nezet('Foglalás 3. lépés (Festés)', 'foCat="Festés"; bookingStep=3; renderFoglalas();', [3]);
nezet('Foglalás 4. lépés', 'foCat=null; selService=Object.assign({cat:"Festés"}, SZOLGALTATASOK["Festés"][0]);' +
  'regLetter="A"; regChemGram=' + JSON.stringify('"><img src=x onerror=alert(13)>') + '; bookingStep=4; renderFoglalas();', [1, 3, 10, 11, 13, 17]);
nezet('Dupla ablak', 'openDuplaById(' + JSON.stringify(UID_A) + '); dupLetter="A"; renderDupBook();', [1, 17]);

// a dupla ablak pihenő-sora: a fájlból jött hibás szegmens-hossz nem kerülhet a gombba (szám vagy semmi)
naplo = [];
vm.runInContext('renderDuplaOpts(findBookingById(' + JSON.stringify(UID_A) + '));', ctx);
const opts = naplo.map((x) => x.html).join('');
ellenoriz('Dupla: pihenő-sor nem tartalmaz szegmens-szemetet', !opts.includes('alert(6)'));

// az ellenőrző önpróbája: felismeri-e a veszélyt (különben a fenti zöldek semmit nem érnének)
const BS = String.fromCharCode(92), AP = String.fromCharCode(39);
ellenoriz('önpróba: nyers <img onerror> kiszűrve', biztonsagos('<div>' + X(1) + '</div>').length > 0);
ellenoriz('önpróba: attribútumból kitörés kiszűrve', biztonsagos('<div data-n=""><img src=x onerror=alert(1)>"></div>').length > 0);
ellenoriz('önpróba: onclick-ből kitörés kiszűrve', biztonsagos('<button onclick="deleteById(' + AP + 'a' + AP + ');alert(1);//)">x</button>').length > 0);
ellenoriz('önpróba: helyes kódolás átmegy', biztonsagos('<div data-n="&quot;&gt;">&lt;img&gt;</div><button onclick="deleteById(' + AP + 'a' + BS + '&#39;b' + AP + ')">x</button>').length === 0);

ellenoriz('nem nyílt (hamis) ablak a teszt alatt (alert/confirm/prompt)', ablakHivas.length === 0, ablakHivas.join(' | '));

console.log('\n' + jo + '/' + (jo + rossz) + ' rendben' + (rossz ? ', ' + rossz + ' HIBA' : ''));
process.exit(rossz ? 1 : 0);
