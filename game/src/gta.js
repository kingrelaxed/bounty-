const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const WORLD = 3000;
const keys = new Set();
let screen = 'title';
let last = performance.now();
let time = 0;
let wanted = 0;
let cash = 450;
let health = 100;
let mission = 0;
let missionText = 'Meet Nova at the cyan marker';
let inCar = false;
let shots = [];
let missionPrompt = '';
let missionPromptTime = 0;
let shotCooldown = 0;

const player = { x: 1450, y: 1500, vx: 0, vy: 0, angle: 0 };
const camera = { x: 0, y: 0 };
const missionMarkers = [
  { x: 1770, y: 1320, label: 'Nova', action: 'Meet Nova' },
  { x: 2420, y: 540, label: 'The Marina', action: 'Win the marina meet' },
  { x: 520, y: 2360, label: 'Safehouse', action: 'Secure the safehouse' },
];

const pedestrians = Array.from({ length: 34 }, (_, i) => ({
  x: 180 + (i * 277) % (WORLD - 360),
  y: 220 + (i * 419) % (WORLD - 440),
  dx: i % 2 ? 1 : -1,
  dy: i % 3 === 0 ? 1 : 0,
  speed: 18 + i % 5 * 4,
  color: ['#f4c27a', '#9ed1b6', '#d7a2bc', '#89b9d0'][i % 4],
}));

const traffic = Array.from({ length: 18 }, (_, i) => {
  const vertical = i % 2 === 0;
  return {
    x: vertical ? 510 + (i % 5) * 500 : 100 + i * 163,
    y: vertical ? 100 + i * 171 : 510 + (i % 5) * 500,
    vertical,
    speed: 65 + i % 4 * 18,
    direction: i % 3 ? 1 : -1,
    color: ['#e45757', '#53c7b4', '#dca64a', '#7b86d1'][i % 4],
  };
});

const police = Array.from({ length: 6 }, (_, i) => ({
  x: 300 + i * 430,
  y: 260 + (i % 3) * 650,
  angle: 0,
}));

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', resize);
resize();

addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  keys.add(key);
  if (e.key === 'Escape' && screen !== 'title' && screen !== 'over') screen = screen === 'pause' ? 'play' : 'pause';
  if (e.key === 'Enter' && screen === 'title') start();
  if (e.key === 'Enter' && screen === 'over') restart();
  if (e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 'f') interact();
  if (e.key.toLowerCase() === 'p') saveGame();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

function saveGame() {
  try {
    localStorage.setItem('neon-vice-6-save', JSON.stringify({ x: player.x, y: player.y, cash, mission, health }));
    status.textContent = 'Game saved';
  } catch {}
}

function loadGame() {
  try {
    const save = JSON.parse(localStorage.getItem('neon-vice-6-save') || 'null');
    if (!save) return;
    player.x = save.x || player.x;
    player.y = save.y || player.y;
    cash = save.cash ?? cash;
    mission = clamp(save.mission ?? mission, 0, 3);
    health = save.health ?? health;
    syncMission();
  } catch {}
}

function syncMission() {
  if (mission === 0) missionText = 'Meet Nova at the cyan marker';
  else if (mission === 1) missionText = 'Race to the marina';
  else if (mission === 2) missionText = 'Return to the safehouse';
  else missionText = 'You own the coast';
}

function start() {
  loadGame();
  missionPrompt = 'Find the cyan mission marker';
  missionPromptTime = 3;
  screen = 'play';
  health = 100;
  wanted = 0;
  status.textContent = missionText;
}

function restart() {
  player.x = 1450;
  player.y = 1500;
  player.vx = 0;
  player.vy = 0;
  cash = 450;
  health = 100;
  mission = 0;
  wanted = 0;
  inCar = false;
  shots = [];
  police.forEach((cop, i) => {
    cop.x = 300 + i * 430;
    cop.y = 260 + (i % 3) * 650;
  });
  missionPrompt = 'A new run begins';
  missionPromptTime = 3;
  syncMission();
  screen = 'play';
  status.textContent = 'Mission restarted';
}

function interact() {
  const marker = missionMarkers[mission];
  if (marker) {
    const dist = Math.hypot(player.x - marker.x, player.y - marker.y);
    if (dist < 75) {
      if (mission === 0) {
        mission = 1;
        missionText = 'Race to the marina';
        cash += 120;
        missionPrompt = 'Nova: Get to the marina. Police on patrol.';
        missionPromptTime = 4;
      } else if (mission === 1) {
        mission = 2;
        missionText = 'Return to the safehouse';
        cash += 300;
        missionPrompt = 'Marina secured. Take it back to the safehouse.';
        missionPromptTime = 4;
      } else {
        mission = 3;
        missionText = 'You own the coast';
        cash += 500;
        missionPrompt = 'Mission complete: Neon Coast is yours.';
        missionPromptTime = 5;
      }
      status.textContent = missionText;
      saveGame();
      return;
    }
  }
  if (!inCar) {
    for (const car of traffic) {
      if (Math.hypot(player.x - car.x, player.y - car.y) < 45) {
        inCar = true;
        raiseWanted(1);
        missionPrompt = 'Vehicle stolen - wanted level 1';
        missionPromptTime = 3;
        status.textContent = 'Vehicle stolen';
        break;
      }
    }
  } else {
    inCar = false;
  }
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function raiseWanted(level) {
  wanted = clamp(Math.max(wanted, level), 0, 5);
  for (const cop of police) {
    if (Math.hypot(cop.x - player.x, cop.y - player.y) > 900) {
      cop.x = clamp(player.x + (cop.x < player.x ? -520 : 520), 30, WORLD - 30);
      cop.y = clamp(player.y + (cop.y < player.y ? -360 : 360), 30, WORLD - 30);
    }
  }
}

function update(dt) {
  time += dt;
  if (screen !== 'play') return;
  let dx = 0;
  let dy = 0;
  if (keys.has('w') || keys.has('arrowup')) dy -= 1;
  if (keys.has('s') || keys.has('arrowdown')) dy += 1;
  if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
  if (keys.has('d') || keys.has('arrowright')) dx += 1;
  const len = Math.hypot(dx, dy) || 1;
  const speed = inCar ? 320 : 155;
  dx /= len;
  dy /= len;
  player.vx += (dx * speed - player.vx) * Math.min(1, dt * 8);
  player.vy += (dy * speed - player.vy) * Math.min(1, dt * 8);
  player.x = clamp(player.x + player.vx * dt, 30, WORLD - 30);
  player.y = clamp(player.y + player.vy * dt, 30, WORLD - 30);
  if (Math.hypot(player.vx, player.vy) > 5) player.angle = Math.atan2(player.vy, player.vx);

  shotCooldown -= dt;
  if (keys.has(' ') && shotCooldown <= 0) {
    shots.push({ x: player.x, y: player.y, angle: player.angle, life: 0.18 });
    shotCooldown = 0.16;
    raiseWanted(wanted + 0.35);
  }
  shots = shots.filter((s) => (s.life -= dt) > 0);

  for (const p of pedestrians) {
    p.x += p.dx * p.speed * dt;
    p.y += p.dy * p.speed * dt;
    if (p.x < 40 || p.x > WORLD - 40) p.dx *= -1;
    if (p.y < 40 || p.y > WORLD - 40) p.dy *= -1;
  }
  for (const car of traffic) {
    if (car.vertical) car.y += car.speed * car.direction * dt;
    else car.x += car.speed * car.direction * dt;
    if (car.y < -100) car.y = WORLD + 100;
    if (car.y > WORLD + 100) car.y = -100;
    if (car.x < -100) car.x = WORLD + 100;
    if (car.x > WORLD + 100) car.x = -100;
  }

  missionPromptTime -= dt;
  if (missionPromptTime <= 0) missionPrompt = '';

  let closestCopDistance = Infinity;
  if (wanted > 0) {
    for (const cop of police) {
      const dx = player.x - cop.x;
      const dy = player.y - cop.y;
      const d = Math.hypot(dx, dy) || 1;
      closestCopDistance = Math.min(closestCopDistance, d);
      cop.angle = Math.atan2(dy, dx);
      if (d > 80) {
        cop.x += dx / d * (60 + wanted * 25) * dt;
        cop.y += dy / d * (60 + wanted * 25) * dt;
      } else {
        health -= dt * (inCar ? 7 : 5);
      }
    }
    if (closestCopDistance > 420) wanted = clamp(wanted - dt * 0.035, 0, 5);
  }
  if (health <= 0) screen = 'over';
  camera.x += (player.x - innerWidth / 2 - camera.x) * Math.min(1, dt * 5);
  camera.y += (player.y - innerHeight / 2 - camera.y) * Math.min(1, dt * 5);
  camera.x = clamp(camera.x, 0, Math.max(0, WORLD - innerWidth));
  camera.y = clamp(camera.y, 0, Math.max(0, WORLD - innerHeight));

  const marker = missionMarkers[mission];
  if (marker && Math.hypot(player.x - marker.x, player.y - marker.y) < 55) {
    status.textContent = `Press E or F: ${marker.action}`;
  } else if (status.textContent.startsWith('Press E or F:')) {
    status.textContent = missionText;
  }
}

function worldToScreen(x, y) { return { x: x - camera.x, y: y - camera.y }; }

function drawRoadGrid() {
  ctx.fillStyle = '#18322d';
  ctx.fillRect(0, 0, WORLD, WORLD);
  ctx.fillStyle = '#314047';
  for (let x = 180; x < WORLD; x += 500) ctx.fillRect(x, 0, 130, WORLD);
  for (let y = 180; y < WORLD; y += 500) ctx.fillRect(0, y, WORLD, 130);
  ctx.fillStyle = '#d6bd69';
  ctx.globalAlpha = 0.38;
  for (let x = 245; x < WORLD; x += 500) for (let y = 20; y < WORLD; y += 44) ctx.fillRect(x, y, 4, 20);
  for (let y = 245; y < WORLD; y += 500) for (let x = 20; x < WORLD; x += 44) ctx.fillRect(x, y, 20, 4);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#1e4a43';
  for (let bx = 350; bx < WORLD; bx += 500) for (let by = 350; by < WORLD; by += 500) ctx.fillRect(bx, by, 290, 290);
  ctx.fillStyle = '#f0ad56';
  ctx.globalAlpha = 0.7;
  ctx.font = '700 58px system-ui';
  ctx.fillText('NEON COUNTY', 560, 920);
  ctx.globalAlpha = 1;
}

function drawMarker() {
  const marker = missionMarkers[mission];
  if (!marker) return;
  const p = worldToScreen(marker.x, marker.y);
  const pulse = 38 + Math.sin(time * 4) * 8;
  ctx.strokeStyle = '#58f2d1';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(p.x, p.y, pulse, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#58f2d1';
  ctx.beginPath(); ctx.moveTo(p.x, p.y - 28); ctx.lineTo(p.x - 20, p.y - 62); ctx.lineTo(p.x + 20, p.y - 62); ctx.closePath(); ctx.fill();
}

function drawActors() {
  for (const p of pedestrians) {
    const s = worldToScreen(p.x, p.y);
    if (s.x < -20 || s.y < -20 || s.x > innerWidth + 20 || s.y > innerHeight + 20) continue;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(s.x, s.y - 7, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#252c3a';
    ctx.fillRect(s.x - 5, s.y, 10, 14);
  }
  for (const car of traffic) {
    const s = worldToScreen(car.x, car.y);
    if (s.x < -70 || s.y < -70 || s.x > innerWidth + 70 || s.y > innerHeight + 70) continue;
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(car.vertical ? Math.PI / 2 : 0);
    ctx.fillStyle = car.color; ctx.fillRect(-24, -13, 48, 26);
    ctx.fillStyle = '#a9d1d8'; ctx.fillRect(-8, -10, 16, 20); ctx.restore();
  }
  for (const cop of police) {
    if (wanted <= 0) continue;
    const s = worldToScreen(cop.x, cop.y);
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(cop.angle);
    ctx.fillStyle = '#e8eef7'; ctx.fillRect(-18, -10, 36, 20);
    ctx.fillStyle = '#2d55a4'; ctx.fillRect(-18, -10, 12, 20);
    ctx.fillStyle = Math.sin(time * 12) > 0 ? '#ff4b55' : '#4aaaff'; ctx.fillRect(-3, -13, 6, 26);
    ctx.restore();
  }
}

function drawPlayer() {
  const s = worldToScreen(player.x, player.y);
  ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(player.angle);
  if (inCar) {
    ctx.fillStyle = '#f2a65a'; ctx.fillRect(-25, -14, 50, 28);
    ctx.fillStyle = '#9fd1dc'; ctx.fillRect(-7, -11, 14, 22);
  } else {
    ctx.fillStyle = '#e5b2ff'; ctx.beginPath(); ctx.arc(0, -9, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4e3e78'; ctx.fillRect(-9, 0, 18, 20);
    ctx.fillStyle = '#d5f0ff'; ctx.fillRect(8, 2, 23, 4);
  }
  ctx.restore();
  ctx.fillStyle = '#c9ffff'; ctx.globalAlpha = 0.28;
  ctx.beginPath(); ctx.arc(s.x, s.y, 34 + Math.sin(time * 5) * 3, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawShots() {
  ctx.strokeStyle = '#ffe978'; ctx.lineWidth = 3;
  for (const shot of shots) {
    const s = worldToScreen(shot.x + Math.cos(shot.angle) * 38, shot.y + Math.sin(shot.angle) * 38);
    ctx.beginPath();
    ctx.moveTo(s.x - Math.cos(shot.angle) * 18, s.y - Math.sin(shot.angle) * 18);
    ctx.lineTo(s.x + Math.cos(shot.angle) * 18, s.y + Math.sin(shot.angle) * 18);
    ctx.stroke();
  }
}

function drawHUD() {
  ctx.fillStyle = 'rgba(8,14,24,.86)'; ctx.fillRect(24, 24, 270, 118);
  ctx.fillStyle = '#fff'; ctx.font = '700 22px system-ui'; ctx.fillText(missionText, 42, 53);
  ctx.fillStyle = '#58f2d1'; ctx.fillText(`$${cash}`, 42, 82);
  ctx.fillStyle = '#ff6b86'; ctx.fillRect(42, 98, 190 * health / 100, 10);
  ctx.fillStyle = '#fff'; ctx.font = '700 15px system-ui';
  ctx.fillText(`HEALTH ${Math.ceil(health)}  |  WANTED`, 42, 128);
  const heat = Math.min(5, Math.max(0, Math.ceil(wanted)));
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < heat ? '#ffcf57' : 'rgba(255,255,255,.22)';
    ctx.beginPath();
    ctx.moveTo(205 + i * 17, 119);
    ctx.lineTo(208 + i * 17, 125);
    ctx.lineTo(202 + i * 17, 125);
    ctx.closePath();
    ctx.fill();
  }
  if (missionPrompt) {
    ctx.fillStyle = 'rgba(8,14,24,.9)';
    ctx.fillRect(innerWidth / 2 - 300, innerHeight - 72, 600, 48);
    ctx.fillStyle = '#58f2d1';
    ctx.font = '800 18px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(missionPrompt, innerWidth / 2, innerHeight - 42);
    ctx.textAlign = 'left';
  }

  const size = 150, x = innerWidth - size - 24, y = 24;
  ctx.fillStyle = 'rgba(8,14,24,.88)'; ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#314047'; ctx.fillRect(x + 12, y + 12, size - 24, size - 24);
  const marker = missionMarkers[mission];
  if (marker) {
    ctx.fillStyle = '#58f2d1';
    ctx.beginPath();
    ctx.arc(x + 12 + marker.x / WORLD * (size - 24), y + 12 + marker.y / WORLD * (size - 24), 4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (wanted > 0) {
    ctx.fillStyle = '#ff5d68';
    for (const cop of police) {
      ctx.beginPath();
      ctx.arc(x + 12 + cop.x / WORLD * (size - 24), y + 12 + cop.y / WORLD * (size - 24), 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#58f2d1';
  ctx.beginPath(); ctx.arc(x + 12 + player.x / WORLD * (size - 24), y + 12 + player.y / WORLD * (size - 24), 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '700 13px system-ui'; ctx.fillText('NEON COUNTY', x + 22, y + 166);
}

function drawTitle() {
  ctx.fillStyle = '#09101e'; ctx.fillRect(0, 0, innerWidth, innerHeight);
  ctx.fillStyle = '#58f2d1'; ctx.fillRect(0, innerHeight * 0.62, innerWidth, innerHeight * 0.38);
  ctx.fillStyle = '#ff8099'; ctx.font = '900 82px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('NEON VICE', innerWidth / 2, innerHeight * 0.35);
  ctx.fillStyle = '#f8d978'; ctx.font = '900 54px system-ui'; ctx.fillText('6', innerWidth / 2 + 290, innerHeight * 0.35);
  ctx.fillStyle = '#fff'; ctx.font = '700 22px system-ui'; ctx.fillText('A neon heat open-world story', innerWidth / 2, innerHeight * 0.43);
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(innerWidth / 2 - 170, innerHeight * 0.53, 340, 58);
  ctx.fillStyle = '#fff'; ctx.font = '800 20px system-ui'; ctx.fillText('PRESS ENTER', innerWidth / 2, innerHeight * 0.57);
  ctx.fillStyle = '#09101e'; ctx.font = '700 17px system-ui';
  ctx.fillText('WASD / ARROWS MOVE  ·  E / F INTERACT  ·  SPACE FIRE', innerWidth / 2, innerHeight * 0.66);
  ctx.fillText('P SAVE  ·  ESC PAUSE  ·  STEAL CARS TO TEST WANTED HEAT', innerWidth / 2, innerHeight * 0.70);
  ctx.textAlign = 'left';
}

function drawOver() {
  ctx.fillStyle = 'rgba(9,13,24,.92)'; ctx.fillRect(0, 0, innerWidth, innerHeight);
  ctx.fillStyle = '#ff6b86'; ctx.font = '900 72px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('WASTED', innerWidth / 2, innerHeight / 2);
  ctx.fillStyle = '#fff'; ctx.font = '700 20px system-ui'; ctx.fillText('Press Enter to restart', innerWidth / 2, innerHeight / 2 + 52);
  ctx.textAlign = 'left';
}

function drawPause() {
  ctx.fillStyle = 'rgba(9,13,24,.82)'; ctx.fillRect(0, 0, innerWidth, innerHeight);
  ctx.fillStyle = '#fff'; ctx.font = '900 56px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('PAUSED', innerWidth / 2, innerHeight / 2);
  ctx.font = '700 18px system-ui'; ctx.fillText('Esc to resume · P to save', innerWidth / 2, innerHeight / 2 + 42);
  ctx.textAlign = 'left';
}

function draw() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  if (screen === 'title') { drawTitle(); return; }
  if (screen === 'over') { drawOver(); return; }
  ctx.save(); ctx.translate(-camera.x, -camera.y);
  drawRoadGrid(); drawMarker(); drawActors(); drawShots(); drawPlayer(); ctx.restore();
  drawHUD();
  if (screen === 'pause') drawPause();
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  screen = 'play';
  player.x = shot === 'start' ? 1450 : shot === 'mission' ? 1770 : 2100;
  player.y = shot === 'start' ? 1500 : shot === 'mission' ? 1320 : 1120;
  camera.x = player.x - innerWidth / 2;
  camera.y = player.y - innerHeight / 2;
  if (shot === 'play') { inCar = true; wanted = 2; mission = 1; }
  if (shot === 'mission') { inCar = true; wanted = 3; mission = 1; }
  syncMission();
  let painted = 0;
  function paintShot() {
    update(0); draw(); painted += 1;
    if (painted < 2) requestAnimationFrame(paintShot);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paintShot);
} else {
  loadGame();
  requestAnimationFrame(frame);
}
