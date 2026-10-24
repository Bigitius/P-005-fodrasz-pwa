// A Rendszer fül "📲 Telepítés" kártyájának automata tesztje (2026-10-24).
// Az index.html-ből kivágja a Telepítés blokkot, és hamis böngésző-környezetben futtatja.
// Valódi ablakot NEM nyit: elszigetelt vm-környezetben fut, nincs benne valódi böngésző;
// az alert egy gyűjtő függvény, ami csak feljegyzi az üzenetet.
// Futtatás: node teszt/telepites_teszt.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const kezd = html.indexOf('// === 📲 Telepítés');
if (kezd < 0) throw new Error('A Telepítés blokk nem található az index.html-ben');
const kod = html.slice(kezd, html.indexOf('})();', kezd) + 5);

let jo = 0, rossz = 0;
function ellenoriz(nev, feltetel) {
  if (feltetel) { jo++; console.log('OK   ' + nev); } else { rossz++; console.log('HIBA ' + nev); }
}

function kornyezet({ protokoll = 'https:', standalone = false, ajanlat = null } = {}) {
  const elemek = {
    telepitAllapot: { textContent: '' },
    telepitBtn: { style: { display: 'none' }, kattintas: null, addEventListener(t, f) { if (t === 'click') this.kattintas = f; } },
  };
  const docEsem = {}, winEsem = {};
  const alertek = [];
  const win = {
    telepitoEsemeny: ajanlat,
    matchMedia: (q) => ({ matches: standalone && q === '(display-mode: standalone)', addEventListener() {} }),
    addEventListener(t, f) { winEsem[t] = f; },
  };
  const ctx = {
    window: win, location: { protocol: protokoll }, navigator: {},
    matchMedia: win.matchMedia,
    alert: (m) => alertek.push(m),
    document: { getElementById: (id) => elemek[id] || null, addEventListener(t, f) { docEsem[t] = f; } },
  };
  vm.createContext(ctx);
  // a window-on beállított telepitoEsemeny legyen ugyanaz, mint amit a kód olvas
  Object.defineProperty(ctx, 'telepitoEsemeny', { get: () => win.telepitoEsemeny });
  vm.runInContext(kod, ctx);
  return { elemek, docEsem, winEsem, alertek, win };
}

const allapot = (k) => k.elemek.telepitAllapot.textContent;
const gomb = (k) => k.elemek.telepitBtn.style.display;
const var_ = () => new Promise((r) => setTimeout(r, 10));

// 1. helyi fájl
let k = kornyezet({ protokoll: 'file:' });
ellenoriz('helyi fájl: magyarázat a webcímmel', allapot(k).includes('helyi fájlként') && allapot(k).includes('github.io'));
ellenoriz('helyi fájl: gomb rejtve', gomb(k) === 'none');

// 2. telepített appként fut
k = kornyezet({ standalone: true });
ellenoriz('telepített app: nincs teendő', allapot(k).includes('Telepített appként fut'));
ellenoriz('telepített app: gomb rejtve', gomb(k) === 'none');

// 3. böngésző, nincs ajánlat -> kézi út, gombnyomásra útmutató
k = kornyezet();
ellenoriz('böngésző ajánlat nélkül: kézi útmutató', allapot(k).includes('⋮'));
ellenoriz('böngésző ajánlat nélkül: gomb látszik', gomb(k) === '');
ellenoriz('böngésző ajánlat nélkül: felirat "Hogyan telepítsem?"', k.elemek.telepitBtn.textContent.includes('Hogyan'));
k.elemek.telepitBtn.kattintas();
ellenoriz('böngésző ajánlat nélkül: gomb útmutatót mutat', k.alertek.length === 1 && k.alertek[0].includes('⋮'));

// 4. ajánlat később érkezik, elfogadás
k = kornyezet();
let hivas = 0;
k.win.telepitoEsemeny = { prompt() { hivas++; }, userChoice: Promise.resolve({ outcome: 'accepted' }) };
k.docEsem['telepites-elerheto']();
ellenoriz('ajánlat érkezett: "érintsd meg" szöveg', allapot(k).includes('Érintsd meg'));
ellenoriz('ajánlat érkezett: felirat "📲 Telepítés"', k.elemek.telepitBtn.textContent === '📲 Telepítés');
k.elemek.telepitBtn.kattintas();
await var_();
ellenoriz('elfogadás: prompt egyszer hívva', hivas === 1);
ellenoriz('elfogadás: "Telepítve" + gomb rejtve', allapot(k).includes('Telepítve') && gomb(k) === 'none');
ellenoriz('elfogadás: ajánlat elhasználva', k.win.telepitoEsemeny === null);

// 5. elutasítás -> visszaáll a kézi útra, nincs felugró ablak
k = kornyezet({ ajanlat: { prompt() {}, userChoice: Promise.resolve({ outcome: 'dismissed' }) } });
k.elemek.telepitBtn.kattintas();
await var_();
ellenoriz('elutasítás: kézi útmutató, gomb látszik', allapot(k).includes('⋮') && gomb(k) === '');
ellenoriz('elutasítás: nincs felugró ablak', k.alertek.length === 0);

// 6. hiba a telepítésben -> hangos
k = kornyezet({ ajanlat: { prompt() {}, userChoice: Promise.reject(new Error('proba-hiba')) } });
k.elemek.telepitBtn.kattintas();
await var_();
ellenoriz('telepítési hiba: hangos üzenet', k.alertek.length === 1 && k.alertek[0].includes('proba-hiba'));

// 7. appinstalled esemény (pl. a Chrome menüből telepítve)
k = kornyezet();
k.winEsem['appinstalled']();
ellenoriz('appinstalled: "Telepítve" + gomb rejtve', allapot(k).includes('Telepítve') && gomb(k) === 'none');

// 8. manifest
const m = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
ellenoriz('manifest: display standalone (óra/akku marad)', m.display === 'standalone');
ellenoriz('manifest: van maskable ikon', m.icons.some((i) => i.purpose === 'maskable'));
ellenoriz('manifest: van 192 és 512-es ikon', ['192x192', '512x512'].every((s) => m.icons.some((i) => i.sizes === s)));
const sw = readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
ellenoriz('service worker: az új ikon az offline listában', sw.includes('./icon-maskable-512.png'));

console.log(`\n${jo}/${jo + rossz} zöld`);
if (rossz) process.exit(1);
