// A Rendszer fül "📲 Telepítés" kártyájának automata tesztje (2026-10-24, v26).
// Az index.html-ből kivágja a Telepítés blokkot, és hamis böngésző-környezetben futtatja.
// Valódi ablakot NEM nyit: elszigetelt vm-környezetben fut, nincs benne valódi böngésző;
// az alert egy gyűjtő függvény, ami csak feljegyzi az üzenetet; az óra kézzel léptetett.
// Futtatás: node teszt/telepites_teszt.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const kezd = html.indexOf('// === 📲 Telepítés');
if (kezd < 0) throw new Error('A Telepítés blokk nem található az index.html-ben');
const veg = html.indexOf('</script>', kezd);
if (veg < 0) throw new Error('A Telepítés blokk vége nem található');
const kod = html.slice(kezd, veg);

let jo = 0, rossz = 0;
function ellenoriz(nev, feltetel) {
  if (feltetel) { jo++; console.log('OK   ' + nev); } else { rossz++; console.log('HIBA ' + nev); }
}

function kornyezet({ protokoll = 'https:', standalone = false, ajanlat = null, telepitettLista = null } = {}) {
  const elemek = {
    telepitAllapot: { textContent: '' },
    telepitBtn: { textContent: '', disabled: false, style: { display: 'none' }, kattintas: null,
      addEventListener(t, f) { if (t === 'click') this.kattintas = f; } },
  };
  const docEsem = {}, winEsem = {};
  const alertek = [];
  let oraFv = null, oraAll = false;
  const win = {
    telepitoEsemeny: ajanlat,
    matchMedia: (q) => ({ matches: standalone && q === '(display-mode: standalone)', addEventListener() {} }),
    addEventListener(t, f) { winEsem[t] = f; },
  };
  const ctx = {
    window: win, location: { protocol: protokoll }, console,
    navigator: telepitettLista ? { getInstalledRelatedApps: () => Promise.resolve(telepitettLista) } : {},
    matchMedia: win.matchMedia,
    alert: (m) => alertek.push(m),
    setInterval: (f) => { oraFv = f; return 1; },
    clearInterval: () => { oraAll = true; },
    Math,
    document: { hidden: false, getElementById: (id) => elemek[id] || null, addEventListener(t, f) { docEsem[t] = f; } },
  };
  vm.createContext(ctx);
  vm.runInContext(kod, ctx);
  const leptet = (mp) => { for (let i = 0; i < mp && !oraAll; i++) oraFv(); };
  return { elemek, docEsem, winEsem, alertek, win, ctx, leptet, oraAll: () => oraAll, vanOra: () => !!oraFv };
}

const allapot = (k) => k.elemek.telepitAllapot.textContent;
const gomb = (k) => k.elemek.telepitBtn;
const var_ = () => new Promise((r) => setTimeout(r, 10));

// 1. helyi fájl
let k = kornyezet({ protokoll: 'file:' });
ellenoriz('helyi fájl: magyarázat a webcímmel', allapot(k).includes('helyi fájlként') && allapot(k).includes('github.io'));
ellenoriz('helyi fájl: gomb rejtve', gomb(k).style.display === 'none');
ellenoriz('helyi fájl: nincs visszaszámláló', !k.vanOra());

// 2. telepített appként fut
k = kornyezet({ standalone: true });
ellenoriz('telepített app: nincs teendő', allapot(k).includes('Telepített appként fut'));
ellenoriz('telepített app: gomb rejtve', gomb(k).style.display === 'none');
ellenoriz('telepített app: nincs visszaszámláló', !k.vanOra());

// 3. böngésző, induláskor: visszaszámlálás, a gomb NEM tiltott (a koppintás érintésnek számít)
k = kornyezet();
ellenoriz('indulás: "Előkészítés… 30 mp"', gomb(k).textContent === '⏳ Előkészítés… 30 mp');
ellenoriz('indulás: gomb látszik és nem tiltott', gomb(k).style.display === '' && gomb(k).disabled === false);
ellenoriz('indulás: érintést kér', allapot(k).includes('Érints meg'));
k.leptet(10);
ellenoriz('10 mp után: "20 mp"', gomb(k).textContent === '⏳ Előkészítés… 20 mp');
k.elemek.telepitBtn.kattintas();
ellenoriz('várakozás közbeni koppintás: nincs felugró ablak', k.alertek.length === 0);
ellenoriz('koppintás után: már nem kér érintést', allapot(k).includes('magától átvált'));
k.leptet(20);
ellenoriz('30 mp után: "Várok a Chrome-ra…"', gomb(k).textContent === '⏳ Várok a Chrome-ra…');

// 4. az ajánlat megérkezik -> magától "Telepítés most", az óra leáll; elfogadás
let hivas = 0;
k.win.telepitoEsemeny = { prompt() { hivas++; }, userChoice: Promise.resolve({ outcome: 'accepted' }) };
k.docEsem['telepites-elerheto']();
ellenoriz('ajánlat: magától "📲 Telepítés most"', gomb(k).textContent === '📲 Telepítés most' && !gomb(k).disabled);
k.leptet(1);
ellenoriz('ajánlat után az óra leáll', k.oraAll());
k.elemek.telepitBtn.kattintas();
await var_();
ellenoriz('elfogadás: prompt egyszer hívva', hivas === 1);
ellenoriz('elfogadás: "Telepítve" + gomb rejtve', allapot(k).includes('Telepítve') && gomb(k).style.display === 'none');
ellenoriz('elfogadás: ajánlat elhasználva', k.win.telepitoEsemeny === null);

// 5. 60 mp alatt nincs ajánlat -> menüs útmutató, a gomb útmutatót ad
k = kornyezet();
k.docEsem['pointerdown']();
k.leptet(60);
ellenoriz('60 mp ajánlat nélkül: "Hogyan telepítsem?"', gomb(k).textContent === '📲 Hogyan telepítsem?');
ellenoriz('60 mp ajánlat nélkül: menüs út a szövegben', allapot(k).includes('⋮'));
ellenoriz('60 mp után az óra leáll', k.oraAll());
k.elemek.telepitBtn.kattintas();
ellenoriz('60 mp után a gomb útmutatót mutat', k.alertek.length === 1 && k.alertek[0].includes('⋮'));

// 6. már telepítve (getInstalledRelatedApps)
k = kornyezet({ telepitettLista: [{ platform: 'webapp' }] });
await var_();
ellenoriz('már telepítve: felismeri', allapot(k).includes('már telepítve van'));
ellenoriz('már telepítve: gomb rejtve', gomb(k).style.display === 'none');
k = kornyezet({ telepitettLista: [] });
await var_();
ellenoriz('nincs telepítve (üres lista): visszaszámlálás marad', gomb(k).textContent.startsWith('⏳'));

// 7. elutasítás -> visszaáll (60 mp előtt várakozás), nincs felugró ablak
k = kornyezet({ ajanlat: { prompt() {}, userChoice: Promise.resolve({ outcome: 'dismissed' }) } });
ellenoriz('kész ajánlattal indul: "Telepítés most"', gomb(k).textContent === '📲 Telepítés most');
k.elemek.telepitBtn.kattintas();
await var_();
ellenoriz('elutasítás: nincs felugró ablak', k.alertek.length === 0);
ellenoriz('elutasítás: gomb újra látszik', gomb(k).style.display === '');
ellenoriz('elutasítás: nem ragad "Várok"-on, menüs útmutató', gomb(k).textContent === '📲 Hogyan telepítsem?' && allapot(k).includes('⋮'));

// 7b. visszaszámlálás közben jött ajánlat, majd elutasítás (az óra már leállt)
k = kornyezet();
k.leptet(31);
k.win.telepitoEsemeny = { prompt() {}, userChoice: Promise.resolve({ outcome: 'dismissed' }) };
k.docEsem['telepites-elerheto']();
k.leptet(1);
k.elemek.telepitBtn.kattintas();
await var_();
ellenoriz('31 mp + ajánlat + elutasítás: menüs útmutató, nem ragad', gomb(k).textContent === '📲 Hogyan telepítsem?');
// a Chrome később új ajánlatot küldhet: akkor újra "Telepítés most"
k.win.telepitoEsemeny = { prompt() {}, userChoice: Promise.resolve({ outcome: 'accepted' }) };
k.docEsem['telepites-elerheto']();
ellenoriz('új ajánlat elutasítás után: újra "Telepítés most"', gomb(k).textContent === '📲 Telepítés most');

// 8. hiba a telepítésben -> hangos
k = kornyezet({ ajanlat: { prompt() {}, userChoice: Promise.reject(new Error('proba-hiba')) } });
k.elemek.telepitBtn.kattintas();
await var_();
ellenoriz('telepítési hiba: hangos üzenet', k.alertek.length === 1 && k.alertek[0].includes('proba-hiba'));

// 9. appinstalled esemény (pl. a Chrome menüből telepítve)
k = kornyezet();
k.winEsem['appinstalled']();
ellenoriz('appinstalled: "Telepítve" + gomb rejtve', allapot(k).includes('Telepítve') && gomb(k).style.display === 'none');

// 10. háttérben nem számol
k = kornyezet();
k.ctx.document.hidden = true;
k.leptet(10);
ellenoriz('háttérben: nem számol', gomb(k).textContent === '⏳ Előkészítés… 30 mp');

// 11. manifest és service worker
const m = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
ellenoriz('manifest: display standalone (óra/akku marad)', m.display === 'standalone');
ellenoriz('manifest: van maskable ikon', m.icons.some((i) => i.purpose === 'maskable'));
ellenoriz('manifest: van 192 és 512-es ikon', ['192x192', '512x512'].every((s) => m.icons.some((i) => i.sizes === s)));
ellenoriz('manifest: related_applications webapp a saját manifestre',
  (m.related_applications || []).some((a) => a.platform === 'webapp' && a.url === 'https://bigitius.github.io/P-005-fodrasz-pwa/manifest.json'));
ellenoriz('manifest: prefer_related_applications nem true', m.prefer_related_applications !== true);
const sw = readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
ellenoriz('service worker: az új ikon az offline listában', sw.includes('./icon-maskable-512.png'));

console.log(`\n${jo}/${jo + rossz} zöld`);
if (rossz) process.exit(1);
