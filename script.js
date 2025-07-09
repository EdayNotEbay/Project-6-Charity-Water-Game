// ====== GAME CONSTANTS ======
// ====== CONSTANTS (update these!) ======

// ...rest of your script.js stays the same!

const GAME_WIDTH = 900;
const GAME_HEIGHT = 520;
const PLAYER_Y = 48;
const DOG_START_X = 10; // Updated from -40 to match CSS position
const PLAYER_X = 170;
const GROUND_HEIGHT = 45;
const BACKGROUND_SPEED = 5.8; // px per tick
const DOG_CHASE_SPEED = 4.8; // px per tick
const DOOR_SPAWN_DIST = 380; // px
const OBSTACLE_MIN_DIST = 230; // px
const OBSTACLE_MAX_DIST = 410;
const TICK_INTERVAL = 18; // ms, ~55fps
const JUMP_VELOCITY = 22; // Increased from 15 for higher jumps
const GRAVITY = 1.09; // Changed back to original value for normal fall speed
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 120;
const DOG_WIDTH = 100;
const DOOR_WIDTH = 56;
const DOOR_HEIGHT = 100;
const HYDRANT_WIDTH = 42; // Updated to match CSS width
const HYDRANT_HEIGHT = 95; // Updated to match CSS height

// Add these constants for background and door offsets
const BG_IMAGE_WIDTH = 800; // width of your background image in px
const BLUE_HOUSE_DOOR_OFFSET = 90; // px from left of background image to blue house door
const RED_HOUSE_DOOR_OFFSET = 390; // px from left of background image to red house door
const DOOR_BOTTOM = 179; // same as .door CSS

// ====== AUDIO SETUP ======
// Create audio objects for sound effects
const dogBarkSound = new Audio('sounds/dog_bark.mp3');
const jumpSound = new Audio('sounds/cartoony_jump_sound.mp3');
const waterDeliverySound = new Audio('sounds/water_delivery_ding_sound.mp3');
const gameOverSound = new Audio('sounds/game_over_sound.mp3');
const backgroundMusic = new Audio('sounds/funny_chase_music.mp3');
const distanceMilestoneSound = new Audio('sounds/distance_milestone_sound.mp3');
const waterMilestoneSound = new Audio('sounds/water_delivery_milestone_sound.mp3');

// Set volume levels (adjust as needed)
dogBarkSound.volume = 0.5;
jumpSound.volume = 0.4;
waterDeliverySound.volume = 0.6;
gameOverSound.volume = 0.7;
backgroundMusic.volume = 0.3; // Keep background music quieter
distanceMilestoneSound.volume = 0.5;
waterMilestoneSound.volume = 0.5;
backgroundMusic.loop = true; // Make background music loop

// Helper function to play sounds safely
function playSound(audio) {
  try {
    audio.currentTime = 0; // Reset to beginning
    audio.play();
  } catch (error) {
    console.log('Could not play sound:', error);
  }
}

// Helper function to stop sounds safely
function stopSound(audio) {
  try {
    audio.pause();
    audio.currentTime = 0; // Reset to beginning
  } catch (error) {
    console.log('Could not stop sound:', error);
  }
}

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

// Milestone tracking variables
let lastDistanceMilestone = 0; // Track the last distance milestone reached
let lastWaterMilestone = 0; // Track the last water delivery milestone reached

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

// Function to test if milestone elements exist
function testMilestoneElements() {
  console.log('Testing milestone elements...');
  
  const distanceElement = document.getElementById('distance-milestone');
  const waterElement = document.getElementById('water-milestone');
  
  console.log('Distance milestone element:', distanceElement);
  console.log('Water milestone element:', waterElement);
  
  if (distanceElement && waterElement) {
    console.log('Both milestone elements found successfully!');
    return true;
  } else {
    console.log('ERROR: Some milestone elements not found!');
    return false;
  }
}

// Simple function to test milestones manually
function testMilestone() {
  console.log('Testing milestone system...');
  
  // Test distance milestone
  const distanceElement = document.getElementById('distance-milestone');
  if (distanceElement) {
    console.log('Distance element found, testing...');
    distanceElement.textContent = 'TEST: 5,000 feet!';
    distanceElement.style.opacity = '1';
    distanceElement.style.background = 'rgba(0, 0, 0, 0.9)';
    distanceElement.style.color = '#FFD700';
    distanceElement.style.padding = '8px 12px';
    distanceElement.style.borderRadius = '8px';
    distanceElement.style.position = 'absolute';
    distanceElement.style.top = '100%';
    distanceElement.style.left = '50%';
    distanceElement.style.transform = 'translateX(-50%)';
    distanceElement.style.zIndex = '1000';
    distanceElement.style.marginTop = '8px';
    distanceElement.style.fontSize = '14px';
    distanceElement.style.fontWeight = '600';
    distanceElement.style.whiteSpace = 'nowrap';
    
    // Hide after 3 seconds
    setTimeout(() => {
      distanceElement.style.opacity = '0';
    }, 3000);
  } else {
    console.log('ERROR: Distance element not found!');
    // Let's try to find it in a different way
    const allElements = document.querySelectorAll('.milestone-message');
    console.log('All milestone elements found:', allElements);
  }
}

// Function to show milestone message - positioned in blue background area
function showMilestone(elementId, message) {
  const milestoneElement = document.getElementById(elementId);

  if (!milestoneElement) {
    console.log(`ERROR: Element ${elementId} not found!`);
    return;
  }

  // Set message and make visible
  milestoneElement.textContent = message;
  milestoneElement.style.display = 'block';
  milestoneElement.style.opacity = '1';
  milestoneElement.style.transition = '';
  milestoneElement.style.transform = 'translateY(0px)';

  console.log(`Milestone displayed in blue area: ${message}`);

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

// Function to check distance milestones - using smaller thresholds for testing
function checkDistanceMilestones(currentDistance) {
  // Use smaller thresholds for easier testing
  if (currentDistance >= 100 && lastDistanceMilestone === 0) {
    const message = `You traveled 100 feet!`;
    console.log(`NEW DISTANCE MILESTONE REACHED: 100`);
    playSound(distanceMilestoneSound); // Play distance milestone sound
    showMilestone('distance-milestone', message);
    lastDistanceMilestone = 100;
  } else if (currentDistance >= 500 && lastDistanceMilestone === 100) {
    const message = `You traveled 500 feet!`;
    console.log(`NEW DISTANCE MILESTONE REACHED: 500`);
    playSound(distanceMilestoneSound); // Play distance milestone sound
    showMilestone('distance-milestone', message);
    lastDistanceMilestone = 500;
  } else if (currentDistance >= 1000 && lastDistanceMilestone === 500) {
    const message = `You traveled 1,000 feet!`;
    console.log(`NEW DISTANCE MILESTONE REACHED: 1000`);
    playSound(distanceMilestoneSound); // Play distance milestone sound
    showMilestone('distance-milestone', message);
    lastDistanceMilestone = 1000;
  } else if (currentDistance >= 2000 && lastDistanceMilestone === 1000) {
    const message = `You traveled 2,000 feet!`;
    console.log(`NEW DISTANCE MILESTONE REACHED: 2000`);
    playSound(distanceMilestoneSound); // Play distance milestone sound
    showMilestone('distance-milestone', message);
    lastDistanceMilestone = 2000;
  } else if (currentDistance >= 5000 && lastDistanceMilestone === 2000) {
    const message = `You traveled 5,000 feet!`;
    console.log(`NEW DISTANCE MILESTONE REACHED: 5000`);
    playSound(distanceMilestoneSound); // Play distance milestone sound
    showMilestone('distance-milestone', message);
    lastDistanceMilestone = 5000;
  }
}

// Function to check water delivery milestones - remove verbose logging
function checkWaterMilestones(currentWater) {
  const milestone = Math.floor(currentWater / 5) * 5;
  
  // Check if we reached a new milestone and it's greater than 0
  if (milestone > lastWaterMilestone && milestone > 0) {
    const message = `You delivered ${milestone} deliveries!`;
    console.log(`NEW WATER MILESTONE REACHED: ${milestone}`);
    playSound(waterMilestoneSound); // Play water milestone sound
    showMilestone('water-milestone', message);
    lastWaterMilestone = milestone;
  }
}

// Update the existing updateScores function to include milestone checking
function updateScores() {
  distanceScore.textContent = `Distance (ft): ${distance}`;
  waterScore.textContent = `Water Delivered: ${waterDelivered}`;
  
  // Check for milestones after updating scores
  checkDistanceMilestones(distance);
  checkWaterMilestones(waterDelivered);
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
  
  // Play dog bark sound when game starts
  playSound(dogBarkSound);
  
  // Start background music
  playSound(backgroundMusic);
}

function endGame() {
  clearInterval(runningInterval);
  gameState = "gameover";
  document.removeEventListener('keydown', jumpHandler);
  gameMain.removeEventListener('mousedown', doorClickHandler);
  
  // Stop background music when game ends
  stopSound(backgroundMusic);
  
  // Play game over sound
  playSound(gameOverSound);
  
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

  // Player gravity - back to simple version
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
        // Only remove glow if door hasn't been delivered
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
    // Only remove glow from undelivered doors
    objects.forEach(obj => { 
      if(obj.type==='door' && !obj.delivered) {
        obj.el.classList.remove("glow"); 
      }
    });
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
  // Simple but effective jump prevention - only check essential conditions
  if ((e.code === "Space" || e.key === " " || e.keyCode === 32) && 
      !playerJumping && 
      gameState === "running" && 
      playerY === PLAYER_Y) { // Player must be exactly on ground
    
    playerJumping = true;
    jumpVel = JUMP_VELOCITY;
    
    // Play jump sound when player jumps
    playSound(jumpSound);
  }
}

// ====== DOOR CLICK ======
function doorClickHandler(e) {
  if (gameState !== "running" || !doorCanBeClicked || !activeDoor) return;

  // Only count click if in front of door and not already delivered
  if (!activeDoor.delivered) {
    activeDoor.delivered = true;
    // Don't remove glow immediately - keep it for 5 seconds
    waterDelivered += 1;
    updateScores();
    
    // Play water delivery sound when water is delivered
    playSound(waterDeliverySound);
    
    // Set a timer to remove glow after 5 seconds
    setTimeout(() => {
      activeDoor.el.classList.remove("glow");
    }, 5000); // 5 seconds
    
    // Confetti animation with jerry can on left, confetti emoji on right
    confettiDiv.style.display = 'flex'; // Changed from 'block' to 'flex'
    confettiDiv.style.opacity = 1;
    confettiDiv.textContent = 'Delivered! 🎉'; // Moved emoji to the right
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
    // Play game over sound when player hits obstacle
    playSound(gameOverSound);
  }
}

// ====== EVENTS ======
startBtn.addEventListener('click', () => {
  hideStartOverlay();
  setTimeout(startGame, 500); // let overlay fade out
});
resetBtn.addEventListener('click', () => {
  // Stop background music when restarting
  stopSound(backgroundMusic);
  gameOverOverlay.classList.remove('show');
  showStartOverlay();
});

// Prevent double-click text selection and context menus
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

// ====== INIT ======
// showStartOverlay(); // Comment out or remove this line

// Move initialization to ensure DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded, initializing game...');
  
  // Test milestone elements
  setTimeout(() => {
    testMilestoneElements();
    
    // Add test button
    const testButton = document.createElement('button');
    testButton.textContent = 'Test Milestone';
    testButton.style.position = 'fixed';
    testButton.style.top = '10px';
    testButton.style.right = '10px';
    testButton.style.zIndex = '9999';
    testButton.style.padding = '10px';
    testButton.style.backgroundColor = '#FFD700';
    testButton.style.border = 'none';
    testButton.style.borderRadius = '5px';
    testButton.style.cursor = 'pointer';
    testButton.onclick = testMilestone;
    document.body.appendChild(testButton);
    
    // Initialize the game after DOM is ready
    showStartOverlay();
  }, 100);
});