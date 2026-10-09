import test from 'node:test';
import assert from 'node:assert/strict';
import * as m from '../../public/mobile.mjs';
const v=(o)=>m.computeView(o);
test('automático: monitor grande é computador; janela estreita ou celular é smartphone',()=>{
  assert.equal(v({pref:'auto',w:1600,h:900}).mobile,false);assert.equal(v({pref:'auto',w:1366,h:768}).mobile,false);
  assert.equal(v({pref:'auto',w:390,h:844,coarse:true}).mobile,true);assert.equal(v({pref:'auto',w:900,h:700}).mobile,true);assert.equal(v({pref:'auto',w:901,h:700}).mobile,false);
});
test('automático: celular deitado (largura > 900, altura baixa, toque) continua smartphone e entra no modo horizontal',()=>{
  const r=v({pref:'auto',w:932,h:430,coarse:true});assert.equal(r.mobile,true);assert.equal(r.landscape,true);assert.equal(r.frame,false);
  assert.equal(v({pref:'auto',w:430,h:932,coarse:true}).landscape,false);
});
test('tablet grande com toque não vira smartphone sozinho',()=>{assert.equal(v({pref:'auto',w:1180,h:820,coarse:true}).mobile,false)});
test('smartphone escolhido num monitor mostra a moldura; num celular real, não',()=>{
  assert.equal(v({pref:'mobile',w:1600,h:900}).frame,true);assert.equal(v({pref:'mobile',w:1600,h:900}).mobile,true);
  assert.equal(v({pref:'mobile',w:390,h:844,coarse:true}).frame,false);assert.equal(v({pref:'mobile',w:844,h:390,coarse:true}).frame,false);
});
test('computador escolhido num celular usa a página larga reduzida; num monitor, nada muda',()=>{
  assert.equal(v({pref:'desktop',w:390,h:844,coarse:true}).desktopOnPhone,true);
  // depois de ampliar a página para 1280 px a janela mede 1280, mas a tela física continua pequena: não pode oscilar
  assert.equal(v({pref:'desktop',w:1280,h:2770,coarse:true,sw:390,sh:844}).desktopOnPhone,true);assert.equal(v({pref:'desktop',w:1280,h:2770,coarse:true,sw:390,sh:844}).mobile,false);assert.equal(v({pref:'desktop',w:390,h:844,coarse:true}).mobile,false);
  assert.equal(v({pref:'desktop',w:1600,h:900}).desktopOnPhone,false);
  assert.equal(v({pref:'desktop',w:700,h:900}).mobile,false);
});
test('nextPref alterna conforme o que está na tela',()=>{
  assert.equal(m.nextPref(v({pref:'auto',w:1600,h:900})),'mobile');assert.equal(m.nextPref(v({pref:'auto',w:390,h:844,coarse:true})),'desktop');
  assert.equal(m.nextPref(v({pref:'mobile',w:1600,h:900})),'desktop');assert.equal(m.nextPref(v({pref:'desktop',w:390,h:844,coarse:true})),'mobile');
});
test('normPref ignora valores desconhecidos',()=>{assert.equal(m.normPref('xyz'),'auto');assert.equal(m.normPref(null),'auto');assert.equal(m.normPref('mobile'),'mobile')});

test('moldura só aparece em tela física grande; num celular nunca',()=>{
  assert.equal(v({pref:'mobile',w:1280,h:2770,sw:390,sh:844}).frame,false);
  assert.equal(v({pref:'mobile',w:1366,h:768,sw:1920,sh:1080}).frame,true);assert.equal(v({pref:'mobile',w:500,h:700,sw:1920,sh:1080}).frame,false);
});
