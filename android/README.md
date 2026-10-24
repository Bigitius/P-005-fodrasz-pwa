# Androidos keret (APK)

A `marti-fodraszata.apk` egy vékony Android-alkalmazás, ami a webes appot
(`https://bigitius.github.io/P-005-fodrasz-pwa/`) futtatja WebView-ban: saját ikon,
böngészősáv nélkül. A tartalom a weboldalról jön, ezért a webes frissítésekhez
nem kell új APK.

## Mit tud a keret
- Mentés fájlba: `window.MartiApp.mentes(név, tartalom)` -> Letöltések mappa (MediaStore).
- Visszatöltés: a weboldal `<input type=file>` mezője az Android fájlválasztóját nyitja.
- alert / confirm / prompt: saját ablak, fejlécben „Márti fodrászata”.
- A weboldal a böngésző-azonosítóban a `MartiApp/<verzió>` jelből ismeri fel (app-mode).
- Más webcím a rendszer böngészőjében nyílik meg.
- A Google-belépés WebView-ban tiltott, ezért az appban a Drive-mentés ki van kapcsolva.

## Építés (Gradle nélkül)
Kell: JDK 17, Android SDK `platforms;android-34`, `build-tools;34.0.0`, Pillow.

    python -X utf8 android/epit.py            # éles: marti-fodraszata.apk a repó gyökerében
    python -X utf8 android/epit.py --proba    # próba: android/epites/proba.apk (localhost:8765, hibakeresés)

Új APK-nál az `epit.py` `VERZIO_KOD` értékét növelni kell.

## Aláírókulcs
`android/kulcs/` (gitből kizárva). Ha elveszik, a tableten lévő alkalmazás csak
eltávolítás (és így adatvesztés) után cserélhető új kulccsal aláírtra – ezért
tartsd biztonsági másolatban, a repón kívül.

## Próba
- `node teszt/android_emulator_proba.mjs` – futó emulátoron a próba-APK-val
  (adb reverse tcp:8765 tcp:8765; helyi szerver a repó gyökeréből a 8765-ös porton, pl.
  `python -m http.server 8765 --bind 127.0.0.1`).
