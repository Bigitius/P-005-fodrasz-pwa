// A 🔄 Frissítés gomb végigpróbája VALÓDI service workerrel: saját kis szerver egy ideiglenes másolatból,
// a GitHubhoz hasonló gyorsítótár-fejlécekkel (max-age=600, ETag). "Kiadunk" egy új verziót, és a gombbal frissítünk.
// Ablakot nem nyit: Chrome --headless=new, vagy futó ablak nélküli emulátor. Az alert le van cserélve, csak feljegyzi.
// Futtatás: node teszt/frissites_proba.mjs            (Chrome, 8770-es port)
//           node teszt/frissites_proba.mjs android    (emulátor + android/epites/proba.apk telepítve; a 8765-ös port legyen szabad)
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ANDROID = process.argv[2] === 'android';
const GYOKER = fileURLToPath(new URL('..', import.meta.url));
const PORT = ANDROID ? 8765 : 8770, CDP = 9338;
const CSOMAG = 'io.github.bigitius.fodrasz.proba', OSZTALY = 'io.github.bigitius.fodrasz.MainActivity';
const ADB = join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe');
const adb = (...a) => execFileSync(ADB, a, { encoding: 'utf8' }).trim();
const var_ = (ms) => new Promise((r) => setTimeout(r, ms));

let jo = 0, rossz = 0;
function e(nev, f, reszlet = '') {
  if (f) { jo++; console.log('OK   ' + nev); } else { rossz++; console.log('HIBA ' + nev + '  -> ' + JSON.stringify(reszlet)); }
}

// --- ideiglenes "weboldal" ---
const web = mkdtempSync(join(tmpdir(), 'pwa-friss-web-'));
for (const n of ['index.html', 'service-worker.js', 'manifest.json', 'version.json', 'drive-config.js', 'drive-sync.js', 'drive-ui.js',
  'icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) cpSync(join(GYOKER, n), join(web, n));
const alapVer = +JSON.parse(readFileSync(join(web, 'version.json'), 'utf8')).web;
function kiad(ver, { csakVersion = false } = {}) {
  writeFileSync(join(web, 'version.json'), JSON.stringify({ web: String(ver), apk: '1.0' }));
  if (csakVersion) return;
  const csere = (n, re, uj) => { const p = join(web, n); const t = readFileSync(p, 'utf8'); if (!re.test(t)) throw new Error('nincs: ' + re); writeFileSync(p, t.replace(re, uj)); };
  csere('index.html', /var APP_VER="\d+"/, `var APP_VER="${ver}"`);
  csere('service-worker.js', /fodrasz-foglalo-v\d+/, `fodrasz-foglalo-v${ver}`);
}
const TIPUS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
const szerver = createServer((req, res) => {
  const ut = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  if (ut === 'atiranyit') { res.writeHead(302, { Location: 'index.html' }); res.end(); return; }
  const f = join(web, ut);
  if (!f.startsWith(web) || !existsSync(f)) { res.writeHead(404); res.end(); return; }
  const adat = readFileSync(f), etag = '"' + createHash('sha1').update(adat).digest('hex') + '"';
  const fej = { 'Cache-Control': 'max-age=600', ETag: etag, 'Content-Type': TIPUS[extname(f)] || 'application/octet-stream' };
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, fej); res.end(); return; }
  res.writeHead(200, fej); res.end(adat);
});
const leall = () => new Promise((r) => { szerver.closeAllConnections(); szerver.close(() => r()); });
await new Promise((r, j) => { szerver.once('error', j); szerver.listen(PORT, '127.0.0.1', r); });
const URL_ = `http://localhost:${PORT}/index.html`;

// --- böngésző vagy emulátor ---
let ch = null, ws;
try {
  if (ANDROID) {
    adb('shell', 'pm', 'clear', CSOMAG);
    adb('reverse', `tcp:${PORT}`, `tcp:${PORT}`);
    adb('shell', 'am', 'start', '-W', '-n', CSOMAG + '/' + OSZTALY);
    await var_(6000);
    try { adb('forward', '--remove', 'tcp:' + CDP); } catch {}
    adb('forward', 'tcp:' + CDP, 'localabstract:webview_devtools_remote_' + adb('shell', 'pidof', CSOMAG));
  } else {
    ch = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', `--remote-debugging-port=${CDP}`,
      `--user-data-dir=${mkdtempSync(join(tmpdir(), 'pwa-friss-'))}`, '--no-first-run', '--window-size=1280,800', 'about:blank'], { stdio: 'ignore' });
  }
  let lap;
  for (let i = 0; i < 40 && !lap; i++) { await var_(250); try { lap = (await (await fetch(`http://127.0.0.1:${CDP}/json`)).json()).find((t) => t.type === 'page'); } catch {} }
  if (!lap) throw new Error('nincs elérhető lap');
  ws = new WebSocket(lap.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const v = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (v.has(d.id)) { v.get(d.id)(d); v.delete(d.id); } };
  const kuld = (method, params = {}) => new Promise((r) => { const i = ++id; v.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const j = async (x) => {
    const r = await Promise.race([kuld('Runtime.evaluate', { expression: `(function(){${x}})()`, returnByValue: true, awaitPromise: true }),
      var_(15000).then(() => { throw new Error('időtúllépés: ' + x.slice(0, 60)); })]);
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || x.slice(0, 60));
    return r.result?.result?.value;
  };
  await kuld('Page.enable'); await kuld('Runtime.enable');
  // az alert sehol nem nyit ablakot (újratöltés után sem); a szöveget feljegyzi
  await kuld('Page.addScriptToEvaluateOnNewDocument', { source: `window.alert=function(m){ var a=JSON.parse(sessionStorage.getItem('__uz')||'[]'); a.push(String(m)); sessionStorage.setItem('__uz',JSON.stringify(a)); };` });
  const betolt = async () => { await kuld('Page.navigate', { url: URL_ }); await var_(ANDROID ? 3500 : 1500); };
  const ver = () => j(`return typeof APP_VER==='undefined'?null:APP_VER;`);
  const varVer = async (cel, mp = 40) => { for (let i = 0; i < mp * 2; i++) { try { if ((await ver()) === String(cel)) return true; } catch {} await var_(500); } return false; };

  await betolt(); await betolt();   // első betöltés: service worker települ; második: már ő vezérel
  for (let i = 0; i < 40; i++) { if (await j(`return !!navigator.serviceWorker.controller;`)) break; await var_(250); }
  e('indulás: a jelenlegi verzió fut, a service worker vezérel', (await ver()) === String(alapVer) && await j(`return !!navigator.serviceWorker.controller;`));

  // adatok, amiknek meg kell maradniuk
  await j(`showTab('rendszer');
    var kat=Object.keys(SZOLGALTATASOK)[0]; SZOLGALTATASOK[kat][0].anyagok=[{code:'A',gram:7}]; saveKartyak();
    CHEMICALS.push({code:'A',name:'Anyag',start:100}); saveChemicals();
    var b=loadBookings(); b.push({date:'2030-05-05',time:'10:05',dur:30,service:'x',name:'Megmarad',phone:'1',uid:'mm',anyagok:[{code:'A',gram:7}],done:true}); saveBookings(b); return 1;`);

  // A. nincs újabb
  await j(`document.getElementById('frissGomb').click(); return 1;`);
  await var_(1500);
  let r = await j(`return {sz:document.getElementById('frissAllapot').textContent, g:document.getElementById('frissGomb').disabled, jel:document.querySelector('.tab[data-tab=rendszer]').classList.contains('uj-ver')};`);
  e('nincs újabb: „ez a legfrissebb”, nincs ⬆ jel', r.sz.includes('legfrissebb') && !r.g && !r.jel, r);

  // B. új kiadás, frissítés a gombbal (a HTTP-gyorsítótárban a régi oldal még "friss" lenne)
  kiad(alapVer + 1);
  await j(`document.getElementById('frissGomb').click(); return 1;`);
  e('a gomb után az új verzió fut', await varVer(alapVer + 1), await ver());
  await var_(1000);
  r = await j(`var kat=Object.keys(SZOLGALTATASOK)[0]; return caches.keys().then(function(k){ return {
      cache:k, foglalas:loadBookings().some(x=>x.name==='Megmarad'&&x.time==='10:05'), anyag:chemRemaining('A'), kartya:SZOLGALTATASOK[kat][0].anyagok,
      uz:JSON.parse(sessionStorage.getItem('__uz')||'[]'), cel:sessionStorage.getItem('fodrasz_friss_cel'), toast:document.getElementById('toast').textContent}; });`);
  e('frissítés után megvannak a foglalások, a leltár és a kártyák', r.foglalas && r.anyag === 93 && r.kartya && r.kartya[0].gram === 7, r);
  e('csak az új gyorsítótár maradt', r.cache.length === 1 && r.cache[0] === 'fodrasz-foglalo-v' + (alapVer + 1), r.cache);
  e('sikerüzenet, nincs hibaablak', r.toast.includes('Frissítve') && r.uz.length === 0 && r.cel === null, r);

  // C. induláskori jelzés; a verziófájl újabbat ígér, de az oldal még a régi: hangos hiba, nem hazudik sikert
  kiad(alapVer + 2, { csakVersion: true });
  await betolt(); await var_(3500);
  r = await j(`return {jel:document.querySelector('.tab[data-tab=rendszer]').classList.contains('uj-ver'), g:document.getElementById('frissGomb').textContent, sz:document.getElementById('frissAllapot').textContent};`);
  e('induláskor magától jelzi az új verziót (⬆, gombfelirat)', r.jel && r.g.includes('v' + (alapVer + 2)) && r.sz.includes('van újabb'), r);
  await j(`document.getElementById('frissGomb').click(); return 1;`);
  await var_(4000);
  r = await j(`return {ver:APP_VER, uz:JSON.parse(sessionStorage.getItem('__uz')||'[]')};`);
  e('ha nem jött meg az új verzió: hangos hibaüzenet, a régi fut tovább', r.ver === String(alapVer + 1) && r.uz.length === 1 && r.uz[0].includes('NEM sikerült'), r);

  // átirányítás a service workeren át: ne legyen hálózati hiba
  await kuld('Page.navigate', { url: URL_.replace('index.html', 'atiranyit') }); await var_(ANDROID ? 3500 : 1500);
  r = await j(`return {ver:typeof APP_VER==='undefined'?null:APP_VER, cim:location.pathname};`);
  e('átirányított címről is betölt az oldal', r.ver === String(alapVer + 1) && r.cim.endsWith('index.html'), r);
  await betolt();

  // D. nincs szerver: nem esik szét, internet nélkül is indul
  await leall();
  await j(`document.getElementById('frissGomb').click(); return 1;`);
  await var_(2500);
  r = await j(`return {sz:document.getElementById('frissAllapot').textContent, g:document.getElementById('frissGomb').disabled};`);
  e('net nélkül: „nem sikerült ellenőrizni”, a gomb újra használható', r.sz.includes('nem sikerült ellenőrizni') && !r.g, r);
  await betolt();
  e('net nélkül is elindul a frissített verzió', await varVer(alapVer + 1, 10), await ver());
} catch (err) {
  rossz++; console.log('HIBA (leállt a próba): ' + err.message);
} finally {
  try { ws?.close(); } catch {}
  ch?.kill();
  if (ANDROID) { try { adb('shell', 'am', 'force-stop', CSOMAG); } catch {} }
  try { szerver.closeAllConnections(); szerver.close(); } catch {}
}
console.log(`\n${jo}/${jo + rossz} zöld`);
process.exit(rossz ? 1 : 0);
