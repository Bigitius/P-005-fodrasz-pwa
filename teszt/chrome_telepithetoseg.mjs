// Láthatatlan (headless) Chrome-mal megkérdezi a Chrome-ot: telepíthető-e az oldal, és ha nem, miért.
// Ablakot nem nyit (--headless=new). Használat: node teszt/chrome_telepithetoseg.mjs <url>
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_ = process.argv[2];
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333;
const profil = mkdtempSync(join(tmpdir(), 'pwa-proba-'));
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profil}`,
  '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });

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

  await kuld('Page.enable');
  await kuld('Page.navigate', { url: URL_ });
  await var_(8000);   // betöltés + service worker aktiválás
  await kuld('Page.reload');
  await var_(5000);
  const hibak = await kuld('Page.getInstallabilityErrors');
  const manifest = await kuld('Page.getAppManifest');
  const sw = await kuld('Runtime.evaluate', { expression: 'navigator.serviceWorker.controller ? navigator.serviceWorker.controller.scriptURL : "nincs vezérlő SW"', returnByValue: true });
  console.log('URL:', URL_);
  console.log('Manifest URL:', manifest.result?.url, '| manifest-hibák:', JSON.stringify(manifest.result?.errors || []));
  console.log('Service worker:', sw.result?.result?.value);
  console.log('Telepíthetőségi hibák:', JSON.stringify(hibak.result?.installabilityErrors ?? hibak, null, 1));
} finally {
  try { ws?.close(); } catch {}
  ch.kill();
}
