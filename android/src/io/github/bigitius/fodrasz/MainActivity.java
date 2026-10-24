package io.github.bigitius.fodrasz;

import android.app.Activity;
import android.app.AlertDialog;
import android.widget.EditText;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.DialogInterface;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Márti fodrászata – Androidos keret (2026-10-24).
 * A webes appot (GitHub Pages) futtatja WebView-ban: saját ikon, böngészősáv nélkül.
 * - Mentés fájlba: a weboldal a window.MartiApp.mentes(név, tartalom) hídon át a Letöltések mappába ír.
 * - Visszatöltés fájlból: a weboldal <input type=file> mezője az Android fájlválasztóját nyitja.
 * - alert/confirm: a WebView saját párbeszédablakai (WebChromeClient beállítva).
 * - Más webcím (pl. külső link) a rendszer böngészőjében nyílik meg.
 */
public class MainActivity extends Activity {

    // a címeket az android/epit.py generálja (BuildInfo): élő = GitHub Pages, próba = a gép helyi szervere
    static final String KEZDO = BuildInfo.KEZDO;
    static final String CIM = "Márti fodrászata";
    static final int FAJLVALASZTO = 1;

    WebView web;
    ValueCallback<Uri[]> fajlVisszahivas;

    @Override
    protected void onCreate(Bundle mentettAllapot) {
        super.onCreate(mentettAllapot);
        // csak a próbaváltozatban: a gépről (adb) ellenőrizhető a weboldal belseje; élesben kikapcsolva
        if (BuildInfo.PROBA) WebView.setWebContentsDebuggingEnabled(true);
        web = new WebView(this);
        web.setBackgroundColor(0xFF0E0B16);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);              // localStorage: itt tárolódnak a foglalások
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);             // a fájlválasztó az URI-t közvetlenül adja át, ez nem kell
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setUserAgentString(s.getUserAgentString() + " MartiApp/" + BuildInfo.VERZIO);

        web.addJavascriptInterface(new Hid(), "MartiApp");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (sajat(u)) return false;
                // csak webcím, telefonszám és e-mail nyílhat külső appban (intent:, file: stb. nem)
                String s = u.getScheme();
                if (!"https".equals(s) && !"tel".equals(s) && !"mailto".equals(s)) return true;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (ActivityNotFoundException e) { /* nincs böngésző */ }
                return true;
            }

            @Override
            public void onReceivedError(WebView v, WebResourceRequest req, WebResourceError err) {
                if (!req.isForMainFrame()) return;
                // Hangos hiba: nincs net ÉS még nincs offline példány (első indítás).
                String html = "<html><body style='background:#0e0b16;color:#ece8f5;font-family:sans-serif;padding:40px'>"
                    + "<h2>Nem sikerült betölteni az alkalmazást</h2>"
                    + "<p>Az első indításhoz internet kell. Kapcsold be a Wi-Fi-t, majd érintsd meg:</p>"
                    + "<p><a style='color:#c084fc;font-size:22px' href='" + KEZDO + "'>Újrapróbálás</a></p>"
                    + "<p style='color:#9a8fb5'>Hiba: " + escape(String.valueOf(err.getDescription())) + "</p></body></html>";
                v.loadDataWithBaseURL(KEZDO, html, "text/html", "UTF-8", null);
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            // Saját párbeszédablakok: a fejlécben az app neve áll, nem a webcím.
            @Override
            public boolean onJsAlert(WebView v, String url, String uzenet, final JsResult r) {
                new AlertDialog.Builder(MainActivity.this).setTitle(CIM).setMessage(uzenet).setCancelable(false)
                    .setPositiveButton("OK", new DialogInterface.OnClickListener() { public void onClick(DialogInterface d, int w) { r.confirm(); } }).show();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView v, String url, String uzenet, final JsResult r) {
                new AlertDialog.Builder(MainActivity.this).setTitle(CIM).setMessage(uzenet).setCancelable(false)
                    .setPositiveButton("OK", new DialogInterface.OnClickListener() { public void onClick(DialogInterface d, int w) { r.confirm(); } })
                    .setNegativeButton("Mégse", new DialogInterface.OnClickListener() { public void onClick(DialogInterface d, int w) { r.cancel(); } }).show();
                return true;
            }

            @Override
            public boolean onJsPrompt(WebView v, String url, String uzenet, String alap, final JsPromptResult r) {
                final EditText mezo = new EditText(MainActivity.this);
                mezo.setText(alap == null ? "" : alap);
                mezo.setSelectAllOnFocus(true);
                new AlertDialog.Builder(MainActivity.this).setTitle(CIM).setMessage(uzenet).setView(mezo).setCancelable(false)
                    .setPositiveButton("OK", new DialogInterface.OnClickListener() { public void onClick(DialogInterface d, int w) { r.confirm(mezo.getText().toString()); } })
                    .setNegativeButton("Mégse", new DialogInterface.OnClickListener() { public void onClick(DialogInterface d, int w) { r.cancel(); } }).show();
                return true;
            }

            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> visszahivas, FileChooserParams p) {
                if (fajlVisszahivas != null) fajlVisszahivas.onReceiveValue(null);
                fajlVisszahivas = visszahivas;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(i, "Mentésfájl kiválasztása"), FAJLVALASZTO);
                } catch (ActivityNotFoundException e) {
                    fajlVisszahivas = null;
                    return false;
                }
                return true;
            }
        });

        // letöltést a keret nem kezel: a rendszer (böngésző) nyitja meg, ne vesszen el csendben
        web.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String ua, String disp, String mime, long hossz) {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (ActivityNotFoundException e) { /* nincs böngésző */ }
            }
        });

        if (mentettAllapot == null || web.restoreState(mentettAllapot) == null) web.loadUrl(KEZDO);
    }

    static boolean sajat(Uri u) {
        return u != null && BuildInfo.SEMA.equals(u.getScheme()) && BuildInfo.HOST.equals(u.getHost())
            && u.getPath() != null && u.getPath().startsWith(BuildInfo.UTVONAL);
    }

    static String escape(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("'", "&#39;");
    }

    @Override
    protected void onActivityResult(int kod, int eredmeny, Intent adat) {
        if (kod == FAJLVALASZTO && fajlVisszahivas != null) {
            Uri[] valasz = null;
            if (eredmeny == RESULT_OK && adat != null && adat.getData() != null) valasz = new Uri[]{adat.getData()};
            fajlVisszahivas.onReceiveValue(valasz);
            fajlVisszahivas = null;
            return;
        }
        super.onActivityResult(kod, eredmeny, adat);
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle ki) {
        super.onSaveInstanceState(ki);
        if (web != null) web.saveState(ki);
    }

    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
    }

    /** A weboldal által hívható híd: window.MartiApp.mentes(név, tartalom), window.MartiApp.verzio(). */
    class Hid {
        @JavascriptInterface
        public String verzio() { return BuildInfo.VERZIO; }

        /** Fájl írása a Letöltések mappába. Visszatérés: "ok:<név>" vagy "hiba:<ok>" (a weboldal hangosan jelzi). */
        @JavascriptInterface
        public String mentes(String nev, String tartalom) {
            try {
                if (nev == null || nev.isEmpty() || tartalom == null) return "hiba:üres név vagy tartalom";
                // csak a weboldal saját mentésfájl-neve és ésszerű méret (ne lehessen tetszőleges fájlt írni)
                if (!nev.matches("^Márti-foglalás-\\d{4}-\\d{2}-\\d{2}-\\d{4}\\.json$")) return "hiba:nem megengedett fájlnév: " + nev;
                if (tartalom.length() > 20_000_000) return "hiba:túl nagy mentés (" + tartalom.length() + " karakter)";
                ContentResolver cr = getContentResolver();
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.MediaColumns.DISPLAY_NAME, nev);
                cv.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
                cv.put(MediaStore.MediaColumns.IS_PENDING, 1);
                Uri uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                if (uri == null) return "hiba:nem jött létre a fájl";
                try (OutputStream ki = cr.openOutputStream(uri)) {
                    if (ki == null) return "hiba:nem nyitható meg írásra";
                    ki.write(tartalom.getBytes(StandardCharsets.UTF_8));
                }
                ContentValues kesz = new ContentValues();
                kesz.put(MediaStore.MediaColumns.IS_PENDING, 0);
                cr.update(uri, kesz, null, null);
                return "ok:" + nev;
            } catch (Exception e) {
                return "hiba:" + e;
            }
        }
    }
}
