# ALLAPOT -- P-005-fodrasz-pwa
Utolso frissites: 2026-10-16

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
- Optimalizálás (számolások összevonása, nagyobb gombok, halott kód, kevesebb Drive-kérés) NINCS elvégezve — külön jóváhagyásra vár.
- Ritka eset: ha a Drive-visszatöltéskor a sérült helyi adat félretétele korábban nem sikerült, a sérült nyers tartalom a Drive-ág biztonsági másolatába nem kerül be.

## Mi nyitott
- 2026-10-13 -- Igazsagforras tisztazando (reszletek: BELSO.md).
- 2026-10-13 -- A seed tesztadatok a tortenetben maradnak; a tulajdonos szerint rendben. A tortenetet nem tisztitjuk (tulajdonosi dontes, 2026-10-13).

- 2026-10-16 -- Drive-mentés: OAuth kliensazonosító létrehozása (Google Cloud), beírása a drive-config.js-be, valódi próba a TAB 10 Lite-on.
- 2026-10-16 -- Döntés kell: maradjon-e a friss telepítéskori mintaadat (Teszt 15p + 5 kitalált névjegy).
- 2026-10-16 -- Optimalizálás (audit-terv C pontja) jóváhagyásra vár.
- 2026-10-16 -- Commit: a Drive-mentés, a leltár szerkesztés/törlés és a hibajavítás commitolatlan.
- 2026-10-16 -- Igazságforrás: a Drive-mentés a GitHub index.html-re épült, a Drive-on lévő `index.v2.html`-lel nincs összefésülve.

## Kovetkezo lepes (terv)
- 1. a sorban: uj verzio (a tartalmat a tulajdonos donti el).
