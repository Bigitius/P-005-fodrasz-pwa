"""Márti fodrászata – APK építése Gradle nélkül (aapt2 + javac + d8 + zipalign + apksigner).

Futtatás:  python -X utf8 android/epit.py           -> marti-fodraszata.apk a repó gyökerében (élő változat;
                                                       innen a GitHub Pages letölthetővé teszi)
           python -X utf8 android/epit.py --proba   -> android/epites/proba.apk: a gép helyi szerverét
                                                       (http://localhost:8765/, adb reverse-szel) tölti be,
                                                       távoli hibakereséssel; csak teszthez, SOHA nem kerül a repóba.

Az aláírókulcs az android/kulcs/ mappában van (gitből kizárva). Ha elveszik, a tableten lévő appot
csak eltávolítás után lehet új kulccsal frissíteni -- ezért első létrehozás után mentsd el máshová is.
A jelszó fájlban van, a szkript soha nem írja ki.
"""
import os
import re
import secrets
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

VERZIO_KOD = 1          # minden új APK-nál növelni kell (az Android csak nagyobbra frissít)
VERZIO = "1.0"
ELO = {"sema": "https", "host": "bigitius.github.io", "utvonal": "/P-005-fodrasz-pwa/",
       "kezdo": "https://bigitius.github.io/P-005-fodrasz-pwa/"}
# próba: emulátorban "adb reverse tcp:8765 tcp:8765" mellett a gép helyi szerverét éri el; a localhost
# biztonságos környezet, így a service worker (offline működés) is kipróbálható
PROBA = {"sema": "http", "host": "localhost", "utvonal": "/",
         "kezdo": "http://localhost:8765/index.html"}

ITT = Path(__file__).resolve().parent
GYOKER = ITT.parent
SDK = Path(os.environ.get("ANDROID_HOME") or Path(os.environ["LOCALAPPDATA"]) / "Android" / "Sdk")
BT = SDK / "build-tools" / "34.0.0"
ANDROID_JAR = SDK / "platforms" / "android-34" / "android.jar"
JDK = Path(os.environ.get("JAVA_HOME") or Path(os.environ["LOCALAPPDATA"]) / "Programs" / "Microsoft" / "jdk-17.0.10.7-hotspot")
EPITES = ITT / "epites"
KULCS = ITT / "kulcs"
KS = KULCS / "marti.jks"
JELSZO = KULCS / "jelszo.txt"
KIMENET = GYOKER / "marti-fodraszata.apk"


def fut(*parancs):
    """Parancs futtatása; hiba esetén hangosan leáll."""
    kornyezet = dict(os.environ, JAVA_HOME=str(JDK))
    kornyezet["PATH"] = str(JDK / "bin") + os.pathsep + kornyezet.get("PATH", "")
    p = subprocess.run([str(x) for x in parancs], capture_output=True, text=True, encoding="utf-8",
                       errors="replace", env=kornyezet)
    if p.returncode != 0:
        print("HIBA a parancsban:", " ".join(str(x) for x in parancs[:3]), "...")
        print(p.stdout[-3000:], p.stderr[-3000:])
        sys.exit(1)
    return p.stdout


def ikon():
    """Adaptív ikon előtere: a meglévő ikon a biztonsági zóna közepén, átlátszó szegéllyel."""
    from PIL import Image
    src = Image.open(GYOKER / "icon-512.png").convert("RGBA")
    meret, belso = 432, 270                 # 108 dp-ből a 66 dp-s biztonsági zóna ~ 62%
    ki = Image.new("RGBA", (meret, meret), (0, 0, 0, 0))
    kicsi = src.resize((belso, belso), Image.LANCZOS)
    ki.paste(kicsi, ((meret - belso) // 2, (meret - belso) // 2))
    cel = ITT / "res" / "mipmap-xxxhdpi" / "ic_eloter.png"
    ki.save(cel)
    return cel


def kulcs():
    if KS.exists() and JELSZO.exists():
        return
    KULCS.mkdir(exist_ok=True)
    JELSZO.write_text(secrets.token_urlsafe(24), encoding="utf-8")
    fut(JDK / "bin" / "keytool.exe", "-genkeypair", "-keystore", KS, "-storepass:file", JELSZO,
        "-keypass:file", JELSZO, "-alias", "marti", "-keyalg", "RSA", "-keysize", "3072",
        "-validity", "10000", "-dname", "CN=Marti fodraszata, O=P-005, C=HU")
    print("Új aláírókulcs készült:", KS, "(mentsd el máshová is!)")


def main():
    for f in (BT / "aapt2.exe", ANDROID_JAR, JDK / "bin" / "javac.exe"):
        if not f.exists():
            sys.exit(f"HIBA: hiányzik: {f}")
    proba = "--proba" in sys.argv
    cel = PROBA if proba else ELO
    kimenet = EPITES / "proba.apk" if proba else KIMENET
    verzio = VERZIO + ("-proba" if proba else "")

    if EPITES.exists():
        shutil.rmtree(EPITES)
    (EPITES / "osztalyok").mkdir(parents=True)
    (EPITES / "gen").mkdir()
    ikon()
    kulcs()

    # 0. generált beállítások (BuildInfo.java) és manifest (próbánál titkosítatlan http engedélyezve)
    (EPITES / "gen" / "BuildInfo.java").write_text(
        "package io.github.bigitius.fodrasz;\n/** Generálta: android/epit.py -- ne szerkeszd kézzel. */\n"
        "final class BuildInfo {\n"
        f'    static final String VERZIO = "{verzio}";\n'
        f'    static final boolean PROBA = {"true" if proba else "false"};\n'
        f'    static final String KEZDO = "{cel["kezdo"]}";\n'
        f'    static final String SEMA = "{cel["sema"]}";\n'
        f'    static final String HOST = "{cel["host"]}";\n'
        f'    static final String UTVONAL = "{cel["utvonal"]}";\n'
        "}\n", encoding="utf-8")
    manifest = (ITT / "AndroidManifest.xml").read_text("utf-8")
    if proba:
        manifest = manifest.replace('android:allowBackup="false"',
                                    'android:allowBackup="false"\n        android:usesCleartextTraffic="true"')
        assert "usesCleartextTraffic" in manifest
    (EPITES / "AndroidManifest.xml").write_text(manifest, encoding="utf-8")

    # 1. erőforrások
    fut(BT / "aapt2.exe", "compile", "--dir", ITT / "res", "-o", EPITES / "res.zip")
    alap = EPITES / "alap.apk"
    fut(BT / "aapt2.exe", "link", "-o", alap, "-I", ANDROID_JAR, "--manifest", EPITES / "AndroidManifest.xml",
        "--min-sdk-version", "29", "--target-sdk-version", "34",
        "--version-code", str(VERZIO_KOD), "--version-name", verzio,
        # a próba külön csomagnév: tévedésből sem írhatja felül a tableten az éles appot
        *(["--rename-manifest-package", "io.github.bigitius.fodrasz.proba"] if proba else []),
        EPITES / "res.zip")

    # 2. Java -> .class -> classes.dex
    forrasok = [str(p) for p in (ITT / "src").rglob("*.java")] + [str(EPITES / "gen" / "BuildInfo.java")]
    fut(JDK / "bin" / "javac.exe", "-source", "8", "-target", "8", "-bootclasspath", ANDROID_JAR,
        "-Xlint:-options", "-encoding", "UTF-8", "-d", EPITES / "osztalyok", *forrasok)
    osztalyok = [str(p) for p in (EPITES / "osztalyok").rglob("*.class")]
    fut(BT / "d8.bat", "--release", "--min-api", "29", "--lib", ANDROID_JAR, "--output", EPITES, *osztalyok)

    # 3. dex hozzáadása, igazítás, aláírás
    with zipfile.ZipFile(alap, "a", zipfile.ZIP_DEFLATED) as z:
        z.write(EPITES / "classes.dex", "classes.dex")
    igazitott = EPITES / "igazitott.apk"
    fut(BT / "zipalign.exe", "-p", "-f", "4", alap, igazitott)
    fut(BT / "apksigner.bat", "sign", "--ks", KS, "--ks-pass", f"file:{JELSZO}",   # a kulcs jelszava ugyanaz (az apksigner ezt próbálja elsőként)
        "--ks-key-alias", "marti", "--v4-signing-enabled", "false", "--out", kimenet, igazitott)

    # 4. visszaellenőrzés
    print(fut(BT / "apksigner.bat", "verify", "--verbose", kimenet).strip())
    print(fut(BT / "aapt2.exe", "dump", "badging", kimenet).splitlines()[0])
    print("KÉSZ:", kimenet, kimenet.stat().st_size, "bájt, verzió", verzio, "kód", VERZIO_KOD, "| kezdőcím:", cel["kezdo"])


if __name__ == "__main__":
    main()
