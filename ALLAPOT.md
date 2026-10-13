# ALLAPOT -- P-005-fodrasz-pwa
Utolso frissites: 2026-10-13 (atvetel a C:\Code ala; a tartalom a repo fajljaibol es meresekbol)

## Hol tartunk
MERT (2026-10-13):
- Repo klonozva: Bigitius/P-005-fodrasz-pwa, ag: main, 27 commit (2026-07-18-tol). `gh repo view` -> PUBLIC (nyilvanos, tesztelesre).
- Fajlok: index.html (az alkalmazas), manifest.json, service-worker.js, TELEPITES.md, .nojekyll, 3 ikon. Nincs .gitignore.
- Utolso commit: d2acad3 (2026-10-09): tablet-mode, v25 (Mentes/Visszatoltes gomb elrejtve tablet-modban). A service-worker.js cache-neve `fodrasz-foglalo-v17` (az index.html verzioszamatol, v25, elter -- jelzes, nem vizsgaltam).
- Biztonsagi atvizsgalas (bigi-keret:biztonsagi + a teljes commit-tortenet git log -G ellenorzese, 2026-10-13): nyilvanos, tesztelesre; atvizsgalva 2026-10-13. Nincs e-mail-cim, API-kulcs, jelszo, token, torolt fajl a tortenetben (27 commit, egy ag). Egyetlen lelet: index.html seedContacts/seedDemo (1932-1945. sor) -- 5 nev + telefonszam + "Teszt 15p" -- TESZTADATOK, Istvan megerositette 2026-10-13; a repo maradhat nyilvanos.
- Nem vizsgalt: az index.html 396. sorabeli beagyazott logo tartalma, az ikonok, a tavoli GitHub-oldal (Pages, PR-ok).

ALLITOTT (nem mertem):
- Hogy az alkalmazas jelenleg hasznalatban van-e (Marti iPadje / Huawei tablet): ismeretlen.
- A TELEPITES.md szerint a Huawei MediaPad T3-on a service worker nem volt megbizhato (v15-v19 kiserlet utan), helyi fajlkent (file://) valo hasznalat a megoldas (Istvan dontese 2026-09-06). Nem probaltam ki.

## Tablet-telepitocsomag a Drive-on (tervezo merese, 2026-10-13 -- csak tenyrogzites, a Drive-hoz nem nyultam)
- Harom masolat van: `P-005-tablet` (2026-08-21-i fajlok); `P-005-tablet\Fodrasz-tablet-telepites` (2026-09-06); `Fodrasz-tablet-telepites` (2026-09-06 + egy `index.v2.html`, 2026-10-09).
- Melyik az igazsagforras (GitHub vagy a Drive v2), azt a P-005 kovetkezo megbizasa donti el.

## Mi nyitott (datummal)
- 2026-10-13 -- Igazsagforras: GitHub index.html (v25, 2026-10-09) vs. Drive `index.v2.html` (2026-10-09).
- 2026-10-13 -- Nyilvanos repo: a seed tesztadatok (nevek, szamok) a tortenetben maradnak; Istvan szerint rendben.

## Kovetkezo lepes (terv)
- 1. a sorban: uj verzio (Istvan donti el a tartalmat). Elotte az igazsagforras tisztazasa.
