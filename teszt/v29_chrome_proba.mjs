// v29 végigpróba valódi, ablak nélküli (headless) Chrome-ban: munkaidő, foglalás a Főoldalról, percre pontos kezdés,
// próbaadat-tisztítás, Kártyák fül, több anyag, levonás, mentés, fix felső keret.
// Saját, eldobható böngészőprofillal fut, a valódi adatokhoz nem nyúl. Az alert/confirm le van cserélve;
// ablakot nem nyit (--headless=new). Előfeltétel: helyi szerver a 8765-ös porton.
// Futtatás: node teszt/v29_chrome_proba.mjs
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_ = 'http://localhost:8765/index.html';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9336;
const profil = mkdtempSync(join(tmpdir(), 'pwa-v29-'));
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profil}`,
  '--no-first-run', '--no-default-browser-check', '--window-size=1280,800', 'about:blank'], { stdio: 'ignore' });
const var_ = (ms) => new Promise((r) => setTimeout(r, ms));

let jo = 0, rossz = 0;
function e(nev, f, reszlet = '') {
  if (f) { jo++; console.log('OK   ' + nev); } else { rossz++; console.log('HIBA ' + nev + '  -> ' + JSON.stringify(reszlet)); }
}

let ws;
try {
  let lap;
  for (let i = 0; i < 40 && !lap; i++) { await var_(250); try { lap = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === 'page'); } catch {} }
  ws = new WebSocket(lap.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let id = 0; const v = new Map(); const konzolHiba = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (v.has(d.id)) { v.get(d.id)(d); v.delete(d.id); }
    if (d.method === 'Runtime.exceptionThrown') konzolHiba.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
  };
  const kuld = (method, params = {}) => new Promise((r) => { const i = ++id; v.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const j = async (x) => {
    const r = await kuld('Runtime.evaluate', { expression: `(function(){${x}})()`, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || x);
    return r.result?.result?.value;
  };
  await kuld('Page.enable'); await kuld('Runtime.enable');
  const betolt = async () => { await kuld('Page.navigate', { url: URL_ }); await var_(1500); };
  const stub = `window.__uz=[]; window.alert=function(m){__uz.push(m);}; window.confirm=function(m){__uz.push(m);return true;};`;

  // --- régi telepítés utánzása: próbaadat + valódi vendég + valódi anyag + régi egyanyagos foglalás ---
  await betolt();
  await j(`localStorage.clear();
    localStorage.setItem('fodrasz_foglalasok_v1', JSON.stringify([
      {name:'Tóth Evelin',phone:'+36 20 311 2244',date:'',time:'',dur:0,service:'',serviceObj:null,contact:true},
      {name:'Tóth Evelin',phone:'+36 20 999 0000',date:'',time:'',dur:0,service:'',serviceObj:null,contact:true},
      {name:'Teszt 15p',phone:'+36 30 111 2222',date:'2026-10-01',time:'10:00',dur:15,service:'Alap (15 perc)',uid:'test15'},
      {name:'Régi Vendég',phone:'1',date:'2026-10-01',time:'11:00',dur:30,service:'Festés — Rövid',chemCode:'A1',chemGram:40,done:true,uid:'regi'}]));
    localStorage.setItem('fodrasz_vegyszerek_v1', JSON.stringify([
      {code:'K001',name:'Festék alap K001',start:500},{code:'K002',name:'Festék alap K002',start:400},{code:'K003',name:'Festék alap K003',start:500},
      {code:'K004',name:'Igazi',start:100},{code:'A1',name:'Anyag 1',start:500},{code:'A2',name:'Anyag 2',start:500},{code:'A3',name:'Anyag 3',start:500},
      {code:'A4',name:'Anyag 4',start:500},{code:'A5',name:'Anyag 5',start:500},{code:'A6',name:'Anyag 6',start:500},{code:'A7',name:'Anyag 7',start:500}]));`);
  await betolt();
  let r = await j(`return {nevek:loadBookings().map(b=>b.name+'|'+b.phone), kodok:CHEMICALS.map(c=>c.code), maradA1:chemRemaining('A1')};`);
  e('próba névjegy (pontos egyezés) törölve, azonos nevű valódi megmaradt', !r.nevek.includes('Tóth Evelin|+36 20 311 2244') && r.nevek.includes('Tóth Evelin|+36 20 999 0000'), r.nevek);
  e('„Teszt 15p” törölve, valódi foglalás megmaradt', !r.nevek.some((n) => n.startsWith('Teszt 15p')) && r.nevek.includes('Régi Vendég|1'), r.nevek);
  e('érintetlen K001/K003 törölve, átírt K002 és a többi anyag megmaradt', !r.kodok.includes('K001') && !r.kodok.includes('K003') && r.kodok.includes('K004') && r.kodok.includes('K002') && r.kodok.length === 9, r.kodok);
  e('régi egyanyagos foglalás továbbra is levonódik', r.maradA1 === 460, r.maradA1);

  // --- felület ---
  r = await j(`${stub} showTab('fooldal'); var c=[...document.querySelectorAll('#foTimeline .tcell[data-t]')];
    return {ver:APP_VER, ful:[...document.querySelectorAll('.tab')].map(t=>t.dataset.tab), elso:c[0].dataset.t, utolso:c[c.length-1].dataset.t, sorok:document.querySelectorAll('#foTimeline .trow').length,
      telepit:!!document.getElementById('telepitKartya')};`);
  e('v29, nincs Foglalás fül', r.ver === '29' && !r.ful.includes('foglalas') && r.ful.length === 4, r);
  e('rács 7:00-20:00 (26 sor)', r.elso === '07:00' && r.utolso === '19:30' && r.sorok === 26, r);
  e('nincs telepítés-segítő', !r.telepit);

  // --- fix felső keret ---
  r = await j(`showTab('fooldal'); window.scrollTo(0,900); var h=document.querySelector('header.top').getBoundingClientRect();
    var o={gorgetes:window.scrollY, fent:h.top, css:getComputedStyle(document.querySelector('header.top')).position}; return o;`);
  e('a felső keret görgetés után is fent van', r.gorgetes > 0 && r.fent === 0 && r.css === 'sticky', r);
  r = await j(`foglalasIndit(fmtDate(new Date()),'07:00'); window.scrollTo(0,300); var h=document.querySelector('header.top').getBoundingClientRect(), s=document.querySelector('#view-foglalas .steps').getBoundingClientRect();
    var o={fejAlja:h.bottom, savTeteje:s.top}; foglalasBezar(); window.scrollTo(0,0); return o;`);
  e('a foglalás lépéssora nem csúszik a felső keret alá', r.savTeteje >= r.fejAlja - 1, r);

  // --- Kártyák fül: új kártya 7 anyaggal ---
  r = await j(`showTab('rendszer'); document.querySelector('.rsz-ful[data-rsz=kartyak]').click();
    var sorok=document.querySelectorAll('#kaLista .ka-sor').length;
    document.getElementById('kaUj').click();
    document.getElementById('kaKat').value='__uj'; document.getElementById('kaKat').onchange();
    document.getElementById('kaUjKat').value='Próba kategória'; document.getElementById('kaNev').value='Hétanyagos';
    kaReszek=[{t:'m',d:20},{t:'p',d:30},{t:'m',d:10}]; kaReszRajz();
    for(var i=1;i<=7;i++){ document.querySelector('#kaAnyagok .anyag-uj').click();
      var s=document.querySelectorAll('#kaAnyagok .anyag-sor')[i-1];
      s.querySelector('select').value='A'+i; s.querySelector('select').onchange();
      s.querySelector('input').value=String(i*10); s.querySelector('input').oninput(); }
    document.getElementById('kaMent').click();
    var k=SZOLGALTATASOK['Próba kategória'][0];
    return {sorok, nyitva:document.getElementById('kartyaMask').classList.contains('show'), k, err:document.getElementById('kaErr').textContent};`);
  e('új kártya mentve 7 anyaggal és pihentetéssel', !r.nyitva && r.k.dur === 60 && r.k.anyagok.length === 7 && r.k.seg.length === 3, r);
  e('a beépített kártyák látszanak a listán', r.sorok > 20, r.sorok);

  // --- érvénytelen kártya ---
  r = await j(`document.getElementById('kaUj').click(); document.getElementById('kaNev').value=''; document.getElementById('kaMent').click();
    var a=document.getElementById('kaErr').textContent; document.getElementById('kaNev').value='Hétanyagos';
    document.getElementById('kaKat').value='Próba kategória'; document.getElementById('kaMent').click(); var b=document.getElementById('kaErr').textContent;
    document.getElementById('kaMegse').click(); return {a,b};`);
  e('üres név és névütközés elutasítva', /nevet/.test(r.a) && /már van/.test(r.b), r);

  // --- foglalás a Főoldalról, percre pontos kezdés, előre kitöltött anyagok ---
  await betolt();
  r = await j(`${stub} var kk=SZOLGALTATASOK['Próba kategória'];
    if(!kk||kk.length!==1) return {hiba:'újratöltés után nincs meg a kártya'};
    showTab('fooldal'); foMainDate=new Date(2030,0,7); renderFooldal();
    [...document.querySelectorAll('#foTimeline .tcell[data-t]')].find(x=>x.dataset.t==='10:30').click();
    var o={nezet:document.querySelector('.view.active').id, kezd:document.getElementById('startTime').value, datum:document.getElementById('startDate').textContent};
    var st=document.getElementById('startTime'); st.value='10:37'; st.dispatchEvent(new Event('change'));
    foCat='Próba kategória'; renderFoglalas(); document.querySelector('#foglalasBody .card').click();
    o.lepes=bookingStep; o.sorok=document.querySelectorAll('#bfAnyagok .anyag-sor').length;
    var e1=document.querySelectorAll('#bfAnyagok .anyag-sor')[1]; e1.querySelector('input').value='25'; e1.querySelector('input').oninput();
    document.getElementById('bfName').value='Teszt Vendég'; document.getElementById('bfPhone').value='06301234567';
    document.getElementById('bfName').dispatchEvent(new Event('input'));
    document.getElementById('bfGo').click();
    o.vissza=document.querySelector('.view.active').id; o.uz=__uz.slice();
    var b=loadBookings().find(x=>x.name==='Teszt Vendég'); o.b=b;
    o.napMarad=fmtDate(foMainDate);
    var k=[...document.querySelectorAll('#foTimeline .appt')][0]; o.top=k&&k.offsetTop; o.vart=(10*60+37-7*60)/30*70;
    o.kartyaSzoveg=k&&k.textContent;
    return o;`);
  e('szabad sávra érintve megnyílik a foglalás kitöltött nappal és idővel', r.nezet === 'view-foglalas' && r.kezd === '10:30' && r.datum === '2030-01-07', r);
  e('a kártya 7 anyaga előre kitöltve', r.sorok === 7, r.sorok);
  e('percre pontos kezdés mentve', r.b && r.b.time === '10:37' && r.b.date === '2030-01-07', r.b);
  e('a Főoldal a foglalás napján marad', r.vissza === 'view-fooldal' && r.napMarad === '2030-01-07', r);
  e('a kártya pontosan 10:37-nél áll', Math.abs(r.top - r.vart) < 2, [r.top, r.vart]);
  e('a foglaláson mind a 7 anyag, az átírt gramm is', r.b && r.b.anyagok.length === 7 && r.b.anyagok[1].gram === 25, r.b && r.b.anyagok);
  e('a kártyán látszik az összes anyag', /A1 · 10g/.test(r.kartyaSzoveg) && /A7 · 70g/.test(r.kartyaSzoveg), r.kartyaSzoveg);

  // --- a kártya a RÁCSSORHOZ igazodik (nem a számított értékhez): 14:00-s foglalás a 14:00-s sor tetején áll ---
  r = await j(`${stub} var all=loadBookings(); all.push({date:'2030-01-10',time:'14:00',dur:120,service:'Vágás & Szárítás — Alkalmi frizura',name:'Rács',phone:'1',uid:'racs'}); saveBookings(all);
    showTab('fooldal'); foMainDate=new Date(2030,0,10); renderFooldal();
    var sorok=[...document.querySelectorAll('#foTimeline .trow')], k=document.querySelector('#foTimeline .appt').getBoundingClientRect();
    var felso=function(c){ return sorok.find(x=>x.querySelector('.tlabel').textContent===c).getBoundingClientRect().top; };
    var magas=sorok.map(x=>x.getBoundingClientRect().height);
    return {kartya:k.top, sor14:felso('14:00'), also:k.bottom, sor16:felso('16:00'), min:Math.min.apply(null,magas), max:Math.max.apply(null,magas)};`);
  e('a kártya teteje a 14:00-s sorral egy vonalban', Math.abs(r.kartya - r.sor14) < 1, r);
  e('a kártya alja a 16:00-s sorral egy vonalban', Math.abs(r.also - r.sor16) < 1, r);
  e('minden sor pontosan 70 px', r.min === 70 && r.max === 70, r);

  // --- elkészült pipa: minden anyag levonódik ---
  r = await j(`${stub} foMainDate=new Date(2030,0,7); var b=loadBookings().find(x=>x.name==='Teszt Vendég'); var elotte=chemRemaining('A2');
    openEdit(b); var sorok=document.querySelectorAll('#edAnyagok .anyag-sor').length; document.getElementById('edDone').checked=true; saveEdit();
    return {sorok, elotte, utan:chemRemaining('A2'), a7:chemRemaining('A7'), err:document.getElementById('edErr').textContent, szoveg:document.querySelector('#foTimeline .appt').textContent};`);
  e('módosító ablakban is megvan mind a 7 anyag', r.sorok === 7, r);
  e('„elkészült” után minden anyag levonódik (A2: -25 g, A7: -70 g)', r.elotte - r.utan === 25 && r.a7 === 430, r);

  // --- ütközés és munkaidő percre pontosan ---
  r = await j(`${stub} foglalasIndit('2030-01-07','12:00'); document.getElementById('startTime').value='10:40'; document.getElementById('startTime').dispatchEvent(new Event('change'));
    foCat='Vágás & Szárítás'; renderFoglalas(); document.querySelector('#foglalasBody .card').click();
    document.getElementById('bfName').value='Más'; document.getElementById('bfPhone').value='1'; document.getElementById('bfGo').click();
    var a=__uz[0], nezet=document.querySelector('.view.active').id, db=loadBookings().filter(x=>x.name==='Más').length;
    __uz.length=0; selTime='06:59'; document.getElementById('bfGo').click(); var k=__uz[0];
    __uz.length=0; selTime='19:59'; document.getElementById('bfGo').click(); var z=__uz[0];
    foglalasBezar(); return {a,nezet,db,k,z};`);
  e('ütközés: szól, nem ment, a képernyőn marad', /foglalt/.test(r.a) && r.nezet === 'view-foglalas' && r.db === 0, r);
  e('munkaidőn kívül: szól', /07:00/.test(r.k) && /20:00/.test(r.z), r);

  // --- nem kötelező mezők: név, telefon, anyag nélkül is menthető ---
  r = await j(`${stub} var e=__uz.length; foglalasIndit('2030-01-08','09:00'); foCat='Vágás & Szárítás'; renderFoglalas(); document.querySelector('#foglalasBody .card').click();
    regAnyagok=[{code:'',gram:''},{code:'A3',gram:''}];
    document.getElementById('bfGo').click();
    var b=loadBookings().find(x=>x.date==='2030-01-08'&&x.time==='09:00');
    var o={uz:__uz.length-e, b, nezet:document.querySelector('.view.active').id, felirat:document.querySelector('#foTimeline .appt .nm').textContent};
    openEdit(b); document.getElementById('edName').value=''; document.getElementById('edPhone').value=''; edLista.push({code:'',gram:''}); saveEdit();
    o.err=document.getElementById('edErr').textContent; o.zart=!document.getElementById('editMask').classList.contains('show');
    var ki=[...loadBookings()]; localStorage.setItem('fodrasz_foglalasok_v1',JSON.stringify(ki.filter(x=>x!==0)));
    return o;`);
  e('név, telefon és gramm nélkül is menthető foglalás', r.uz === 0 && r.b && r.b.name === '' && r.b.phone === '' && r.nezet === 'view-fooldal', r);
  e('anyag nélküli sor kimarad, gramm nélkül 0 g', r.b && r.b.anyagok.length === 1 && r.b.anyagok[0].code === 'A3' && r.b.anyagok[0].gram === 0, r.b && r.b.anyagok);
  e('név nélküli kártya felirata', r.felirat.includes('(név nélkül)'), r.felirat);
  e('módosítás is menthető üres névvel', r.err === '' && r.zart, r);

  // --- módosító ablak: névjegy-választó ---
  r = await j(`${stub} var b=loadBookings().find(x=>x.name==='Teszt Vendég'); openEdit(b);
    var box=document.getElementById('edBook'); var o={nyitva:box.style.display!=='none'&&box.querySelectorAll('.ltr').length>0};
    var cb=document.getElementById('edDone').getBoundingClientRect(); o.cbSzel=cb.width;
    box.querySelector('.ltr[data-l="R"]').click();
    var p=[...box.querySelectorAll('.nm-pick')].find(x=>x.dataset.n==='Régi Vendég'); o.van=!!p; p.click();
    o.nev=document.getElementById('edName').value; o.tel=document.getElementById('edPhone').value;
    closeEdit(); return o;`);
  e('a módosító ablakban választható névjegy, a név és telefon beíródik', r.nyitva && r.cbSzel < 30 && r.van && r.nev === 'Régi Vendég' && r.tel === '1', r);

  // --- dupla: a mezők üresek, a 2. kártya nem örökli az 1. vendég adatait ---
  r = await j(`${stub} var all=loadBookings(); var A={date:'2030-01-09',time:'12:00',dur:30,service:'Festés — Rövid',name:'Első Vendég',phone:'555',uid:'dupA',serviceObj:{cat:'Festés',name:'Rövid',dur:30}};
    all.push(A); saveBookings(all); openDuplaById('dupA');
    var o={nev:document.getElementById('dupName').value, tel:document.getElementById('dupPhone').value, nevek:document.querySelectorAll('#dupBook .nm-pick').length};
    closeDupla();
    var A2=findBookingById('dupA'); var B=findService(Object.keys(FESTES).map(k=>FESTES[k])[0]);
    var res=applyDupla(A2,{B:svcFullId(B),e:0,u:0},'u','','', '', '');
    o.res=res; var b2=loadBookings().find(x=>x.duplaRole==='B'&&x.date==='2030-01-09'); o.b2={n:b2&&b2.name,t:b2&&b2.phone}; return o;`);
  e('Dupla ablak: a név, telefon és a névjegylista üresen nyílik', r.nev === '' && r.tel === '' && r.nevek === 0, r);
  e('a dupla kártya nem örökli az 1. vendég nevét és telefonját', r.res.ok && r.b2.n === '' && r.b2.t === '', r);

  // --- anyagsorok: a választó széles, a kiválasztott anyag olvasható, nincs vízszintes görgetés ---
  r = await j(`${stub} var m=function(id,dobozSel){ var sor=document.querySelector(id+' .anyag-sor'); var sel=sor.querySelector('select').getBoundingClientRect(), inp=sor.querySelector('input').getBoundingClientRect(), d=document.querySelector(dobozSel);
      return {sel:Math.round(sel.width), inp:Math.round(inp.width), kilog:d.scrollWidth>d.clientWidth+1, szoveg:sor.querySelector('select').selectedOptions[0].textContent}; };
    var o={}; var b=loadBookings().find(x=>x.name==='Teszt Vendég'); openEdit(b); o.mod=m('#edAnyagok','#editMask .modal'); closeEdit();
    kartyaNyit('Próba kategória',0); o.kartya=m('#kaAnyagok','#kartyaMask .modal'); o.resz=m('#kaReszek','#kartyaMask .modal'); kartyaZar();
    foglalasIndit('2030-01-11','09:00'); foCat='Próba kategória'; renderFoglalas(); document.querySelector('#foglalasBody .card').click(); o.fogl=m('#bfAnyagok','#view-foglalas'); o.foglSor=(function(){var x=document.querySelector('#bfAnyagok .anyag-sor').getBoundingClientRect(), f=document.querySelector('.frm').getBoundingClientRect(); return x.right<=f.right+1;})(); foglalasBezar();
    return o;`);
  for (const [nev, x] of [['módosító ablak', r.mod], ['kártya-szerkesztő', r.kartya], ['foglalás', r.fogl]]) {
    e(nev + ': a választó széles, a gramm-mező keskeny, nincs vízszintes görgetés', x.sel >= 150 && x.inp <= 90 && !x.kilog, x);
  }
  e('módosító ablak: a kiválasztott anyag neve látszik a mezőben', /^A1 · Anyag 1/.test(r.mod.szoveg), r.mod.szoveg);
  e('foglalás: az anyagsor a bal hasábon belül marad', r.foglSor, r);

  // --- 5 perces időválasztó ---
  r = await j(`${stub} foglalasIndit('2030-01-12','10:30');
    var po=document.getElementById('startTimeP'), oo=document.getElementById('startTimeO');
    var o={percek:[...po.options].map(x=>x.value), orak:[...oo.options].map(x=>x.value), p:po.value, ora:oo.value};
    po.value='35'; po.onchange(); o.utan=selTime; o.pMarad=document.getElementById('startTimeP').value;
    oo.value='15'; oo.onchange(); o.utan2=selTime; foglalasBezar();
    var b=loadBookings().find(x=>x.name==='Teszt Vendég'); openEdit(b);
    o.ed=document.getElementById('edTime').value; o.edP=document.getElementById('edTimeP').value;
    o.edPercek=[...document.getElementById('edTimeP').options].map(x=>x.value);
    var ep=document.getElementById('edTimeP'); ep.value='40'; ep.onchange(); saveEdit(); o.mentett=loadBookings().find(x=>x.name==='Teszt Vendég').time;
    o.err=document.getElementById('edErr').textContent;
    return o;`);
  const ot = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
  e('foglalás: a percek 5 percenként (12 lehetőség), az órák 7-19', r.percek.join() === ot.join() && r.orak[0] === '07' && r.orak.at(-1) === '19', r);
  e('foglalás: az óra és perc beállítja a kezdést', r.p === '30' && r.ora === '10' && r.utan === '10:35' && r.pMarad === '35' && r.utan2 === '15:35', r);
  e('módosító: a korábbi 10:37 megmarad, plusz sorként a listában', r.ed === '10:37' && r.edP === '37' && r.edPercek.includes('37'), r);
  e('módosító: 5 perces idő beállítható és menthető', r.mentett === '10:40' && r.err === '', r);

  // --- átnevezés, törlés, leltár-kód csere ---
  r = await j(`${stub} kartyaNyit('Próba kategória',0); document.getElementById('kaNev').value='Átnevezett'; document.getElementById('kaMent').click();
    var b=loadBookings().find(x=>x.name==='Teszt Vendég'); var o={svc:b.service, szin:serviceColor(b.service).idx};
    kartyaTorol('Próba kategória',0); o.kat=!!SZOLGALTATASOK['Próba kategória'];
    var b2=loadBookings().find(x=>x.name==='Teszt Vendég'); o.megvan=!!b2; openEdit(b2); o.opc=document.getElementById('edService').value; saveEdit(); o.err=document.getElementById('edErr').textContent;
    o.utan=loadBookings().find(x=>x.name==='Teszt Vendég').service; return o;`);
  e('átnevezéskor a foglalás neve követi', r.svc === 'Próba kategória — Átnevezett' && r.szin === 0, r);
  e('törölt kártya: a kategória eltűnik, a foglalás megmarad és menthető', !r.kat && r.megvan && r.err === '' && r.utan === 'Próba kategória — Átnevezett' && r.opc === r.utan, r);

  // --- mentés / visszatöltés: a kártyák is ---
  r = await j(`${stub} var regiKeys=Object.keys(SZOLGALTATASOK).length; SZOLGALTATASOK['Festés'][0].anyagok=[{code:'A1',gram:5}]; saveKartyak();
    return {keys:regiKeys, tarolt:JSON.parse(localStorage.getItem('fodrasz_kartyak_v1'))['Festés'][0].anyagok, megoszt:kartyakErvenyes({x:[{name:'a',dur:0}]}), ok:kartyakErvenyes(SZOLGALTATASOK), forras:autoBackupToFile.toString().includes('kartyak:SZOLGALTATASOK')};`);
  e('a mentésfájlba a kártyák is bekerülnek', r.forras && r.ok && !r.megoszt && r.tarolt[0].code === 'A1', r);
  await betolt();
  r = await j(`return {a:SZOLGALTATASOK['Festés'][0].anyagok, gorget:document.documentElement.scrollWidth>innerWidth};`);
  e('újratöltés után megmaradnak a kártyaadatok', r.a && r.a[0].gram === 5 && !r.gorget, r);

  // --- hibás mentésfájl elutasítása, beépített „—” jeles kártya szerkesztése, használt próbakód megmarad ---
  r = await j(`${stub} var o={}; var jo={date:'2030-01-01',time:'10:00',dur:30,name:'A',phone:'1'};
    o.jo=mentesErvenyes([jo,{name:'B',phone:'2',date:'',time:'',dur:0,service:'',contact:true}],[{code:'A',name:'x',start:5}],SZOLGALTATASOK);
    o.nincsIdo=mentesErvenyes([{date:'2030-01-01',dur:30}]);
    o.rosszAnyag=mentesErvenyes([Object.assign({},jo,{anyagok:[null]})]);
    o.rosszLeltar=mentesErvenyes([jo],[null]);
    o.proto=kartyakErvenyes(JSON.parse('{"__proto__":[{"name":"x","dur":5}]}'));
    o.constr=kartyakErvenyes({constructor:[{name:'x',dur:5}]});
    o.szovegDur=kartyakErvenyes({a:[{name:'x',dur:'30'}]}); o.vegtelen=kartyakErvenyes({a:[{name:'x',dur:Infinity}]});
    o.ures=kartyakErvenyes({}); o.uresKat=kartyakErvenyes({a:[]}); o.rosszGram=kartyakErvenyes({a:[{name:'x',dur:5,anyagok:[{code:'A',gram:'x'}]}]});
    o.regiMentes=mentesErvenyes([jo],undefined,undefined);
    var kat=Object.keys(SZOLGALTATASOK).find(c=>SZOLGALTATASOK[c].some(x=>x.name.indexOf('—')>=0)); var ki=kat?SZOLGALTATASOK[kat].findIndex(x=>x.name.indexOf('—')>=0):-1; var nev=kat&&SZOLGALTATASOK[kat][ki].name;
    if(nev){ kartyaNyit(kat,ki); document.getElementById('kaMent').click(); o.dupErr=document.getElementById('kaErr').textContent; o.dupZart=!document.getElementById('kartyaMask').classList.contains('show'); kartyaZar(); }
    o.vanKat=!!nev;
    kartyaNyit('Festés',0); document.getElementById('kaNev').value='Új — név'; document.getElementById('kaMent').click(); o.ujJel=document.getElementById('kaErr').textContent; kartyaZar();
    var all=loadBookings(); all.push({date:'2030-02-01',time:'10:00',dur:30,service:'x',name:'H',phone:'1',uid:'hK',anyagok:[{code:'K003',gram:5}]}); saveBookings(all);
    CHEMICALS.push({code:'K003',name:'Festék alap K003',start:500}); saveChemicals(); probaAdatTorol(); o.hasznalt=CHEMICALS.some(c=>c.code==='K003');
    return o;`);
  e('jó és régi mentés elfogadva', r.jo === true && r.regiMentes === true, r);
  e('hibás foglalás/leltár elutasítva', !r.nincsIdo && !r.rosszAnyag && !r.rosszLeltar, r);
  e('hibás kártyalista elutasítva (rendszernév, szöveges perc, végtelen, üres, rossz gramm)', !r.proto && !r.constr && !r.szovegDur && !r.vegtelen && !r.ures && !r.uresKat && !r.rosszGram, r);
  e('beépített „—” jeles kártya menthető, új névben a jel tiltott', r.vanKat && r.dupErr === '' && r.dupZart && /jel/.test(r.ujJel), r);
  e('foglalásban használt próbakód nem törlődik', r.hasznalt === true, r);

  // --- sérült kártyatár: hangos, nem írja felül ---
  await j(`localStorage.setItem('fodrasz_kartyak_v1','{sérült');`);
  await betolt();
  r = await j(`return {hiba:adathibaVan(), nyers:localStorage.getItem('fodrasz_kartyak_v1'), kat:Object.keys(SZOLGALTATASOK).length};`);
  e('sérült kártyatárnál hibajelzés, a beépített kártyák működnek', r.hiba === true && r.kat >= 8, r);

  // --- a félretett sérült kártyatár visszatöltés után megszűnik; az utolsó kártya nem törölhető ---
  r = await j(`${stub} var ok=adatCsere([],[],saveBookings,saveChemicals); var o={ok:ok, hiba:adathibaVan(), kulcs:localStorage.getItem('fodrasz_kartyak_v1')};
    Object.keys(SZOLGALTATASOK).slice(1).forEach(c=>{delete SZOLGALTATASOK[c];}); var c0=Object.keys(SZOLGALTATASOK)[0]; SZOLGALTATASOK[c0].length=1;
    __uz.length=0; kartyaTorol(c0,0); o.uz=__uz[0]; o.db=Object.keys(SZOLGALTATASOK).length; return o;`);
  e('visszatöltés után a sérült kártyatár nem jelez újra hibát', r.ok && !r.hiba && r.kulcs === null, r);
  e('az utolsó kártya nem törölhető', /utolsó/.test(r.uz) && r.db === 1, r);

  e('nem volt kezeletlen JavaScript-hiba', konzolHiba.length === 0, konzolHiba);
} catch (err) {
  rossz++; console.log('HIBA (leállt a próba): ' + err.message);
} finally {
  try { ws?.close(); } catch {}
  ch.kill();
}
console.log(`\n${jo}/${jo + rossz} zöld`);
if (rossz) process.exit(1);
