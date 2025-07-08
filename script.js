// ====== GAME CONSTANTS ======
// ====== CONSTANTS (update these!) ======

// ...rest of your script.js stays the same!

const GAME_WIDTH = 900;
const GAME_HEIGHT = 520;
const PLAYER_Y = 48;
const DOG_START_X = -40;
const PLAYER_X = 170;
const GROUND_HEIGHT = 45;
const BACKGROUND_SPEED = 5.8; // px per tick
const DOG_CHASE_SPEED = 4.8; // px per tick
const DOOR_SPAWN_DIST = 380; // px
const OBSTACLE_MIN_DIST = 230; // px
const OBSTACLE_MAX_DIST = 410;
const TICK_INTERVAL = 18; // ms, ~55fps
const JUMP_VELOCITY = 15;
const GRAVITY = 1.09;
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 120;
const DOG_WIDTH = 100;
const DOOR_WIDTH = 56;
const DOOR_HEIGHT = 100;
const HYDRANT_WIDTH =  18;
const HYDRANT_HEIGHT = 36;

// ====== GAME STATE ======
let gameState = "start"; // start, running, gameover
let distance = 0;
let waterDelivered = 0;
let backgroundPos = 0;
let objects = []; // {type:'door'|'hydrant', x, el, delivered}
let nextDoorX = GAME_WIDTH + 200;
let nextObstacleX = GAME_WIDTH + 300;
let doorCanBeClicked = false;
let activeDoor = null;
let runningInterval = null;
let playerJumping = false;
let playerY = PLAYER_Y;
let jumpVel = 0;
let dogX = DOG_START_X;
let dogChasing = false;
let confettiTimer = null;

// ====== DOM ELEMENTS ======
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');
const gameMain = document.getElementById('game-main');
const backgroundHouses = document.getElementById('background-houses');
const playerImg = document.getElementById('player');
const dogImg = document.getElementById('dog');
const distanceScore = document.getElementById('distance-score');
const waterScore = document.getElementById('water-score');
const confettiDiv = document.getElementById('confetti');
const gameOverOverlay = document.getElementById('game-over-overlay');
const finalDistance = document.getElementById('final-distance');
const finalWater = document.getElementById('final-water');
const resetBtn = document.getElementById('reset-btn');

// ====== UTILITY ======
function px(val) { return val + 'px'; }
function rand(a, b) { return Math.random()*(b-a)+a; }

// ====== GAME LOGIC ======

function resetGameVars() {
  distance = 0;
  waterDelivered = 0;
  backgroundPos = 0;
  objects.forEach(o => o.el.remove());
  objects = [];
  nextDoorX = GAME_WIDTH + 200;
  nextObstacleX = GAME_WIDTH + 320;
  doorCanBeClicked = false;
  activeDoor = null;
  playerJumping = false;
  playerY = PLAYER_Y;
  jumpVel = 0;
  dogX = DOG_START_X;
  dogChasing = false;
  confettiDiv.style.display = 'none';
  playerImg.style.bottom = px(playerY);
  playerImg.style.left = px(PLAYER_X);
  dogImg.style.left = px(dogX);
  dogImg.style.bottom = px(playerY-2);
}

function showStartOverlay() {
  startOverlay.classList.remove('hide');
  startOverlay.style.display = 'flex';
  gameOverOverlay.classList.remove('show');
  playerImg.style.display = 'none';
  dogImg.style.display = 'none';
  // Remove game objects from main layer
  objects.forEach(o => o.el.remove());
  objects = [];
}

function hideStartOverlay() {
  startOverlay.classList.add('hide');
  setTimeout(() => {
    startOverlay.style.display = 'none';
    showGameMain();
  }, 500);
}

function showGameMain() {
  playerImg.style.left = px(PLAYER_X);
  playerImg.style.bottom = px(PLAYER_Y);
  playerImg.style.display = 'block';
  dogImg.style.display = 'block';
  dogImg.style.left = px(dogX);
  dogImg.style.bottom = px(PLAYER_Y-2);
}

function showGameOver() {
  gameState = 'gameover';
  gameOverOverlay.classList.add('show');
  finalDistance.textContent = `Distance: ${distance} ft`;
  finalWater.textContent = `Water Delivered: ${waterDelivered}`;
}

function updateScores() {
  distanceScore.textContent = `Distance (ft): ${distance}`;
  waterScore.textContent = `Water Delivered: ${waterDelivered}`;
}

// ====== GAME LOOP ======
function startGame() {
  resetGameVars();
  showGameMain();
  updateScores();
  gameState = "running";
  runningInterval = setInterval(gameTick, TICK_INTERVAL);
  // Listen for jump
  document.addEventListener('keydown', jumpHandler);
  // Listen for door click
  gameMain.addEventListener('mousedown', doorClickHandler);
}

function endGame() {
  clearInterval(runningInterval);
  gameState = "gameover";
  document.removeEventListener('keydown', jumpHandler);
  gameMain.removeEventListener('mousedown', doorClickHandler);
  showGameOver();
}

// ====== GAME TICK ======
function gameTick() {
  if (gameState !== "running") return;

  // Background scroll
  backgroundPos -= BACKGROUND_SPEED;
  backgroundHouses.style.backgroundPositionX = px(backgroundPos);

  // Move obstacles & doors
  objects.forEach(obj => {
    obj.x -= BACKGROUND_SPEED;
    obj.el.style.left = px(obj.x);
  });

  // Remove offscreen objects
  objects = objects.filter(obj => {
    if (obj.x < -120) { obj.el.remove(); return false; }
    return true;
  });

  // Player gravity
  if (playerJumping) {
    jumpVel -= GRAVITY;
    playerY += jumpVel;
    if (playerY <= PLAYER_Y) {
      playerY = PLAYER_Y;
      playerJumping = false;
      jumpVel = 0;
    }
    playerImg.style.bottom = px(playerY);
  }

  // Score & distance
  distance += 1;
  updateScores();

  // Dog chases if you hit obstacle or gameover (handled below)
  if (dogChasing && dogX < PLAYER_X - 30) {
    dogX += DOG_CHASE_SPEED;
    dogImg.style.left = px(dogX);
  }

  // ==== SPAWN OBSTACLES & DOORS ====
  if (backgroundPos < -nextDoorX) {
    spawnDoor();
    nextDoorX += DOOR_SPAWN_DIST + rand(-60, 40);
  }
  if (backgroundPos < -nextObstacleX) {
    spawnObstacle();
    nextObstacleX += rand(OBSTACLE_MIN_DIST, OBSTACLE_MAX_DIST);
  }

  // ==== HANDLE COLLISIONS ====
  // Find closest door in range for click
  let glowing = false;
  activeDoor = null;
  for (const obj of objects) {
    if (obj.type === "door" && !obj.delivered) {
      // Is player in front of door? (overlapping x)
      const pxLeft = PLAYER_X;
      const pxRight = pxLeft + PLAYER_WIDTH;
      const doorLeft = obj.x;
      const doorRight = doorLeft + DOOR_WIDTH;
      // In front zone
      if (pxRight > doorLeft+7 && pxLeft < doorRight-10) {
        glowing = true;
        obj.el.classList.add("glow");
        activeDoor = obj;
        doorCanBeClicked = true;
      } else {
        obj.el.classList.remove("glow");
      }
    }
    // Hydrant collision (hitbox matches hydrant size exactly)
    if (obj.type === "hydrant") {
      const hydrantLeft = obj.x;
      const hydrantRight = hydrantLeft + HYDRANT_WIDTH;
      const hydrantTop = PLAYER_Y; // ground level
      const hydrantBottom = hydrantTop + HYDRANT_HEIGHT;
      const playerLeft = PLAYER_X;
      const playerRight = playerLeft + PLAYER_WIDTH;
      const playerBottom = playerY;
      const playerTop = playerBottom + PLAYER_HEIGHT;

      // Check for overlap in X and Y (simple rectangle collision)
      const overlapX = playerRight > hydrantLeft && playerLeft < hydrantRight;
      const overlapY = playerBottom < hydrantBottom && playerTop > hydrantTop;

      if (overlapX && overlapY) {
        triggerDogChase();
      }
    }
  }
  if (!glowing) {
    doorCanBeClicked = false;
    // Remove any previous glows
    objects.forEach(obj => { if(obj.type==='door') obj.el.classList.remove("glow"); });
    activeDoor = null;
  }

  // ==== DOG CATCHES PLAYER ====
  if (dogChasing && dogX + DOG_WIDTH - 30 >= PLAYER_X) {
    endGame();
  }
}

// ====== SPAWNERS ======
function spawnDoor() {
  const el = document.createElement('div');
  el.className = 'door';
  el.style.left = px(GAME_WIDTH + 35);
  gameMain.appendChild(el);
  objects.push({ type: 'door', x: GAME_WIDTH + 35, el, delivered: false });
}
function spawnObstacle() {
  const el = document.createElement('div');
  el.className = 'hydrant';
  el.style.left = px(GAME_WIDTH + rand(80, 170));
  gameMain.appendChild(el);
  objects.push({ type: 'hydrant', x: GAME_WIDTH + rand(80, 170), el });
}

// ====== JUMP LOGIC ======
function jumpHandler(e) {
  if ((e.code === "Space" || e.key === " " || e.keyCode === 32) && !playerJumping && gameState === "running") {
    playerJumping = true;
    jumpVel = JUMP_VELOCITY;
  }
}

// ====== DOOR CLICK ======
function doorClickHandler(e) {
  if (gameState !== "running" || !doorCanBeClicked || !activeDoor) return;

  // Only count click if in front of door and not already delivered
  if (!activeDoor.delivered) {
    activeDoor.delivered = true;
    activeDoor.el.classList.remove("glow");
    waterDelivered += 1;
    updateScores();
    // Confetti animation
    confettiDiv.style.display = 'block';
    confettiDiv.style.opacity = 1;
    confettiDiv.textContent = '🎉 Delivered!';
    if (confettiTimer) clearTimeout(confettiTimer);
    confettiTimer = setTimeout(() => {
      confettiDiv.style.display = 'none';
    }, 1200);
  }
}

// ====== DOG CHASES PLAYER (GAME OVER IF CATCHES) ======
function triggerDogChase() {
  if (!dogChasing) {
    dogChasing = true;
    // Optionally play animation/sound here
  }
}

// ====== EVENTS ======
startBtn.addEventListener('click', () => {
  hideStartOverlay();
  setTimeout(startGame, 500); // let overlay fade out
});
resetBtn.addEventListener('click', () => {
  gameOverOverlay.classList.remove('show');
  showStartOverlay();
});

// ====== INIT ======
showStartOverlay();