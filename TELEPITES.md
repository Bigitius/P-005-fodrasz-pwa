# Telepítési útmutató – Márti fodrászata alkalmazás

Ez az útmutató végigvezet azon, hogyan tudod feltenni az alkalmazást az internetre,
és hogyan tudod feltenni az iPad kezdőképernyőjére, hogy egy ikonra kattintva
azonnal megnyíljon, akár internet nélkül is.

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

<!-- frissites: v2 telepites inditasa 2026-07-18 -->
<!-- frissites: v3 Huawei MediaPad T3 tablet-tamogatas (7. lepes) 2026-08-23 -->

