// Teljesitmeny-meres a bongeszoben (kezzel betoltve, NEM resze az appnak).
// Kitalalt adattal (nevek: "Vendeg N") feltolti a tarolot, megmeri a fo rajzolasokat,
// majd VISSZAALLITJA az eredeti tarolot. Eredmeny: window.__meres
(function () {
  var KULCSOK = ['fodrasz_foglalasok_v1', 'fodrasz_vegyszerek_v1'];
  var mentett = {};
  KULCSOK.forEach(function (k) { mentett[k] = localStorage.getItem(k); });
  var drive = localStorage.getItem('fodrasz_drive_allapot_v1');
  try {
    var szolg = ['Vágás & Szárítás — Száraz hajvágás', 'Festés+Vágás — Rövid haj (50g)', 'Melír — Rövid haj', 'Férfi hajvágás — Egyméret'];
    var durs = [30, 90, 90, 15];
    var ma = new Date(); var bks = [];
    for (var i = 0; i < 2000; i++) {
      var d = new Date(ma.getFullYear(), ma.getMonth(), ma.getDate() - 180 + Math.floor(i / 6));
      var k = i % 4;
      var b = { date: fmtDate(d), time: fmtTime(9 * 60 + (i % 6) * 90), dur: durs[k], service: szolg[k], name: 'Vendeg ' + (i % 300), phone: '+36 00 000 ' + (1000 + i % 300), uid: 'm' + i };
      if (k === 1) { b.chemCode = 'K00' + (1 + i % 3); b.chemGram = 50; b.done = i % 2 === 0; }
      bks.push(b);
    }
    localStorage.setItem('fodrasz_foglalasok_v1', JSON.stringify(bks));
    function mer(nev, fn, n) {
      fn(); var t0 = performance.now(); for (var j = 0; j < n; j++) fn();
      return [nev, Math.round((performance.now() - t0) / n * 10) / 10];
    }
    foMainDate = new Date(); selDate = fmtDate(new Date()); bookingStep = 2;
    var body = document.getElementById('foglalasBody');
    window.__meres = [
      mer('loadBookings (2000 db)', function () { loadBookings(); }, 20),
      mer('renderFooldal', function () { renderFooldal(); }, 10),
      mer('renderStep2 (idopont-racs)', function () { renderStep2(body); }, 10),
      mer('renderNevjegyzek', function () { renderNevjegyzek(); }, 10),
      mer('renderLeltar', function () { renderLeltar(); }, 10)
    ].map(function (x) { return x[0] + ': ' + x[1] + ' ms'; });
  } finally {
    KULCSOK.forEach(function (k) { if (mentett[k] === null) localStorage.removeItem(k); else localStorage.setItem(k, mentett[k]); });
    if (drive === null) localStorage.removeItem('fodrasz_drive_allapot_v1'); else localStorage.setItem('fodrasz_drive_allapot_v1', drive);
    bookingStep = 1; selDate = null;
    renderFooldal(); renderNevjegyzek();
  }
})();
