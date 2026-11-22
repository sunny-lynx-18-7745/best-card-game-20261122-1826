// Starfall Duel — an original turn-based card duel of the four suits.
// You vs Lyra, Star Herald. 40 life each, energy that grows each turn,
// a 30-card deck of 10 original cards (3 copies each). No network, no
// assets: every suit icon is inline SVG, every sound is a WebAudio blip.
// Screenshots: ?shot=start|play|win|loss&seed=N stages a real scene by
// playing the rules forward from a fresh deck with a fixed seed.

const $ = (id) => document.getElementById(id);

// ---------- seeded random ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rnd) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------- suits & cards (original designs) ----------
const SUITS = {
  ember: { name: 'Ember', color: '#d9481f', dark: '#8f2a0e', blurb: 'strike' },
  tide: { name: 'Tide', color: '#1f7fd0', dark: '#0e4a7d', blurb: 'flow' },
  leaf: { name: 'Leaf', color: '#2f9e44', dark: '#14532a', blurb: 'mend' },
  star: { name: 'Star', color: '#c8930a', dark: '#7a5200', blurb: 'power' },
};
const ICONS = {
  flame: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 3-2 4-2 7 0 1.5 1 2.5 2 2.5S14 10.5 14 9c2 1.5 3 3.5 3 6a5 5 0 0 1-10 0c0-4 3-6 5-13z"/></svg>',
  drop: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/></svg>',
  leaf: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4C10 4 4 10 4 20c10 0 16-6 16-16zM6 18c3-5 7-8 11-10"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l2.6 6.6L21 8.2l-5 4.6 1.4 6.7L12 16l-5.4 3.5L8 12.8 3 8.2l6.4-.6z"/></svg>',
};
const SUIT_ICON = { ember: 'flame', tide: 'drop', leaf: 'leaf', star: 'star' };

// effect: dmg (damage), hits (times), shield, heal, draw
const CARD_DEFS = [
  { id: 'ember-strike', unit: 'damage', name: 'Ember Strike', suit: 'ember', cost: 1, power: 4, powerLabel: '4 damage', text: 'Deal 4 damage.', fx: { dmg: 4 } },
  { id: 'tide-lash', unit: 'damage', name: 'Tide Lash', suit: 'tide', cost: 2, power: 6, powerLabel: '6 damage', text: 'Deal 6 damage.', fx: { dmg: 6 } },
  { id: 'star-lance', unit: 'damage', name: 'Star Lance', suit: 'star', cost: 3, power: 9, powerLabel: '9 damage', text: 'Deal 9 damage.', fx: { dmg: 9 } },
  { id: 'leaf-mend', unit: 'life', name: 'Leaf Mend', suit: 'leaf', cost: 2, power: 6, powerLabel: '6 life', text: 'Restore 6 life.', fx: { heal: 6 } },
  { id: 'ember-aegis', unit: 'shield', name: 'Ember Aegis', suit: 'ember', cost: 1, power: 5, powerLabel: '5 shield', text: 'Gain 5 shield.', fx: { shield: 5 } },
  { id: 'tide-insight', unit: 'draw', name: 'Tide Insight', suit: 'tide', cost: 1, power: 2, powerLabel: 'draw 2', text: 'Draw 2 cards.', fx: { draw: 2 } },
  { id: 'star-nova', unit: 'damage + draw', name: 'Star Nova', suit: 'star', cost: 4, power: 7, powerLabel: '7 damage', text: 'Deal 7 damage, draw 1.', fx: { dmg: 7, draw: 1 } },
  { id: 'leaf-thorn', unit: 'damage + shield', name: 'Leaf Thorn', suit: 'leaf', cost: 2, power: 3, powerLabel: '3 + 3', text: 'Deal 3 damage, gain 3 shield.', fx: { dmg: 3, shield: 3 } },
  { id: 'ember-surge', unit: 'damage × 2', name: 'Ember Surge', suit: 'ember', cost: 2, power: 6, powerLabel: '3 × 2', text: 'Deal 3 damage × 2.', fx: { dmg: 3, hits: 2 } },
  { id: 'leaf-veil', unit: 'shield + draw', name: 'Leaf Veil', suit: 'leaf', cost: 2, power: 8, powerLabel: '8 shield', text: 'Gain 8 shield, draw 1.', fx: { shield: 8, draw: 1 } },
];
const MAX_HP = 40;
const START_ENERGY = 3;
const MAX_ENERGY = 7;
const HAND_LIMIT = 7;

// ---------- sound (synthesised, no files) ----------
let audioCtx = null;
let soundOn = true;
function beep(freq, dur, type = 'sine', gain = 0.06) {
  if (!soundOn) return;
  try {
    audioCtx = audioCtx ?? new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(gain, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch { /* sound is decoration; a silent game is still a game */ }
}
const sfx = {
  play: () => beep(520, 0.09, 'triangle'),
  hurt: () => beep(140, 0.16, 'sawtooth', 0.05),
  heal: () => { beep(660, 0.1); setTimeout(() => beep(880, 0.12), 90); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.22, 'triangle', 0.07), i * 130)),
  loss: () => [392, 330, 262, 196].forEach((f, i) => setTimeout(() => beep(f, 0.22, 'sawtooth', 0.05), i * 150)),
};

// ---------- state ----------
function buildDeck(rnd) {
  const deck = [];
  for (const def of CARD_DEFS) for (let i = 0; i < 3; i += 1) deck.push(def.id);
  return shuffle(deck, rnd);
}
function newFighter(name, rnd) {
  return { name, hp: MAX_HP, shield: 0, energy: 0, maxEnergy: 0, deck: buildDeck(rnd), hand: [], discard: [] };
}
let S = null; // game state
let rnd = mulberry32(1);
let seed = 1;

function freshState(s) {
  seed = s;
  rnd = mulberry32(s);
  S = {
    phase: 'title', // title | play | over
    active: 'player',
    turn: 1,
    winner: null,
    log: [],
    stats: { cardsPlayed: 0, damageDealt: 0 },
    player: newFighter('You', rnd),
    rival: newFighter('Lyra', rnd),
    lastCard: null,
    busy: false,
  };
  return S;
}

function drawCards(f, n) {
  for (let i = 0; i < n; i += 1) {
    if (f.hand.length >= HAND_LIMIT) return;
    if (f.deck.length === 0) {
      if (f.discard.length === 0) return;
      f.deck = shuffle(f.discard.splice(0), rnd);
      log(`${f.name} reshuffle${f.name === 'You' ? '' : 's'} the discard pile into the deck.`);
    }
    f.hand.push(f.deck.pop());
  }
}

function dealDamage(target, n, byPlayer) {
  let left = n;
  const soaked = Math.min(target.shield, left);
  target.shield -= soaked; left -= soaked;
  target.hp = Math.max(0, target.hp - left);
  if (byPlayer) S.stats.damageDealt += n;
  return { soaked, dealt: left };
}

function applyCard(who, cardId) {
  const def = CARD_DEFS.find((c) => c.id === cardId);
  const me = S[who];
  const foe = S[who === 'player' ? 'rival' : 'player'];
  const fx = def.fx;
  const parts = [];
  if (fx.dmg) {
    const hits = fx.hits ?? 1;
    for (let h = 0; h < hits; h += 1) {
      const r = dealDamage(foe, fx.dmg, who === 'player');
      parts.push(`<span class="dmg">${fx.dmg} damage</span>${r.soaked ? ` (${r.soaked} soaked by shield)` : ''}`);
    }
    sfx.hurt();
  }
  if (fx.shield) { me.shield += fx.shield; parts.push(`<span class="shd">+${fx.shield} shield</span>`); }
  if (fx.heal) {
    const healed = Math.min(fx.heal, MAX_HP - me.hp);
    me.hp += healed; parts.push(`<span class="heal">+${healed} life</span>`);
    if (healed) sfx.heal();
  }
  if (fx.draw) { drawCards(me, fx.draw); parts.push(`draws ${fx.draw}`); }
  S.stats.cardsPlayed += 1;
  S.lastCard = def;
  log(`<b>${me.name}</b> play${who === 'player' ? '' : 's'} <b>${def.name}</b> — ${parts.join(', ')}.`);
}

function playCard(who, handIndex) {
  const me = S[who];
  const cardId = me.hand[handIndex];
  if (!cardId) return false;
  const def = CARD_DEFS.find((c) => c.id === cardId);
  if (me.energy < def.cost) return false;
  me.energy -= def.cost;
  me.hand.splice(handIndex, 1);
  me.discard.push(cardId);
  applyCard(who, cardId);
  sfx.play();
  return true;
}

function beginTurn(who) {
  const me = S[who];
  // energy grows with the round: both sides track the same round number
  me.maxEnergy = Math.min(MAX_ENERGY, START_ENERGY + (S.turn - 1));
  me.energy = me.maxEnergy;
  drawCards(me, 1);
}

function checkEnd() {
  if (S.rival.hp <= 0) { endGame('player'); return true; }
  if (S.player.hp <= 0) { endGame('rival'); return true; }
  return false;
}

function endGame(winner) {
  S.phase = 'over';
  S.winner = winner;
  if (winner === 'player') { sfx.win(); log('<b>You win the duel!</b>'); } else { sfx.loss(); log('<b>Lyra wins the duel.</b>'); }
  render();
}

function startDuel() {
  freshState(seed);
  S.phase = 'play';
  drawCards(S.player, 5);
  drawCards(S.rival, 5);
  beginTurn('player');
  S.active = 'player';
  log('The duel begins. <b>You</b> draw 5 cards and take the first turn.');
  render();
}

// ---------- AI ----------
function aiChoose() {
  const me = S.rival;
  const hand = me.hand.map((id, i) => ({ def: CARD_DEFS.find((c) => c.id === id), i }));
  const playable = hand.filter((c) => c.def.cost <= me.energy);
  if (!playable.length) return -1;
  // Lethal first.
  const lethal = playable.find((c) => (c.def.fx.dmg ?? 0) * (c.def.fx.hits ?? 1) >= S.player.hp + S.player.shield);
  if (lethal) return lethal.i;
  // Heal when hurt, guard when exposed, draw when short of cards.
  if (me.hp <= 12) {
    const heal = playable.find((c) => c.def.fx.heal);
    if (heal) return heal.i;
  }
  if (me.shield === 0) {
    const guard = playable.filter((c) => c.def.fx.shield).sort((a, b) => b.def.fx.shield - a.def.fx.shield)[0];
    if (guard && me.energy >= guard.def.cost + 1) return guard.i;
  }
  if (me.hand.length <= 3) {
    const draw = playable.find((c) => c.def.fx.draw);
    if (draw) return draw.i;
  }
  // Otherwise the biggest hit we can afford.
  const dmg = playable.filter((c) => c.def.fx.dmg).sort((a, b) => (b.def.fx.dmg * (b.def.fx.hits ?? 1)) - (a.def.fx.dmg * (a.def.fx.hits ?? 1)))[0];
  if (dmg) return dmg.i;
  return playable[0].i;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function aiTurn() {
  S.active = 'rival';
  S.busy = true;
  render();
  await sleep(650);
  beginTurn('rival');
  render();
  await sleep(450);
  let guard = 0;
  while (guard < 12 && S.phase === 'play') {
    guard += 1;
    const pick = aiChoose();
    if (pick < 0) break;
    playCard('rival', pick);
    render();
    if (checkEnd()) { S.busy = false; return; }
    await sleep(750);
  }
  log('Lyra ends her turn.');
  S.turn += 1;
  S.active = 'player';
  S.busy = false;
  beginTurn('player');
  log(`<b>Turn ${S.turn}</b> — your move.`);
  render();
}

function endPlayerTurn() {
  if (S.phase !== 'play' || S.active !== 'player' || S.busy) return;
  log('You end your turn.');
  aiTurn();
}

// ---------- autopilot for screenshots (plays the real rules, no timers) ----------
function autoPlayCard(who, strategy) {
  const me = S[who];
  const foe = S[who === 'player' ? 'rival' : 'player'];
  const hand = me.hand.map((id, i) => ({ def: CARD_DEFS.find((c) => c.id === id), i }))
    .filter((c) => c.def.cost <= me.energy);
  if (!hand.length) return false;
  let pick = null;
  if (strategy === 'win') {
    // aggressive: biggest damage first, heal only when nearly dead
    if (me.hp <= 8) pick = hand.find((c) => c.def.fx.heal);
    pick = pick ?? hand.filter((c) => c.def.fx.dmg).sort((a, b) => (b.def.fx.dmg * (b.def.fx.hits ?? 1)) - (a.def.fx.dmg * (a.def.fx.hits ?? 1)))[0];
    pick = pick ?? hand.find((c) => c.def.fx.draw) ?? hand[0];
  } else if (strategy === 'lose') {
    // passive: only draw/shield, never damage — the rival wins
    pick = hand.find((c) => c.def.fx.draw) ?? hand.find((c) => c.def.fx.shield && !c.def.fx.dmg) ?? null;
    if (!pick) return false;
  } else {
    // balanced: like the AI
    pick = hand.filter((c) => c.def.fx.dmg).sort((a, b) => (b.def.fx.dmg * (b.def.fx.hits ?? 1)) - (a.def.fx.dmg * (a.def.fx.hits ?? 1)))[0]
      ?? hand.find((c) => c.def.fx.draw) ?? hand[0];
  }
  return playCard(who, pick.i);
}
function autoTurn(who, strategy) {
  beginTurn(who);
  let guard = 0;
  while (guard < 12 && S.phase === 'play') {
    guard += 1;
    if (!autoPlayCard(who, strategy)) break;
    if (checkEnd()) return;
  }
}
function stageShot(name, s) {
  freshState(s);
  if (name === 'start') {
    // title screen over a fresh table: draw the opening hands so the
    // table behind the title already looks alive.
    drawCards(S.player, 5); drawCards(S.rival, 5);
    S.phase = 'title';
    render();
    return;
  }
  S.phase = 'play';
  drawCards(S.player, 5); drawCards(S.rival, 5);
  beginTurn('player');
  if (name === 'play') {
    for (let t = 0; t < 2 && S.phase === 'play'; t += 1) {
      autoTurn('player', 'balanced');
      if (S.phase !== 'play') break;
      autoTurn('rival', 'balanced');
      if (S.phase !== 'play') break;
      S.turn += 1;
    }
    // leave the player mid-turn with a full hand and a card on the table
    if (S.phase === 'play') {
      beginTurn('player');
      autoPlayCard('player', 'balanced');
    }
    render();
    return;
  }
  if (name === 'win') {
    for (let t = 0; t < 40 && S.phase === 'play'; t += 1) {
      autoTurn('player', 'win');
      if (S.phase !== 'play') break;
      autoTurn('rival', 'lose');
      if (S.phase !== 'play') break;
      S.turn += 1;
    }
    render();
    return;
  }
  // loss
  for (let t = 0; t < 40 && S.phase === 'play'; t += 1) {
    autoTurn('player', 'lose');
    if (S.phase !== 'play') break;
    autoTurn('rival', 'win');
    if (S.phase !== 'play') break;
    S.turn += 1;
  }
  render();
}

// ---------- log / toast ----------
function log(html) {
  S.log.unshift(html);
  if (S.log.length > 40) S.log.length = 40;
  const ul = $('logList');
  if (ul) ul.innerHTML = S.log.slice(0, 7).map((l) => `<li>${l}</li>`).join('');
}
let toastTimer = null;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
}

// ---------- rendering ----------
function cardEl(def, opts = {}) {
  const suit = SUITS[def.suit];
  const b = document.createElement('button');
  b.className = 'card' + (opts.spot ? ' spot' : '');
  b.type = 'button';
  b.disabled = !!opts.disabled;
  b.setAttribute('aria-label', `${def.name}, ${suit.name} suit, cost ${def.cost}, ${def.text}`);
  b.innerHTML = `
    <span class="cost">${def.cost}</span>
    <span class="suit-band" style="background:${suit.color}">${ICONS[SUIT_ICON[def.suit]]}${suit.name}</span>
    <span class="art" style="color:${suit.color}">${ICONS[SUIT_ICON[def.suit]]}</span>
    <span class="power" style="color:${suit.dark}">${def.power}<small>${def.unit}</small></span>
    <span class="cname">${def.name}</span>
    <span class="ctext">${def.text}</span>
    ${opts.key != null ? `<span class="key">[${opts.key}]</span>` : ''}`;
  if (opts.onClick) b.addEventListener('click', opts.onClick);
  return b;
}
function renderFighter(prefix, f) {
  $(`${prefix}HpFill`).style.width = `${(f.hp / MAX_HP) * 100}%`;
  $(`${prefix}HpLabel`).textContent = `♥ ${f.hp} / ${MAX_HP} life`;
  $(`${prefix}Shield`).textContent = `🛡 ${f.shield} shield`;
  $(`${prefix}Energy`).textContent = `✦ ${f.energy} / ${f.maxEnergy} energy`;
  $(`${prefix}Deck`).textContent = `🂠 ${f.deck.length} in deck · ${f.discard.length} discarded`;
}
function render() {
  if (!S) return;
  renderFighter('player', S.player);
  renderFighter('rival', S.rival);
  // rival hand backs
  const rh = $('rivalHand');
  rh.innerHTML = '';
  for (let i = 0; i < S.rival.hand.length; i += 1) {
    const d = document.createElement('div');
    d.className = 'card-back';
    d.textContent = '✦';
    rh.appendChild(d);
  }
  $('rivalNote').textContent = S.rival.hand.length
    ? `Lyra holds ${S.rival.hand.length} card${S.rival.hand.length === 1 ? '' : 's'} — ${S.rival.shield ? `her ${S.rival.shield} shield will soak your strikes.` : 'no shield up. Strike now.'}`
    : 'Lyra has no cards in hand.';
  // player hand
  const hand = $('playerHand');
  hand.innerHTML = '';
  if (!S.player.hand.length) {
    const e = document.createElement('div');
    e.className = 'empty-hand';
    e.textContent = 'No cards in hand — end your turn to draw.';
    hand.appendChild(e);
  }
  S.player.hand.forEach((id, i) => {
    const def = CARD_DEFS.find((c) => c.id === id);
    const canPlay = S.phase === 'play' && S.active === 'player' && !S.busy && S.player.energy >= def.cost;
    hand.appendChild(cardEl(def, {
      disabled: !canPlay,
      key: i + 1,
      onClick: () => {
        if (!canPlay) { toast(`Not enough energy for ${def.name} (cost ${def.cost}).`); return; }
        playCard('player', i);
        render();
        if (!checkEnd()) { /* keep playing */ }
      },
    }));
  });
  // spotlight: last played card
  const sp = $('spotlight');
  sp.innerHTML = '';
  if (S.lastCard) {
    sp.appendChild(cardEl(S.lastCard, { spot: true }));
    const cap = document.createElement('div');
    cap.className = 'hint';
    cap.style.textAlign = 'left';
    cap.innerHTML = `<b>${S.lastCard.name}</b> · ${SUITS[S.lastCard.suit].name} · cost ${S.lastCard.cost}<br>${S.lastCard.text}<br><br>Your hand: <b>${S.player.hand.length}</b> cards · deck: <b>${S.player.deck.length}</b>`;
    sp.appendChild(cap);
  } else {
    sp.innerHTML = '<div class="hint">Your last played card appears here.<br><b>Click a card</b> in your hand — or press <b>1–7</b> — to play it.</div>';
  }
  // header / buttons
  const badge = $('turnBadge');
  if (S.phase === 'over') badge.textContent = S.winner === 'player' ? '★ You win!' : 'Lyra wins';
  else if (S.active === 'player') badge.textContent = `Turn ${S.turn} · Your move`;
  else badge.textContent = `Turn ${S.turn} · Lyra is thinking…`;
  badge.classList.toggle('rival', S.active === 'rival');
  $('endTurn').disabled = !(S.phase === 'play' && S.active === 'player' && !S.busy);
  // overlays
  $('titleOverlay').hidden = S.phase !== 'title';
  $('winOverlay').hidden = !(S.phase === 'over' && S.winner === 'player');
  $('lossOverlay').hidden = !(S.phase === 'over' && S.winner === 'rival');
  if (S.phase === 'over') {
    const p = S.winner === 'player' ? 'win' : 'loss';
    $(`${p}Turns`).textContent = S.turn;
    $(`${p}Cards`).textContent = S.stats.cardsPlayed;
    $(`${p}Dmg`).textContent = S.stats.damageDealt;
  }
  const status = $('status');
  status.textContent = S.phase === 'title' ? 'Starfall Duel title screen. Press Enter to begin.'
    : S.phase === 'over' ? (S.winner === 'player' ? 'You win the duel.' : 'Lyra wins the duel.')
    : `Turn ${S.turn}. You have ${S.player.hp} life, Lyra has ${S.rival.hp}. Your energy ${S.player.energy}.`;
  // keep log list in sync (log() already writes it, but a fresh render rebuilds it)
  const ul = $('logList');
  ul.innerHTML = S.log.slice(0, 7).map((l) => `<li>${l}</li>`).join('');
}

// ---------- fit the 1280x720 stage to the window ----------
function fit() {
  const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  $('stage').style.transform = `translate(-50%, -50%) scale(${s})`;
}
window.addEventListener('resize', fit);

// ---------- wiring ----------
$('startBtn').addEventListener('click', () => { beep(660, 0.1); startDuel(); });
$('winAgainBtn').addEventListener('click', () => startDuel());
$('lossAgainBtn').addEventListener('click', () => startDuel());
$('restartBtn').addEventListener('click', () => { if (S.phase !== 'title') startDuel(); else toast('Press Begin the Duel to start.'); });
$('endTurn').addEventListener('click', endPlayerTurn);
$('helpBtn').addEventListener('click', () => {
  if (S.phase === 'title') return;
  freshState(seed); S.phase = 'title';
  drawCards(S.player, 5); drawCards(S.rival, 5);
  render();
});
$('soundBtn').addEventListener('click', (e) => {
  soundOn = !soundOn;
  e.currentTarget.textContent = soundOn ? '♪ Sound on' : '♪ Sound off';
  if (soundOn) beep(660, 0.08);
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (S.phase === 'title') startDuel();
    else if (S.phase === 'over') startDuel();
    return;
  }
  if (S.phase !== 'play' || S.active !== 'player' || S.busy) return;
  if (e.key >= '1' && e.key <= '7') {
    const i = Number(e.key) - 1;
    const id = S.player.hand[i];
    if (!id) return;
    const def = CARD_DEFS.find((c) => c.id === id);
    if (S.player.energy < def.cost) { toast(`Not enough energy for ${def.name} (cost ${def.cost}).`); return; }
    playCard('player', i);
    render();
    checkEnd();
  } else if (e.key === 'e' || e.key === 'E') {
    endPlayerTurn();
  }
});

// ---------- boot ----------
fit();
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seedParam = Number(params.get('seed') || '1');
if (shot) {
  stageShot(shot, Number.isFinite(seedParam) ? seedParam : 1);
} else {
  freshState(1);
  drawCards(S.player, 5); drawCards(S.rival, 5);
  S.phase = 'title';
  render();
}
