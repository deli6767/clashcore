/*
CLASHCORE v0.4 - Improved Local
Bigger map, faster pace, smarter bots, better character, fixed movement
*/

let state = "menu";
let mode = 1;
let players = [];
let bots = [];
let bullets = [];
let particles = [];
let walls = [];
let botCount = 6;
let scoreLimit = 12;
let screenShake = 0;
let roundWinner = "";

const COLORS = {
  p1: [80, 220, 255],
  p2: [255, 100, 150],
  bot: [255, 200, 70],
  bg: [6, 8, 18]
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("Arial");
  resetArena();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  makeWalls();
}

function resetArena() {
  players = [];
  bots = [];
  bullets = [];
  particles = [];
  walls = [];
  makeWalls();

  if (mode === 3) {
    players.push(new Player(1, 250, height / 2, COLORS.p1));
    players.push(new Player(2, width - 250, height / 2, COLORS.p2));
  } else {
    players.push(new Player(1, 250, height / 2, COLORS.p1));
    players.push(new Player(2, width - 250, height / 2, COLORS.p2));
    for (let i = 0; i < botCount; i++) spawnBot();
  }
}

function makeWalls() {
  walls = [];
  let cx = width / 2;
  let cy = height / 2;
  walls.push({ x: cx - 250, y: cy - 40, w: 500, h: 80 });
  walls.push({ x: cx - 40, y: cy - 250, w: 80, h: 180 });
  walls.push({ x: cx - 40, y: cy + 70, w: 80, h: 180 });
  walls.push({ x: 200, y: 180, w: 180, h: 50 });
  walls.push({ x: width - 380, y: 180, w: 180, h: 50 });
  walls.push({ x: 200, y: height - 230, w: 180, h: 50 });
  walls.push({ x: width - 380, y: height - 230, w: 180, h: 50 });
}

function draw() {
  background(...COLORS.bg);
  if (state === "menu") {
    drawMenu();
    return;
  }
  updateGame();
  drawGame();
  if (state === "gameover") drawGameOver();
}

function drawMenu() {
  textAlign(CENTER);
  fill(255);
  textSize(70);
  text("CLASHCORE", width / 2, height * 0.22);
  fill(120, 180, 255);
  textSize(20);
  text("v0.4 - FASTER & BIGGER", width / 2, height * 0.22 + 40);

  let modes = ["1  FREE-FOR-ALL", "2  TEAM BATTLE", "3  DUEL", "4  BOT WAR"];
  for (let i = 0; i < modes.length; i++) {
    let y = height * 0.4 + i * 45;
    fill(mode === i + 1 ? 255 : 150);
    textSize(mode === i + 1 ? 22 : 18);
    text(modes[i], width / 2, y);
  }

  fill(255);
  textSize(16);
  if (mode !== 3) text("BOTS: " + botCount + "   [ / ]", width / 2, height * 0.68);
  fill(100, 220, 255);
  textSize(24);
  text("ENTER TO START", width / 2, height * 0.76);
  fill(130);
  textSize(13);
  text("P1: WASD / F shoot / G dash / H shock", width / 2, height * 0.84);
  text("P2: ARROWS / / shoot / . dash / , shock", width / 2, height * 0.88);
}

function updateGame() {
  for (let p of players) p.update();
  for (let b of bots) b.update();
  for (let bullet of bullets) bullet.update();
  for (let p of particles) p.update();
  bullets = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  bots = bots.filter(b => !b.dead);
  checkRoundEnd();
  if (screenShake > 0) screenShake *= 0.84;
}

function drawGame() {
  push();
  translate(random(-screenShake, screenShake), random(-screenShake, screenShake));
  stroke(30, 40, 70, 90);
  for (let x = 0; x < width; x += 70) line(x, 0, x, height);
  for (let y = 0; y < height; y += 70) line(0, y, width, y);
  noStroke();
  noFill();
  stroke(70, 140, 255, 160);
  strokeWeight(5);
  rect(12, 12, width - 24, height - 24, 6);
  noStroke();
  for (let w of walls) {
    fill(32, 42, 70);
    stroke(80, 110, 170);
    strokeWeight(2);
    rect(w.x, w.y, w.w, w.h, 6);
    noStroke();
  }
  for (let b of bullets) b.draw();
  for (let p of players) if (p.alive) p.draw();
  for (let b of bots) if (b.alive) b.draw();
  for (let p of particles) p.draw();
  pop();
  drawHUD();
}

class Player {
  constructor(id, x, y, color) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.r = 20;
    this.color = color;
    this.hp = 100;
    this.maxHP = 100;
    this.energy = 100;
    this.alive = true;
    this.kills = 0;
    this.cooldown = 0;
    this.dashCooldown = 0;
    this.abilityCooldown = 0;
    this.invuln = 0;
    this.walkFrame = 0;
  }

  update() {
    if (!this.alive) return;

    let dx = 0, dy = 0;
    if (this.id === 1) {
      if (keyIsDown(87)) dy--;
      if (keyIsDown(83)) dy++;
      if (keyIsDown(65)) dx--;
      if (keyIsDown(68)) dx++;
    } else if (this.id === 2) {
      if (keyIsDown(UP_ARROW)) dy--;
      if (keyIsDown(DOWN_ARROW)) dy++;
      if (keyIsDown(LEFT_ARROW)) dx--;
      if (keyIsDown(RIGHT_ARROW)) dx++;
    }

    let mag = sqrt(dx * dx + dy * dy);
    if (mag > 0) {
      dx /= mag;
      dy /= mag;
      this.vx += dx * 0.9;
      this.vy += dy * 0.9;
      this.walkFrame += 0.3;
    }

    this.vx *= 0.88;
    this.vy *= 0.88;

    let maxSpeed = 8.5;
    let speed = sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }

    this.x += this.vx;
    this.y += this.vy;
    this.resolveWalls();
    this.keepInArena();

    if (this.cooldown > 0) this.cooldown--;
    if (this.dashCooldown > 0) this.dashCooldown--;
    if (this.abilityCooldown > 0) this.abilityCooldown--;
    if (this.invuln > 0) this.invuln--;

    this.energy = min(100, this.energy + 0.4);

    if ((this.id === 1 && keyIsDown(70)) || (this.id === 2 && keyIsDown(191))) {
      this.shoot();
    }
  }

  shoot() {
    if (this.cooldown > 0) return;
    let angle = this.id === 1 ? 0 : PI;
    let target = findNearestEnemy(this);
    if (target) angle = atan2(target.y - this.y, target.x - this.x);

    bullets.push(new Bullet(
      this.x + cos(angle) * 26,
      this.y + sin(angle) * 26,
      cos(angle) * 13,
      sin(angle) * 13,
      this,
      this.color
    ));
    this.cooldown = 8;

    for (let i = 0; i < 5; i++) {
      particles.push(new Particle(this.x + cos(angle) * 22, this.y + sin(angle) * 22, random(-2, 2), random(-2, 2), this.color, 16));
    }
  }

  dash() {
    if (this.dashCooldown > 0 || !this.alive) return;
    let dx = this.vx, dy = this.vy;
    if (abs(dx) + abs(dy) < 0.4) {
      dx = this.id === 1 ? 1 : -1;
      dy = 0;
    }
    let mag = sqrt(dx * dx + dy * dy) || 1;
    this.vx = (dx / mag) * 22;
    this.vy = (dy / mag) * 22;
    this.invuln = 14;
    this.dashCooldown = 55;
    screenShake = 6;
    for (let i = 0; i < 16; i++) particles.push(new Particle(this.x, this.y, random(-4, 4), random(-4, 4), this.color, 25));
  }

  shockwave() {
    if (this.abilityCooldown > 0 || this.energy < 40) return;
    this.energy -= 40;
    this.abilityCooldown = 140;
    for (let b of bots) {
      if (b.alive && dist(this.x, this.y, b.x, b.y) < 180) b.takeDamage(30, this);
    }
    for (let p of players) {
      if (p !== this && p.alive && dist(this.x, this.y, p.x, p.y) < 180) p.takeDamage(30, this);
    }
    screenShake = 14;
    for (let i = 0; i < 45; i++) {
      let a = random(TWO_PI);
      particles.push(new Particle(this.x + cos(a) * random(40, 180), this.y + sin(a) * random(40, 180), cos(a) * 3, sin(a) * 3, this.color, 35));
    }
  }

  takeDamage(amount, attacker) {
    if (this.invuln > 0 || !this.alive) return;
    this.hp -= amount;
    this.invuln = 5;
    screenShake = 5;
    if (this.hp <= 0) {
      this.alive = false;
      if (attacker) attacker.kills++;
      explosion(this.x, this.y, this.color);
      setTimeout(() => {
        if (state === "playing") {
          this.hp = this.maxHP;
          this.x = this.id === 1 ? 200 : width - 200;
          this.y = random(150, height - 150);
          this.alive = true;
          this.invuln = 30;
        }
      }, 800);
    }
  }

  resolveWalls() {
    for (let w of walls) {
      let closestX = constrain(this.x, w.x, w.x + w.w);
      let closestY = constrain(this.y, w.y, w.y + w.h);
      let dx = this.x - closestX;
      let dy = this.y - closestY;
      let d = sqrt(dx * dx + dy * dy);
      if (d < this.r && d > 0) {
        this.x += (dx / d) * (this.r - d);
        this.y += (dy / d) * (this.r - d);
        this.vx *= 0.3;
        this.vy *= 0.3;
      }
    }
  }

  keepInArena() {
    this.x = constrain(this.x, 30, width - 30);
    this.y = constrain(this.y, 30, height - 30);
  }

  draw() {
    if (this.invuln > 0 && frameCount % 4 < 2) return;

    push();
    translate(this.x, this.y);
    let angle = atan2(this.vy, this.vx);
    if (abs(this.vx) + abs(this.vy) < 0.4) angle = this.id === 1 ? 0 : PI;
    rotate(angle);

    let bob = sin(this.walkFrame) * 2;
    translate(0, bob);

    noStroke();
    fill(...this.color, 60);
    circle(0, 0, 48);

    fill(...this.color);
    rectMode(CENTER);
    rect(0, 2, 18, 22, 4);
    fill(240, 220, 200);
    circle(6, -4, 12);
    let legOffset = sin(this.walkFrame * 2) * 4;
    fill(40, 40, 50);
    rect(-6, 14 + legOffset, 6, 10, 2);
    rect(6, 14 - legOffset, 6, 10, 2);

    fill(255);
    circle(8, -4, 4);
    pop();

    noStroke();
    fill(30);
    rect(this.x - 22, this.y - 32, 44, 5, 2);
    fill(...this.color);
    rect(this.x - 22, this.y - 32, 44 * (this.hp / this.maxHP), 5, 2);
  }
}

class Bot {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.r = 17;
    this.hp = 65;
    this.maxHP = 65;
    this.alive = true;
    this.kills = 0;
    this.cooldown = random(10, 30);
    this.type = random(["rusher", "gunner", "flanker"]);
    this.color = COLORS.bot;
  }

  update() {
    if (!this.alive) return;
    let target = findNearestEnemy(this);
    if (!target) return;

    let dx = target.x - this.x;
    let dy = target.y - this.y;
    let d = max(1, sqrt(dx * dx + dy * dy));
    let nx = dx / d;
    let ny = dy / d;

    let moveX = nx, moveY = ny;
    if (this.type === "gunner" && d < 300) {
      moveX = -nx; moveY = -ny;
    } else if (this.type === "flanker") {
      moveX = nx * 0.5 - ny;
      moveY = ny * 0.5 + nx;
    }

    this.vx += moveX * 0.55;
    this.vy += moveY * 0.55;
    this.vx *= 0.9;
    this.vy *= 0.9;
    let maxS = this.type === "rusher" ? 6 : 4.5;
    let spd = sqrt(this.vx * this.vx + this.vy * this.vy);
    if (spd > maxS) {
      this.vx = (this.vx / spd) * maxS;
      this.vy = (this.vy / spd) * maxS;
    }
    this.x += this.vx;
    this.y += this.vy;
    this.keepInArena();

    this.cooldown--;
    if (this.cooldown <= 0 && d < 450) {
      this.shoot(target);
      this.cooldown = this.type === "gunner" ? 14 : 22;
    }
  }

  shoot(target) {
    let angle = atan2(target.y - this.y, target.x - this.x);
    angle += random(-0.12, 0.12);
    let spd = 10;
    bullets.push(new Bullet(
      this.x + cos(angle) * 20,
      this.y + sin(angle) * 20,
      cos(angle) * spd,
      sin(angle) * spd,
      this,
      this.color
    ));
  }

  takeDamage(amount, attacker) {
    if (!this.alive) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.alive = false;
      if (attacker) attacker.kills++;
      explosion(this.x, this.y, this.color);
      setTimeout(() => {
        if (state === "playing" && mode !== 3) spawnBot();
      }, 1000);
    }
  }

  keepInArena() {
    this.x = constrain(this.x, 40, width - 40);
    this.y = constrain(this.y, 40, height - 40);
  }

  draw() {
    push();
    translate(this.x, this.y);
    let angle = atan2(this.vy, this.vx);
    rotate(angle);
    noStroke();
    fill(...this.color, 40);
    circle(0, 0, 44);
    fill(...this.color);
    triangle(18, 0, -12, -11, -12, 11);
    fill(30);
    circle(2, 0, 5);
    pop();
    fill(40);
    rect(this.x - 18, this.y - 26, 36, 4);
    fill(...this.color);
    rect(this.x - 18, this.y - 26, 36 * (this.hp / this.maxHP), 4);
  }
}

class Bullet {
  constructor(x, y, vx, vy, owner, color) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.owner = owner; this.color = color; this.r = 5; this.dead = false; this.life = 70; this.damage = 14;
  }
  update() {
    this.x += this.vx; this.y += this.vy; this.life--;
    if (this.life <= 0 || this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
      this.dead = true; return;
    }
    for (let w of walls) {
      if (this.x > w.x && this.x < w.x + w.w && this.y > w.y && this.y < w.y + w.h) {
        this.dead = true; return;
      }
    }
    for (let p of players) {
      if (p !== this.owner && p.alive && dist(this.x, this.y, p.x, p.y) < this.r + p.r) {
        p.takeDamage(this.damage, this.owner);
        this.dead = true; return;
      }
    }
    for (let b of bots) {
      if (b !== this.owner && b.alive && dist(this.x, this.y, b.x, b.y) < this.r + b.r) {
        b.takeDamage(this.damage, this.owner);
        this.dead = true; return;
      }
    }
  }
  draw() {
    noStroke();
    fill(...this.color, 80);
    circle(this.x, this.y, 14);
    fill(...this.color);
    circle(this.x, this.y, 6);
  }
}

class Particle {
  constructor(x, y, vx, vy, color, life) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.color = color; this.life = life; this.maxLife = life; this.dead = false; this.size = random(3, 7);
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    this.vx *= 0.96; this.vy *= 0.96;
    this.life--;
    if (this.life <= 0) this.dead = true;
  }
  draw() {
    noStroke();
    fill(...this.color, map(this.life, 0, this.maxLife, 0, 255));
    circle(this.x, this.y, this.size);
  }
}

function findNearestEnemy(entity) {
  let cands = [];
  for (let p of players) if (p !== entity && p.alive) cands.push(p);
  for (let b of bots) if (b !== entity && b.alive) cands.push(b);
  if (!cands.length) return null;
  let best = cands[0];
  let bestD = dist(entity.x, entity.y, best.x, best.y);
  for (let c of cands) {
    let d = dist(entity.x, entity.y, c.x, c.y);
    if (d < bestD) { best = c; bestD = d; }
  }
  return best;
}

function spawnBot() {
  let x, y, tries = 0;
  do {
    x = random(100, width - 100);
    y = random(100, height - 100);
    tries++;
  } while (dist(x, y, width / 2, height / 2) < 220 && tries < 40);
  bots.push(new Bot(x, y));
}

function explosion(x, y, color) {
  screenShake = 12;
  for (let i = 0; i < 30; i++) {
    let a = random(TWO_PI);
    let s = random(2, 7);
    particles.push(new Particle(x, y, cos(a) * s, sin(a) * s, color, random(20, 40)));
  }
}

function drawHUD() {
  fill(0, 0, 0, 150);
  rect(0, 0, width, 50);
  textAlign(LEFT);
  if (players[0]) {
    fill(...players[0].color);
    textSize(15);
    text("P1 " + players[0].kills + "K", 20, 22);
    noStroke();
    fill(40);
    rect(20, 30, 140, 6, 2);
    fill(...players[0].color);
    rect(20, 30, 140 * (players[0].hp / 100), 6, 2);
  }
  if (players[1]) {
    fill(...players[1].color);
    textAlign(RIGHT);
    text("P2 " + players[1].kills + "K", width - 20, 22);
    noStroke();
    fill(40);
    rect(width - 160, 30, 140, 6, 2);
    fill(...players[1].color);
    rect(width - 160, 30, 140 * (players[1].hp / 100), 6, 2);
  }
  textAlign(CENTER);
  fill(255);
  textSize(13);
  text(mode === 1 ? "FFA" : mode === 2 ? "TEAM" : mode === 3 ? "DUEL" : "BOT WAR", width / 2, 22);
  fill(140);
  text("R restart • ESC menu", width / 2, 38);
}

function checkRoundEnd() {
  if (mode === 3) {
    if (players[0].kills >= scoreLimit) endRound("PLAYER 1");
    if (players[1] && players[1].kills >= scoreLimit) endRound("PLAYER 2");
  } else if (mode === 2) {
    let pk = (players[0] ? players[0].kills : 0) + (players[1] ? players[1].kills : 0);
    if (pk >= scoreLimit) endRound("PLAYERS");
  } else {
    if (players[0] && players[0].kills >= scoreLimit) endRound("PLAYER 1");
    if (players[1] && players[1].kills >= scoreLimit) endRound("PLAYER 2");
  }
}

function endRound(w) {
  if (state !== "playing") return;
  state = "gameover";
  roundWinner = w;
}

function drawGameOver() {
  fill(0, 0, 0, 180);
  rect(0, 0, width, height);
  textAlign(CENTER);
  fill(255);
  textSize(60);
  text("BATTLE OVER", width / 2, height * 0.4);
  fill(roundWinner.includes("1") ? COLORS.p1 : roundWinner.includes("2") ? COLORS.p2 : COLORS.bot);
  textSize(30);
  text(roundWinner + " WINS", width / 2, height * 0.5);
  fill(200);
  textSize(16);
  text("ENTER rematch • ESC menu", width / 2, height * 0.62);
}

function keyPressed() {
  if (state === "menu") {
    if (key === "1") mode = 1;
    if (key === "2") mode = 2;
    if (key === "3") mode = 3;
    if (key === "4") mode = 4;
    if (key === "[") botCount = max(0, botCount - 1);
    if (key === "]") botCount = min(14, botCount + 1);
    if (keyCode === ENTER) startGame();
    return;
  }
  if (state === "gameover") {
    if (keyCode === ENTER) startGame();
    if (keyCode === ESCAPE) state = "menu";
    return;
  }
  if (state === "playing") {
    if (key === "g" || key === "G") if (players[0]) players[0].dash();
    if (key === "h" || key === "H") if (players[0]) players[0].shockwave();
    if (key === ".") if (players[1]) players[1].dash();
    if (key === ",") if (players[1]) players[1].shockwave();
    if (key === "r" || key === "R") startGame();
    if (keyCode === ESCAPE) state = "menu";
  }
}

function startGame() {
  state = "playing";
  resetArena();
  for (let p of players) p.kills = 0;
}
