// ====== GAME CONSTANTS ======
const GAME_WIDTH = 900;
const GAME_HEIGHT = 520;
const PLAYER_Y = 18; // Keep original value for CSS positioning logic
const GROUND_LEVEL = 144; // New constant for collision detection with people/hydrants
const DOG_START_X = 10;
const PLAYER_X = 170;
const GROUND_HEIGHT = 45;
const BACKGROUND_SPEED = 5.8;
const DOG_CHASE_SPEED = 4.8;

// Updated door spawning for 2 people per background rotation
const BG_IMAGE_WIDTH = 800; // Width of background image
const DOOR_SPAWN_DIST = BG_IMAGE_WIDTH / 2; // 400px - spawn 2 people per background rotation
const DOORS_PER_ROTATION = 2; // Number of people per background image cycle

const OBSTACLE_MIN_DIST = 180;
const OBSTACLE_MAX_DIST = 300;
const TICK_INTERVAL = 18;
const JUMP_VELOCITY = 22;
const GRAVITY = 1.09;
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 120;
const DOG_WIDTH = 100;
const DOOR_WIDTH = 60; // Reduced from 80 for better proportions
const DOOR_HEIGHT = 90; // Reduced from 120 for better proportions
const HYDRANT_WIDTH = 42;
const HYDRANT_HEIGHT = 95;

// Updated spacing constants for better gameplay
const MIN_HYDRANT_TO_DOOR_DISTANCE = 100;
const MIN_HYDRANT_TO_HYDRANT_DISTANCE = 150;
const HYDRANT_SPAWN_CHANCE = 0.8;

// Array of people images organized by size category
const PEOPLE_IMAGES = {
  kids: [
    'img/kid_1-removebg-preview.png',
    'img/kid_2-removebg-preview.png',
    'img/kid_3-removebg-preview.png',
    'img/kid_4-removebg-preview.png',
    'img/kid_5-removebg-preview.png'
  ],
  adult_1: [
    'img/adult_1.png'
  ],
  adult_2: [
    'img/adult_2.png'
  ],
  grandma: [
    'img/grandma-removebg-preview.png'
  ]
};

// Size constants for different person types - adjusted for better visibility
const PERSON_SIZES = {
  kids: { width: 40, height: 60 },    // Bigger for kids so they're visible (was 25x40)
  adult_1: { width: 49, height: 70 }, // 30% smaller than adult_2 (70% of 70x100)
  adult_2: { width: 70, height: 100 }, // Normal size for adult_2 (was 80x110)
  grandma: { width: 90, height: 140 } // Slightly taller for grandma (was 90x120)
};

// ====== AUDIO SETUP ======
const dogBarkSound = new Audio('sounds/dog_bark.mp3');
const jumpSound = new Audio('sounds/cartoony_jump_sound.mp3');
const waterDeliverySound = new Audio('sounds/water_delivery_ding_sound.mp3');
const gameOverSound = new Audio('sounds/game_over_sound.mp3');
const backgroundMusic = new Audio('sounds/funny_chase_music.mp3');
const distanceMilestoneSound = new Audio('sounds/distance_milestone_sound.mp3');
const waterMilestoneSound = new Audio('sounds/water_delivery_milestone_sound.mp3');

// Set volume levels
dogBarkSound.volume = 0.5;
jumpSound.volume = 0.4;
waterDeliverySound.volume = 0.6;
gameOverSound.volume = 0.7;
backgroundMusic.volume = 0.3;
distanceMilestoneSound.volume = 0.5;
waterMilestoneSound.volume = 0.5;
backgroundMusic.loop = true;

// Helper functions for audio
function playSound(audio) {
  try {
    audio.currentTime = 0;
    audio.play();
  } catch (error) {
    console.log('Could not play sound:', error);
  }
}

function stopSound(audio) {
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch (error) {
    console.log('Could not stop sound:', error);
  }
}

// ====== GAME STATE ======
let gameState = "start";
let distance = 0;
let waterDelivered = 0;
let backgroundPos = 0;
let objects = [];
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

// Milestone tracking variables
let lastDistanceMilestone = 0;
let lastWaterMilestone = 0;

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
function rand(a, b) { return Math.random() * (b - a) + a; }

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
  dogImg.style.bottom = px(playerY - 2);
  
  // Reset milestone tracking
  lastDistanceMilestone = 0;
  lastWaterMilestone = 0;
}

function showStartOverlay() {
  startOverlay.classList.remove('hide');
  startOverlay.style.display = 'flex';
  gameOverOverlay.classList.remove('show');
  playerImg.style.display = 'none';
  dogImg.style.display = 'none';
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
  dogImg.style.bottom = px(PLAYER_Y - 2);
}

function showGameOver() {
  gameState = 'gameover';
  gameOverOverlay.classList.add('show');
  finalDistance.textContent = `Distance: ${distance} ft`;
  finalWater.textContent = `Water Delivered: ${waterDelivered}`;
}

// Function to show milestone message
function showMilestone(elementId, message) {
  const milestoneElement = document.getElementById(elementId);

  if (!milestoneElement) {
    console.log(`ERROR: Element ${elementId} not found!`);
    return;
  }

  milestoneElement.textContent = message;
  milestoneElement.style.display = 'block';
  milestoneElement.style.opacity = '1';
  milestoneElement.style.transition = '';
  milestoneElement.style.transform = 'translateY(0px)';

  console.log(`Milestone displayed: ${message}`);

  // Animate down and fade out after 2.5 seconds
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

// Function to check distance milestones
function checkDistanceMilestones(currentDistance) {
  if (currentDistance >= 100 && lastDistanceMilestone === 0) {
    const message = `You traveled 100 feet!`;
    playSound(distanceMilestoneSound);
    showMilestone('distance-milestone', message);
    lastDistanceMilestone = 100;
  } else if (currentDistance >= 500 && lastDistanceMilestone === 100) {
    const message = `You traveled 500 feet!`;
    playSound(distanceMilestoneSound);
    showMilestone('distance-milestone', message);
    lastDistanceMilestone = 500;
  } else if (currentDistance >= 1000 && lastDistanceMilestone === 500) {
    const message = `You traveled 1,000 feet!`;
    playSound(distanceMilestoneSound);
    showMilestone('distance-milestone', message);
    lastDistanceMilestone = 1000;
  } else if (currentDistance >= 2000 && lastDistanceMilestone === 1000) {
    const message = `You traveled 2,000 feet!`;
    playSound(distanceMilestoneSound);
    showMilestone('distance-milestone', message);
    lastDistanceMilestone = 2000;
  } else if (currentDistance >= 5000 && lastDistanceMilestone === 2000) {
    const message = `You traveled 5,000 feet!`;
    playSound(distanceMilestoneSound);
    showMilestone('distance-milestone', message);
    lastDistanceMilestone = 5000;
  }
}

// Function to check water delivery milestones
function checkWaterMilestones(currentWater) {
  const milestone = Math.floor(currentWater / 5) * 5;
  
  if (milestone > lastWaterMilestone && milestone > 0) {
    const message = `You delivered ${milestone} deliveries!`;
    playSound(waterMilestoneSound);
    showMilestone('water-milestone', message);
    lastWaterMilestone = milestone;
  }
}

// Update scores function
function updateScores() {
  distanceScore.textContent = `Distance (ft): ${distance}`;
  waterScore.textContent = `Water Delivered: ${waterDelivered}`;
  
  checkDistanceMilestones(distance);
  checkWaterMilestones(waterDelivered);
}

// Helper function to check if position is too close to existing objects
function isPositionTooClose(newX, minDistance, objectType = null) {
  for (const obj of objects) {
    const distance = Math.abs(obj.x - newX);
    
    if (objectType === 'hydrant' && obj.type === 'door') {
      if (distance < MIN_HYDRANT_TO_DOOR_DISTANCE) {
        return true;
      }
    } else if (objectType === 'hydrant' && obj.type === 'hydrant') {
      if (distance < MIN_HYDRANT_TO_HYDRANT_DISTANCE) {
        return true;
      }
    } else if (distance < minDistance) {
      return true;
    }
  }
  return false;
}

// ====== SPAWNERS ======
function spawnDoor() {
  // Create a person element instead of a door
  const el = document.createElement('div');
  el.className = 'door';
  
  // Randomly select a person category and image
  const categories = Object.keys(PEOPLE_IMAGES);
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  const categoryImages = PEOPLE_IMAGES[randomCategory];
  const randomPersonImage = categoryImages[Math.floor(Math.random() * categoryImages.length)];
  
  // Set the background image
  el.style.backgroundImage = `url('${randomPersonImage}')`;
  
  // Set size based on category
  const size = PERSON_SIZES[randomCategory];
  el.style.width = px(size.width);
  el.style.height = px(size.height);
  
  // Store category for collision detection
  el.dataset.category = randomCategory;
  
  el.style.left = px(GAME_WIDTH + 35);
  gameMain.appendChild(el);
  
  // Store person info with size data for collision detection
  objects.push({ 
    type: 'door', 
    x: GAME_WIDTH + 35, 
    el, 
    delivered: false,
    category: randomCategory,
    width: size.width,
    height: size.height
  });
  
  console.log(`${randomCategory} spawned with image: ${randomPersonImage}, size: ${size.width}x${size.height}`);
}

function spawnObstacle() {
  if (Math.random() > HYDRANT_SPAWN_CHANCE) {
    return;
  }
  
  let attempts = 0;
  let hydrantX;
  const maxAttempts = 8;
  
  while (attempts < maxAttempts) {
    hydrantX = GAME_WIDTH + rand(60, 180);
    
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

// ====== GAME LOOP ======
function startGame() {
  resetGameVars();
  showGameMain();
  updateScores();
  gameState = "running";
  runningInterval = setInterval(gameTick, TICK_INTERVAL);
  document.addEventListener('keydown', jumpHandler);
  gameMain.addEventListener('mousedown', doorClickHandler);
  
  playSound(dogBarkSound);
  playSound(backgroundMusic);
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

// ====== GAME TICK ======
function gameTick() {
  if (gameState !== "running") return;

  // Background scroll
  backgroundPos -= BACKGROUND_SPEED;
  backgroundHouses.style.backgroundPositionX = px(backgroundPos);

  // Move objects
  objects.forEach(obj => {
    obj.x -= BACKGROUND_SPEED;
    obj.el.style.left = px(obj.x);
  });

  // Remove offscreen objects
  objects = objects.filter(obj => {
    if (obj.x < -120) { 
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

  // Update distance and scores
  distance += 1;
  updateScores();

  // Dog chase
  if (dogChasing && dogX < PLAYER_X - 30) {
    dogX += DOG_CHASE_SPEED;
    dogImg.style.left = px(dogX);
  }

  // Spawn objects
  if (backgroundPos < -nextDoorX) {
    spawnDoor();
    nextDoorX += DOOR_SPAWN_DIST + rand(-40, 40);
  }
  
  if (backgroundPos < -nextObstacleX) {
    spawnObstacle();
    nextObstacleX += rand(OBSTACLE_MIN_DIST, OBSTACLE_MAX_DIST);
  }

  // Handle collisions
  let glowing = false;
  activeDoor = null;
  
  for (const obj of objects) {
    if (obj.type === "door" && !obj.delivered) {
      const pxLeft = PLAYER_X;
      const pxRight = pxLeft + PLAYER_WIDTH;
      const doorLeft = obj.x;
      
      // Use dynamic width based on person category
      const doorWidth = obj.width || DOOR_WIDTH; // Fallback to default
      const doorRight = doorLeft + doorWidth;
      
      if (pxRight > doorLeft + 7 && pxLeft < doorRight - 10) {
        glowing = true;
        obj.el.classList.add("glow");
        activeDoor = obj;
        doorCanBeClicked = true;
      } else {
        obj.el.classList.remove("glow");
      }
    }
    
    // Hydrant collision - use GROUND_LEVEL for proper collision detection
    if (obj.type === "hydrant") {
      const hydrantLeft = obj.x;
      const hydrantRight = hydrantLeft + HYDRANT_WIDTH;
      const hydrantTop = GROUND_LEVEL; // Use ground level instead of PLAYER_Y
      const hydrantBottom = hydrantTop + HYDRANT_HEIGHT;
      const playerLeft = PLAYER_X;
      const playerRight = playerLeft + PLAYER_WIDTH;
      const playerBottom = GROUND_LEVEL; // Use ground level for player too
      const playerTop = playerBottom + PLAYER_HEIGHT;

      const overlapX = playerRight > hydrantLeft && playerLeft < hydrantRight;
      const overlapY = playerBottom < hydrantBottom && playerTop > hydrantTop;

      if (overlapX && overlapY) {
        triggerDogChase();
      }
    }
  }
  
  if (!glowing) {
    doorCanBeClicked = false;
    objects.forEach(obj => { 
      if (obj.type === 'door' && !obj.delivered) {
        obj.el.classList.remove("glow"); 
      }
    });
    activeDoor = null;
  }

  // Dog catches player
  if (dogChasing && dogX + DOG_WIDTH - 30 >= PLAYER_X) {
    endGame();
  }
}

// ====== INPUT HANDLERS ======
function jumpHandler(e) {
  if ((e.code === "Space" || e.key === " " || e.keyCode === 32) && 
      !playerJumping && 
      gameState === "running" && 
      playerY === PLAYER_Y) {
    
    playerJumping = true;
    jumpVel = JUMP_VELOCITY;
    playSound(jumpSound);
  }
}

function doorClickHandler(e) {
  if (gameState !== "running" || !doorCanBeClicked || !activeDoor) return;

  if (!activeDoor.delivered) {
    activeDoor.delivered = true;
    waterDelivered += 1;
    updateScores();
    
    playSound(waterDeliverySound);
    
    setTimeout(() => {
      activeDoor.el.classList.remove("glow");
    }, 5000);
    
    confettiDiv.style.display = 'flex';
    confettiDiv.style.opacity = 1;
    confettiDiv.textContent = 'Water Delivered! 🎉';
    if (confettiTimer) clearTimeout(confettiTimer);
    confettiTimer = setTimeout(() => {
      confettiDiv.style.display = 'none';
    }, 1200);
  }
}

function triggerDogChase() {
  if (!dogChasing) {
    dogChasing = true;
    playSound(gameOverSound);
  }
}

// ====== EVENT LISTENERS ======
startBtn.addEventListener('click', () => {
  hideStartOverlay();
  setTimeout(startGame, 500);
});

resetBtn.addEventListener('click', () => {
  stopSound(backgroundMusic);
  gameOverOverlay.classList.remove('show');
  showStartOverlay();
});

// Prevent text selection
document.addEventListener('selectstart', (e) => {
  e.preventDefault();
  return false;
});

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  return false;
});

document.addEventListener('dblclick', (e) => {
  e.preventDefault();
  return false;
});

// ====== INITIALIZATION ======
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing game...');
  showStartOverlay();
});