/*
CLASHCORE v0.3 - Online Multiplayer (PeerJS)
Host creates room code, others join.
Host is authoritative for game state.
*/

let state = "menu";
let mode = 1;
let isOnline = false;
let isHost = false;
let peer;
let connections = [];
let roomCode = "";
let joinCode = "";
let myId = null;
let players = [];
let bots = [];
let bullets = [];
let particles = [];
let pickups = [];
let walls = [];
let botCount = 4;
let scoreLimit = 10;
let screenShake = 0;
let roundWinner = "";

const COLORS = {
  p1: [80, 220, 255],
  p2: [255, 100, 150],
  p3: [180, 255, 100],
  p4: [255, 180, 80],
  bot: [255, 200, 70],
  bg: [8, 10, 22]
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("Arial");
  resetArena();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function resetArena() {
  players = [];
  bots = [];
  bullets = [];
  particles = [];
  pickups = [];
  walls = [];
  makeWalls();
}

function makeWalls() {
  walls = [];
  let cx = width / 2;
  let cy = height / 2;
  walls.push({ x: cx - 180, y: cy - 25, w: 360, h: 50 });
  walls.push({ x: cx - 25, y: cy - 160, w: 50, h: 120 });
  walls.push({ x: cx - 25, y: cy + 40, w: 50, h: 120 });
}

function draw() {
  background(...COLORS.bg);
  if (state === "menu") {
    drawMenu();
    return;
  }
  if (isHost) updateGame();
  drawGame();
  if (state === "gameover") drawGameOver();
}

function drawMenu() {
  textAlign(CENTER);
  fill(255);
  textSize(60);
  text("CLASHCORE", width / 2, height * 0.2);
  fill(120, 180, 255);
  textSize(18);
  text("ONLINE MULTI", width / 2, height * 0.2 + 40);

  textSize(20);
  fill(mode === 1 ? 255 : 160);
  text("1 LOCAL FFA", width / 2, height * 0.4);
  fill(mode === 2 ? 255 : 160);
  text("2 LOCAL TEAM", width / 2, height * 0.45);

  fill(100, 220, 255);
  textSize(22);
  text("H = HOST ROOM", width / 2, height * 0.58);
  text("J = JOIN ROOM", width / 2, height * 0.64);

  if (roomCode) {
    fill(255, 200, 80);
    textSize(28);
    text("ROOM: " + roomCode, width / 2, height * 0.75);
    textSize(16);
    fill(200);
    text("Share this code with friends", width / 2, height * 0.8);
  }

  if (joinCode) {
    fill(255);
    textSize(18);
    text("Joining: " + joinCode, width / 2, height * 0.85);
  }

  fill(140);
  textSize(14);
  text("ENTER start (host) | ESC back", width / 2, height * 0.92);
}

function keyPressed() {
  if (state === "menu") {
    if (key === "1") mode = 1;
    if (key === "2") mode = 2;
    if (key === "h" || key === "H") startHost();
    if (key === "j" || key === "J") promptJoin();
    if (keyCode === ENTER && isHost) startGame();
    return;
  }
  if (keyCode === ESCAPE) {
    state = "menu";
    isOnline = false;
    if (peer) peer.destroy();
  }
}

function startHost() {
  peer = new Peer();
  peer.on("open", id => {
    roomCode = id;
    isHost = true;
    isOnline = true;
    myId = id;
    console.log("Hosting as", id);
  });
  peer.on("connection", conn => {
    connections.push(conn);
    conn.on("data", data => handleClientData(data, conn));
    conn.on("close", () => {
      connections = connections.filter(c => c !== conn);
    });
  });
}

function promptJoin() {
  joinCode = prompt("Enter room code:");
  if (!joinCode) return;
  peer = new Peer();
  peer.on("open", id => {
    myId = id;
    let conn = peer.connect(joinCode);
    conn.on("open", () => {
      connections = [conn];
      isOnline = true;
      isHost = false;
      conn.on("data", data => handleHostData(data));
      state = "playing";
    });
  });
}

function handleClientData(data, conn) {
  if (!isHost) return;
  let p = players.find(pl => pl.netId === data.id);
  if (p && data.input) {
    p.input = data.input;
  }
}

function handleHostData(data) {
  if (isHost) return;
  if (data.type === "state") {
    applyState(data.state);
  }
}

function broadcastState() {
  if (!isHost) return;
  let stateData = {
    type: "state",
    state: {
      players: players.map(p => ({
        x: p.x, y: p.y, vx: p.vx, vy: p.vy,
        hp: p.hp, energy: p.energy, kills: p.kills,
        color: p.color, alive: p.alive, id: p.id
      })),
      bullets: bullets.map(b => ({
        x: b.x, y: b.y, vx: b.vx, vy: b.vy, color: b.color
      }))
    }
  };
  for (let c of connections) {
    if (c.open) c.send(stateData);
  }
}

function applyState(s) {
  for (let i = 0; i < s.players.length; i++) {
    if (!players[i]) players[i] = new Player(i + 1, s.players[i].x, s.players[i].y, s.players[i].color, 1);
    Object.assign(players[i], s.players[i]);
  }
  bullets = s.bullets.map(b => new Bullet(b.x, b.y, b.vx, b.vy, null, b.color));
}

function startGame() {
  state = "playing";
  resetArena();
  let colors = [COLORS.p1, COLORS.p2, COLORS.p3, COLORS.p4];
  players.push(new Player(1, 200, height / 2, colors[0], 1));
  players[0].netId = myId;
  for (let i = 0; i < connections.length && i < 3; i++) {
    players.push(new Player(i + 2, width - 200 - i * 40, height / 2 + i * 30, colors[i + 1], 1));
  }
  for (let i = 0; i < botCount; i++) spawnBot();
}

function updateGame() {
  for (let p of players) p.update();
  for (let b of bots) b.update();
  for (let bullet of bullets) bullet.update();
  for (let p of particles) p.update();
  bullets = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  bots = bots.filter(b => !b.dead);
  if (frameCount % 3 === 0) broadcastState();
  if (screenShake > 0) screenShake *= 0.85;
}

function drawGame() {
  push();
  translate(random(-screenShake, screenShake), random(-screenShake, screenShake));
  stroke(35, 45, 75);
  for (let x = 0; x < width; x += 60) line(x, 0, x, height);
  for (let y = 0; y < height; y += 60) line(0, y, width, y);
  noStroke();
  for (let w of walls) {
    fill(35, 45, 75);
    rect(w.x, w.y, w.w, w.h, 5);
  }
  for (let b of bullets) b.draw();
  for (let p of players) if (p.alive) p.draw();
  for (let b of bots) if (b.alive) b.draw();
  for (let p of particles) p.draw();
  pop();
  fill(0, 0, 0, 150);
  rect(0, 0, width, 50);
  fill(255);
  textAlign(CENTER);
  textSize(14);
  text(isHost ? "HOSTING" : "JOINED", width / 2, 25);
  text("Players: " + players.length, width / 2, 42);
}

function drawGameOver() {
  fill(0, 0, 0, 170);
  rect(0, 0, width, height);
  fill(255);
  textAlign(CENTER);
  textSize(50);
  text("BATTLE OVER", width / 2, height / 2 - 40);
  textSize(24);
  text(roundWinner + " WINS", width / 2, height / 2 + 20);
}

class Player {
  constructor(id, x, y, color, team) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.r = 18;
    this.color = color;
    this.team = team;
    this.hp = 100;
    this.maxHP = 100;
    this.energy = 100;
    this.alive = true;
    this.kills = 0;
    this.cooldown = 0;
    this.input = { dx: 0, dy: 0, shoot: false, dash: false };
    this.netId = null;
  }
  update() {
    if (!this.alive) return;
    let dx = this.input.dx || 0;
    let dy = this.input.dy || 0;
    if (this.id === 1 && !isOnline) {
      if (keyIsDown(87)) dy--;
      if (keyIsDown(83)) dy++;
      if (keyIsDown(65)) dx--;
      if (keyIsDown(68)) dx++;
    }
    let mag = sqrt(dx * dx + dy * dy);
    if (mag > 0) {
      dx /= mag; dy /= mag;
      this.vx += dx * 0.6;
      this.vy += dy * 0.6;
    }
    this.vx *= 0.9;
    this.vy *= 0.9;
    this.x += this.vx;
    this.y += this.vy;
    this.keepInArena();
    this.energy = min(100, this.energy + 0.25);
    if (this.cooldown > 0) this.cooldown--;
    if (this.input.shoot && this.cooldown <= 0) this.shoot();
  }
  shoot() {
    this.cooldown = 12;
    bullets.push(new Bullet(this.x + 20, this.y, 10, 0, this, this.color));
  }
  keepInArena() {
    this.x = constrain(this.x, 30, width - 30);
    this.y = constrain(this.y, 30, height - 30);
  }
  draw() {
    push();
    translate(this.x, this.y);
    noStroke();
    fill(...this.color, 50);
    circle(0, 0, 50);
    fill(...this.color);
    triangle(20, 0, -14, -12, -14, 12);
    fill(255);
    circle(0, 0, 6);
    pop();
    fill(40);
    rect(this.x - 20, this.y - 28, 40, 5);
    fill(...this.color);
    rect(this.x - 20, this.y - 28, 40 * (this.hp / this.maxHP), 5);
  }
  takeDamage(amt) {
    this.hp -= amt;
    if (this.hp <= 0) this.alive = false;
  }
}

class Bot {
  constructor(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.r = 16; this.hp = 60; this.maxHP = 60; this.alive = true;
    this.color = COLORS.bot; this.cooldown = 30;
  }
  update() {
    if (!this.alive) return;
    this.x += random(-1, 1);
    this.y += random(-1, 1);
    this.keepInArena();
    this.cooldown--;
    if (this.cooldown <= 0) {
      bullets.push(new Bullet(this.x, this.y, random(-5, 5), random(-5, 5), this, this.color));
      this.cooldown = 40;
    }
  }
  keepInArena() {
    this.x = constrain(this.x, 30, width - 30);
    this.y = constrain(this.y, 30, height - 30);
  }
  draw() {
    fill(...this.color);
    circle(this.x, this.y, 30);
  }
  takeDamage(amt) {
    this.hp -= amt;
    if (this.hp <= 0) this.alive = false;
  }
}

class Bullet {
  constructor(x, y, vx, vy, owner, color) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.owner = owner; this.color = color; this.r = 5; this.dead = false; this.life = 80;
  }
  update() {
    this.x += this.vx; this.y += this.vy; this.life--;
    if (this.life <= 0) this.dead = true;
    for (let p of players) {
      if (p !== this.owner && p.alive && dist(this.x, this.y, p.x, p.y) < 20) {
        p.takeDamage(15);
        this.dead = true;
      }
    }
  }
  draw() {
    fill(...this.color);
    circle(this.x, this.y, 8);
  }
}

class Particle {
  constructor(x, y, vx, vy, color, life) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.color = color; this.life = life; this.maxLife = life; this.dead = false;
  }
  update() { this.x += this.vx; this.y += this.vy; this.life--; if (this.life <= 0) this.dead = true; }
  draw() {
    fill(...this.color, map(this.life, 0, this.maxLife, 0, 255));
    circle(this.x, this.y, 4);
  }
}

function spawnBot() {
  bots.push(new Bot(random(100, width - 100), random(100, height - 100)));
}

function explosion(x, y, color) {
  for (let i = 0; i < 20; i++) {
    particles.push(new Particle(x, y, random(-3, 3), random(-3, 3), color, 30));
  }
}
