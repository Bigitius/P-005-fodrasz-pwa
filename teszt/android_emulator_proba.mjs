// Az Androidos keret (android/epites/proba.apk) próbája futó, ablak nélküli emulátoron (2026-10-24).
// Előfeltétel: emulátor fut (-no-window), a próba-APK telepítve, a helyi szerver (tablet/szerver.py, 8765) fut.
// A weboldal belsejét a próbaváltozat távoli hibakeresésén (adb forward + DevTools-protokoll) éri el.
// Valódi ablakot NEM nyit. Futtatás: node teszt/android_emulator_proba.mjs [kepmappa]
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ADB = join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe');
const CSOMAG = 'io.github.bigitius.fodrasz.proba';   // a próba-APK külön csomagnévvel települ
const OSZTALY = 'io.github.bigitius.fodrasz.MainActivity';
const KEPEK = process.argv[2] || '.';
const PORT = 9229;
const var_ = (ms) => new Promise((r) => setTimeout(r, ms));
const adb = (...a) => execFileSync(ADB, a, { encoding: 'utf8' }).trim();

let jo = 0, rossz = 0;
function ellenoriz(nev, feltetel, reszlet = '') {
  if (feltetel) { jo++; console.log('OK   ' + nev); } else { rossz++; console.log('HIBA ' + nev + (reszlet ? '  -> ' + reszlet : '')); }
}

function kep(nev) {
  const png = execFileSync(ADB, ['exec-out', 'screencap', '-p']);
  writeFileSync(join(KEPEK, nev), png);
}

async function indit() {
  adb('shell', 'am', 'force-stop', CSOMAG);
  adb('shell', 'am', 'start', '-W', '-n', CSOMAG + '/' + OSZTALY);
  await var_(6000);
}

async function kapcsolodik() {
  const pid = adb('shell', 'pidof', CSOMAG);
  if (!pid) throw new Error('az app nem fut');
  try { adb('forward', '--remove', 'tcp:' + PORT); } catch {}
  adb('forward', 'tcp:' + PORT, 'localabstract:webview_devtools_remote_' + pid);
  let lap;
  for (let i = 0; i < 20 && !lap; i++) {
    try { lap = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === 'page'); } catch {}
    if (!lap) await var_(500);
  }
  if (!lap) throw new Error('nem érhető el a WebView hibakereső');
  const ws = new WebSocket(lap.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const varo = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && varo.has(d.id)) { varo.get(d.id)(d); varo.delete(d.id); } };
  const kuld = (method, params = {}) => new Promise((r) => { const i = ++id; varo.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ertek = async (kif) => {
    const v = await Promise.race([
      kuld('Runtime.evaluate', { expression: kif, returnByValue: true, awaitPromise: true }),
      var_(15000).then(() => { throw new Error('időtúllépés (nyitva maradt egy párbeszédablak?): ' + kif.slice(0, 60)); }),
    ]);
    return v.result?.result?.value;
  };
  return { ertek, zar: () => ws.close(), url: lap.url };
}

try {
  // 1. indulás, felismerés
  await indit();
  let k = await kapcsolodik();
  const allapot = JSON.parse(await k.ertek(`JSON.stringify({ver: APP_VER, ua: navigator.userAgent,
    hid: typeof window.MartiApp, verzio: window.MartiApp && MartiApp.verzio(),
    appMode: document.documentElement.classList.contains('app-mode'),
    kartya: document.getElementById('telepitAllapot').textContent,
    driveRejtve: getComputedStyle(document.getElementById('driveBadge')).display === 'none'})`));
  console.log('Betöltött oldal:', k.url, '| verzió:', allapot.ver);
  ellenoriz('az app a weboldalt tölti be (v27)', allapot.ver === '27', allapot.ver);
  ellenoriz('böngésző-azonosítóban MartiApp jel', / MartiApp\//.test(allapot.ua));
  ellenoriz('a mentő híd elérhető', allapot.hid === 'object' && !!allapot.verzio);
  ellenoriz('app-mode és "Androidos alkalmazásként fut"', allapot.appMode && allapot.kartya.includes('Androidos alkalmazásként fut'), allapot.kartya);
  ellenoriz('Drive-gomb rejtve az appban', allapot.driveRejtve);
  const rossz = await k.ertek(`MartiApp.mentes('rossz.apk', 'x')`);
  ellenoriz('híd: tiltott fájlnevet elutasít', String(rossz).startsWith('hiba:'), rossz);
  const jo_ = await k.ertek(`MartiApp.mentes('Márti-foglalás-2000-01-01-0000.json', '{"proba":1}')`);
  ellenoriz('híd: a saját mentésfájl-nevet elfogadja', String(jo_).startsWith('ok:'), jo_);

  // 2. adatmegmaradás: próbakulcs + a valódi foglalás-tároló, app leállítása és újraindítása
  const jel = 'proba-' + Date.now();
  await k.ertek(`localStorage.setItem('android_proba_jel', '${jel}'); true`);
  const foglalasDb = await k.ertek(`loadBookings().length`);
  k.zar();
  // MÉRT korlát (2026-10-24): a WebView kb. 1 mp-en belül írja ki véglegesen; az ennél gyorsabb kemény
  // leállítás az utolsó írást elveszítheti (a Chrome-ban futó webes változat is így működik)
  await var_(2000);
  await indit();
  k = await kapcsolodik();
  ellenoriz('újraindítás után megmaradt a tárolt adat', (await k.ertek(`localStorage.getItem('android_proba_jel')`)) === jel);
  ellenoriz('újraindítás után a foglalások száma ugyanaz', (await k.ertek(`loadBookings().length`)) === foglalasDb);

  // 3. offline: a service worker vezérli-e az oldalt, majd a gép szerverének elvágása után is indul-e
  await var_(3000);
  const sw = await k.ertek(`navigator.serviceWorker && navigator.serviceWorker.controller ? 'van' : 'nincs'`);
  ellenoriz('service worker vezérli az oldalt (offline-hoz kell)', sw === 'van', sw);
  k.zar();
  adb('reverse', '--remove-all');
  await indit();
  k = await kapcsolodik();
  const offlineVer = await k.ertek(`typeof APP_VER!=='undefined' ? APP_VER : document.body.innerText.slice(0,80)`);
  kep('android_offline.png');
  ellenoriz('internet (szerver) nélkül is elindul a v27', offlineVer === '27', String(offlineVer));
  k.zar();
  adb('reverse', 'tcp:8765', 'tcp:8765');

  // 4. saját párbeszédablak: a fejlécben "Márti fodrászata"
  await indit();
  k = await kapcsolodik();
  await k.ertek(`window.__valasz='?'; setTimeout(function(){ window.__valasz = confirm('Próba kérdés'); }, 300); true`);
  await var_(1500);
  kep('android_confirm.png');
  const ui = adb('exec-out', 'uiautomator', 'dump', '/dev/tty');
  ellenoriz('megerősítő ablak fejléce: "Márti fodrászata"', ui.includes('text="Márti fodrászata"'));
  ellenoriz('megerősítő ablak gombjai: OK és Mégse', ui.includes('text="OK"') && /text="mégse"/i.test(ui));
  // "Mégse" megnyomása (a gomb felirata nagybetűs lehet: MÉGSE)
  const m = ui.match(/text="mégse"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/i);
  if (!m) adb('shell', 'input', 'keyevent', 'KEYCODE_BACK');
  if (m) adb('shell', 'input', 'tap', String((+m[1] + +m[3]) >> 1), String((+m[2] + +m[4]) >> 1));
  await var_(800);
  ellenoriz('Mégse -> confirm() hamis', (await k.ertek(`window.__valasz`)) === false);
  await k.ertek(`localStorage.removeItem('android_proba_jel'); true`);
  k.zar();
} catch (e) {
  rossz++;
  console.log('HIBA (leállt a próba):', e.message);
  try { adb('reverse', 'tcp:8765', 'tcp:8765'); } catch {}
}

console.log(`\n${jo}/${jo + rossz} zöld`);
if (rossz) process.exit(1);
