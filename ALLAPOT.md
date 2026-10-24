# ALLAPOT -- P-005-fodrasz-pwa
Utolso frissites: 2026-10-24

Nyilvanos repo: ebbe a fajlba csak olyan kerulhet, ami barkinek lathato lehet. Belso jegyzetek a gitbol kizart BELSO.md-ben vannak.

## Hol tartunk
MERT (2026-10-13):
- Repo: Bigitius/P-005-fodrasz-pwa, ag: main. Lathatosag: PUBLIC (nyilvanos, tesztelesre).
- Fajlok: index.html (az alkalmazas), manifest.json, service-worker.js, TELEPITES.md, .nojekyll, 3 ikon.
- Utolso tartalmi commit: d2acad3 (2026-10-09), a commit-uzenet szerint v25. A service-worker.js cache-neve `fodrasz-foglalo-v17`; az index.html-ben nincs v25-os verziojelzes, a v25 csak a commit-uzenetekbol ismert. A ketto kozti kulonbseg nem vizsgalt.
- Biztonsagi atvizsgalas 2026-10-13: nyilvanos, tesztelesre; atvizsgalva, tiszta. A fajlok es a teljes commit-tortenet (27 commit, egy ag) atnezve: nincs e-mail-cim, API-kulcs, jelszo, token, torolt fajl. Egyetlen lelet: index.html seedContacts/seedDemo (1932-1945. sor) -- kitalalt nevek es telefonszamok, tesztadatok, a tulajdonos megerositette 2026-10-13.
- Nem vizsgalt: az index.html 396. sorabeli beagyazott logo tartalma, az ikonok, a tavoli GitHub-oldal (Pages, PR-ok).

ALLITOTT (nem mertem):
- Hogy az alkalmazas jelenleg hasznalatban van-e: ismeretlen.
- A TELEPITES.md szerint egy regi Android-tableten a service worker nem volt megbizhato, ezert helyi fajlkent (file://) is hasznalhato. Nem probaltam ki.

## Drive-mentés (2026-10-16, elkészült, még NEM commitolva, NEM élesítve)
MERT:
- Új fájlok: drive-sync.js (motor), drive-ui.js (felület), drive-config.js (üres kliensazonosító), teszt/drive_teszt.mjs. Módosítva: index.html (☁ Drive gomb + 3 script-tag), service-worker.js (cache v18), TELEPITES.md (9. lépés).
- Független ellenőr (2026-10-16) két valódi hibát talált, javítva: (1) kifejezett felülírásnál/régi másolat visszatöltésénél a Drive-on lévő legfrissebb állapot egyedi nevű másolatba kerül; (2) a másolat-keresés nem a Drive `contains` lekérdezésére épül, hanem a mappa listájából szűr.
- Mock-Drive teszt: 15/15 zöld (bizonyitek/drive_teszt_2.txt; a drive_teszt_1.txt a javítás előtti 12/12). Böngészőben (mock-Drive-val, hamis Google-belépéssel) a teljes út működött: mentés, helyi adat törlése, visszatöltés a gombbal, 7 foglalás visszajött.
- Fejléc 1280x800 nézeten kifér, nincs vízszintes görgetés.
ALLITOTT (nem mertem):
- Valódi Google-belépés és valódi Drive: nem próbáltam. Ehhez kell az OAuth kliensazonosító (drive-config.js) — ezt a tulajdonos hozza létre.
- A TAB 10 Lite-on futás nem próbált. Cél-eszköz: TAB 10 Lite (pontos gyártó/típus nincs rögzítve).
- A drive-ui.js (panel, megerősítő ablak) automata tesztje nincs; csak a böngészős kézi végigpróba (mock-Drive) volt.
- Korlát: a Google-belépés kb. óránként lejár; csendes megújítás nem biztos, hogy minden esetben sikerül (ilyenkor a gomb "be kell jelentkezni").

## Leltár szerkesztés/törlés (2026-10-16, még NEM commitolva)
MERT: minden leltárkártyán ✏️ Szerkeszt és 🗑 Töröl gomb (index.html, renderLeltar + editChemical/deleteChemical). Böngészőben (prompt/confirm helyettesítve) kipróbálva: kód+név+kezdő mennyiség módosítása mentődik, ugyanolyan kód elutasítva, törlés megerősítéssel (mégse esetén marad), tárolás frissül. Kódátnevezéskor a foglalások hivatkozása is átíródik. A Drive-mentés is jelzést kap (saveChemicals/saveBookings).
ALLITOTT: valódi érintéses próba a TAB 10 Lite-on nem történt; a böngésző konzoljában 2 régi "SyntaxError" bejegyzés maradt egy korábbi, azóta javított betöltésből (a kiszolgált fájl és az inline szkriptek szintaxisa rendben).

## Kód-audit és hibajavítás (2026-10-16, app v20, SW-cache v19, még NEM commitolva)
MERT (bizonyitek/audit_2026-10-16.txt, bizonyitek/hibajavitas_2026-10-16.txt, bizonyitek/drive_teszt_3.txt):
- Audit: 4 hiba élesben igazolva: (1) sérült tárolt adatot a mintaadat csendben felülírta; (2) a minta-névjegyek nem voltak törölhetők; (3) aposztrófos névnél nem működött a ✏️/🗑; (4) nyitvatartáson kívüli foglalás eltűnt a Főoldalról.
- Javítva és böngészőben újramérve: sérült adat félretéve + piros sáv (mentés csak sikeres félretétel után); mentési hiba hangos (alert) + visszaolvasás; fájlból visszatöltés megerősítéssel, biztonsági másolattal, „mindent vagy semmit” cserével; egyedi azonosító (uid) a foglalásokhoz; nyitvatartás-ellenőrzés új foglalásnál és időpont-módosításnál, a régi kívül eső foglalás figyelmeztető sávban látszik; mintaadat csak teljesen üres tárolónál; Dz/Dzs csoportosítás; Drive-feltöltés szünetel sérült helyi adatnál.
- Független ellenőr átnézte; az általa talált 2 valódi hiba (régi kívül eső foglalás vegyszer-adata nem volt menthető; részleges visszatöltési hiba félig cserélt állapotot hagyott) javítva és újramérve.
- Drive mock-teszt 16/16 zöld; az index.html 6 inline szkriptje szintaktikailag hibátlan.
- Teljesítmény-alapmérés (javítás előtt): bizonyitek/teljesitmeny_elotte.txt — leglassabb az időpont-rács (23,5 ms asztali gépen, 2000 foglalással).
ALLITOTT / nem mért:
- A TAB 10 Lite-on nem próbált; a valódi (nem helyettesített) felugró ablakok kézi kipróbálása Istváné.

## Optimalizálás (2026-10-16, app v21, SW-cache v20)
MERT (bizonyitek/optimalizalas_2026-10-16.txt, bizonyitek/drive_teszt_4.txt):
- Mintaadat kivéve (Teszt 15p + 5 kitalált névjegy) — tulajdonosi döntés. A korábbi telepítéseken bent lévők kézzel törölhetők.
- Gyorsulás asztali gépen, 2000 foglalással: időpont-rács 23,5 → 1,6 ms; Főoldal 6,5 → 3,2 ms; Névjegyzék 12,7 → 2,3 ms.
- Drive: szokásos mentés 6 → 4 hálózati kérés (ugyanazzal a teszttel mérve); mock-teszt 17/17.
- Nagyobb kártyagombok (36 px; 15 perces kártyán 28 px), a szöveg nem fut alájuk (1280x800-on mérve).
- Próba közben talált RÉGI hiba javítva: új festésnél üres maradt a vegyszerkód, így a leltárból nem vonódott le.
- Halott kód törölve; az ütközés-ellenőrzés 3 másolata egy közös függvény.
- Független ellenőr: RENDBEN. Megjegyzés: a régi, szétszakadt dupla-párok javítója már csak induláskor és visszatöltés után fut (nem minden rajzolásnál).
ALLITOTT: a TAB 10 Lite-on nem mért (a gyorsulás aránya ott más lehet).

## Élesítés (2026-10-16)
MERT: push István jóváhagyásával: origin/main = ac35da0 (helyi = távoli). GitHub Pages build: "built ac35da0". Az élő oldalon: APP_VER="21", service worker "fodrasz-foglalo-v20", drive-sync.js HTTP 200.
ALLITOTT: a tabletek a következő megnyitáskor (netkapcsolattal) frissülnek — nem ellenőrzött.
- Ritka eset: ha a Drive-visszatöltéskor a sérült helyi adat félretétele korábban nem sikerült, a sérült nyers tartalom a Drive-ág biztonsági másolatába nem kerül be.

## Helyi tablet-változat felfedezése + Vissza gomb (2026-10-16, app v22, SW-cache v21)
MERT:
- A `tablet\` mappa (gitből kizárva a .git\info\exclude-dal, NEM a GitHubon) egy 2026-10-14-i külön változatot tartalmaz (`tablet\app.html`, futtató, titkosítás-teszt). Eltérései a GitHub 199b18e-hez képest: fent maradó lépéssor Vissza gombbal; PIN-kódos zárképernyő + AES-256 titkosított tárolás helyreállító kóddal, titkosított mentésfájl; K001–K003 próbakódok és a mintaadat törölve (István kérése, 2026-10-14); service worker kikapcsolva. Ez korábban az ALLAPOT.md-ben nem szerepelt.
- A Drive-on lévő `index.v2.html` a GitHub 199b18e-től csak a logó képében tér el.
- A fent maradó Vissza gomb átvéve az index.html-be, böngészőben kipróbálva (bizonyitek/vissza_gomb_2026-10-16.txt).
ALLITOTT: a PIN/titkosítás átvétele NEM történt meg — tulajdonosi döntés kell (ütközik a Drive-mentéssel: a Drive-ra jelenleg titkosítatlanul menne fel az adat).

## Élesítés v22 + v23 (2026-10-16 / 2026-10-19)
MERT: v22 (62fa773) és v23 (38362eb) pusholva István jóváhagyásával; GitHub Pages build "built 38362eb"; élő oldal: APP_VER="23", SW "fodrasz-foglalo-v22" {cache:'reload'}-dal, updateViaCache. A v23 javítja, hogy a tablet offline példánya nem frissült (bizonyitek/sw_frissites_2026-10-19.txt).
ALLITOTT: a tableten a v23 megjelenése nem ellenőrzött. A javítás előtti telepítésnél (v21/v22 SW) az első átállás még a régi SW-n át megy: netkapcsolattal megnyitás, bezárás, újranyitás kell.

## Rendszer fül (2026-10-19, app v24, SW-cache v23)
MERT (bizonyitek/rendszer_ful_2026-10-19.txt): az 5 fül (Főoldal, Foglalás, Névjegyzék, Leltár, Rendszer) a felső sávban, 1280x800-on egy sorban; a Mentés / Visszatöltés / Offline letöltés / Drive gomb a Rendszer fülön, mind működik. Drive-hiba esetén a Rendszer fülön ⚠ jel látszik. Tablet-mode-ban (file://) a Mentés/Visszatöltés most már látszik (a Rendszer fülön van hely), a Drive helyett magyarázó szöveg.
ALLITOTT: a TAB 10 Lite-on nem próbált.

## Telepítés gomb (2026-10-24, app v25, SW-cache v24, élesítve)
MERT: push István jóváhagyásával: origin/main = cd434f0; GitHub Pages "built cd434f0"; élő oldalon APP_VER="25", SW "fodrasz-foglalo-v24", icon-maskable-512.png HTTP 200, manifest id "./".
Cél-eszköz adatai (a tulajdonos megadta): TAB 10 Lite, modell M10, Android 14, Chrome 155.
MERT (bizonyitek/telepites_2026-10-24.txt):
- Rendszer fül első kártyája: „📲 Telepítés a tabletre”. Kiírja, hogyan fut az app (helyi fájl / telepített app / böngésző); böngészőben egy gombbal indítja a Chrome telepítését, ha nincs ajánlat, kézi útmutatót ad („Hogyan telepítsem?”). Hiba hangos.
- manifest: id, scope, lang, leírás; új Androidos (maskable) ikon: icon-maskable-512.png. display marad standalone (óra/akku látszik — tulajdonosi döntés, 2026-10-24).
- TELEPITES.md: új, 4 lépéses TAB 10 Lite rész az elején, a régi részek alatta.
- teszt/telepites_teszt.mjs 21/21 zöld; Drive mock-teszt 17/17. Böngészőben (1280x800, hamis telepítési ajánlattal) kipróbálva, konzol hibamentes.
- Független ellenőr: RENDBEN; 2 apró megjegyzése (gomb-felirat ajánlat nélkül, teszt-fejléc) javítva.
ALLITOTT: valódi telepítés a TAB 10 Lite-on nem próbált. Hogy a tablet most helyi fájlból vagy a webcímről fut-e, nem ismert (a v25 a Rendszer fülön kiírja).

## Telepítés gomb v26 (2026-10-24, app v26, SW-cache v25, élesítve)
MERT: push István jóváhagyásával: origin/main = 06831a2; Pages "built 06831a2"; az élő oldalon headless Chrome 155: APP_VER 26, ajánlat jött, gomb „📲 Telepítés most”, 0 telepíthetőségi hiba; SW v25; manifest related_applications él.
Kutatás (források: web.dev install-criteria, Google Play tanúsított eszközlista, blink-dev Web Install API):
- A tablet: PRITOM TAB 10 Lite (M10). A Pritom M10 több tucat változata a Google Play tanúsított listáján szerepel (köztük _US); a pontos „TAP_10_Lite” build név szerint nincs benne. A Chrome 155 frissessége is Play-t valószínűsít.
- Önmagát jóváhagyás nélkül telepítő gomb a Chrome biztonsági szabályai miatt nem lehetséges; a Chrome csak kb. 30 mp látott idő + 1 érintés után ad ajánlatot. A Web Install API Androidon nem érhető el.
MERT (bizonyitek/telepites_v26_2026-10-24.txt, bizonyitek/telepithetoseg_2026-10-24.txt):
- Az élő oldal a Chrome 155 szerint telepíthető (0 hiba, headless).
- A gomb visszaszámol („⏳ Előkészítés… N mp”), ajánlat érkezésekor magától „📲 Telepítés most”; 60 mp után menüs útmutató; „már telepítve” felismerés (manifest related_applications + getInstalledRelatedApps).
- teszt/telepites_teszt.mjs 40/40; Drive 17/17; headless Chrome 155-ben az ajánlat megjött, a gomb átváltott.
- Független ellenőr 1 valódi hibát talált (elutasítás után „Várok”-on ragadt), javítva.
ALLITOTT: Android Chrome-on a 30 mp-es út és a „már telepítve” felismerés nem mért.

## Mi nyitott
- 2026-10-13 -- Igazsagforras tisztazando (reszletek: BELSO.md).
- 2026-10-13 -- A seed tesztadatok a tortenetben maradnak; a tulajdonos szerint rendben. A tortenetet nem tisztitjuk (tulajdonosi dontes, 2026-10-13).

- 2026-10-16 -- Drive-mentés: OAuth kliensazonosító létrehozása (Google Cloud), beírása a drive-config.js-be, valódi próba a TAB 10 Lite-on.
- 2026-10-16 -- Kérdés: a leltár alap "próba kódjai" (K001–K003, 500 g) maradjanak-e friss telepítésnél.
- 2026-10-16 -- Igazságforrás: a Drive-mentés a GitHub index.html-re épült, a Drive-on lévő `index.v2.html`-lel nincs összefésülve.

## Kovetkezo lepes (terv)
- 1. a sorban: uj verzio (a tartalmat a tulajdonos donti el).
