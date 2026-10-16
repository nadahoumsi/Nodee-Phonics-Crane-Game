/* ============================================================================
   nodee for kids — Alphabet Claw Machine
   Pure vanilla JS: state machine, physics, bounding-box collision,
   WebAudio synth sounds, speech, canvas confetti, round progression.
   ============================================================================ */
(() => {
'use strict';

/* ---------------- Asset manifest (exact files in elements/) ----------------
   upper  = "X.png" style   | lower = "*1.png" style | obj = "*0.png" style   */
const E = (f) => 'elements/' + f;
const LETTERS = [
  { L:'A', word:'Apple',     emoji:'🍎', upper:E('A.png'),   lower:E('A 1.png'), obj:E('A 0.png') },
  { L:'B', word:'Bear',      emoji:'🐻', upper:E('B.png'),   lower:E('b 1.png'), obj:E('B 0.png') },
  { L:'C', word:'Cat',       emoji:'🐱', upper:E('C.png'),   lower:E('C1.png'),  obj:E('0.png')   },
  { L:'D', word:'Dog',       emoji:'🐶', upper:E('D.png'),   lower:E('d1.png'),  obj:E('d 0.png') },
  { L:'E', word:'Elephant',  emoji:'🐘', upper:E('E.png'),   lower:E('e 1.png'), obj:E('E 0.png') },
  { L:'F', word:'Fish',      emoji:'🐟', upper:E('F.png'),   lower:E('F 1.png'), obj:E('F 0.png') },
  { L:'G', word:'Guitar',    emoji:'🎸', upper:E('G.png'),   lower:E('G 1.png'), obj:E('g 0.png') },
  { L:'H', word:'Hat',       emoji:'🎩', upper:E('H.png'),   lower:E('h 1.png'), obj:E('H 0.png') },
  { L:'I', word:'Ice cream', emoji:'🍦', upper:E('I.png'),   lower:E('I 1.png'), obj:E('I 0.png') },
  { L:'J', word:'Juice',     emoji:'🧃', upper:E('J.png'),   lower:E('j 1.png'), obj:E('J 0.png') },
  { L:'K', word:'Kite',      emoji:'🪁', upper:E('K.png'),   lower:E('K.png'),  obj:E('K 0.png'), lowerAlt:E('K0.png') },
  { L:'L', word:'Lion',      emoji:'🦁', upper:E('L.png'),   lower:E('L 1.png'), obj:E('L 0.png') },
  { L:'M', word:'Monkey',    emoji:'🐵', upper:E('M.png'),   lower:E('M.png'),   obj:E('M 0.png') },
  { L:'N', word:'Nest',      emoji:'🪹', upper:E('N.png'),   lower:E('N 1.png'), obj:E('N 0.png') },
  { L:'O', word:'Orange',    emoji:'🍊', upper:E('O.png'),   lower:E('O 1.png'), obj:E('O 0.png') },
  { L:'P', word:'Penguin',   emoji:'🐧', upper:E('P.png'),   lower:E('P 1.png'), obj:E('P 0.png') },
  { L:'Q', word:'Queen',     emoji:'👑', upper:E('Q0.png'),  lower:E('Q1.png'),  obj:E('Q 0.png') },
  { L:'R', word:'Rabbit',    emoji:'🐰', upper:E('R.png'),   lower:E('R 1.png'), obj:E('R 0.png') },
  { L:'S', word:'Sun',       emoji:'☀️', upper:E('S.png'),   lower:E('s 1.png'), obj:E('S 0.png') },
  { L:'T', word:'Tiger',     emoji:'🐯', upper:E('T.png'),   lower:E('t 1.png'), obj:E('T 0.png') },
  { L:'U', word:'Umbrella',  emoji:'☂️', upper:E('U.png'),   lower:E('U 1.png'), obj:E('U0.png')  },
  { L:'V', word:'Van',       emoji:'🚐', upper:E('V.png'),   lower:E('V 1.png'), obj:E('V 0.png') },
  { L:'W', word:'Whale',     emoji:'🐳', upper:E('W.png'),   lower:E('w 1.png'), obj:E('W 0.png'), upperAlt:E('W_.png') },
  { L:'X', word:'Xylophone', emoji:'🎶', upper:E('X.png'),   lower:E('x 1.png'), obj:E('X  0.png') },
  { L:'Y', word:'Yo-yo',     emoji:'🪀', upper:E('Y.png'),   lower:E('y 1.png'), obj:E('y 0.png') },
  { L:'Z', word:'Zebra',     emoji:'🦓', upper:E('Z_.png'),  lower:E('Z 1.png'), obj:E('Z0.png')  },
];
const byLetter = Object.fromEntries(LETTERS.map(o => [o.L, o]));
const TOTAL_ROUNDS = 8;
const TOY_COUNT = 6;

/* ---------------- DOM ---------------- */
const $ = (id) => document.getElementById(id);
const tank = $('tank'), carriage = $('carriage'), rope = $('rope'), claw = $('claw'),
  grabItem = $('grabItem'), toyFloor = $('toyFloor'), chute = $('chute'),
  pointsEl = $('points'), roundNumEl = $('roundNum'), streakEl = $('streak'),
  powerFill = $('powerFill'), powerWrap = document.querySelector('.power-wrap'),
  taskCard = $('taskCard'), taskLetter = $('taskLetter'), taskWord1 = $('taskWord1'),
  taskWord2 = $('taskWord2'), taskStars = $('taskStars'),
  popLayer = $('popLayer'), toast = $('tankToast'),
  startOverlay = $('startOverlay'), victoryOverlay = $('victoryOverlay'),
  playBtn = $('playBtn'), replayBtn = $('replayBtn'),
  dropBtn = $('dropBtn'), leftBtn = $('leftBtn'), rightBtn = $('rightBtn'),
  soundBtn = $('soundBtn'), voiceBtn = $('voiceBtn'), speakBtn = $('speakBtn'),
  fxCanvas = $('fxCanvas');
const fx = fxCanvas.getContext('2d');

/* ---------------- Game state ---------------- */
const S = {
  started:false, state:'idle',          // idle|dropping|closing|rising|toChute|returning|celebrating|over
  x:60, ropeLen:44, dir:0,
  points:0, streak:0, bestStreak:0, round:0, firstTry:true,
  plan:[], learned:[], stars:[],
  target:null, toys:[], held:null, heldFromX:0,
  power:100, sound:true, voice:true,
  tankW:300, tankH:500, lastT:0, swayT:0, idleT:0,
};

/* ---------------- Audio (tiny synth, no files) ---------------- */
let AC = null;
function ac(){ if(!AC){ AC = new (window.AudioContext||window.webkitAudioContext)(); } if(AC.state==='suspended') AC.resume(); return AC; }
function tone(freq, t0, dur, type='sine', vol=.18){
  if(!S.sound) return;
  try{
    const c = ac(), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, c.currentTime + t0);
    g.gain.setValueAtTime(0, c.currentTime + t0);
    g.gain.linearRampToValueAtTime(vol, c.currentTime + t0 + .02);
    g.gain.exponentialRampToValueAtTime(.001, c.currentTime + t0 + dur);
    o.connect(g).connect(c.destination); o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + .05);
  }catch(e){}
}
const sfx = {
  click(){ tone(660,0,.09,'square',.08); },
  move(){ tone(320,0,.06,'sine',.05); },
  drop(){ if(!S.sound) return; try{ const c=ac(),o=c.createOscillator(),g=c.createGain();
    o.type='sawtooth'; o.frequency.setValueAtTime(500,c.currentTime); o.frequency.exponentialRampToValueAtTime(120,c.currentTime+.45);
    g.gain.setValueAtTime(.07,c.currentTime); g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.5);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime+.55);}catch(e){} },
  grab(){ tone(240,0,.12,'triangle',.2); tone(360,.08,.12,'triangle',.2); },
  good(){ [523,659,784,1047].forEach((f,i)=>tone(f,i*.11,.22,'triangle',.2)); tone(1319,.46,.4,'sine',.15); },
  bad(){ tone(330,0,.2,'sine',.15); tone(262,.18,.3,'sine',.15); },
  miss(){ tone(220,0,.15,'sine',.1); },
  win(){ [523,659,784,1047,784,1047,1319].forEach((f,i)=>tone(f,i*.14,.25,'triangle',.2)); },
};

/* ---------------- Speech ---------------- */
function speak(text){
  if(!S.voice) return;
  try{
    if(!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = .92; u.pitch = 1.15; u.lang = 'en-US';
    window.speechSynthesis.speak(u);
  }catch(e){}
}

/* ---------------- Helpers ---------------- */
const rand = (a,b) => a + Math.random()*(b-a);
const randi = (a,b) => Math.floor(rand(a,b+1));
const pick = (arr) => arr[Math.floor(Math.random()*arr.length)];
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const wait = (ms) => new Promise(r=>setTimeout(r,ms));
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function measure(){
  const r = tank.getBoundingClientRect();
  S.tankW = r.width; S.tankH = r.height;
  fxCanvas.width = Math.max(1, Math.floor(r.width));
  fxCanvas.height = Math.max(1, Math.floor(r.height));
  S.x = clamp(S.x, 4, S.tankW - 68);
}
window.addEventListener('resize', measure);

function toastMsg(msg, ms=1600){
  toast.textContent = msg; toast.hidden = false;
  clearTimeout(toastMsg._t);
  toastMsg._t = setTimeout(()=>{ toast.hidden = true; }, ms);
}
function pop(text, x, y, gold=false){
  const d = document.createElement('div');
  d.className = 'score-pop' + (gold ? ' gold' : '');
  d.textContent = text;
  d.style.left = clamp(x, 20, S.tankW-60) + 'px';
  d.style.top = y + 'px';
  popLayer.appendChild(d);
  setTimeout(()=>d.remove(), 1150);
}
function taskFlash(kind){
  taskCard.classList.remove('good','bad'); void taskCard.offsetWidth;
  taskCard.classList.add(kind); setTimeout(()=>taskCard.classList.remove(kind), 900);
}
function renderHUD(){
  pointsEl.textContent = S.points;
  streakEl.textContent = S.streak;
  roundNumEl.textContent = Math.min(S.round+1, TOTAL_ROUNDS);
  powerFill.style.width = clamp(S.power,0,100) + '%';
  powerWrap.classList.toggle('low', S.power < 25);
  dropBtn.disabled = S.state !== 'idle' || !S.started || S.power < 10;
  // task stars = completed rounds (gold) vs remaining (dim)
  taskStars.innerHTML = Array.from({length:TOTAL_ROUNDS},
    (_,i)=>`<span class="${i<S.learned.length?'':'off'}">★</span>`).join('');
}

/* ---------------- Confetti particles (canvas, no deps) ---------------- */
let parts = [];
function burst(x, y, n=90){
  const colors = ['#ff6fa5','#8b7bff','#3fd6c0','#ffd166','#ff9d6f','#7be3a8','#fff'];
  for(let i=0;i<n;i++){
    parts.push({ x, y, vx:rand(-260,260), vy:rand(-420,-60),
      g:rand(500,900), s:rand(4,9), r:rand(0,Math.PI*2), vr:rand(-8,8),
      c:pick(colors), life:rand(.9,1.7), t:0, rect:Math.random()<.5 });
  }
}
function fxTick(dt){
  fx.clearRect(0,0,fxCanvas.width,fxCanvas.height);
  parts = parts.filter(p=>p.t<p.life);
  for(const p of parts){
    p.t += dt; p.vy += p.g*dt; p.x += p.vx*dt; p.y += p.vy*dt; p.r += p.vr*dt;
    const a = 1 - p.t/p.life;
    fx.save(); fx.globalAlpha = Math.max(0,a); fx.translate(p.x,p.y); fx.rotate(p.r); fx.fillStyle = p.c;
    if(p.rect) fx.fillRect(-p.s/2,-p.s/3,p.s,p.s*.66); else { fx.beginPath(); fx.arc(0,0,p.s/2.4,0,7); fx.fill(); }
    fx.restore();
  }
}

/* ---------------- Toys ---------------- */
const FALLBACK_COLORS = [['#ff6fa5','#8b7bff'],['#3fd6c0','#22a894'],['#ffb703','#fb8500'],['#8b7bff','#5a4fcf'],['#ff8fb8','#e14e86']];
function toyImageEl(letter, kind){
  const info = byLetter[letter];
  const srcs = kind==='upper' ? [info.upper, info.upperAlt]
             : kind==='lower' ? [info.lower, info.lowerAlt]
             : [info.obj, info.objAlt];
  const img = document.createElement('img');
  img.alt = kind==='obj' ? `${info.word}` : `Letter ${letter}`;
  img.draggable = false;
  let i = 0;
  const cleans = srcs.filter(Boolean);
  img.onerror = () => {
    i++;
    if(i < cleans.length){ img.src = cleans[i]; }
    else { // graceful letter tile fallback (offline-proof)
      const tile = document.createElement('div');
      tile.className = 'toy fallback';
      const [c1,c2] = pick(FALLBACK_COLORS);
      tile.style.setProperty('--c1', c1); tile.style.setProperty('--c2', c2);
      tile.style.width = tile.style.height = '100%';
      tile.innerHTML = `<span>${kind==='lower'?letter.toLowerCase():letter}</span><small>${info.word}</small>`;
      img.replaceWith(tile);
    }
  };
  img.src = cleans[0];
  return img;
}
function clearToys(){ toyFloor.innerHTML=''; S.toys=[]; }
function addToy(letter, kind){
  const size = rand(60, 84);
  const el = document.createElement('div');
  el.className = 'toy';
  el.style.setProperty('--s', size+'px');
  el.style.setProperty('--d', rand(0,2).toFixed(2)+'s');
  const left = rand(6, Math.max(10, S.tankW - size - 6));
  const row = S.toys.length % 3;
  el.style.left = left+'px';
  el.style.bottom = (row*rand(14,26) + rand(0,10))+'px';
  el.style.transform = `rotate(${rand(-12,12).toFixed(1)}deg)`;
  el.style.zIndex = 10 + row;
  el.appendChild(toyImageEl(letter, kind));
  el.addEventListener('pointerdown', ()=>{ if(S.state==='idle'&&S.started){ nudgeToward(left+size/2); sfx.move(); } });
  toyFloor.appendChild(el);
  const toy = { el, letter, kind, size };
  S.toys.push(toy);
  return toy;
}
function buildPile(){
  clearToys();
  const t = S.target;
  const distractorPool = shuffle(LETTERS.filter(o=>o.L!==t.L));
  // guarantee exactly one correct toy (random form), rest distractors
  const winKind = pick(['upper','lower','obj']);
  const items = [{ letter:t.L, kind:winKind }];
  for(let i=0;i<TOY_COUNT-1;i++){
    const d = distractorPool[i % distractorPool.length];
    items.push({ letter:d.L, kind:pick(['upper','lower','obj']) });
  }
  shuffle(items).forEach(it=>addToy(it.letter, it.kind));
}
function toyCenterRel(toy){
  const tr = toy.el.getBoundingClientRect(), kr = tank.getBoundingClientRect();
  return { x: tr.left - kr.left + tr.width/2, y: tr.top - kr.top + tr.height/2, w: tr.width, h: tr.height };
}
function findCatch(cx, tipY){
  let best = null, bestScore = -1;
  for(const toy of S.toys){
    if(toy.el.dataset.gone) continue;
    const c = toyCenterRel(toy);
    const overlapX = 1 - Math.min(1, Math.abs(cx - c.x) / (c.w*0.62));
    if(overlapX <= 0) continue;
    const withinY = tipY > c.y - c.h*0.75 && tipY < c.y + c.h*0.6;
    if(!withinY) continue;
    const score = overlapX;
    if(score > bestScore){ bestScore = score; best = toy; }
  }
  return best;
}

/* ---------------- Round flow ---------------- */
function nextPlan(){
  S.plan = shuffle([...LETTERS]).slice(0, TOTAL_ROUNDS).map(o=>o.L);
}
function startRound(){
  S.target = byLetter[S.plan[S.round]];
  S.firstTry = true;
  taskLetter.textContent = S.target.L;
  taskWord1.textContent = S.target.L;
  taskWord2.textContent = S.target.word;
  document.getElementById('taskEmoji').textContent = S.target.emoji;
  buildPile();
  S.ropeLen = 44;
  S.x = rand(30, Math.max(40, S.tankW-100));
  renderHUD();
  speak(`Find the letter ${S.target.L}! ${S.target.L} is for ${S.target.word}!`);
  toastMsg(`${S.target.emoji} Find “${S.target.L}” — ${S.target.L} is for ${S.target.word}!`, 2200);
}
function chutePos(){
  const cr = chute.getBoundingClientRect(), kr = tank.getBoundingClientRect();
  return { x: cr.left - kr.left + cr.width/2, y: cr.top - kr.top + cr.height/2 };
}

/* ---------------- Claw action (async state machine) ---------------- */
function tween(durMs, fn){
  return new Promise(res=>{
    const t0 = performance.now();
    (function step(t){
      const k = clamp((t-t0)/durMs, 0, 1);
      fn(k);
      if(k<1) requestAnimationFrame(step); else res();
    })(t0);
  });
}
async function doDrop(){
  if(S.state!=='idle' || !S.started || S.power<10){ if(S.power<10) toastMsg('⚡ Charging claw… one sec!'); return; }
  S.state = 'dropping'; S.power = Math.max(0, S.power - 9); renderHUD(); sfx.drop();
  claw.classList.remove('closed');
  // Tip must reach the toy pile near the floor: tip = 84 + ropeLen.
  // Old formula (tankH*0.50-30) stopped ~40% too shallow — toys unreachable.
  const maxRope = Math.max(140, S.tankH - 150);
  const startLen = S.ropeLen;
  let caught = null;
  // descend — stops the moment the claw touches a toy
  await new Promise(res=>{
    const t0 = performance.now(), DUR = 900;
    (function step(t){
      const k = clamp((t-t0)/DUR, 0, 1);
      S.ropeLen = startLen + (maxRope-startLen)*k;
      const hit = findCatch(clawCX(), ropeTip().y);
      if(hit){ caught = hit; res(); return; }
      if(k<1) requestAnimationFrame(step); else res();
    })(t0);
  });
  // if we touched one mid-air, snap rope to it
  if(caught){
    const c = toyCenterRel(caught);
    S.ropeLen = clamp(c.y - 78, startLen, maxRope);
  }
  // close
  S.state = 'closing'; claw.classList.add('closed'); sfx.grab();
  if(caught){
    caught.el.classList.add('caught');
    grabItem.innerHTML = '';
    grabItem.appendChild(toyImageEl(caught.letter, caught.kind));
    grabItem.hidden = false;
    caught.el.style.opacity = '.25';
  }
  await wait(420);
  // rise
  S.state = 'rising';
  const upFrom = S.ropeLen;
  await tween(caught ? 750 : 550, k=>{ S.ropeLen = upFrom + (44-upFrom)*k; });
  if(!caught){
    S.state = 'idle'; renderHUD(); sfx.miss();
    toastMsg('So close! Aim right above it 🎯'); S.firstTry = false;
    return;
  }
  S.held = caught; S.heldFromX = S.x;
  const correct = caught.letter === S.target.L;
  if(correct) await deliverPrize(caught);
  else await returnToy(caught);
}
function ropeTip(){ return { y: 22 + S.ropeLen + 62 }; }
function clawCX(){ return S.x + 32; }

async function deliverPrize(toy){
  S.state = 'toChute'; claw.classList.add('glow');
  const cp = chutePos();
  const targetX = clamp(cp.x - 32, 4, S.tankW-68);
  const fromX = S.x;
  await tween(650, k=>{ S.x = fromX + (targetX-fromX)*k; });
  // release into chute
  S.state = 'celebrating';
  toy.el.dataset.gone = '1';
  grabItem.hidden = true; grabItem.innerHTML = '';
  claw.classList.remove('closed','glow');
  chute.classList.add('flash','swallow');
  setTimeout(()=>chute.classList.remove('flash','swallow'), 700);
  // fly-to-chute ghost
  const ghost = document.createElement('div');
  ghost.className = 'toy'; ghost.style.cssText = `left:${S.x+4}px;top:${ropeTip().y-40}px;width:56px;height:56px;z-index:55;position:absolute;`;
  ghost.appendChild(toyImageEl(toy.letter, toy.kind));
  tank.appendChild(ghost);
  const g0 = { x:S.x+32, y:ropeTip().y-10 };
  await tween(450, k=>{
    ghost.style.left = (g0.x + (cp.x-g0.x)*k - 28)+'px';
    ghost.style.top = (g0.y + (cp.y-g0.y)*k*k - 20)+'px';
    ghost.style.transform = `scale(${1-k*.4}) rotate(${k*180}deg)`;
    ghost.style.opacity = 1-k*.4;
  });
  ghost.remove();
  toy.el.remove(); S.toys = S.toys.filter(t=>t!==toy); S.held = null;
  // score!
  const bonus = Math.min(100, S.streak*25);
  const gained = 100 + bonus;
  S.points += gained; S.streak++; S.bestStreak = Math.max(S.bestStreak, S.streak);
  S.power = clamp(S.power + 28, 0, 100);
  S.stars.push(S.firstTry ? 1 : 0); // gold star only for first-try catches
  pop(`+${gained}`, cp.x-20, cp.y-60, true);
  burst(cp.x, cp.y, 110);
  const r = tank.getBoundingClientRect();
  burst(r.width/2, r.height*0.35, 60);
  sfx.good(); taskFlash('good');
  speak(pick(['Wonderful!','Amazing!','Great job!','Super!']) + ` ${S.target.L} is for ${S.target.word}!`);
  toastMsg(`🎉 Yes! “${S.target.L}” — ${S.target.emoji} ${S.target.word}! +${gained}`, 1800);
  S.learned.push(S.target.L);
  await wait(1400);
  // replenish pile with a fresh distractor so it stays full
  const others = LETTERS.filter(o=>o.L!==S.target.L);
  if(S.toys.length < TOY_COUNT) addToy(pick(others).L, pick(['upper','lower','obj']));
  S.round++;
  if(S.round >= TOTAL_ROUNDS){ victory(); }
  else { S.state='idle'; startRound(); renderHUD(); }
}

async function returnToy(toy){
  S.state = 'returning';
  const backX = S.heldFromX;
  const fromX = S.x;
  await tween(500, k=>{ S.x = fromX + (backX-fromX)*k; });
  // lower a touch and release back
  const downFrom = S.ropeLen;
  await tween(350, k=>{ S.ropeLen = downFrom + 40*k; });
  claw.classList.remove('closed');
  grabItem.hidden = true; grabItem.innerHTML = '';
  toy.el.style.opacity = '1'; toy.el.classList.remove('caught');
  // shuffle the returned toy to a fresh spot — retries always feel alive,
  // and a covering toy can never block the winner forever
  toy.el.style.left = rand(6, Math.max(10, S.tankW - toy.size - 6)) + 'px';
  toy.el.animate(
    [{transform:'scale(1.15) rotate(4deg)'},{transform:'scale(1) rotate(0deg)'}],
    {duration:350, easing:'cubic-bezier(.34,1.56,.64,1)'});
  const info = byLetter[toy.letter];
  const label = toy.kind==='obj' ? info.word : (toy.kind==='lower' ? info.L.toLowerCase() : info.L);
  sfx.bad(); taskFlash('bad');
  speak(`Oops! That's ${label}. Let's find ${S.target.L}!`);
  toastMsg(`💛 That's “${label}” — we need “${S.target.L}”! Try again!`, 2000);
  S.streak = 0; S.firstTry = false;
  await tween(350, k=>{ S.ropeLen = (downFrom+40) - 40*k; });
  S.held = null; S.state = 'idle'; renderHUD();
}

function victory(){
  S.state = 'over'; renderHUD(); sfx.win();
  speak('You did it! You are an alphabet superstar!');
  const r = tank.getBoundingClientRect();
  burst(r.width*0.25, r.height*0.3, 120);
  setTimeout(()=>burst(r.width*0.75, r.height*0.25, 120), 350);
  setTimeout(()=>burst(r.width*0.5, r.height*0.45, 140), 700);
  $('finalPoints').textContent = S.points;
  // victory stars = first-try rate (gold) vs needed retries (dim)
  $('vStars').innerHTML = S.stars.map(s=>`<span class="${s?'':'off'}">★</span>`).join('');
  $('vLetters').innerHTML = S.learned.map((L,i)=>
    `<span style="animation-delay:${i*60}ms">${L}</span>`).join('');
  victoryOverlay.hidden = false;
}
function resetGame(){
  S.points=0; S.streak=0; S.bestStreak=0; S.round=0;
  S.learned=[]; S.stars=[]; S.held=null; S.power=100; S.state='idle';
  victoryOverlay.hidden = true;
  nextPlan(); startRound(); renderHUD();
}

/* ---------------- Per-frame loop: movement, sway, power regen, render ---------------- */
function tick(t){
  const dt = Math.min(.05, (t - S.lastT)/1000 || .016);
  S.lastT = t;
  // movement input
  if(S.started && S.state==='idle'){
    if(S.dir!==0){
      S.x = clamp(S.x + S.dir*300*dt, 4, S.tankW-68);
      S.idleT = 0;
    } else {
      S.idleT += dt;
      if(S.idleT > 3){ // gentle attract sway after 3s idle
        S.swayT += dt;
        S.x = clamp(S.x + Math.sin(S.swayT*1.4)*24*dt, 4, S.tankW-68);
      }
    }
    // power trickle regen while idle
    if(S.power < 100){ S.power = clamp(S.power + 3*dt, 0, 100); renderHUD(); }
  }
  // pendulum sway on claw for life
  const sway = S.state==='idle' ? Math.sin(t/600)*2.5 : Math.sin(t/180)*1.2;
  carriage.style.transform = `translateX(${S.x.toFixed(1)}px)`;
  rope.style.height = S.ropeLen.toFixed(1)+'px';
  claw.style.transform = `rotate(${sway.toFixed(2)}deg)`;
  fxTick(dt);
  requestAnimationFrame(tick);
}

/* ---------------- Controls ---------------- */
function nudgeToward(px){ S.x = clamp(S.x + clamp(px-(S.x+32), -90, 90)*.35, 4, S.tankW-68); }
function hold(btn, d){
  const on = (e)=>{ e.preventDefault(); S.dir = d; S.idleT = 0; btn.classList.add('held'); try{ac();}catch(_){} };
  const off = ()=>{ if(S.dir===d) S.dir = 0; btn.classList.remove('held'); };
  btn.addEventListener('pointerdown', on);
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>btn.addEventListener(ev, off));
}
hold(leftBtn, -1); hold(rightBtn, 1);
dropBtn.addEventListener('click', ()=>{ try{ac();}catch(_){} sfx.click(); doDrop(); });

// drag inside glass to steer
let dragging = false;
tank.addEventListener('pointerdown', (e)=>{
  if(e.target.closest('button') || e.target.closest('.start-overlay') || e.target.closest('.victory-overlay')) return;
  dragging = true; S.idleT = 0; tank.setPointerCapture?.(e.pointerId);
  moveDrag(e);
});
tank.addEventListener('pointermove', (e)=>{ if(dragging) moveDrag(e); });
['pointerup','pointercancel'].forEach(ev=>tank.addEventListener(ev, ()=>{ dragging=false; }));
function moveDrag(e){
  const kr = tank.getBoundingClientRect();
  S.x = clamp(e.clientX - kr.left - 32, 4, S.tankW-68);
}
// keyboard
const keys = {};
window.addEventListener('keydown', (e)=>{
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'||e.key===' '){
    e.preventDefault();
    if(!S.started) return;
    if(e.key==='ArrowLeft') S.dir = -1;
    if(e.key==='ArrowRight') S.dir = 1;
    if(e.key===' ' && !e.repeat){ sfx.click(); doDrop(); }
    S.idleT = 0;
  }
});
window.addEventListener('keyup', (e)=>{
  if(e.key==='ArrowLeft'&&S.dir===-1) S.dir=0;
  if(e.key==='ArrowRight'&&S.dir===1) S.dir=0;
});

/* ---------------- Buttons ---------------- */
playBtn.addEventListener('click', ()=>{
  try{ ac(); }catch(_){}
  sfx.click();
  S.started = true;
  startOverlay.style.display = 'none';
  startRound(); renderHUD();
});
replayBtn.addEventListener('click', ()=>{ sfx.click(); resetGame(); });
soundBtn.addEventListener('click', ()=>{
  S.sound = !S.sound;
  soundBtn.textContent = S.sound ? '🔊' : '🔇';
  soundBtn.classList.toggle('off', !S.sound);
  if(S.sound) sfx.click();
});
voiceBtn.addEventListener('click', ()=>{
  S.voice = !S.voice;
  voiceBtn.textContent = S.voice ? '🗣️' : '🚫';
  voiceBtn.classList.toggle('off', !S.voice);
  if(S.voice){ sfx.click(); speak(`Find the letter ${S.target?S.target.L:'B'}!`); }
  else { try{window.speechSynthesis.cancel();}catch(_){} }
});
speakBtn.addEventListener('click', ()=>{
  sfx.click();
  if(S.target) speak(`Find the letter ${S.target.L}! ${S.target.L} is for ${S.target.word}!`);
});

/* ---------------- Boot ---------------- */
function boot(){
  measure();
  nextPlan();
  S.target = byLetter[S.plan[0]];
  taskLetter.textContent = S.target.L;
  taskWord1.textContent = S.target.L;
  taskWord2.textContent = S.target.word;
  document.getElementById('taskEmoji').textContent = S.target.emoji;
  buildPile();           // pretty pile behind the start card
  S.stars = [];
  renderHUD();
  setTimeout(measure, 100);
  requestAnimationFrame(t=>{ S.lastT=t; requestAnimationFrame(tick); });
}
/* Optional branding: if the owner exports the PDF logo as logo.png next to
   index.html, show it. fetch() (unlike <img>) never logs a console error
   when the file is absent. */
fetch('logo.png', { method:'HEAD' }).then(r=>{
  if(!r.ok) return;
  const img = document.createElement('img');
  img.className = 'logo-img'; img.alt = 'nodee for kids logo'; img.src = 'logo.png';
  const badge = document.querySelector('.logo-badge');
  if(badge) badge.prepend(img);
}).catch(()=>{});

/* QA hook for automated browser testing (read-only handle + actions). */
window.__game = { S, doDrop, resetGame, startRound, findCatch, clawCX, ropeTip, TOTAL_ROUNDS, version:'1.1.0' };
boot();
})();
