// ====== GAME CONSTANTS ======
const GAME_WIDTH = 900;
const GAME_HEIGHT = 520;
const PLAYER_Y = 18; // Back to original positioning to match CSS
const GROUND_LEVEL = 144; // Ground level for people
const DOG_START_X = 10;
const PLAYER_X = 170;
const GROUND_HEIGHT = 45;
const DOG_CHASE_SPEED = 4.8;

// Updated spawning for exactly 1 person per background rotation - using actual background image width
const BG_IMAGE_WIDTH = 1441.58; // Actual width of background image (was 800)
const DOOR_SPAWN_DIST = BG_IMAGE_WIDTH; // 1441.58px - spawn exactly 1 person per background rotation
const DOORS_PER_ROTATION = 1; // Exactly 1 person per background image cycle

const OBSTACLE_MIN_DIST = 150;
const OBSTACLE_MAX_DIST = 250;
const TICK_INTERVAL = 18;
const JUMP_VELOCITY = 22;

// Gravity values for each mode (smaller gravity = longer jump)
const DIFFICULTY_GRAVITY = {
  easy: 0.7,    // Stay in air longer on easy
  normal: 1.09, // Original gravity
  hard: 1.25    // Fall a bit faster on hard
};

let GRAVITY = DIFFICULTY_GRAVITY.normal; // Default gravity

const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 120;
const DOG_WIDTH = 100;
const DOOR_WIDTH = 60;
const DOOR_HEIGHT = 90;
const HYDRANT_WIDTH = 38; // Tight hitbox for snake
const HYDRANT_HEIGHT = 20;

// Much larger distances to prevent "phasing in" and overlapping
const MIN_HYDRANT_TO_DOOR_DISTANCE = 340; // Distance between snakes and people
const MIN_HYDRANT_TO_HYDRANT_DISTANCE = 450; // Increased from 340px to 450px for snakes
const HYDRANT_SPAWN_CHANCE = 0.3; // Reduced spawn rate for better spacing

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
let nextDoorX = GAME_WIDTH + 400;
let nextObstacleX = GAME_WIDTH + 500;
let doorCanBeClicked = false;
let activeDoor = null;
let runningInterval = null;
let playerJumping = false;
let playerY = PLAYER_Y;
let jumpVel = 0;
let dogX = DOG_START_X;
let dogChasing = false;
let confettiTimer = null;
// Add lives variable (2 hearts = 2 lives)
let lives = 2;

// Milestone tracking variables
let lastDistanceMilestone = 0;
let lastWaterMilestone = 0;

// ====== DIFFICULTY SETTINGS ======
let selectedDifficulty = null;

// Default speeds for each mode
const DIFFICULTY_SPEEDS = {
  easy: 4.2,    // Slower background scroll for easy
  normal: 5.8,  // Current normal speed
  hard: 7.0     // Slightly faster for hard
};

let BACKGROUND_SPEED = DIFFICULTY_SPEEDS.normal; // Default to normal

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
// Add references to heart images
const heart1 = document.getElementById('heart1');
const heart2 = document.getElementById('heart2');

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
  nextDoorX = GAME_WIDTH + 400;
  nextObstacleX = GAME_WIDTH + 500;
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

  // Reset lives and hearts
  lives = 2;
  if (heart1) heart1.classList.remove('faded');
  if (heart2) heart2.classList.remove('faded');
  // Reset player position and remove any flashing effect
  if (playerImg) {
    playerImg.classList.remove('flash');
    playerImg.style.left = px(PLAYER_X);
  }
}

function showStartOverlay() {
  startOverlay.classList.remove('hide');
  startOverlay.style.display = 'flex';
  gameOverOverlay.classList.remove('show');
  playerImg.style.display = 'none';
  dogImg.style.display = 'none';
  objects.forEach(o => o.el.remove());
  objects = [];
  clearDifficultySelection();
  selectedDifficulty = null;
  startBtn.disabled = true;
}

function hideStartOverlay() {
  startOverlay.classList.add('hide');
  setTimeout(() => {
    startOverlay.style.display = 'none';
    showGameMain();
  }, 500);
}

function showGameMain() {
  // Always reset player position to normal at game start
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
  // Show a milestone every 1000 feet (1000, 2000, 3000, ...) with no upper limit
  if (currentDistance > 0 && currentDistance % 1000 === 0 && currentDistance !== lastDistanceMilestone) {
    const message = `You traveled ${currentDistance.toLocaleString()} feet!`;
    playSound(distanceMilestoneSound);
    showMilestone('distance-milestone', message);
    lastDistanceMilestone = currentDistance;
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
    const objDistance = Math.abs(obj.x - newX);
    
    // For snakes spawning near doors (people)
    if (objectType === 'hydrant' && obj.type === 'door') {
      if (objDistance < MIN_HYDRANT_TO_DOOR_DISTANCE) {
        console.log(`Snake spawn blocked: too close to person at ${obj.x}px (distance: ${objDistance}px, min required: ${MIN_HYDRANT_TO_DOOR_DISTANCE}px)`);
        return true;
      }
    } 
    // For snakes spawning near other snakes
    else if (objectType === 'hydrant' && obj.type === 'hydrant') {
      if (objDistance < MIN_HYDRANT_TO_HYDRANT_DISTANCE) {
        console.log(`Snake spawn blocked: too close to other snake at ${obj.x}px (distance: ${objDistance}px, min required: ${MIN_HYDRANT_TO_HYDRANT_DISTANCE}px)`);
        return true;
      }
    } 
    // For doors spawning near existing objects
    else if (objectType === 'door' || objectType === null) {
      if (objDistance < minDistance) {
        console.log(`Person spawn blocked: too close to object at ${obj.x}px (distance: ${objDistance}px, min required: ${minDistance}px)`);
        return true;
      }
    }
  }
  return false;
}

// ====== SPAWNERS ======
function spawnDoor() {
  // Create a person element
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
  
  // People spawn at fixed distance (300px) to maintain 1441.58px spacing between people
  // No collision avoidance for people - they follow the background rotation schedule
  const spawnX = GAME_WIDTH + 300;
  el.style.left = px(spawnX);
  gameMain.appendChild(el);
  
  // Store person info with size data for collision detection
  objects.push({ 
    type: 'door', 
    x: spawnX, 
    el, 
    delivered: false,
    category: randomCategory,
    width: size.width,
    height: size.height
  });
  
  console.log(`${randomCategory} spawned at fixed position ${spawnX}px (maintains 1441.58px spacing)`);
}

function spawnObstacle() {
  // Lower spawn chance for better spacing
  if (Math.random() > HYDRANT_SPAWN_CHANCE) {
    console.log('Snake spawn skipped due to chance');
    return;
  }
  
  let attempts = 0;
  let hydrantX;
  const maxAttempts = 20; // More attempts for better positioning
  
  while (attempts < maxAttempts) {
    // Spawn much further away to prevent "phasing in"
    hydrantX = GAME_WIDTH + rand(400, 600); // Further spawn range for snakes
    
    // Check if this position is too close to doors or other snakes
    if (!isPositionTooClose(hydrantX, MIN_HYDRANT_TO_DOOR_DISTANCE, 'hydrant')) {
      const el = document.createElement('div');
      el.className = 'hydrant';
      el.style.left = px(hydrantX);
      gameMain.appendChild(el);
      objects.push({ type: 'hydrant', x: hydrantX, el });
      console.log(`Snake spawned at position ${hydrantX}px`);
      return;
    }
    
    attempts++;
  }
  
  console.log('Snake spawn skipped - no good position found after', maxAttempts, 'attempts');
}

// ====== GAME LOOP ======
function startGame() {
  // Only start if a difficulty is selected
  if (!selectedDifficulty) {
    alert('Please select a difficulty first!');
    return;
  }
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

  // Move objects with better performance
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    obj.x -= BACKGROUND_SPEED;
    obj.el.style.left = px(obj.x);
  }

  // Remove offscreen objects more efficiently
  objects = objects.filter(obj => {
    if (obj.x < -300) { // Remove when further off screen
      obj.el.remove(); 
      return false; 
    }
    return true;
  });

  // Player gravity (unchanged)
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

  // Spawn objects with consistent spacing - exactly 1 person per background rotation
  if (backgroundPos < -nextDoorX) {
    spawnDoor();
    nextDoorX += DOOR_SPAWN_DIST; // Fixed distance - no random variation for consistent 1 per rotation
  }
  
  if (backgroundPos < -nextObstacleX) {
    spawnObstacle();
    nextObstacleX += rand(OBSTACLE_MIN_DIST, OBSTACLE_MAX_DIST);
  }

  // Handle collisions (simplified for performance)
  let glowing = false;
  activeDoor = null;
  
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    
    if (obj.type === "door" && !obj.delivered) {
      // Person collision detection
      const pxLeft = PLAYER_X;
      const pxRight = pxLeft + PLAYER_WIDTH;
      const doorLeft = obj.x;
      const doorWidth = obj.width;
      const doorRight = doorLeft + doorWidth;
      
      const leftMargin = Math.max(3, Math.floor(doorWidth * 0.1));
      const rightMargin = Math.max(5, Math.floor(doorWidth * 0.15));
      
      if (pxRight > doorLeft + leftMargin && pxLeft < doorRight - rightMargin) {
        glowing = true;
        obj.el.classList.add("glow");
        activeDoor = obj;
        doorCanBeClicked = true;
      } else {
        obj.el.classList.remove("glow");
      }
    }
    
    // Snake collision with centered hitbox
    if (obj.type === "hydrant") {
      // Center the hitbox horizontally within the snake image
      // The snake image is 180px wide, hitbox is 38px wide
      // So left edge = obj.x + (180 - 38) / 2
      const snakeImageWidth = 180; // matches CSS .hydrant width
      const hitboxOffset = (snakeImageWidth - HYDRANT_WIDTH) / 2;
      const snakeLeft = obj.x + hitboxOffset;
      const snakeRight = snakeLeft + HYDRANT_WIDTH;

      const playerLeft = PLAYER_X;
      const playerRight = playerLeft + PLAYER_WIDTH;

      // Tight collision detection
      const overlapX = playerRight > snakeLeft && playerLeft < snakeRight;
      const playerAtGroundLevel = playerY < PLAYER_Y + 40;

      // Debug: Uncomment to visualize hitbox in console
      // console.log(`Snake hitbox: ${snakeLeft} to ${snakeRight}`);

      if (overlapX && playerAtGroundLevel) {
        // Only trigger damage if not already flashing (prevents double hit in one frame)
        if (!playerImg.classList.contains('flash')) {
          console.log('Snake collision detected!');
          triggerDogChase();
        }
      }
    }
  }
  
  // Clear glow states efficiently
  if (!glowing) {
    doorCanBeClicked = false;
    activeDoor = null;
  }

  // Dog catches player
  const dogRight = dogX + DOG_WIDTH;
  const playerLeft = PLAYER_X;
  
  if (dogChasing && dogRight - 30 >= playerLeft) {
    console.log('Dog caught player!');
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

// Helper to move player closer to the dog based on lives left
function movePlayerForLives() {
  // On first hit, move player 70px closer to the dog
  // On second hit, move player 120px closer (total from start)
  let offset = 0;
  if (lives === 1) {
    offset = 70;
  } else if (lives === 0) {
    offset = 120;
  }
  playerImg.style.left = px(PLAYER_X - offset);
}

// Add a CSS class for flashing effect (white flash)
function addPlayerFlash() {
  if (playerImg) {
    playerImg.classList.add('flash');
    setTimeout(() => {
      playerImg.classList.remove('flash');
    }, 350); // Flash for 0.35 seconds
  }
}

function triggerDogChase() {
  // Only lose a life if not already at 0
  if (lives === 2) {
    // First hit: lose one life, fade out heart2, move player, flash
    lives = 1;
    if (heart2) heart2.classList.add('faded');
    movePlayerForLives();
    addPlayerFlash();
    dogChasing = false; // Don't start the chase yet
    playSound(gameOverSound);
  } else if (lives === 1) {
    // Second hit: lose last life, fade out heart1, move player, flash, start chase
    lives = 0;
    if (heart1) heart1.classList.add('faded');
    movePlayerForLives();
    addPlayerFlash();
    dogChasing = true; // Start the chase so the dog catches the player
    playSound(gameOverSound);
  }
}

// ====== DIFFICULTY BUTTON LOGIC ======
// Helper to clear selection
function clearDifficultySelection() {
  easyBtn.classList.remove('selected');
  normalBtn.classList.remove('selected');
  hardBtn.classList.remove('selected');
}

// When a difficulty button is clicked, set the speed and enable start
easyBtn.addEventListener('click', () => {
  clearDifficultySelection();
  easyBtn.classList.add('selected');
  selectedDifficulty = 'easy';
  BACKGROUND_SPEED = DIFFICULTY_SPEEDS.easy;
  GRAVITY = DIFFICULTY_GRAVITY.easy; // Less gravity for longer jumps
  startBtn.disabled = false;
});

normalBtn.addEventListener('click', () => {
  clearDifficultySelection();
  normalBtn.classList.add('selected');
  selectedDifficulty = 'normal';
  BACKGROUND_SPEED = DIFFICULTY_SPEEDS.normal;
  GRAVITY = DIFFICULTY_GRAVITY.normal; // Normal gravity
  startBtn.disabled = false;
});

hardBtn.addEventListener('click', () => {
  clearDifficultySelection();
  hardBtn.classList.add('selected');
  selectedDifficulty = 'hard';
  BACKGROUND_SPEED = DIFFICULTY_SPEEDS.hard;
  GRAVITY = DIFFICULTY_GRAVITY.hard; // More gravity for faster fall
  startBtn.disabled = false;
});

// ====== EVENT LISTENERS ======
startBtn.addEventListener('click', () => {
  hideStartOverlay();
  setTimeout(startGame, 500);
});

resetBtn.addEventListener('click', () => {
  stopSound(backgroundMusic);
  gameOverOverlay.classList.remove('show');
  showStartOverlay();
  clearDifficultySelection();
  selectedDifficulty = null;
  startBtn.disabled = true;
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