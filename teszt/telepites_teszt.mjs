// A Rendszer fül "📲 Telepítés" kártyájának és a mentő hídnak automata tesztje (2026-10-24, v27).
// Az index.html-ből kivágja a Telepítés blokkot és az autoBackupToFile függvényt, és hamis
// böngésző-környezetben futtatja. Valódi ablakot NEM nyit: elszigetelt vm-környezet, az alert gyűjtő függvény.
// Futtatás: node teszt/telepites_teszt.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function kivag(jelolo, vegJel) {
  const k = html.indexOf(jelolo);
  if (k < 0) throw new Error('Nem található: ' + jelolo);
  const v = html.indexOf(vegJel, k);
  if (v < 0) throw new Error('Nem található a vége: ' + jelolo);
  return html.slice(k, v + (vegJel === '</script>' ? 0 : vegJel.length));
}
const telepites = kivag('// === 📲 Telepítés', '</script>');
const mentes = kivag('function autoBackupToFile(arr){', '\n}\n');

let jo = 0, rossz = 0;
function ellenoriz(nev, feltetel, reszlet = '') {
  if (feltetel) { jo++; console.log('OK   ' + nev); } else { rossz++; console.log('HIBA ' + nev + (reszlet ? '  -> ' + reszlet : '')); }
}

const UA_CHROME = 'Mozilla/5.0 (Linux; Android 14; M10) AppleWebKit/537.36 Chrome/155.0 Safari/537.36';
const UA_APP = UA_CHROME + ' MartiApp/1.0';

function kartya({ protokoll = 'https:', ua = UA_CHROME, standalone = false, hid = null } = {}) {
  const elemek = {
    telepitAllapot: { textContent: '' },
    telepitBtn: { textContent: '', style: { display: 'none' }, kattintas: null,
      addEventListener(t, f) { if (t === 'click') this.kattintas = f; } },
  };
  const loc = { protocol: protokoll, href: 'https://bigitius.github.io/P-005-fodrasz-pwa/' };
  const win = { MartiApp: hid };
  const ctx = {
    window: win, location: loc, navigator: { userAgent: ua },
    matchMedia: (q) => ({ matches: standalone && q === '(display-mode: standalone)' }),
    document: { getElementById: (id) => elemek[id] || null },
  };
  win.matchMedia = ctx.matchMedia;
  vm.createContext(ctx);
  vm.runInContext(telepites, ctx);
  return { elemek, loc };
}
const sz = (k) => k.elemek.telepitAllapot.textContent;
const gomb = (k) => k.elemek.telepitBtn;

// 1. saját Androidos appban
let k = kartya({ ua: UA_APP, hid: { verzio: () => '1.0' } });
ellenoriz('appban: "Androidos alkalmazásként fut" + verzió', sz(k).includes('Androidos alkalmazásként fut') && sz(k).includes('v1.0'));
ellenoriz('appban: gomb rejtve', gomb(k).style.display === 'none');

// 2. helyi fájl
k = kartya({ protokoll: 'file:' });
ellenoriz('helyi fájl: a webcímre küld', sz(k).includes('helyi fájlként') && sz(k).includes('github.io'));
ellenoriz('helyi fájl: gomb rejtve', gomb(k).style.display === 'none');

// 3. Chrome-ban: letöltő gomb, lépések, adatátvitel
k = kartya();
ellenoriz('böngészőben: "📥 Alkalmazás letöltése" gomb látszik', gomb(k).textContent === '📥 Alkalmazás letöltése' && gomb(k).style.display === '');
ellenoriz('böngészőben: előbb Mentés, utána Visszatöltés', sz(k).includes('💾 Mentés') && sz(k).includes('📂 Visszatöltés'));
ellenoriz('böngészőben: engedélykérésre figyelmeztet', sz(k).includes('engedélyt kér'));
gomb(k).kattintas();
ellenoriz('gomb: az APK-t tölti le', k.loc.href === 'marti-fodraszata.apk', k.loc.href);

// 4. webes ikonról (korábbi PWA-telepítés) is felkínálja
k = kartya({ standalone: true });
ellenoriz('webes ikonról: szintén letöltő gomb', sz(k).startsWith('Most webes ikonról fut') && gomb(k).style.display === '');

// 5. mentő híd az autoBackupToFile-ban
function mentesKorny(hid) {
  const alertek = [], letoltesek = [];
  const ctx = {
    window: { MartiApp: hid }, alert: (m) => alertek.push(m), CHEMICALS: [{ code: 'K1' }],
    fmtDateTime: () => '2026-10-24 10:00', JSON, Date, String, Blob: class { constructor(p) { this.p = p; } },
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} }, setTimeout: () => {},
    document: { createElement: () => ({ style: {}, click() { letoltesek.push(this.download); } }), body: { appendChild() {}, removeChild() {} } },
  };
  vm.createContext(ctx);
  vm.runInContext(mentes + '\nthis.autoBackupToFile = autoBackupToFile;', ctx);
  return { ctx, alertek, letoltesek };
}
let hivasok = [];
let m = mentesKorny({ mentes: (n, t) => { hivasok.push([n, t]); return 'ok:' + n; } });
let eredm = m.ctx.autoBackupToFile([{ name: 'Teszt' }]);
ellenoriz('híd: a mentés a hídon megy, nem letöltő linken', hivasok.length === 1 && m.letoltesek.length === 0);
ellenoriz('híd: helyes fájlnév és tartalom', /^Márti-foglalás-.*\.json$/.test(hivasok[0][0]) && JSON.parse(hivasok[0][1]).bookings[0].name === 'Teszt');
ellenoriz('híd: siker -> true', eredm === true);
m = mentesKorny({ mentes: () => 'hiba:betelt' });
eredm = m.ctx.autoBackupToFile([]);
ellenoriz('híd hiba: hangos üzenet és false', eredm === false && m.alertek.length === 1 && m.alertek[0].includes('betelt'));
m = mentesKorny(null);
m.ctx.autoBackupToFile([]);
ellenoriz('híd nélkül (böngésző): letöltő link', m.letoltesek.length === 1);

// 6. a Mentés gomb nem ír sikert, ha a híd hibát jelzett
ellenoriz('Mentés gomb: hiba esetén nincs "letöltve" üzenet', html.includes("if(autoBackupToFile(loadBookings())===false) return;"));

// 7. manifest, service worker, Drive
const man = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
ellenoriz('manifest: display standalone', man.display === 'standalone');
const sw = readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
ellenoriz('service worker: az APK NINCS az offline listában', !sw.includes('.apk'));
ellenoriz('service worker: főoldalnak csak HTML-t ment (APK-letöltés nem írja felül)', sw.includes("tipus.indexOf('text/html') === 0"));
const driveUi = readFileSync(new URL('../drive-ui.js', import.meta.url), 'utf8');
ellenoriz('Drive: az appban nem indul (Google-belépés tiltott WebView-ban)', driveUi.includes("/ MartiApp\\//.test(navigator.userAgent)) return;"));

console.log(`\n${jo}/${jo + rossz} zöld`);
if (rossz) process.exit(1);
