// Drive-mentes felulet + bekotes az index.html-hez. Az index.html fo szkriptje UTAN toltodik be.
// Tablet-mode-ban (file://) nem fut: Google-bejelentkezes csak http(s) cimrol mukodik.
(function () {
  'use strict';
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;

  var badge = document.getElementById('driveBadge');
  if (!badge) return;
  var CLIENT_ID = (window.DRIVE_CLIENT_ID || '').trim();
  var SCOPE = 'https://www.googleapis.com/auth/drive.file';
  var BELEPVE_KULCS = 'fodrasz_drive_belepve';

  // ---- stilus ----
  var css = document.createElement('style');
  css.textContent =
    '#driveBadge{min-height:44px;padding:8px 14px;border-radius:12px;border:1px solid var(--line);background:var(--panel2);color:var(--txt);font-size:14px;cursor:pointer;white-space:nowrap}' +
    '#driveBadge.ok{border-color:var(--ok)} #driveBadge.warn{border-color:var(--warn)} #driveBadge.bad{border-color:var(--bad);color:var(--bad)}' +
    '#driveMask{position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;z-index:9999;padding:16px}' +
    '#driveMask.show{display:flex}' +
    '#drivePanel{background:var(--panel);border:1px solid var(--line);border-radius:16px;max-width:520px;width:100%;max-height:90vh;overflow:auto;padding:18px;color:var(--txt)}' +
    '#drivePanel h3{margin:0 0 6px;font-size:18px} #drivePanel .st{margin:6px 0 14px;font-size:15px}' +
    '#drivePanel button{display:block;width:100%;min-height:48px;margin:8px 0;padding:10px 14px;border-radius:12px;border:1px solid var(--line);background:var(--panel2);color:var(--txt);font-size:15px;text-align:left;cursor:pointer}' +
    '#drivePanel button.fo{background:var(--purple2);border-color:var(--purple)} #drivePanel button.veszely{border-color:var(--bad)}' +
    '#drivePanel .lst{margin-top:8px;border-top:1px solid var(--line);padding-top:8px} #drivePanel .kis{font-size:13px;color:var(--muted)}';
  document.head.appendChild(css);

  var mask = document.createElement('div');
  mask.id = 'driveMask';
  mask.innerHTML = '<div id="drivePanel" role="dialog" aria-label="Drive mentés"></div>';
  document.body.appendChild(mask);
  var panel = mask.firstChild;
  mask.addEventListener('click', function (e) { if (e.target === mask) mask.classList.remove('show'); });

  var utolso = { kind: 'ures', text: 'Drive: még nincs mentés' };
  function frissitBadge(s) {
    utolso = s;
    var szoveg = s.text, osztaly = 'warn';
    if (s.kind === 'mentve') osztaly = 'ok';
    if (s.kind === 'hiba' || s.kind === 'konfliktus' || s.kind === 'belepes') osztaly = 'bad';
    if (s.dirty && s.dirtySince) {
      var napok = Math.floor((Date.now() - new Date(s.dirtySince).getTime()) / 86400000);
      if (napok >= 1) { szoveg += ' — ' + napok + ' napja nincs lementve!'; osztaly = 'bad'; }
    }
    badge.className = osztaly;
    badge.textContent = '☁ ' + szoveg;
    if (mask.classList.contains('show')) rajzolPanel();
  }

  // ---- Google bejelentkezes (GIS token modell) ----
  var token = null, lejar = 0, kliens = null, varakozo = null;
  function gisBetolt() {
    return new Promise(function (ok, nem) {
      if (window.google && google.accounts && google.accounts.oauth2) return ok();
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = function () { ok(); }; s.onerror = function () { nem(new Error('A Google bejelentkezés nem tölthető be (nincs net?)')); };
      document.head.appendChild(s);
    });
  }
  var auth = {
    invalidate: function () { token = null; lejar = 0; },
    getToken: async function (interaktiv) {
      if (token && Date.now() < lejar - 60000) return token;
      var voltBelepve = false;
      try { voltBelepve = localStorage.getItem(BELEPVE_KULCS) === '1'; } catch (e) {}
      if (!interaktiv && !voltBelepve) return null;   // elso belepes csak kattintasra
      await gisBetolt();
      if (!kliens) {
        kliens = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID, scope: SCOPE,
          callback: function (r) { var v = varakozo; varakozo = null; if (v) v(r && r.access_token ? r : null); },
          error_callback: function () { var v = varakozo; varakozo = null; if (v) v(null); }
        });
      }
      var r = await new Promise(function (ok) {
        varakozo = ok;
        setTimeout(function () { if (varakozo === ok) { varakozo = null; ok(null); } }, interaktiv ? 120000 : 8000);
        kliens.requestAccessToken({ prompt: interaktiv && !voltBelepve ? 'consent' : '' });
      });
      if (!r) return null;
      token = r.access_token; lejar = Date.now() + (parseInt(r.expires_in, 10) || 3600) * 1000;
      try { localStorage.setItem(BELEPVE_KULCS, '1'); } catch (e) {}
      return token;
    }
  };

  // ---- szinkron-motor ----
  var ds = null;
  if (CLIENT_ID) {
    ds = DriveSync.create({
      fetch: function (u, i) { return window.fetch(u, i); }, auth: auth, storage: localStorage,
      getData: function () { return { bookings: loadBookings(), chemicals: CHEMICALS }; },
      onStatus: frissitBadge, isOnline: function () { return navigator.onLine; },
      tiltva: function () { return (window.adathibaVan && adathibaVan()) ? 'a tableten lévő adat sérült, előbb tölts vissza mentésből' : null; },
      setTimer: function (f, ms) { return setTimeout(f, ms); }, clearTimer: function (t) { clearTimeout(t); }
    });
    // az index.html mentő függvényei: minden mentés után jelezzük a Drive-nak
    var eredetiBookings = window.saveBookings, eredetiChem = window.saveChemicals;
    window.saveBookings = function (a) { var r = eredetiBookings(a); ds.markDirty(); return r; };
    window.saveChemicals = function () { var r = eredetiChem(); ds.markDirty(); return r; };
    window.addEventListener('online', function () { ds.szinkron(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) ds.szinkron(); });
    setInterval(function () { ds.szinkron(); }, 5 * 60 * 1000);
    ds.kezdes();
  } else {
    frissitBadge({ kind: 'hiba', text: 'Drive: nincs beállítva (hiányzik a kliensazonosító)', dirty: false });
  }

  // ---- panel ----
  function gomb(felirat, osztaly, fn) {
    var b = document.createElement('button'); b.textContent = felirat; if (osztaly) b.className = osztaly;
    b.onclick = fn; panel.appendChild(b); return b;
  }
  function szoveg(tag, t, osztaly) { var e = document.createElement(tag); e.textContent = t; if (osztaly) e.className = osztaly; panel.appendChild(e); return e; }
  function hibaToast(e) { toast('Drive hiba: ' + (e && e.message ? e.message : e)); }

  function rajzolPanel() {
    panel.innerHTML = '';
    szoveg('h3', '☁ Mentés Google Drive-ra');
    szoveg('div', utolso.text, 'st');
    if (!ds) { szoveg('div', 'A kliensazonosító nincs megadva (drive-config.js), ezért a Drive-mentés ki van kapcsolva. Az adatok a tableten maradnak.', 'kis'); gomb('Bezár', '', zar); return; }
    gomb('Bejelentkezés Google-lal / újra', utolso.kind === 'belepes' ? 'fo' : '', function () {
      ds.szinkron({ kenyszer: true, interaktiv: true });
    });
    gomb('Mentés most', utolso.kind === 'konfliktus' ? '' : 'fo', function () { ds.szinkron({ kenyszer: true, interaktiv: true }); });
    if (utolso.kind === 'konfliktus') {
      szoveg('div', 'A Drive-on más mentés van, mint amit ez a tablet utoljára látott. Döntsd el, melyik az igaz:', 'kis');
      gomb('A Drive-on lévő a jó → visszatöltés', 'fo', visszatoltLista);
      gomb('Ennek a tabletnek az adata a jó → Drive felülírása', 'veszely', function () {
        if (confirm('A Drive-on lévő mentés ELŐZŐ NAPI MÁSOLATBAN megmarad, de a legfrissebb mentés felülíródik ennek a tabletnek az adatával. Biztos?'))
          ds.szinkron({ kenyszer: true, interaktiv: true, felulir: true });
      });
    } else {
      gomb('Visszatöltés Drive-ról…', '', visszatoltLista);
    }
    gomb('Bezár', '', zar);
  }
  function zar() { mask.classList.remove('show'); }

  async function visszatoltLista() {
    var lst = document.createElement('div'); lst.className = 'lst'; panel.appendChild(lst);
    lst.textContent = 'Betöltés…';
    try {
      var l = await ds.lista();
      lst.innerHTML = '';
      if (!l.length) { lst.textContent = 'A Drive-on még nincs mentés.'; return; }
      l.forEach(function (elem) {
        var b = document.createElement('button'); b.textContent = elem.cimke;
        b.onclick = function () { visszatoltEgyet(elem); };
        lst.appendChild(b);
      });
    } catch (e) { lst.textContent = 'Hiba: ' + e.message; hibaToast(e); }
  }
  async function visszatoltEgyet(elem) {
    try {
      var data = await ds.elonezet(elem.id);
      var sor = elem.cimke + '\nMentve: ' + (data.savedAt || '?') + '\nFoglalás: ' + data.bookings.length + ', anyag: ' + (data.chemicals ? data.chemicals.length : 0) +
        '\n\nJelenleg a tableten: ' + loadBookings().length + ' foglalás, ' + CHEMICALS.length + ' anyag.' +
        '\n\nA mostani tableten lévő adatról biztonsági másolat készül. Visszatöltöd?';
      if (!confirm(sor)) return;
      await ds.visszatolt(elem, data, function (d) {
        // vagy minden átíródik, vagy semmi (index.html adatCsere); az eredeti mentők nem
        // jelölnek piszkosnak, azt a motor maga kezeli
        if (!adatCsere(d.bookings, Array.isArray(d.chemicals) ? d.chemicals : null, eredetiBookings, eredetiChem))
          throw new Error('A visszatöltött adat mentése a tabletre nem sikerült, a korábbi állapot maradt');
        renderFooldal(); renderNevjegyzek(); refreshStep2(); renderLeltar();
      });
      toast('Visszatöltve: ' + data.bookings.length + ' foglalás');
      rajzolPanel();
    } catch (e) { hibaToast(e); }
  }

  badge.onclick = function () { rajzolPanel(); mask.classList.add('show'); };
})();
