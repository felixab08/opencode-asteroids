'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Skins ─────────────────────────────────────────────────────────────────────
// Cada skin define su silueta (nariz hacia +x) y su paleta. Las balas salen
// siempre desde NOSE = 21 para no alterar el balance, aunque el skin tenga
// otra longitud de nariz.
const SKINS = [
  {
    id: 'clasica', nombre: 'Clásica',
    color: '#fff', flameColor: 'rgba(255, 130, 0, 0.85)', bulletColor: '#fff',
    verts:   [[20, 0], [-12, -9], [-7, 0], [-12, 9]],
    flameX:  -8,
  },
  {
    id: 'dardo', nombre: 'Dardo',
    color: '#8fd0ff', flameColor: 'rgba(80, 190, 255, 0.85)', bulletColor: '#8fd0ff',
    verts:   [[23, 0], [-8, -5], [-15, 0], [-8, 5]],
    flameX:  -15,
  },
  {
    id: 'espectro', nombre: 'Espectro',
    color: '#7dffa1', flameColor: 'rgba(0, 255, 130, 0.8)', bulletColor: '#7dffa1',
    verts:   [[16, 0], [-13, -12], [-5, -4], [-5, 4], [-13, 12]],
    flameX:  -12,
  },
  {
    id: 'infierno', nombre: 'Infierno',
    color: '#ff5a44', flameColor: 'rgba(255, 90, 0, 0.9)', bulletColor: '#ff5a44',
    verts:   [[18, 0], [-6, -12], [-14, -5], [-14, 5], [-6, 12]],
    flameX:  -13,
  },
  {
    id: 'solar', nombre: 'Solar',
    color: '#ffd400', flameColor: 'rgba(255, 212, 0, 0.9)', bulletColor: '#ffd400',
    verts:   [[20, 0], [2, -8], [-12, -3], [-12, 3], [2, 8]],
    flameX:  -12,
  },
];

const SKIN_STORAGE_KEY = 'asteroids-skin';

let skinIndex = (function loadSkinIndex() {
  try {
    const id  = localStorage.getItem(SKIN_STORAGE_KEY);
    const idx = SKINS.findIndex(s => s.id === id);
    return idx >= 0 ? idx : 0;
  } catch {
    return 0;   // sin localStorage: skin por defecto
  }
})();

const activeSkin = () => SKINS[skinIndex];

function applySkin(idx) {
  skinIndex = idx;
  try { localStorage.setItem(SKIN_STORAGE_KEY, SKINS[idx].id); } catch { /* sin persistencia */ }
}

// Traza el contorno cerrado del skin (en el transform actual)
function buildShipPath(skin) {
  ctx.beginPath();
  ctx.moveTo(skin.verts[0][0], skin.verts[0][1]);
  for (let i = 1; i < skin.verts.length; i++)
    ctx.lineTo(skin.verts[i][0], skin.verts[i][1]);
  ctx.closePath();
}

// Dibuja la silueta del skin en (x, y) con ángulo y escala dados
function drawShipShape(skin, x, y, angle, scale = 1, lineWidth = 1.5) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.strokeStyle = skin.color;
  ctx.lineWidth   = lineWidth / scale;
  ctx.lineJoin    = 'round';
  buildShipPath(skin);
  ctx.stroke();
  ctx.restore();
}

// ── Menú de skins ─────────────────────────────────────────────────────────────
let skinMenuOpen = false;
let skinMenuSel  = 0;   // índice resaltado mientras el menú está abierto

function drawSkinMenu() {
  // Velo oscuro sobre la partida congelada
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font      = 'bold 40px monospace';
  ctx.fillText('SKINS', W / 2, H / 2 - 130);

  // Galería: las naves se dibujan con nariz hacia arriba
  const SPACE = 145;
  const y = H / 2 - 10;

  for (let i = 0; i < SKINS.length; i++) {
    const skin = SKINS[i];
    const x    = W / 2 + (i - (SKINS.length - 1) / 2) * SPACE;
    const sel  = i === skinMenuSel;

    drawShipShape(skin, x, y, -Math.PI / 2, 1.5);

    // Marcadores de selección a los lados de la nave resaltada
    if (sel) {
      ctx.fillStyle = skin.color;
      ctx.font      = 'bold 20px monospace';
      ctx.fillText('<', x - 52, y + 7);
      ctx.fillText('>', x + 52, y + 7);
    }

    // Nombre resaltado con el color del skin
    ctx.fillStyle = sel ? skin.color : 'rgba(255, 255, 255, 0.5)';
    ctx.font      = (sel ? 'bold ' : '') + '13px monospace';
    ctx.fillText(skin.nombre, x, y + 40);

    // Etiqueta del skin en uso
    if (i === skinIndex) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.font      = '11px monospace';
      ctx.fillText('ACTIVO', x, y - 42);
    }
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.font      = '15px monospace';
  ctx.fillText('← → ELEGIR · ENTER CONFIRMAR · ESC SALIR', W / 2, H / 2 + 90);
}

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = activeSkin().bulletColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella fugaz (asteroide especial) ───────────────────────────────────────
class ShootingStar extends Asteroid {
  static POINTS = 250;             // recompensa por destruirla
  static SPEED_MIN = 250;          // px/s (3-4× la de un asteroide normal)
  static SPEED_MAX = 320;
  static TTL       = 7;            // tiempo máximo de vida (s)

  constructor(x, y, angle) {
    super(x, y, 1);                // radio y colisiones de tamaño 1
    const speed = rand(ShootingStar.SPEED_MIN, ShootingStar.SPEED_MAX);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.ttl = ShootingStar.TTL;
    this.rotSpeed = rand(-3, 3);   // gira más rápido: sensación de "fugaz"
  }

  update(dt) {
    super.update(dt);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  split() { return []; }           // no se divide al ser destruida

  draw() {
    // Parpadeo justo antes de desaparecer (mismo patrón que PowerUp)
    if (this.ttl < 2 && Math.floor(this.ttl * 6) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Estela: rayo amarillo tenue en contra de su velocidad
    ctx.strokeStyle = 'rgba(255, 212, 0, 0.4)';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-this.vx * 0.06, -this.vy * 0.06);
    ctx.stroke();

    // Polígono irregular: halo blanco exterior + borde amarillo
    ctx.rotate(this.rot);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth   = 4;
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = '#ffd400';
    ctx.lineWidth   = 2;
    ctx.stroke();

    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoost    = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;

    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost    -= dt;

    // Boost de velocidad: empuje duplicado (la rotación no cambia)
    const THRUST_ACTIVE = this.speedBoost > 0 ? THRUST * 2 : THRUST;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST_ACTIVE * dt;
      this.vy += Math.sin(this.angle) * THRUST_ACTIVE * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = activeSkin();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = skin.color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta del skin activo
    buildShipPath(skin);
    ctx.stroke();

    // Contorno amarillo mientras dure el boost de velocidad
    if (this.speedBoost > 0) {
      ctx.strokeStyle = 'rgba(255, 212, 0, 0.9)';
      ctx.lineWidth   = 4;
      ctx.stroke();
    }

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(skin.flameX, -4);
      ctx.lineTo(skin.flameX - rand(6, 14), 0);
      ctx.lineTo(skin.flameX,  4);
      ctx.strokeStyle = skin.flameColor;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── PowerUp (Velocidad) ───────────────────────────────────────────────────────
class PowerUp {
  static DURATION = 5;    // segundos de boost al recogerlo
  static TTL       = 10;  // segundos flotando en el mapa

  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.ttl = PowerUp.TTL;
    this.dead = false;

    // Deriva lenta para que no se quede estático
    const angle = rand(0, Math.PI * 2);
    const SPEED = 25;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo justo antes de desaparecer
    if (this.ttl < 2 && Math.floor(this.ttl * 6) % 2 === 0) return;

    const pulse = 1 + 0.08 * Math.sin(performance.now() / 120);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(pulse, pulse);

    // Círculo exterior
    ctx.strokeStyle = '#ffd400';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Letra "V" centrada
    ctx.fillStyle   = '#ffd400';
    ctx.font        = 'bold 11px monospace';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('V', 0, 1);

    ctx.restore();
  }
}

// ── Texto flotante (recompensas) ─────────────────────────────────────────────
class FloatText {
  constructor(x, y, text) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.ttl  = 0.9;
    this.dead = false;
  }

  update(dt) {
    this.y -= 30 * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = Math.min(1, this.ttl / 0.9).toFixed(2);
    ctx.fillStyle   = `rgba(255,255,255,${alpha})`;
    ctx.font        = 'bold 14px monospace';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, this.x, this.y);
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups, floatTexts;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let shootingStarTimer;   // tiempo restante hasta la próxima estrella fugaz

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function spawnShootingStar() {
  // Entra por un borde aleatorio, dirigiéndose hacia el interior del mapa
  const MARGIN = 30;
  let x, y, angle;
  switch (randInt(0, 3)) {
    case 0:  x = rand(0, W);       y = MARGIN;     angle =  Math.PI / 2; break; // superior
    case 1:  x = W - MARGIN;       y = rand(0, H); angle =  Math.PI;     break; // derecha
    case 2:  x = rand(0, W);       y = H - MARGIN; angle = -Math.PI / 2; break; // inferior
    default: x = MARGIN;           y = rand(0, H); angle =  0;           break; // izquierda
  }
  asteroids.push(new ShootingStar(x, y, angle + rand(-0.6, 0.6)));
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  floatTexts = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
  shootingStarTimer = rand(8, 14);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerups  = [];
  floatTexts = [];
  ship.reset();
  spawnAsteroids(3 + level);
  shootingStarTimer = rand(8, 14);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  // Menú de skins: se abre/cierra con C; mientras está abierto el juego
  // se congela para poder elegir sin riesgo
  if (pressed('KeyC')) {
    skinMenuOpen = !skinMenuOpen;
    if (skinMenuOpen) skinMenuSel = skinIndex;
  }
  if (skinMenuOpen) {
    if (pressed('ArrowLeft'))  skinMenuSel = wrap(skinMenuSel - 1, SKINS.length);
    if (pressed('ArrowRight')) skinMenuSel = wrap(skinMenuSel + 1, SKINS.length);
    if (pressed('Enter') || pressed('Space')) {
      applySkin(skinMenuSel);
      skinMenuOpen = false;
    }
    if (pressed('Escape')) skinMenuOpen = false;
    return;   // congela nave, asteroides y temporizadores
  }

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    floatTexts.forEach(t => t.update(dt));
    floatTexts = floatTexts.filter(t => !t.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    floatTexts.forEach(t => t.update(dt));
    floatTexts = floatTexts.filter(t => !t.dead);
    asteroids.forEach(a => a.update(dt));
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(pu => pu.update(dt));
  floatTexts.forEach(t => t.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerups  = powerups.filter(pu => !pu.dead);
  floatTexts = floatTexts.filter(t => !t.dead);

  // Aparición ocasional de estrella fugaz (máximo 1 en pantalla)
  shootingStarTimer -= dt;
  if (shootingStarTimer <= 0) {
    if (!asteroids.some(a => a instanceof ShootingStar)) {
      spawnShootingStar();
      shootingStarTimer = rand(8, 14);
    } else {
      shootingStarTimer = 2;   // hay una activa: reintentar en breve
    }
  }

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        // La estrella fugaz da puntos especiales
        if (a instanceof ShootingStar) {
          score += ShootingStar.POINTS;
          explode(a.x, a.y, 12);
          floatTexts.push(new FloatText(a.x, a.y, `+${ShootingStar.POINTS}`));
        } else {
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
        }
        newAsteroids.push(...a.split());

        // Posible suelta de power-up (máximo 2 en pantalla)
        if (Math.random() < 0.15 && powerups.length < 2)
          powerups.push(new PowerUp(a.x, a.y));
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
  }

  // Nave vs power-up
  for (const pu of powerups) {
    if (dist(ship, pu) < ship.radius + pu.radius) {
      pu.dead = true;
      ship.speedBoost = PowerUp.DURATION;
      explode(pu.x, pu.y, 8);
    }
  }
  powerups = powerups.filter(pu => !pu.dead);

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  // Siloeta reducida del skin activo, apuntando hacia arriba
  drawShipShape(activeSkin(), x, y, -Math.PI / 2, 0.8, 1.2);
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Indicador de boost de velocidad activo
  if (ship.speedBoost > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd400';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`VELOCIDAD ${ship.speedBoost.toFixed(1)}`, W / 2, H - 14);
  }

}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerups.forEach(pu => pu.draw());
  bullets.forEach(b => b.draw());
  floatTexts.forEach(t => t.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);

  // Menú de skins: se dibuja encima de todo (incluido el de GAME OVER)
  if (skinMenuOpen)
    drawSkinMenu();
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
