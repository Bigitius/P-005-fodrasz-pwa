# Telepítési útmutató – Márti fodrászata alkalmazás

## Telepítés a TAB 10 Lite tabletre (Android 14, Chrome) – EZ AZ ALAP

Telepítés után az app saját ikonról, a böngésző címsora nélkül indul
(az Android felső sávja – óra, akkumulátor – látszik).

1. A tableten nyisd meg a **Chrome**-ot, és írd be:
   `https://bigitius.github.io/P-005-fodrasz-pwa/`
2. Az appban érintsd meg felül a **⚙️ Rendszer** fület.
3. A **📲 Telepítés a tabletre** kártyán érintsd meg a **📲 Telepítés** gombot,
   majd a felugró kérdésnél: **Telepítés**.
4. Zárd be a Chrome-ot. Ezentúl a kezdőképernyőn lévő **Márti fodrászata**
   ikonról indítsd az appot.

Ellenőrzés: indítás után a Rendszer fülön ez áll: „✅ Telepített appként fut”.

Ha a gomb nem indítja a telepítést (pl. a Chrome épp nem ajánlja fel):
Chrome jobb felső **⋮** menü → **„Alkalmazás telepítése”** vagy
**„Hozzáadás a kezdőképernyőhöz”**. Ha ott sincs ilyen, az app valószínűleg már
telepítve van – keresd az ikonját a kezdőképernyőn.

Ha korábban helyi fájlként (Fájlkezelő → `index.html`) használtad: előtte
a Rendszer fülön **💾 Mentés**, a telepített appban pedig **📂 Visszatöltés**
ugyanabból a fájlból. A helyi fájl és a telepített app adatai NEM közösek.

Frissítés: az app magától frissül, ha internettel nyitod meg. Ha az új verzió
nem látszik: nyisd meg internettel, várj pár másodpercet, zárd be, nyisd meg újra.
A verziószám a fejlécben, a név mellett látszik.

---

# Régebbi útmutatók (iPad, Huawei MediaPad T3, saját tárhely létrehozása)

Az alábbi részek a korábbi eszközökhöz és a kezdeti beállításhoz készültek.

## 1. lépés – GitHub-fiók létrehozása (ingyenes)

1. Nyisd meg a böngészőben: https://github.com/signup
2. Add meg az e-mail címed, válassz jelszót, majd válassz felhasználónevet.
3. Igazold vissza az e-mail címed a kiküldött kód/link alapján.
4. A regisztráció végén ingyenes csomagot válassz (Free) – ez bőven elég ehhez.

## 2. lépés – Új, publikus repó (tárhely) létrehozása

1. Bejelentkezés után kattints a jobb felső sarokban a "+" jelre, majd "New repository".
2. Adj neki nevet, például: `fodrasz-pwa`
3. Állítsd "Public"-ra (nyilvánosra) – ez szükséges az ingyenes GitHub Pages
   szolgáltatáshoz.
4. A "Create repository" gombbal hozd létre.

## 3. lépés – A fájlok feltöltése (böngészőből, webes felületen)

Az alkalmazáshoz összesen 6 fájl tartozik, mindet fel kell tölteni:

- `index.html`
- `manifest.json`
- `service-worker.js`
- `icon-180.png`
- `icon-192.png`
- `icon-512.png`

Feltöltés menete:

1. Az újonnan létrehozott repóban kattints az "Add file" gombra, majd
   "Upload files"-ra.
2. Húzd be egyszerre mind a 6 fájlt (vagy tallózd be egyenként).
3. Alul, a "Commit changes" résznél hagyd az alapértelmezett szöveget, majd
   kattints a zöld "Commit changes" gombra.

## 4. lépés – GitHub Pages bekapcsolása

1. A repóban kattints a felső menüsorban a "Settings" fülre.
2. A bal oldali menüben keresd meg a "Pages" pontot.
3. A "Branch" résznél válaszd ki a `main` ágat és a `/ (root)` mappát, majd
   "Save".
4. Néhány percen belül megjelenik egy elérhetőség, valami ilyesmi formában:
   `https://felhasznalonev.github.io/fodrasz-pwa/`
   Ezt a címet fogod használni az iPaden.

## 5. lépés – Telepítés iPaden (Safari)

1. Nyisd meg Safariban a fenti címet.
2. Alul (vagy a címsorban) kattints a "Megosztás" ikonra (a négyzet, benne
   felfelé mutató nyíllal).
3. Görgess le, és válaszd: "Hozzáadás a kezdőképernyőhöz".
4. Adj nevet az ikonnak (pl. "Márti fodrászata"), majd kattints "Hozzáadás"-ra.
5. Ezután az ikon megjelenik a kezdőképernyőn, mint egy sima alkalmazás.

## 6. lépés – Ellenőrzés repülőgép módban

Ez azt teszteli, hogy internet nélkül is működik-e az alkalmazás.

1. Nyisd meg egyszer az alkalmazást a kezdőképernyő ikonjáról normál
   internetkapcsolat mellett (ez tölti be a gépre a szükséges fájlokat).
2. Kapcsold be az iPad repülőgép módját (Beállítások → Repülőgép mód, vagy a
   Vezérlőközpontból).
3. Nyisd meg újra az alkalmazás ikonját a kezdőképernyőről.
4. Ha az alkalmazás internet nélkül is betölt és használható, a telepítés
   sikeres volt.
5. Ha üres vagy hibás oldal jelenik meg, kapcsold ki a repülőgép módot, nyisd
   meg egyszer újra internettel az appot, majd ismételd meg a 2–3. lépést.

## 7. lépés – Telepítés Android táblagépen (pl. Huawei MediaPad T3)

Ugyanaz a webcím működik itt is, mint az iPadnél (2–4. lépés) — nem kell
külön programot, APK-t vagy áruházat használni, csak a Chrome böngészőt,
ami a táblagépen alapból rajta van.

1. Nyisd meg Chrome-ban a fenti (github.io-s) webcímet.
2. Jobb felül kattints a három pontra (⋮), majd válaszd: "Telepítés" vagy
   "Hozzáadás a kezdőképernyőhöz" (a pontos szöveg Chrome-verziónként
   eltérhet).
3. Erősítsd meg — az ikon megjelenik a táblagép kezdőképernyőjén, ugyanúgy
   mint egy sima alkalmazás, internet nélkül is megnyitható.
4. Az alkalmazás ezen a táblagépen mindig fekvő tájolásban nyílik meg
   (ezt a program maga állítja be) — nem kell forgatni, csak egyféle
   elrendezésre kell számítani.
5. Ha korábban már telepítve volt egy régebbi verzió, és a friss
   módosítások nem látszanak: nyisd meg az alkalmazást internettel, várj
   pár másodpercet (ekkor frissül a háttérben), majd zárd be és nyisd meg
   újra.

## 8. lépés – HA a 7. lépés (GitHub Pages, service worker) NEM megbízható

A Huawei MediaPad T3-on (nagyon régi, 2018-as Chrome) öt külön javítási
kísérlet (v15–v19) után sem volt megbízható a szolgáltatásmunkás-alapú
offline működés. Ha nálad is ez a helyzet — a "📥 Offline letöltés" gomb
hibát ír ki, vagy repülőgép módban üres/hibás oldalt látsz —, ne ezzel az
úttal küzdj tovább: tedd fel az alkalmazást HELYI FÁJLKÉNT, internet és
szerver nélkül. Ez lemond a "valódi telepített app" élményről (a Chrome
címsora látszani fog), cserébe nem függ a szolgáltatásmunkástól, tehát a
korábbi hiba oka is eltűnik.

1. Másold át a 6 fájlt (index.html, manifest.json, service-worker.js,
   icon-180.png, icon-192.png, icon-512.png) a táblagépre, EGY MAPPÁBA —
   például USB-kábelen a géped és a tábla között, vagy egy felhős
   tárhelyen (Google Drive, e-mail melléklet) keresztül letöltve a
   táblagép saját "Letöltések" mappájába.
2. A táblagépen nyisd meg a Fájlkezelő (Files) alkalmazást, keresd meg a
   mappát, és érintsd meg az `index.html` fájlt — ez Chrome-ban nyílik meg.
3. Jobb felül a három pontra (⋮) kattintva válaszd: "Hozzáadás a
   kezdőképernyőhöz". Az ikon ezután ugyanúgy a kezdőképernyőn lesz, mint
   egy telepített alkalmazás — de a Chrome címsorával nyílik meg (ez a
   file:// megnyitás velejárója, nem hiba).
4. Mivel nincs hálózati függőség, ez MINDIG offline működik — nincs mit
   "letölteni" előre, az "Offline letöltés" gomb ezért automatikusan
   eltűnik, ha a programot így, helyi fájlként nyitod meg.
5. FONTOS BIZTONSÁGI HÁLÓ: mivel helyi fájlként a böngésző adattárolása
   (localStorage) régebbi Android-verziókon néha megbízhatatlan, HASZNÁLD
   RENDSZERESEN a fejlécben lévő "💾 Mentés" gombot (ez egy .json fájlba
   menti az összes foglalást a táblagépre) — ha valaha üresen indulna az
   app, a "📂 Visszatöltés" gombbal ebből a fájlból mentesen visszaállítható
   minden adat.

## 9. lépés – Automatikus mentés Google Drive-ra (TAB 10 Lite, https-ről)

Ez csak akkor működik, ha az app a GitHub Pages címről fut (https), helyi
fájlként (file://) nem — ott a gomb el van rejtve.

Egyszeri beállítás (a tulajdonos végzi, Google Cloud Console):
1. Új projekt, "Google Drive API" bekapcsolása.
2. OAuth hozzájárulási képernyő (External), a saját Google-fiók felvéve tesztfelhasználónak.
3. Hitelesítő adatok → OAuth ügyfélazonosító → "Web application"; engedélyezett
   JavaScript origin: a GitHub Pages cím (pl. `https://felhasznalo.github.io`).
4. A kapott ügyfélazonosítót (nem titok) a `drive-config.js` fájlba kell írni
   (`window.DRIVE_CLIENT_ID`). Jelszó, token vagy kulcs SOHA nem kerül a fájlba.

Használat:
- A fejlécben a "☁ Drive" gomb mutatja az állapotot: mentve / nincs net, vár /
  be kell jelentkezni / HIBA / ütközés. Ha hiba van, piros.
- Az app a Drive-on egy "Fodrasz-adatok" mappába ment: `fodrasz-adatok.json`
  (mindig a legutóbbi) és naponta egy előző-napi másolat (legfeljebb 10).
- Net nélkül a mentés vár; ha a net visszajön (vagy megnyitod az appot), magától feltölt.
- Új vagy javított tableten: bejelentkezés → "Visszatöltés Drive-ról…" →
  válaszd ki a mentést. A tabletről előtte helyi biztonsági másolat készül.
- Ha a Drive-on más mentés van, mint amit a tablet utoljára látott, az app NEM ír
  felül, hanem rákérdez (ez védi az adatot, ha egy új, üres tablet indul).
- Korlát: a Google-belépés kb. óránként lejár; ilyenkor a gomb "be kell
  jelentkezni" jelzést ad, egy érintéssel megújítható.

<!-- frissites: v2 telepites inditasa 2026-07-18 -->
<!-- frissites: v3 Huawei MediaPad T3 tablet-tamogatas (7. lepes) 2026-08-23 -->
<!-- frissites: v4 helyi fajlkent (file://, szerver nelkul) telepitesi
     alternativa (8. lepes) az otodik offline-javitasi kiserlet utan is
     megbizhatatlan szolgaltatasmunkas miatt, Istvan dontese, 2026-09-06 -->
<!-- frissites: v5 TAB 10 Lite telepites a Rendszer ful Telepites gombjaval, 2026-10-24 -->

