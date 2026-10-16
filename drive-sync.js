// Google Drive szinkron + visszatoltes a Marti fodraszata alkalmazashoz.
// Nincs benne DOM es nincs benne bejelentkezesi ablak: minden kulso dolgot
// (fetch, token, tarolo, ora) kivulrol kap, ezert Node-ban mock-Drive-val tesztelheto.
// Hatokor: drive.file -- az app CSAK a sajat maga letrehozta fajlokhoz fer hozza.
// Drive-on: "Fodrasz-adatok" mappa; benne fodrasz-adatok.json (mindig a legfrissebb)
// es fodrasz-mentes-YYYY-MM-DD.json (naponta egy elozo allapot-masolat, legfeljebb 10).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DriveSync = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MAPPA = 'Fodrasz-adatok';
  var FO_FAJL = 'fodrasz-adatok.json';
  var NAPI_ELO = 'fodrasz-mentes-';
  var MAX_NAPI = 10;
  var API = 'https://www.googleapis.com/drive/v3/files';
  var FELTOLT = 'https://www.googleapis.com/upload/drive/v3/files';
  var ALLAPOT_KULCS = 'fodrasz_drive_allapot_v1';
  var BIZTONSAGI_KULCS = 'fodrasz_elotte_visszatoltes';

  function create(opt) {
    var fetchFn = opt.fetch;
    var auth = opt.auth;            // { getToken(interactive) -> Promise<string|null> }
    var storage = opt.storage;      // localStorage-szeru
    var getData = opt.getData;      // -> { bookings:[], chemicals:[] }
    var onStatus = opt.onStatus || function () {};
    var now = opt.now || function () { return new Date(); };
    var isOnline = opt.isOnline || function () { return true; };
    var setTimer = opt.setTimer || setTimeout;
    var clearTimer = opt.clearTimer || clearTimeout;
    var debounceMs = opt.debounceMs == null ? 5000 : opt.debounceMs;
    var tiltva = opt.tiltva || function () { return null; };   // -> ok-szoveg, ha a feltoltes tilos

    var st = betolt();
    var verzio = 0;       // markDirty szamlalo
    var foglalt = false;
    var ujra = false;
    var timer = null;

    function betolt() {
      var s = {};
      try { s = JSON.parse(storage.getItem(ALLAPOT_KULCS) || '{}') || {}; } catch (e) { s = {}; }
      if (!s.deviceId) s.deviceId = 'eszk-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      return s;
    }
    function ment() {
      try { storage.setItem(ALLAPOT_KULCS, JSON.stringify(st)); }
      catch (e) { jelez('hiba', 'A helyi allapot nem menthető: ' + e.message); }
    }
    function jelez(kind, text, extra) {
      var o = { kind: kind, text: text, dirty: !!st.dirty, lastSavedAt: st.lastSavedAt || null, dirtySince: st.dirtySince || null };
      if (extra) for (var k in extra) o[k] = extra[k];
      st.status = kind;
      onStatus(o);
    }
    function p2(n) { n = String(n); return n.length < 2 ? '0' + n : n; }
    function napStr(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
    function idoStr(d) { return napStr(d) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()); }

    function hiba(res, mit) {
      var e = new Error(mit + ': HTTP ' + res.status);
      e.status = res.status;
      return e;
    }
    async function api(token, url, init, mit) {
      init = init || {};
      init.headers = Object.assign({ Authorization: 'Bearer ' + token }, init.headers || {});
      var res = await fetchFn(url, init);
      if (!res.ok) throw hiba(res, mit);
      return res;
    }
    function q(s) { return encodeURIComponent(s); }
    function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

    async function listaz(token, kerdes) {
      var url = API + '?q=' + q(kerdes) + '&fields=' + q('files(id,name,modifiedTime,appProperties)') + '&pageSize=100&spaces=drive';
      var r = await api(token, url, {}, 'Drive lista');
      return (await r.json()).files || [];
    }
    async function mappa(token, letrehoz) {
      var l = await listaz(token, "name='" + MAPPA + "' and mimeType='application/vnd.google-apps.folder' and trashed=false");
      if (l.length) return l[0].id;
      if (!letrehoz) return null;
      var r = await api(token, API + '?fields=id', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: MAPPA, mimeType: 'application/vnd.google-apps.folder' })
      }, 'Mappa letrehozas');
      return (await r.json()).id;
    }
    function multipart(meta, tartalom) {
      var h = 'fodraszhatar' + Math.random().toString(36).slice(2);
      var body = '--' + h + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) +
        '\r\n--' + h + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + tartalom + '\r\n--' + h + '--';
      return { body: body, type: 'multipart/related; boundary=' + h };
    }
    async function letolt(token, id) {
      var r = await api(token, API + '/' + id + '?alt=media', {}, 'Letoltes');
      return await r.text();
    }

    function csomag() {
      var d = getData();
      return {
        app: 'Márti fodrászata', formatum: 1, savedAt: idoStr(now()), deviceId: st.deviceId,
        bookings: d.bookings, chemicals: d.chemicals
      };
    }
    function ervenyes(data) {
      return data && Array.isArray(data.bookings) && (data.chemicals == null || Array.isArray(data.chemicals));
    }

    async function tokenKer(interactive) {
      var t = null;
      try { t = await auth.getToken(!!interactive); } catch (e) { t = null; }
      return t;
    }

    // ---- feltoltes ----
    async function szinkron(opts) {
      opts = opts || {};
      if (foglalt) { ujra = true; return; }
      // a helyi adat serult: feltolteni tilos (a Drive-on levo jo mentest irnank felul)
      var tilt = tiltva();
      if (tilt) { jelez('hiba', 'Drive: mentés szünetel — ' + tilt); return; }
      if (!st.dirty && !opts.kenyszer) { jelez(st.lastSavedAt ? 'mentve' : 'ures', st.lastSavedAt ? 'Drive: mentve ' + st.lastSavedAt : 'Drive: még nincs mentés'); return; }
      if (!isOnline()) { jelez('offline', 'Drive: nincs net, mentésre vár'); return; }
      foglalt = true;
      var induloVerzio = verzio;
      try {
        jelez('dolgozik', 'Drive: mentés…');
        var token = await tokenKer(!!opts.interaktiv);
        if (!token) { jelez('belepes', 'Drive: be kell jelentkezni'); return; }

        var mappaId = await mappa(token, true);
        var fajlok = await listaz(token, "name='" + FO_FAJL + "' and '" + esc(mappaId) + "' in parents and trashed=false");
        var fo = fajlok[0] || null;

        if (fo && !opts.felulir && fo.modifiedTime !== st.lastSyncedModified) {
          jelez('konfliktus', 'Drive: a Drive-on más (újabb vagy ismeretlen) mentés van — nem írtam felül',
            { driveModified: fo.modifiedTime });
          return;
        }

        if (fo) {
          await napiMasolat(token, fo, mappaId);
          // kifejezett felulirasnal (ütközés-döntés, régi másolat visszatöltése) a Drive-on lévő
          // legfrissebb állapot külön, egyedi nevű másolatba megy, hogy semmi ne vesszen el
          if (opts.felulir || st.eloMasolat) {
            var d0 = now();
            await api(token, API + '/' + fo.id + '/copy?fields=id', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: NAPI_ELO + napStr(d0) + '-felulirva-' + p2(d0.getHours()) + p2(d0.getMinutes()) + p2(d0.getSeconds()) + '.json', parents: [mappaId] })
            }, 'Felulirasi masolat');
          }
        }

        var tartalom = JSON.stringify(csomag());
        var meta = { name: FO_FAJL, mimeType: 'application/json', appProperties: { deviceId: st.deviceId } };
        var res;
        if (fo) {
          var mp = multipart(meta, tartalom);
          res = await api(token, FELTOLT + '/' + fo.id + '?uploadType=multipart&fields=id,modifiedTime',
            { method: 'PATCH', headers: { 'Content-Type': mp.type }, body: mp.body }, 'Feltoltes');
        } else {
          meta.parents = [mappaId];
          var mp2 = multipart(meta, tartalom);
          res = await api(token, FELTOLT + '?uploadType=multipart&fields=id,modifiedTime',
            { method: 'POST', headers: { 'Content-Type': mp2.type }, body: mp2.body }, 'Feltoltes');
        }
        var kesz = await res.json();

        // visszaolvasas: csak akkor "mentve", ha a Drive-on pont az van, amit kuldtunk
        var vissza = await letolt(token, kesz.id);
        if (vissza !== tartalom) throw new Error('Visszaolvasás eltér: a Drive-on lévő fájl nem egyezik a küldöttel');

        st.lastSyncedModified = kesz.modifiedTime; st.eloMasolat = false;
        st.lastSavedAt = idoStr(now());
        if (verzio === induloVerzio) { st.dirty = false; st.dirtySince = null; }
        ment();
        jelez(st.dirty ? 'offline' : 'mentve', st.dirty ? 'Drive: újabb módosítás vár' : 'Drive: mentve ' + st.lastSavedAt);
      } catch (e) {
        if (e.status === 401) {
          try { auth.invalidate && auth.invalidate(); } catch (x) {}
          jelez('belepes', 'Drive: be kell jelentkezni újra');
        } else {
          jelez('hiba', 'Drive HIBA: ' + e.message, { hiba: e.message });
        }
      } finally {
        foglalt = false;
        if (ujra) { ujra = false; if (st.dirty && st.status !== 'hiba' && st.status !== 'konfliktus' && st.status !== 'belepes') idozit(0); }
      }
    }

    async function napiMasolat(token, fo, mappaId) {
      var nap = napStr(new Date(fo.modifiedTime));
      var nev = NAPI_ELO + nap + '.json';
      var van = await listaz(token, "name='" + nev + "' and '" + esc(mappaId) + "' in parents and trashed=false");
      if (!van.length) {
        await api(token, API + '/' + fo.id + '/copy?fields=id', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: nev, parents: [mappaId] })
        }, 'Napi masolat');
      }
      var mind = (await listaz(token, "'" + esc(mappaId) + "' in parents and trashed=false")).filter(function (x) { return x.name.indexOf(NAPI_ELO) === 0; });
      mind.sort(function (a, b) { return a.name < b.name ? 1 : -1; });
      for (var i = MAX_NAPI; i < mind.length; i++) {
        // kukaba, nem vegleges torles
        await api(token, API + '/' + mind[i].id, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true })
        }, 'Regi masolat kukaba');
      }
    }

    function idozit(ms) {
      if (timer) clearTimer(timer);
      timer = setTimer(function () { timer = null; szinkron(); }, ms == null ? debounceMs : ms);
    }

    // ---- visszatoltes ----
    async function lista() {
      var token = await tokenKer(true);
      if (!token) throw new Error('Nincs bejelentkezve');
      var mappaId = await mappa(token, false);
      if (!mappaId) return [];
      var f = await listaz(token, "'" + esc(mappaId) + "' in parents and trashed=false");
      var ki = [];
      f.forEach(function (x) {
        if (x.name === FO_FAJL) ki.push({ id: x.id, name: x.name, modifiedTime: x.modifiedTime, fo: true, cimke: 'Legutóbbi mentés (' + idoStr(new Date(x.modifiedTime)) + ')' });
        else if (x.name.indexOf(NAPI_ELO) === 0) ki.push({ id: x.id, name: x.name, modifiedTime: x.modifiedTime, fo: false, cimke: 'Napi másolat: ' + x.name.slice(NAPI_ELO.length, -5) });
      });
      ki.sort(function (a, b) { return a.fo ? -1 : b.fo ? 1 : (a.name < b.name ? 1 : -1); });
      return ki;
    }
    // elonezet: letolti es ellenorzi, de a helyi adathoz nem nyul
    async function elonezet(id) {
      var token = await tokenKer(true);
      if (!token) throw new Error('Nincs bejelentkezve');
      var data = JSON.parse(await letolt(token, id));
      if (!ervenyes(data)) throw new Error('A Drive-fájl formátuma hibás');
      return data;
    }
    // vegrehajtas: a hivo (UI) az alkalmaz(data) fuggvenyben irja be a helyi adatot
    async function visszatolt(elem, data, alkalmaz) {
      if (!ervenyes(data)) throw new Error('Hibás adat, nem töltöm vissza');
      try { // biztonsagi masolat a jelenlegi helyi allapotrol
        storage.setItem(BIZTONSAGI_KULCS, JSON.stringify({ mikor: idoStr(now()), adat: getData() }));
      } catch (e) { throw new Error('A helyi biztonsági másolat nem sikerült, nem töltöm vissza: ' + e.message); }
      alkalmaz(data);
      st.lastSyncedModified = elem.fo ? elem.modifiedTime : st.lastSyncedModified;
      st.eloMasolat = !elem.fo; st.dirty = !elem.fo; st.dirtySince = st.dirty ? (st.dirtySince || now().toISOString()) : null;      // regebbi napi masolat -> az is felulirja a legfrissebbet
      if (!elem.fo) {           // ezt a felhasznalo kifejezetten kerte, nem konfliktus
        var token = await tokenKer(false);
        if (token) {
          var mappaId = await mappa(token, false);
          var fo = (await listaz(token, "name='" + FO_FAJL + "' and '" + esc(mappaId) + "' in parents and trashed=false"))[0];
          if (fo) st.lastSyncedModified = fo.modifiedTime;
        }
      }
      ment();
      if (st.dirty) { verzio++; idozit(0); } else jelez('mentve', 'Drive: visszatöltve ' + idoStr(now()));
    }

    // ---- kifele ----
    return {
      markDirty: function () {
        st.dirty = true; if (!st.dirtySince) st.dirtySince = now().toISOString(); verzio++; ment();
        if (st.status === 'konfliktus' || st.status === 'belepes' || st.status === 'hiba') { jelez(st.status, st.status === 'konfliktus' ? 'Drive: ütközés — döntésre vár' : st.status === 'belepes' ? 'Drive: be kell jelentkezni' : 'Drive: hiba — újrapróbálom'); }
        if (st.status === 'hiba') idozit(); else if (st.status !== 'konfliktus' && st.status !== 'belepes') idozit();
      },
      szinkron: szinkron,
      kezdes: function () { if (st.dirty) idozit(0); else jelez(st.lastSavedAt ? 'mentve' : 'ures', st.lastSavedAt ? 'Drive: mentve ' + st.lastSavedAt : 'Drive: még nincs mentés'); },
      lista: lista,
      elonezet: elonezet,
      visszatolt: visszatolt,
      allapot: function () { return JSON.parse(JSON.stringify(st)); },
      BIZTONSAGI_KULCS: BIZTONSAGI_KULCS
    };
  }

  return { create: create, MAPPA: MAPPA, FO_FAJL: FO_FAJL, MAX_NAPI: MAX_NAPI };
});
