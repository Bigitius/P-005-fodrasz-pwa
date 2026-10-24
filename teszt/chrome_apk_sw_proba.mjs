// Headless Chrome: az APK-letöltés (navigate kérés) nem írhatja felül a service worker offline főoldalát.
// Ablakot nem nyit (--headless=new). Használat: node teszt/chrome_apk_sw_proba.mjs http://localhost:8765/
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ALAP = process.argv[2] || 'http://localhost:8765/';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9335;
const profil = mkdtempSync(join(tmpdir(), 'pwa-apk-'));
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profil}`,
  '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
const var_ = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, hibas = false;
try {
  let lap;
  for (let i = 0; i < 40 && !lap; i++) { await var_(250); try { lap = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === 'page'); } catch {} }
  ws = new WebSocket(lap.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let id = 0; const v = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (v.has(d.id)) { v.get(d.id)(d); v.delete(d.id); } };
  const kuld = (method, params = {}) => new Promise((r) => { const i = ++id; v.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const e = async (x) => (await kuld('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.result?.value;
  const cacheFo = `caches.keys().then(ks => Promise.all(ks.map(k => caches.open(k).then(c => c.match('./index.html')))))
    .then(rs => rs.filter(Boolean)[0]).then(r => r ? r.text().then(t => r.headers.get('content-type') + ' | ' + t.slice(0, 15)) : 'nincs')`;

  await kuld('Page.enable');
  await kuld('Browser.setDownloadBehavior', { behavior: 'deny' });   // a letöltött fájl nem kerül sehová
  await kuld('Page.navigate', { url: ALAP + 'index.html' });
  await var_(5000);
  await kuld('Page.reload');
  await var_(3000);
  console.log('SW vezérel:', await e(`!!navigator.serviceWorker.controller`));
  console.log('Offline főoldal ELŐTTE:', await e(cacheFo));
  await kuld('Page.navigate', { url: ALAP + 'marti-fodraszata.apk' });   // ugyanaz, mint a gomb
  await var_(3000);
  await kuld('Page.navigate', { url: ALAP + 'index.html' });
  await var_(3000);
  const utana = await e(cacheFo);
  console.log('Offline főoldal UTÁNA :', utana);
  hibas = !/text\/html/.test(utana) || !/<!DOCTYPE/i.test(utana.replace(/^\uFEFF/, '').split(' | ')[1] || '');
  console.log(hibas ? 'HIBA: az offline főoldal nem HTML' : 'OK: az APK-letöltés után is HTML az offline főoldal');
} finally {
  try { ws?.close(); } catch {}
  ch.kill();
}
if (hibas) process.exit(1);
