// ====== GAME CONSTANTS ======
const GAME_WIDTH = 900;
const GAME_HEIGHT = 520;
const PLAYER_Y = 18;
const DOG_START_X = 10;
const PLAYER_X = 170;
const DOG_CHASE_SPEED = 4.8;
const BG_IMAGE_WIDTH = 1441.58;
const DOOR_SPAWN_DIST = BG_IMAGE_WIDTH;
const OBSTACLE_MIN_DIST = 150;
const OBSTACLE_MAX_DIST = 250;
const TICK_INTERVAL = 18;
const JUMP_VELOCITY = 22;
const DIFFICULTY_GRAVITY = { easy: 0.7, normal: 1.09, hard: 1.25 };
const PLAYER_WIDTH = 50;
const DOG_WIDTH = 100;
const HYDRANT_WIDTH = 38;
const MIN_HYDRANT_TO_DOOR_DISTANCE = 340;
const MIN_HYDRANT_TO_HYDRANT_DISTANCE = 450;
const HYDRANT_SPAWN_CHANCE = 0.3;
const PEOPLE_IMAGES = {
  kids: [
    'img/kid_1-removebg-preview.png',
    'img/kid_2-removebg-preview.png',
    'img/kid_3-removebg-preview.png',
    'img/kid_4-removebg-preview.png',
    'img/kid_5-removebg-preview.png'
  ],
  adult_1: ['img/adult_1.png'],
  adult_2: ['img/adult_2.png'],
  grandma: ['img/grandma-removebg-preview.png']
};
const PERSON_SIZES = {
  kids: { width: 40, height: 60 },
  adult_1: { width: 49, height: 70 },
  adult_2: { width: 70, height: 100 },
  grandma: { width: 90, height: 140 }
};
const DIFFICULTY_SPEEDS = { easy: 4.2, normal: 5.8, hard: 7.0 };

// ====== AUDIO SETUP ======
const dogBarkSound = new Audio('sounds/dog_bark.mp3');
const jumpSound = new Audio('sounds/cartoony_jump_sound.mp3');
const waterDeliverySound = new Audio('sounds/water_delivery_ding_sound.mp3');
const gameOverSound = new Audio('sounds/game_over_sound.mp3');
const backgroundMusic = new Audio('sounds/funny_chase_music.mp3');
const distanceMilestoneSound = new Audio('sounds/distance_milestone_sound.mp3');
const waterMilestoneSound = new Audio('sounds/water_delivery_milestone_sound.mp3');
dogBarkSound.volume = 0.5; jumpSound.volume = 0.4; waterDeliverySound.volume = 0.6;
gameOverSound.volume = 0.7; backgroundMusic.volume = 0.3; distanceMilestoneSound.volume = 0.5; waterMilestoneSound.volume = 0.5;
backgroundMusic.loop = true;
function playSound(audio) { try { audio.currentTime = 0; audio.play(); } catch {} }
function stopSound(audio) { try { audio.pause(); audio.currentTime = 0; } catch {} }

// ====== DOM ELEMENTS ======
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');
const easyBtn = document.getElementById('easy-btn');
const normalBtn = document.getElementById('normal-btn');
const hardBtn = document.getElementById('hard-btn');
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
const heart1 = document.getElementById('heart1');
const heart2 = document.getElementById('heart2');

// ====== GAME STATE ======
let gameState = "start";
let distance = 0, waterDelivered = 0, backgroundPos = 0;
let objects = [];
let nextDoorX = GAME_WIDTH + 400, nextObstacleX = GAME_WIDTH + 500;
let doorCanBeClicked = false, activeDoor = null, runningInterval = null;
let playerJumping = false, playerY = PLAYER_Y, jumpVel = 0;
let dogX = DOG_START_X, dogChasing = false, confettiTimer = null;
let lives = 2, lastDistanceMilestone = 0, lastWaterMilestone = 0;
let selectedDifficulty = null, BACKGROUND_SPEED = DIFFICULTY_SPEEDS.normal, GRAVITY = DIFFICULTY_GRAVITY.normal;

// ====== UTILITY ======
const px = val => val + 'px';
const rand = (a, b) => Math.random() * (b - a) + a;

// ====== GAME LOGIC ======
function resetGameVars() {
  distance = waterDelivered = backgroundPos = 0;
  objects.forEach(o => o.el.remove());
  objects = [];
  nextDoorX = GAME_WIDTH + 400; nextObstacleX = GAME_WIDTH + 500;
  doorCanBeClicked = false; activeDoor = null; playerJumping = false;
  playerY = PLAYER_Y; jumpVel = 0; dogX = DOG_START_X; dogChasing = false;
  confettiDiv.style.display = 'none';
  playerImg.style.bottom = px(playerY); playerImg.style.left = px(PLAYER_X);
  dogImg.style.left = px(dogX); dogImg.style.bottom = px(playerY - 2);
  lastDistanceMilestone = 0; lastWaterMilestone = 0;
  lives = 2;
  if (heart1) heart1.classList.remove('faded');
  if (heart2) heart2.classList.remove('faded');
  playerImg.classList.remove('flash'); playerImg.style.left = px(PLAYER_X);
}

function showStartOverlay() {
  startOverlay.classList.remove('hide');
  startOverlay.style.display = 'flex';
  gameOverOverlay.classList.remove('show');
  playerImg.style.display = 'none'; dogImg.style.display = 'none';
  objects.forEach(o => o.el.remove()); objects = [];
  clearDifficultySelection(); selectedDifficulty = null; startBtn.disabled = true;
}

function hideStartOverlay() {
  startOverlay.classList.add('hide');
  setTimeout(() => { startOverlay.style.display = 'none'; showGameMain(); }, 500);
}

function showGameMain() {
  playerImg.style.left = px(PLAYER_X); playerImg.style.bottom = px(PLAYER_Y);
  playerImg.style.display = 'block'; dogImg.style.display = 'block';
  dogImg.style.left = px(dogX); dogImg.style.bottom = px(PLAYER_Y - 2);
}

function showGameOver() {
  gameState = 'gameover';
  gameOverOverlay.classList.add('show');
  finalDistance.textContent = `Distance: ${distance} ft`;
  finalWater.textContent = `Water Delivered: ${waterDelivered}`;
}

function showMilestone(elementId, message) {
  const milestoneElement = document.getElementById(elementId);
  if (!milestoneElement) return;
  milestoneElement.textContent = message;
  milestoneElement.style.display = 'block';
  milestoneElement.style.opacity = '1';
  milestoneElement.style.transition = '';
  milestoneElement.style.transform = 'translateY(0px)';
  setTimeout(() => {
    milestoneElement.style.transition = 'all 1s ease-out';
    milestoneElement.style.opacity = '0';
    milestoneElement.style.transform = 'translateY(30px)';
    setTimeout(() => {
      milestoneElement.style.display = 'none';
      milestoneElement.style.transition = '';
      milestoneElement.style.transform = 'translateY(0px)';
    }, 1000);
  }, 2500);
}

function checkDistanceMilestones(currentDistance) {
  if (currentDistance > 0 && currentDistance % 1000 === 0 && currentDistance !== lastDistanceMilestone) {
    showMilestone('distance-milestone', `You traveled ${currentDistance.toLocaleString()} feet!`);
    playSound(distanceMilestoneSound);
    lastDistanceMilestone = currentDistance;
  }
}

function checkWaterMilestones(currentWater) {
  const milestone = Math.floor(currentWater / 5) * 5;
  if (milestone > lastWaterMilestone && milestone > 0) {
    showMilestone('water-milestone', `You delivered ${milestone} deliveries!`);
    playSound(waterMilestoneSound);
    lastWaterMilestone = milestone;
  }
}

function updateScores() {
  distanceScore.textContent = `Distance (ft): ${distance}`;
  waterScore.textContent = `Water Delivered: ${waterDelivered}`;
  checkDistanceMilestones(distance);
  checkWaterMilestones(waterDelivered);
}

// ====== SPAWNERS & HELPERS ======
function isPositionTooClose(newX, minDistance, objectType = null) {
  for (const obj of objects) {
    const objDistance = Math.abs(obj.x - newX);
    if (objectType === 'hydrant' && obj.type === 'door' && objDistance < MIN_HYDRANT_TO_DOOR_DISTANCE) return true;
    if (objectType === 'hydrant' && obj.type === 'hydrant' && objDistance < MIN_HYDRANT_TO_HYDRANT_DISTANCE) return true;
    if ((objectType === 'door' || objectType === null) && objDistance < minDistance) return true;
  }
  return false;
}

function spawnDoor() {
  // Create a person element and make sure it's always visible
  const el = document.createElement('div');
  el.className = 'door';
  const categories = Object.keys(PEOPLE_IMAGES);
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  const categoryImages = PEOPLE_IMAGES[randomCategory];
  const randomPersonImage = categoryImages[Math.floor(Math.random() * categoryImages.length)];
  el.style.backgroundImage = `url('${randomPersonImage}')`;
  const size = PERSON_SIZES[randomCategory];
  el.style.width = px(size.width);
  el.style.height = px(size.height);
  el.dataset.category = randomCategory;
  const spawnX = GAME_WIDTH + 300;
  el.style.left = px(spawnX);
  el.style.opacity = "1"; // Always visible, no fade-in
  gameMain.appendChild(el);
  objects.push({
    type: 'door',
    x: spawnX,
    el,
    delivered: false,
    category: randomCategory,
    width: size.width,
    height: size.height
  });
}

function spawnObstacle() {
  if (Math.random() > HYDRANT_SPAWN_CHANCE) return;
  let attempts = 0, hydrantX, maxAttempts = 20;
  while (attempts < maxAttempts) {
    hydrantX = GAME_WIDTH + rand(400, 600);
    if (!isPositionTooClose(hydrantX, MIN_HYDRANT_TO_DOOR_DISTANCE, 'hydrant')) {
      const el = document.createElement('div');
      el.className = 'hydrant';
      el.style.left = px(hydrantX);
      gameMain.appendChild(el);
      objects.push({ type: 'hydrant', x: hydrantX, el });
      return;
    }
    attempts++;
  }
}

// ====== COLLISION & PLAYER STATE ======
function movePlayerForLives() {
  let offset = 0;
  if (lives === 1) offset = 70;
  else if (lives === 0) offset = 120;
  playerImg.style.left = px(PLAYER_X - offset);
}

function addPlayerFlash() {
  playerImg.classList.add('flash');
  setTimeout(() => playerImg.classList.remove('flash'), 350);
}

function triggerDogChase() {
  if (lives === 2) {
    lives = 1;
    if (heart2) heart2.classList.add('faded');
    movePlayerForLives();
    addPlayerFlash();
    dogChasing = false;
    playSound(gameOverSound);
  } else if (lives === 1) {
    lives = 0;
    if (heart1) heart1.classList.add('faded');
    movePlayerForLives();
    addPlayerFlash();
    dogChasing = true;
    playSound(gameOverSound);
  }
}

// ====== GAME LOOP ======
function startGame() {
  if (!selectedDifficulty) { alert('Please select a difficulty first!'); return; }
  resetGameVars(); showGameMain(); updateScores();
  gameState = "running";
  runningInterval = setInterval(gameTick, TICK_INTERVAL);
  document.addEventListener('keydown', jumpHandler);
  gameMain.addEventListener('mousedown', doorClickHandler);
  playSound(dogBarkSound); playSound(backgroundMusic);
}

function endGame() {
  clearInterval(runningInterval);
  gameState = "gameover";
  document.removeEventListener('keydown', jumpHandler);
  gameMain.removeEventListener('mousedown', doorClickHandler);
  stopSound(backgroundMusic);
  playSound(gameOverSound);
  showGameOver();
}

function gameTick() {
  if (gameState !== "running") return;
  backgroundPos -= BACKGROUND_SPEED;
  backgroundHouses.style.backgroundPositionX = px(backgroundPos);

  // Move and remove objects
  objects.forEach(obj => {
    obj.x -= BACKGROUND_SPEED;
    obj.el.style.left = px(obj.x);
  });
  objects = objects.filter(obj => {
    if (obj.x < -300) {
      obj.el.remove();
      return false;
    }
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

  distance += 1;
  updateScores();

  // Dog chase
  if (dogChasing && dogX < PLAYER_X - 30) {
    dogX += DOG_CHASE_SPEED;
    dogImg.style.left = px(dogX);
  }

  // Spawning
  if (backgroundPos < -nextDoorX) {
    spawnDoor();
    nextDoorX += DOOR_SPAWN_DIST;
  }
  if (backgroundPos < -nextObstacleX) {
    spawnObstacle();
    nextObstacleX += rand(OBSTACLE_MIN_DIST, OBSTACLE_MAX_DIST);
  }

  // Collisions
  let glowing = false;
  activeDoor = null;
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    if (obj.type === "door" && !obj.delivered) {
      const pxLeft = PLAYER_X, pxRight = pxLeft + PLAYER_WIDTH;
      const doorLeft = obj.x, doorWidth = obj.width, doorRight = doorLeft + doorWidth;
      const leftMargin = Math.max(3, Math.floor(doorWidth * 0.1));
      const rightMargin = Math.max(5, Math.floor(doorWidth * 0.15));
      if (pxRight > doorLeft + leftMargin && pxLeft < doorRight - rightMargin) {
        glowing = true;
        obj.el.classList.add("glow");
        obj.el.style.opacity = "1"; // Always visible when glowing
        activeDoor = obj;
        doorCanBeClicked = true;
      } else {
        obj.el.classList.remove("glow");
        obj.el.style.opacity = "1"; // Always visible even when not glowing
      }
    }
    if (obj.type === "hydrant") {
      const snakeImageWidth = 180, hitboxOffset = (snakeImageWidth - HYDRANT_WIDTH) / 2;
      const snakeLeft = obj.x + hitboxOffset, snakeRight = snakeLeft + HYDRANT_WIDTH;
      const playerLeft = PLAYER_X, playerRight = playerLeft + PLAYER_WIDTH;
      const overlapX = playerRight > snakeLeft && playerLeft < snakeRight;
      const playerAtGroundLevel = playerY < PLAYER_Y + 40;
      if (overlapX && playerAtGroundLevel && !playerImg.classList.contains('flash')) {
        triggerDogChase();
      }
    }
  }
  if (!glowing) {
    doorCanBeClicked = false;
    activeDoor = null;
  }

  // Dog catches player
  const dogRight = dogX + DOG_WIDTH, playerLeft = PLAYER_X;
  if (dogChasing && dogRight - 30 >= playerLeft) endGame();
}

// ====== INPUT HANDLERS ======
function jumpHandler(e) {
  if ((e.code === "Space" || e.key === " " || e.keyCode === 32) && !playerJumping && gameState === "running" && playerY === PLAYER_Y) {
    playerJumping = true; jumpVel = JUMP_VELOCITY; playSound(jumpSound);
  }
}

function doorClickHandler(e) {
  if (gameState !== "running" || !doorCanBeClicked || !activeDoor) return;
  if (!activeDoor.delivered) {
    activeDoor.delivered = true; waterDelivered += 1; updateScores();
    playSound(waterDeliverySound);
    setTimeout(() => { activeDoor.el.classList.remove("glow"); }, 5000);
    confettiDiv.style.display = 'flex'; confettiDiv.style.opacity = 1;
    confettiDiv.textContent = 'Water Delivered! 🎉';
    if (confettiTimer) clearTimeout(confettiTimer);
    confettiTimer = setTimeout(() => { confettiDiv.style.display = 'none'; }, 1200);
  }
}

// ====== DIFFICULTY BUTTON LOGIC ======
function clearDifficultySelection() {
  easyBtn.classList.remove('selected');
  normalBtn.classList.remove('selected');
  hardBtn.classList.remove('selected');
}
easyBtn.addEventListener('click', () => {
  clearDifficultySelection(); easyBtn.classList.add('selected');
  selectedDifficulty = 'easy';
  BACKGROUND_SPEED = DIFFICULTY_SPEEDS.easy;
  GRAVITY = DIFFICULTY_GRAVITY.easy;
  startBtn.disabled = false;
});
normalBtn.addEventListener('click', () => {
  clearDifficultySelection(); normalBtn.classList.add('selected');
  selectedDifficulty = 'normal';
  BACKGROUND_SPEED = DIFFICULTY_SPEEDS.normal;
  GRAVITY = DIFFICULTY_GRAVITY.normal;
  startBtn.disabled = false;
});
hardBtn.addEventListener('click', () => {
  clearDifficultySelection(); hardBtn.classList.add('selected');
  selectedDifficulty = 'hard';
  BACKGROUND_SPEED = DIFFICULTY_SPEEDS.hard;
  GRAVITY = DIFFICULTY_GRAVITY.hard;
  startBtn.disabled = false;
});

// ====== EVENT LISTENERS ======
startBtn.addEventListener('click', () => { hideStartOverlay(); setTimeout(startGame, 500); });
resetBtn.addEventListener('click', () => {
  stopSound(backgroundMusic); gameOverOverlay.classList.remove('show');
  showStartOverlay(); clearDifficultySelection(); selectedDifficulty = null; startBtn.disabled = true;
});
document.addEventListener('selectstart', e => { e.preventDefault(); return false; });
document.addEventListener('contextmenu', e => { e.preventDefault(); return false; });
document.addEventListener('dblclick', e => { e.preventDefault(); return false; });
document.addEventListener('DOMContentLoaded', () => { showStartOverlay(); });