# ALLAPOT -- P-005-fodrasz-pwa
Utolso frissites: 2026-10-13

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

## Mi nyitott
- 2026-10-13 -- Igazsagforras tisztazando (reszletek: BELSO.md).
- 2026-10-13 -- A seed tesztadatok a tortenetben maradnak; a tulajdonos szerint rendben.

## Kovetkezo lepes (terv)
- 1. a sorban: uj verzio (a tartalmat a tulajdonos donti el).
