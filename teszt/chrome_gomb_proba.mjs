// Ablak nélküli (headless) Chrome: megnézi, hogy a Chrome küld-e telepítési ajánlatot (beforeinstallprompt),
// és a Rendszer fül gombja átvált-e "Telepítés most"-ra. A 30 mp-es Chrome-feltételt a
// --bypass-app-banner-engagement-checks tesztkapcsoló iktatja ki (csak ha 'kerulo' a 2. paraméter).
// Használat: node teszt/chrome_gomb_proba.mjs <url> [kerulo]
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_ = process.argv[2];
const kerulo = process.argv[3] === 'kerulo';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9334;
const profil = mkdtempSync(join(tmpdir(), 'pwa-gomb-'));
const kapcsolok = ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profil}`,
  '--no-first-run', '--no-default-browser-check', '--window-size=1280,800'];
if (kerulo) kapcsolok.push('--bypass-app-banner-engagement-checks');
const ch = spawn(CHROME, [...kapcsolok, 'about:blank'], { stdio: 'ignore' });

const var_ = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
try {
  let lap;
  for (let i = 0; i < 40 && !lap; i++) {
    await var_(250);
    try { lap = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === 'page'); } catch {}
  }
  if (!lap) throw new Error('A headless Chrome nem indult el');
  ws = new WebSocket(lap.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const varo = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && varo.has(d.id)) { varo.get(d.id)(d); varo.delete(d.id); } };
  const kuld = (method, params = {}) => new Promise((r) => { const i = ++id; varo.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ertek = async (kif) => (await kuld('Runtime.evaluate', { expression: kif, returnByValue: true, awaitPromise: true })).result?.result?.value;
  const allapot = `JSON.stringify({ver: typeof APP_VER!=='undefined'?APP_VER:null, gomb: document.getElementById('telepitBtn').textContent,
    tiltott: document.getElementById('telepitBtn').disabled, lathato: getComputedStyle(document.getElementById('telepitBtn')).display,
    ajanlat: !!window.telepitoEsemeny, szoveg: document.getElementById('telepitAllapot').textContent,
    relatedApi: !!navigator.getInstalledRelatedApps})`;

  await kuld('Page.enable');
  await kuld('Page.navigate', { url: URL_ });
  await var_(6000);                       // betöltés + service worker
  await kuld('Page.reload');              // SW-vezérelt második betöltés
  await var_(3000);
  console.log('URL:', URL_, '| engedély-kerülő kapcsoló:', kerulo);
  console.log('t=3s  ', await ertek(allapot));
  // egy valódi koppintás (CDP egér-esemény) az oldalra
  for (const type of ['mousePressed', 'mouseReleased'])
    await kuld('Input.dispatchMouseEvent', { type, x: 640, y: 700, button: 'left', clickCount: 1 });
  await var_(8000);
  console.log('t=11s ', await ertek(allapot));
  const hibak = await kuld('Page.getInstallabilityErrors');
  console.log('Telepíthetőségi hibák:', JSON.stringify(hibak.result?.installabilityErrors));
  console.log('Konzol-ellenőrzés: getInstalledRelatedApps eredmény:',
    await ertek('navigator.getInstalledRelatedApps ? navigator.getInstalledRelatedApps().then(l=>JSON.stringify(l)).catch(e=>"hiba: "+e) : "nincs API"'));
} finally {
  try { ws?.close(); } catch {}
  ch.kill();
}
