// Az Androidos alkalmazás mentő hídjának automata tesztje (2026-10-24, v29-től a telepítés-kártya nélkül).
// Az index.html-ből kivágja az autoBackupToFile függvényt, és hamis
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
const mentes = kivag('function autoBackupToFile(arr){', '\n}\n');

let jo = 0, rossz = 0;
function ellenoriz(nev, feltetel, reszlet = '') {
  if (feltetel) { jo++; console.log('OK   ' + nev); } else { rossz++; console.log('HIBA ' + nev + (reszlet ? '  -> ' + reszlet : '')); }
}

// 1. a telepítés-segítő kártya 2026-10-31-én kikerült (tulajdonosi döntés)
ellenoriz('a Rendszer fülön nincs telepítés-segítő', !html.includes('telepitKartya') && !html.includes('telepitBtn'));

// 5. mentő híd az autoBackupToFile-ban
function mentesKorny(hid) {
  const alertek = [], letoltesek = [];
  const ctx = {
    window: { MartiApp: hid }, alert: (m) => alertek.push(m), CHEMICALS: [{ code: 'K1' }], SZOLGALTATASOK: {},
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
