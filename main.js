import * as THREE from 'https://cdn.jsdelivr.net/npm/three/build/three.module.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three/examples/jsm/loaders/FBXLoader.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://cdn.jsdelivr.net/npm/three/examples/jsm/postprocessing/ShaderPass.js';
import { TextureLoader } from 'https://cdn.jsdelivr.net/npm/three/src/loaders/TextureLoader.js';


// Pixelation shader
const PixelationShader = {
  uniforms: {
    "tDiffuse": { value: null },
    "resolution": { value: new THREE.Vector2() },
    "pixelSize": { value: 4.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float pixelSize;
    varying vec2 vUv;
    
    void main() {
      vec2 dxy = pixelSize / resolution;
      vec2 coord = dxy * floor(vUv / dxy);
      gl_FragColor = texture2D(tDiffuse, coord);
    }
  `
};

// Global state variables
let isBlackScreen = false;

// Create status panel
const statusPanel = document.createElement('div');
statusPanel.style.position = 'fixed';
statusPanel.style.bottom = '20px';
statusPanel.style.left = '20px';
statusPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
statusPanel.style.color = 'white';
statusPanel.style.padding = '15px';
statusPanel.style.borderRadius = '10px';
statusPanel.style.fontFamily = 'Dogica, monospace';
statusPanel.style.zIndex = '1000';
statusPanel.style.minWidth = '200px';

// Add status panel to document
document.body.appendChild(statusPanel);

// Function to update status panel
function updateStatusPanel() {
  // Clamp all stats before displaying
  companionState.happiness = clampStat(companionState.happiness);
  companionState.hunger = clampStat(companionState.hunger);
  companionState.cleanliness = clampStat(companionState.cleanliness);
  companionState.health = clampStat(companionState.health);
  
  statusPanel.innerHTML = `
    <div style="margin-bottom: 10px;">
      <strong>${companionState.name}</strong>
      <div style="font-size: 12px; color: #aaa;">Age: ${Math.floor(companionState.age)}s</div>
    </div>
    <div style="display: grid; grid-template-columns: 1fr; gap: 5px;">
      <div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span>Happiness</span>
          <span>${Math.floor(companionState.happiness)}%</span>
        </div>
        <div style="width: 100%; height: 8px; background: #333; border-radius: 4px; overflow: hidden;">
          <div style="width: ${companionState.happiness}%; height: 100%; background: #4CAF50; transition: width 0.3s;"></div>
        </div>
      </div>
      <div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span>Hunger</span>
          <span>${Math.floor(companionState.hunger)}%</span>
        </div>
        <div style="width: 100%; height: 8px; background: #333; border-radius: 4px; overflow: hidden;">
          <div style="width: ${companionState.hunger}%; height: 100%; background: #FF9800; transition: width 0.3s;"></div>
        </div>
      </div>
      <div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span>Cleanliness</span>
          <span>${Math.floor(companionState.cleanliness)}%</span>
        </div>
        <div style="width: 100%; height: 8px; background: #333; border-radius: 4px; overflow: hidden;">
          <div style="width: ${companionState.cleanliness}%; height: 100%; background: #2196F3; transition: width 0.3s;"></div>
        </div>
      </div>
      <div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span>Health</span>
          <span>${Math.floor(companionState.health)}%</span>
        </div>
        <div style="width: 100%; height: 8px; background: #333; border-radius: 4px; overflow: hidden;">
          <div style="width: ${companionState.health}%; height: 100%; background: #f44336; transition: width 0.3s;"></div>
        </div>
      </div>
    </div>
    <div style="margin-top: 10px;">
      <div style="display: flex; gap: 5px; margin-bottom: 5px;">
        ${Array(3).fill(null).map((_, i) => `
          <div style="width: 20px; height: 20px; background: ${i < gameState.unlockedTraitSlots ? '#4CAF50' : '#666'}; border-radius: 4px;"></div>
        `).join('')}
      </div>
      <div style="font-size: 12px;">
        <div>Turns Left: ${gameState.turnsLeft}</div>
        <div>Money: $${gameState.money}</div>
      </div>
    </div>
  `;
}

// Create history panel
const historyPanel = document.createElement('div');
historyPanel.style.position = 'fixed';
historyPanel.style.right = '20px';
historyPanel.style.top = '20px';
historyPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
historyPanel.style.color = 'white';
historyPanel.style.padding = '20px';
historyPanel.style.borderRadius = '10px';
historyPanel.style.fontFamily = 'Dogica, monospace';
historyPanel.style.zIndex = '1000';
historyPanel.style.width = '250px';

// Setup scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
scene.background = new THREE.Color(0x000000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animation);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
document.body.appendChild(renderer.domElement);

// Setup post-processing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const pixelationPass = new ShaderPass(PixelationShader);
pixelationPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
composer.addPass(pixelationPass);

// Add position display
const positionDisplay = document.createElement('div');
positionDisplay.style.position = 'fixed';
positionDisplay.style.top = '10px';
positionDisplay.style.left = '10px';
positionDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
positionDisplay.style.color = 'white';
positionDisplay.style.padding = '10px';
positionDisplay.style.borderRadius = '5px';
positionDisplay.style.fontFamily = 'monospace';
document.body.appendChild(positionDisplay);

// Add lights
const ambientLight = new THREE.AmbientLight(0xffffff, 3.3);  // Set to 3.3 as specified
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);  // Set to 0.3 as specified
directionalLight.position.set(3, 10, 3);  // Set to specified position
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 128;
directionalLight.shadow.mapSize.height = 128;
directionalLight.shadow.bias = -0.0001;
scene.add(directionalLight);

// Create environment
const roomSize = 10;
const wallHeight = 5;

// Floor
const floorGeometry = new THREE.PlaneGeometry(roomSize, roomSize);
const floorMaterial = new THREE.MeshStandardMaterial({ 
  color: 0xffffff,
  roughness: 0.5,   // Set to 0.5 as specified
  metalness: 0.1    // Set to 0.1 as specified
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Walls
const wallMaterial = new THREE.MeshStandardMaterial({ 
  color: 0xffffff,
  roughness: 0.5,   // Set to 0.5 as specified
  metalness: 0.1    // Set to 0.1 as specified
});

// Back wall
const backWall = new THREE.Mesh(
  new THREE.PlaneGeometry(roomSize, wallHeight),
  wallMaterial
);
backWall.position.z = -roomSize/2;
backWall.position.y = wallHeight/2;
backWall.receiveShadow = true;
scene.add(backWall);

// Side walls
const leftWall = new THREE.Mesh(
  new THREE.PlaneGeometry(roomSize, wallHeight),
  wallMaterial
);
leftWall.position.x = -roomSize/2;
leftWall.position.y = wallHeight/2;
leftWall.rotation.y = Math.PI / 2;
leftWall.receiveShadow = true;
scene.add(leftWall);

const rightWall = new THREE.Mesh(
  new THREE.PlaneGeometry(roomSize, wallHeight),
  wallMaterial
);
rightWall.position.x = roomSize/2;
rightWall.position.y = wallHeight/2;
rightWall.rotation.y = -Math.PI / 2;
rightWall.receiveShadow = true;
scene.add(rightWall);

// Camera settings
const cameraOffset = new THREE.Vector3(0, 3, 8);
const cameraSmoothness = 0.1;

// Position camera
camera.position.copy(cameraOffset);

let catModel;
let companionCat;  // The companion cat model

// Cat name generator
const catNames = [
  "Luna", "Oliver", "Leo", "Bella", "Charlie", "Lucy", "Milo", "Nala",
  "Simba", "Tiger", "Shadow", "Smokey", "Ginger", "Coco", "Pepper", "Mocha",
  "Midnight", "Snowball", "Whiskers", "Pumpkin", "Cookie", "Muffin", "Cupcake",
  "Pancake", "Waffle", "Donut", "Bagel", "Pretzel", "Cinnamon", "Nutmeg", "Oreo"
];

// Shop items
const shopItems = {
  consumables: {
    fish: {
      name: "Fish",
      description: "A tasty fish that makes cats happy",
      cost: 100,
      effect: (cat) => {
        cat.happiness += 20;
        cat.hunger += 10;
        cat.health += 5;
        // Clamp all stats
        cat.happiness = clampStat(cat.happiness);
        cat.hunger = clampStat(cat.hunger);
        cat.health = clampStat(cat.health);
        // Update history for trait
        cat.history.fishEaten++;
      }
    },
    catnip: {
      name: "Catnip",
      description: "Makes cats go crazy",
      cost: 150,
      effect: (cat) => {
        cat.happiness += 30;
        cat.cleanliness -= 10;
        cat.health -= 5;
        // Clamp all stats
        cat.happiness = clampStat(cat.happiness);
        cat.cleanliness = clampStat(cat.cleanliness);
        cat.health = clampStat(cat.health);
        // Update history for trait
        cat.history.catnipUsed++;
      }
    },
    milk: {
      name: "Milk",
      description: "Makes cats feel like kittens again",
      cost: 80,
      effect: (cat) => {
        cat.happiness += 15;
        cat.cleanliness += 5;
        cat.health += 3;
        // Clamp all stats
        cat.happiness = clampStat(cat.happiness);
        cat.cleanliness = clampStat(cat.cleanliness);
        cat.health = clampStat(cat.health);
        // Update history for trait
        cat.history.milkDrunk++;
      }
    },
    chocolate: {
      name: "Chocolate",
      description: "A sweet treat that cats shouldn't eat...",
      cost: 200,
      effect: (cat) => {
        cat.happiness = clampStat(cat.happiness + 40);
        cat.health = clampStat(cat.health - 20);
        cat.cleanliness = clampStat(cat.cleanliness - 15);
        cat.history.chocolateEaten++;
        
        // Always kill the cat when eating chocolate
        cat.isDead = true;
        cat.history.isDead = true;
        
        // Make cat fall over
        if (companionCat) {
          companionCat.rotation.x = Math.PI / 2; // Rotate to lie on side
          companionCat.position.y = 0.1; // Lower to ground
        }
        
        // Disable all actions
        companionUI.style.display = 'none';
        
        // Show disposal message
        const deathMessage = document.createElement('div');
        deathMessage.style.position = 'fixed';
        deathMessage.style.top = '50%';
        deathMessage.style.left = '50%';
        deathMessage.style.transform = 'translate(-50%, -50%)';
        deathMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        deathMessage.style.color = 'white';
        deathMessage.style.padding = '20px';
        deathMessage.style.borderRadius = '10px';
        deathMessage.style.textAlign = 'center';
        deathMessage.style.zIndex = '1000';
        deathMessage.innerHTML = `
          <h3>Your cat has died from chocolate poisoning!</h3>
          <p>Click on the cat to dispose of it and get a new one.</p>
        `;
        document.body.appendChild(deathMessage);
        
        // Add click handler to companion cat for disposal
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        
        function handleDeathClick(event) {
          mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
          mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
          
          raycaster.setFromCamera(mouse, camera);
          const intersects = raycaster.intersectObject(companionCat, true);
          
          if (intersects.length > 0) {
            // Remove death message
            deathMessage.remove();
            // Start new round without resetting money
            startNewRound();
            // Remove click handler
            window.removeEventListener('click', handleDeathClick);
          }
        }
        
        window.addEventListener('click', handleDeathClick);
      }
    }
  },
  accessories: {
    headphones: {
      name: "Headphones",
      description: "Makes your cat look cool",
      cost: 500,
      model: "headphones",
      effect: (cat) => {
        console.log('Attempting to equip headphones...'); // Debug log
        cat.accessories.push("headphones");
        if (headphonesModel && catModel) {
          console.log('Models exist, proceeding with equipping...'); // Debug log
          // Remove from scene if it's already there
          if (headphonesModel.parent) {
            console.log('Removing headphones from previous parent...'); // Debug log
            headphonesModel.parent.remove(headphonesModel);
          }
          // Make visible and attach to cat
          headphonesModel.visible = true;
          // Make sure all meshes in the model are visible
          headphonesModel.traverse((child) => {
            if (child.isMesh) {
              child.visible = true;
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          headphonesModel.position.set(0, 0, 0); // Reset position relative to cat
          headphonesModel.rotation.set(0, 0, 0); // Reset rotation relative to cat
          catModel.add(headphonesModel);
          console.log('Headphones equipped successfully!'); // Debug log
        } else {
          console.log('Missing models:', { headphonesModel: !!headphonesModel, catModel: !!catModel }); // Debug log
        }
      }
    },
    starPin: {
      name: "Star Hairpin",
      description: "Adds a cute star to your cat",
      cost: 300,
      model: "starPin",
      effect: (cat) => {
        console.log('Attempting to equip star pin...'); // Debug log
        cat.accessories.push("starPin");
        if (starPinModel && catModel) {
          console.log('Models exist, proceeding with equipping...'); // Debug log
          // Remove from scene if it's already there
          if (starPinModel.parent) {
            console.log('Removing star pin from previous parent...'); // Debug log
            starPinModel.parent.remove(starPinModel);
          }
          // Make visible and attach to cat
          starPinModel.visible = true;
          // Make sure all meshes in the model are visible
          starPinModel.traverse((child) => {
            if (child.isMesh) {
              child.visible = true;
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          starPinModel.position.set(0, 0, 0); // Reset position relative to cat
          starPinModel.rotation.set(0, 0, 0); // Reset rotation relative to cat
          catModel.add(starPinModel);
          console.log('Star pin equipped successfully!'); // Debug log
        } else {
          console.log('Missing models:', { starPinModel: !!starPinModel, catModel: !!catModel }); // Debug log
        }
      }
    }
  },
  upgrades: {
    traitSlot: {
      name: "Trait Slot",
      description: "Unlock an additional trait slot for your cat",
      cost: 1000,
      effect: (gameState) => {
        if (gameState.unlockedTraitSlots < 3) {
          gameState.unlockedTraitSlots++;
          return true;
        }
        return false;
      }
    }
  }
};

// Trait definitions
const traits = {
  masochistic: {
    name: "Masochistic",
    description: "This cat has learned to enjoy pain...",
    condition: (history) => history.punchPetRatio > 0.7 && history.punchCount > 5
  },
  sickly: {
    name: "Sickly",
    description: "Poor health has become a way of life",
    condition: (history) => companionState.health <= 30
  },
  glutton: {
    name: "Glutton",
    description: "Never met a meal it didn't like... twice",
    condition: (history) => history.overfeeding > 10
  },
  emo: {
    name: "Emo",
    description: "It's not just a phase...",
    condition: (history) => companionState.happiness <= 30
  },
  depressed: {
    name: "Depressed",
    description: "Life is pain",
    condition: (history) => companionState.happiness <= 30 && 
      companionState.hunger <= 30 && 
      companionState.cleanliness <= 30 && 
      companionState.health <= 30
  },
  fulfilled: {
    name: "Fulfilled",
    description: "Living its best life",
    condition: (history) => companionState.happiness >= 70 && 
      companionState.hunger >= 70 && 
      companionState.cleanliness >= 70 && 
      companionState.health >= 70
  },
  messy: {
    name: "Messy",
    description: "Hygiene is optional",
    condition: (history) => companionState.cleanliness <= 30
  },
  reallyClean: {
    name: "Really Clean",
    description: "Cleanliness is next to godliness",
    condition: (history) => companionState.cleanliness >= 70
  },
  fishYum: {
    name: "Fish Lover",
    description: "This cat loves fish!",
    condition: (history) => history.fishEaten > 0
  },
  druggie: {
    name: "Catnip Addict",
    description: "This cat is addicted to catnip",
    condition: (history) => history.catnipUsed > 0
  },
  kittenUwu: {
    name: "Eternal Kitten",
    description: "This cat acts like a kitten",
    condition: (history) => history.milkDrunk > 0
  },
  dead: {
    name: "Dead",
    description: "This cat is dead",
    condition: (history) => history.isDead
  }
};

// Buyer preferences
const buyerTypes = [
  {
    name: "Goth Teen",
    description: "Looking for a kindred spirit",
    desiredTraits: ["emo", "depressed"],
    basePrice: 500,
    traitBonus: 300
  },
  {
    name: "Rich Lady",
    description: "Only the finest will do",
    desiredTraits: ["reallyClean", "fulfilled"],
    basePrice: 800,
    traitBonus: 400
  },
  {
    name: "Gym Bro",
    description: "No pain no gain",
    desiredTraits: ["masochistic", "glutton"],
    basePrice: 400,
    traitBonus: 250
  },
  {
    name: "Neat Freak",
    description: "Must be pristine",
    desiredTraits: ["reallyClean"],
    basePrice: 600,
    traitBonus: 350
  },
  {
    name: "Cat Hoarder",
    description: "Just wants more cats",
    desiredTraits: ["messy", "sickly"],
    basePrice: 200,
    traitBonus: 150
  }
];

// Create game info display (at the top of the screen)
const gameInfo = document.createElement('div');
gameInfo.style.position = 'fixed';
gameInfo.style.top = '20px';
gameInfo.style.left = '50%';
gameInfo.style.transform = 'translateX(-50%)';
gameInfo.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
gameInfo.style.color = 'white';
gameInfo.style.padding = '15px 30px';
gameInfo.style.borderRadius = '10px';
gameInfo.style.fontFamily = 'Dogica, monospace';
gameInfo.style.fontSize = '16px';
gameInfo.style.zIndex = '1000';
document.body.appendChild(gameInfo);

// Add shop button to game info
const shopButton = document.createElement('button');
shopButton.textContent = 'Shop';
shopButton.style.marginLeft = '20px';
shopButton.style.padding = '5px 15px';
shopButton.style.backgroundColor = '#4CAF50';
shopButton.style.border = 'none';
shopButton.style.borderRadius = '5px';
shopButton.style.color = 'white';
shopButton.style.cursor = 'pointer';
shopButton.style.fontFamily = 'Dogica, monospace';
shopButton.onclick = () => {
  shopUI.style.display = 'block';
  showShop();
};

// Update game info function
function updateGameInfo() {
  gameInfo.innerHTML = `Turns Left: ${gameState.turnsLeft} | Money: $${gameState.money} | Trait Slots: ${gameState.unlockedTraitSlots}`;
  if (gameState.gamePhase === 'caring') {
    gameInfo.appendChild(shopButton);
  }
  updateStatusPanel();
}

// Initialize game state with inventory
const gameState = {
  turnsLeft: 20,
  money: 0,
  unlockedTraitSlots: 1, // Start with 1 trait slot
  gamePhase: 'caring',
  potentialBuyers: [],
  soldCats: [],
  inventory: {
    fish: 0,
    catnip: 0,
    milk: 0,
    chocolate: 0
  },
  equippedAccessories: []
};

// Initialize companion state
let companionState = {
  name: catNames[Math.floor(Math.random() * catNames.length)],
  age: 0,
  happiness: 50,  // Start at 50
  hunger: 50,     // Start at 50
  cleanliness: 50, // Start at 50
  health: 50,     // Start at 50
  traits: [],
  accessories: [],
  isDead: false,
  lastMoveTime: 0,
  moveInterval: 2000,
  currentDirection: new THREE.Vector3(),
  isBeingPet: false,
  isBeingFed: false,
  isBeingPunched: false,
  isBeingBathed: false,
  history: {
    punchCount: 0,
    petCount: 0,
    punchPetRatio: 0,
    lowHealthTime: 0,
    overfeeding: 0,
    lowHappinessTime: 0,
    allStatsLowTime: 0,
    allStatsHighTime: 0,
    lowCleanlinessTime: 0,
    highCleanlinessTime: 0,
    fishEaten: 0,
    catnipUsed: 0,
    milkDrunk: 0,
    isDead: false
  }
};

// Initialize displays
updateGameInfo();
updateStatusPanel();
updateHistoryPanel();

let isBouncing = false;
let bounceStartTime = 0;
const bounceDuration = 400;
const bounceHeight = 2.0;

// Movement controls
const moveSpeed = 0.05;  // Reduced from 0.1 to 0.05 for slower movement
const rotationSpeed = 0.2;
const walkBobSpeed = 0.2;  // Increased from 0.1 to 0.2 for faster bobbing
const walkBobHeight = 0.05;  // Height of the bobbing motion
let walkTime = 0;  // Time tracker for walking animation
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  space: false
};

// Room boundaries for collision
const roomBounds = {
  minX: -roomSize/2 + 0.5,
  maxX: roomSize/2 - 0.5,
  minZ: -roomSize/2 + 0.5,
  maxZ: roomSize/2 - 0.5
};

// Create sparkle particle system
const sparkleGeometry = new THREE.BufferGeometry();
const sparkleCount = 20;
const sparklePositions = new Float32Array(sparkleCount * 3);
const sparkleVelocities = new Float32Array(sparkleCount * 3);
const sparkleLifetimes = new Float32Array(sparkleCount);

for (let i = 0; i < sparkleCount; i++) {
  sparklePositions[i * 3] = 0;
  sparklePositions[i * 3 + 1] = 0;
  sparklePositions[i * 3 + 2] = 0;
  
  sparkleVelocities[i * 3] = (Math.random() - 0.5) * 0.2;
  sparkleVelocities[i * 3 + 1] = Math.random() * 0.2;
  sparkleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
  
  sparkleLifetimes[i] = 0;
}

sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
sparkleGeometry.setAttribute('velocity', new THREE.BufferAttribute(sparkleVelocities, 3));
sparkleGeometry.setAttribute('lifetime', new THREE.BufferAttribute(sparkleLifetimes, 1));

const sparkleMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.1,
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending
});

const sparkles = new THREE.Points(sparkleGeometry, sparkleMaterial);
scene.add(sparkles);

// Key event handlers
function onKeyDown(event) {
  console.log('Key pressed:', event.key); // Debug log for all keys
  const key = event.key.toLowerCase();
  
  // Handle space key specifically
  if (event.code === 'Space' && !isBouncing) {
    console.log('Space detected!'); // Debug log for space
    isBouncing = true;
    bounceStartTime = Date.now();
    
    // Reset sparkles
    const positions = sparkleGeometry.attributes.position.array;
    const velocities = sparkleGeometry.attributes.velocity.array;
    const lifetimes = sparkleGeometry.attributes.lifetime.array;
    
    for (let i = 0; i < sparkleCount; i++) {
      positions[i * 3] = catModel.position.x;
      positions[i * 3 + 1] = catModel.position.y;
      positions[i * 3 + 2] = catModel.position.z;
      
      velocities[i * 3] = (Math.random() - 0.5) * 0.2;
      velocities[i * 3 + 1] = Math.random() * 0.2;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
      
      lifetimes[i] = 1.0;
    }
    
    sparkleGeometry.attributes.position.needsUpdate = true;
    sparkleGeometry.attributes.velocity.needsUpdate = true;
    sparkleGeometry.attributes.lifetime.needsUpdate = true;
    
    console.log('Jump started, isBouncing:', isBouncing); // Debug log
    return;
  }
  
  // Handle other keys
  if (keys.hasOwnProperty(key)) {
    keys[key] = true;
  }
}

function onKeyUp(event) {
  const key = event.key.toLowerCase();
  if (keys.hasOwnProperty(key)) {
    keys[key] = false;
  }
}

// Add key event listeners
window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);

// Debug log to confirm event listeners are added
console.log('Event listeners added');

// Load the texture
const textureLoader = new TextureLoader();
const catTexture = textureLoader.load('/tex/tex.png');
catTexture.flipY = true; // FBX models typically need flipped textures

// Load the FBX model
const fbxLoader = new FBXLoader();
fbxLoader.load(
  '/models/catchara.fbx',
  (fbx) => {
    catModel = fbx;
    
    // Scale reduced to half the previous size
    catModel.scale.set(0.025, 0.025, 0.025);
    
    // Position the model in the center and lift it up to stand on the floor
    catModel.position.set(0, 1.250, 0);
    catModel.castShadow = true;
    catModel.receiveShadow = true;
    
    // Apply texture to all meshes
    catModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // Apply the texture to the material
        if (child.material) {
          // Create a new material to ensure we have full control
          child.material = new THREE.MeshStandardMaterial({
            map: catTexture,
            roughness: 1.0,  // Set to 1.0 as specified
            metalness: 0.1,  // Set to 0.1 as specified
            emissive: new THREE.Color(0x000000),
            emissiveIntensity: 0.0,  // Set to 0.0 as specified
            envMapIntensity: 0.0     // Set to 0.0 as specified
          });
          child.material.needsUpdate = true;
        }
      }
    });
    
    scene.add(catModel);

    // Create companion cat
    companionCat = fbx.clone();
    companionCat.scale.set(0.015, 0.015, 0.015);  // Make it smaller than the main cat
    companionCat.position.set(2, 0.75, 2);  // Position it to the side
    companionCat.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material = child.material.clone();  // Clone the material to avoid sharing
        }
      }
    });
    scene.add(companionCat);
    
    console.log('Cat models loaded successfully with texture!');
    updatePositionDisplay();
  },
  (progress) => {
    console.log('Loading progress:', (progress.loaded / progress.total) * 100 + '%');
  },
  (error) => {
    console.error('Error loading cat model:', error);
  }
);

// Visual Novel Popup System
let currentText = '';
let displayedText = '';
let isTyping = false;
let typeSpeed = 50; // milliseconds per character
let lastTypeTime = 0;
let currentStep = 0;
let isPopupVisible = true;

const popupSteps = [
  {
    text: "U CAN RAISE CAT IN THIS GAME. A LOT OF THINGS R BROKEN. R U READY!!!!!",
    options: ["YES", "NO"]
  },
  {
    text: "LETS GO!!!!",
    options: null,
    isEnd: true
  },
  {
    text: "WHY. UR GONNA DO IT ANYWAY LOL",
    options: ["YES", "NO"]
  },
  {
    text: "STOP WASTING TIME AND PLAY THE GAME PLZ",
    options: ["YES", "NO"]
  },
  {
    text: "THX LETS GO!!!",
    options: null,
    isEnd: true
  },
  {
    text: "FINALLY!!!!!! LETS GO",
    options: null,
    isEnd: true
  }
];

// Add a variable to track when to hide the popup
let hidePopupTimeout = null;

// Add cursor animation
const style = document.createElement('style');
style.textContent = `
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  @font-face {
    font-family: 'Dogica';
    src: url('/fonts/Dogica.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
  }
  .pixel-font {
    font-family: 'Dogica', monospace !important;
  }
`;
document.head.appendChild(style);

// Create popup container
const popupContainer = document.createElement('div');
popupContainer.style.position = 'fixed';
popupContainer.style.top = '50%';
popupContainer.style.left = '50%';
popupContainer.style.transform = 'translate(-50%, -50%)';
popupContainer.style.width = '400px';
popupContainer.style.backgroundColor = 'white';
popupContainer.style.padding = '20px';
popupContainer.style.border = '4px solid black';
popupContainer.style.boxShadow = '4px 4px 0 black';
popupContainer.classList.add('pixel-font');
popupContainer.style.zIndex = '1000';
popupContainer.style.display = 'none';

// Create text container
const textContainer = document.createElement('div');
textContainer.style.marginBottom = '20px';
textContainer.style.fontSize = '24px';
textContainer.style.lineHeight = '1.4';
textContainer.style.minHeight = '100px';
popupContainer.appendChild(textContainer);

// Create options container
const optionsContainer = document.createElement('div');
optionsContainer.style.display = 'flex';
optionsContainer.style.justifyContent = 'flex-end';
optionsContainer.style.gap = '20px';
popupContainer.appendChild(optionsContainer);

// Create cursor
const cursor = document.createElement('div');
cursor.style.display = 'inline-block';
cursor.style.width = '8px';
cursor.style.height = '24px';
cursor.style.backgroundColor = 'black';
cursor.style.marginLeft = '4px';
cursor.style.animation = 'blink 1s infinite';
textContainer.appendChild(cursor);

document.body.appendChild(popupContainer);

// Create option buttons
function createOptionButton(text, onClick) {
  const button = document.createElement('button');
  button.textContent = text;
  button.classList.add('pixel-font');
  button.style.padding = '8px 16px';
  button.style.border = '2px solid black';
  button.style.backgroundColor = 'white';
  button.style.cursor = 'pointer';
  button.style.fontSize = '16px';
  button.style.boxShadow = '2px 2px 0 black';
  button.style.transition = 'all 0.1s';
  
  button.onmouseover = () => {
    button.style.transform = 'translate(2px, 2px)';
    button.style.boxShadow = 'none';
  };
  
  button.onmouseout = () => {
    button.style.transform = 'translate(0, 0)';
    button.style.boxShadow = '2px 2px 0 black';
  };
  
  button.onclick = onClick;
  return button;
}

function showPopup(step) {
  popupContainer.style.display = 'block';
  currentText = popupSteps[step].text;
  displayedText = '';
  isTyping = true;
  lastTypeTime = Date.now();
  
  // Clear previous options
  optionsContainer.innerHTML = '';
  
  // Add new options if they exist
  if (popupSteps[step].options) {
    popupSteps[step].options.forEach(option => {
      const button = createOptionButton(option, () => handleOption(option));
      optionsContainer.appendChild(button);
    });
  }

  // If this is a final message, set up auto-hide
  if (popupSteps[step].isEnd) {
    setTimeout(() => {
      isPopupVisible = false;
      popupContainer.style.display = 'none';
    }, 1000);
  }
}

// Start the popup
showPopup(0);

function hidePopup() {
  isPopupVisible = false;
  popupContainer.style.display = 'none';
  if (hidePopupTimeout) {
    clearTimeout(hidePopupTimeout);
    hidePopupTimeout = null;
  }
}

function handleOption(option) {
  if (option === "YES") {
    if (popupSteps[currentStep].isEnd) {
      showPopup(currentStep);  // Show the final message first
      // Clear any existing timeout
      if (hidePopupTimeout) {
        clearTimeout(hidePopupTimeout);
      }
      // Set new timeout to hide popup
      hidePopupTimeout = setTimeout(() => {
        isPopupVisible = false;
        popupContainer.style.display = 'none';
      }, 1000);
      return;
    }
    if (currentStep === 2) {
      currentStep = 4;  // If YES on "WHY. UR GONNA DO IT ANYWAY LOL", go to "STOP WASTING TIME"
    } else {
      currentStep++;
    }
  } else {
    if (currentStep === 0) {
      currentStep = 2;
    } else if (currentStep === 2) {
      currentStep = 3;  // If NO on "WHY. UR GONNA DO IT ANYWAY LOL", go to "THX LETS GO"
    } else if (currentStep === 4) {
      isBlackScreen = true;
      popupContainer.style.display = 'none';
      return;
    }
  }
  showPopup(currentStep);
}

// Update animation function
function animation() {
  if (catModel) {
    // Update accessory positions if they exist
    if (headphonesModel && headphonesModel.parent === catModel) {
      console.log('Updating headphones position...');
      headphonesModel.position.set(0, 0.5, 0);
      headphonesModel.rotation.set(0, 0, 0);
      headphonesModel.visible = true;
      headphonesModel.traverse((child) => {
        if (child.isMesh) {
          child.visible = true;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      // Force update the scene
      scene.updateMatrixWorld(true);
    }
    if (starPinModel && starPinModel.parent === catModel) {
      console.log('Updating star pin position...');
      starPinModel.position.set(0, 0.5, 0);
      starPinModel.rotation.set(0, 0, 0);
      starPinModel.visible = true;
      starPinModel.traverse((child) => {
        if (child.isMesh) {
          child.visible = true;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      // Force update the scene
      scene.updateMatrixWorld(true);
    }
    
    // Update companion cat movement and state
    if (companionCat && gameState.gamePhase === 'caring' && !companionState.isDead) {
      const currentTime = Date.now();
      
      // Update age
      companionState.age += 0.016; // Approximately 60 FPS
      
      // Track high/low stat times
      if (companionState.happiness <= 30) {
        companionState.history.lowHappinessTime += 0.016;
      } else {
        companionState.history.lowHappinessTime = 0;
      }
      
      if (companionState.health <= 30) {
        companionState.history.lowHealthTime += 0.016;
      } else {
        companionState.history.lowHealthTime = 0;
      }
      
      if (companionState.cleanliness <= 30) {
        companionState.history.lowCleanlinessTime += 0.016;
      } else {
        companionState.history.lowCleanlinessTime = 0;
      }
      
      if (companionState.cleanliness >= 70) {
        companionState.history.highCleanlinessTime += 0.016;
      } else {
        companionState.history.highCleanlinessTime = 0;
      }
      
      // Track all stats high/low
      if (companionState.happiness >= 70 && 
          companionState.hunger >= 70 && 
          companionState.cleanliness >= 70 && 
          companionState.health >= 70) {
        companionState.history.allStatsHighTime += 0.016;
      } else {
        companionState.history.allStatsHighTime = 0;
      }
      
      if (companionState.happiness <= 30 && 
          companionState.hunger <= 30 && 
          companionState.cleanliness <= 30 && 
          companionState.health <= 30) {
        companionState.history.allStatsLowTime += 0.016;
      } else {
        companionState.history.allStatsLowTime = 0;
      }
      
      // Random movement
      if (currentTime - companionState.lastMoveTime > companionState.moveInterval) {
        // Generate new random direction
        companionState.currentDirection.set(
          (Math.random() - 0.5) * 2,
          0,
          (Math.random() - 0.5) * 2
        ).normalize();
        
        companionState.lastMoveTime = currentTime;
        companionState.moveInterval = 1000 + Math.random() * 2000;  // Random interval between 1-3 seconds
      }
      
      // Apply movement with boundary checking
      const moveSpeed = 0.03;
      const newX = companionCat.position.x + companionState.currentDirection.x * moveSpeed;
      const newZ = companionCat.position.z + companionState.currentDirection.z * moveSpeed;
      
      // Check boundaries
      if (newX >= roomBounds.minX && newX <= roomBounds.maxX) {
        companionCat.position.x = newX;
      } else {
        companionState.currentDirection.x *= -1;  // Reverse direction if hitting boundary
      }
      
      if (newZ >= roomBounds.minZ && newZ <= roomBounds.maxZ) {
        companionCat.position.z = newZ;
      } else {
        companionState.currentDirection.z *= -1;  // Reverse direction if hitting boundary
      }
      
      // Rotate to face movement direction
      if (companionState.currentDirection.x !== 0 || companionState.currentDirection.z !== 0) {
        const targetRotation = Math.atan2(companionState.currentDirection.x, companionState.currentDirection.z);
        companionCat.rotation.y = targetRotation;
      }
      
      // Handle animations for different states
      if (companionState.isBeingPet) {
        companionCat.position.y = 0.75 + Math.sin(currentTime * 0.01) * 0.1;
      } else if (companionState.isBeingPunched) {
        companionCat.position.y = 0.75 + Math.sin(currentTime * 0.05) * 0.2;
      } else if (companionState.isBeingBathed) {
        companionCat.position.y = 0.75 + Math.sin(currentTime * 0.02) * 0.05;
      } else {
        companionCat.position.y = 0.75 + Math.sin(currentTime * 0.005) * 0.05;  // Gentle idle animation
      }
    } else if (companionCat && companionState.isDead) {
      // Keep dead cat lying on its side
      companionCat.rotation.x = Math.PI / 2;
      companionCat.position.y = 0.1;
    }

    // Calculate movement direction
    let moveX = 0;
    let moveZ = 0;
    
    if (keys.w) moveZ -= moveSpeed;
    if (keys.s) moveZ += moveSpeed;
    if (keys.a) moveX -= moveSpeed;
    if (keys.d) moveX += moveSpeed;
    
    // Calculate target rotation based on movement direction
    if (moveX !== 0 || moveZ !== 0) {
      const targetRotation = Math.atan2(moveX, moveZ);
      // Smoothly rotate the cat
      catModel.rotation.y += (targetRotation - catModel.rotation.y) * rotationSpeed;
      
      // Update walking animation
      walkTime += walkBobSpeed;
      const walkBob = Math.sin(walkTime) * walkBobHeight;
      catModel.position.y = 1.250 + walkBob;
    } else {
      // Reset walking animation when not moving
      walkTime = 0;
      if (!isBouncing) {
        catModel.position.y = 1.250;
      }
    }
    
    // Apply movement with collision detection
    const newX = catModel.position.x + moveX;
    const newZ = catModel.position.z + moveZ;
    
    // Check boundaries before applying movement
    if (newX >= roomBounds.minX && newX <= roomBounds.maxX) {
      catModel.position.x = newX;
    }
    if (newZ >= roomBounds.minZ && newZ <= roomBounds.maxZ) {
      catModel.position.z = newZ;
    }
    
    // Handle bounce animation
    if (isBouncing) {
      const currentTime = Date.now();
      const elapsed = currentTime - bounceStartTime;
      
      if (elapsed < bounceDuration) {
        const progress = elapsed / bounceDuration;
        const bounce = Math.sin(progress * Math.PI) * bounceHeight;
        catModel.position.y = 1.250 + bounce;
      } else {
        catModel.position.y = 1.250;
        isBouncing = false;
      }
    } else if (!(moveX !== 0 || moveZ !== 0)) {
      // Only set base height if not walking or bouncing
      catModel.position.y = 1.250;
    }
    
    // Update camera position based on cat's position
    const targetCameraPos = new THREE.Vector3(
      catModel.position.x + cameraOffset.x,
      catModel.position.y + cameraOffset.y,
      catModel.position.z + cameraOffset.z
    );
    
    // Smoothly move camera
    camera.position.lerp(targetCameraPos, cameraSmoothness);
    
    // Make camera look at cat
    camera.lookAt(catModel.position);
    
    // Update position display
    updatePositionDisplay();

    // Update popup typing animation
    if (isPopupVisible && isTyping) {
      const currentTime = Date.now();
      if (currentTime - lastTypeTime >= typeSpeed) {
        if (displayedText.length < currentText.length) {
          displayedText += currentText[displayedText.length];
          textContainer.innerHTML = displayedText + '<div style="display: inline-block; width: 8px; height: 24px; background-color: black; margin-left: 4px; animation: blink 1s infinite;"></div>';
          lastTypeTime = currentTime;
        } else {
          isTyping = false;
        }
      }
    }
  }
  
  // Handle black screen
  if (isBlackScreen) {
    renderer.setClearColor(0x000000);
  } else {
    renderer.setClearColor(0xffc0cb);
  }
  
  composer.render();
}

// Handle window resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  pixelationPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);

function updatePositionDisplay() {
  if (catModel) {
    positionDisplay.textContent = `Position: x: ${catModel.position.x.toFixed(3)}, y: ${catModel.position.y.toFixed(3)}, z: ${catModel.position.z.toFixed(3)}`;
  }
}



// Create shop UI
const shopUI = document.createElement('div');
shopUI.style.position = 'fixed';
shopUI.style.top = '50%';
shopUI.style.left = '50%';
shopUI.style.transform = 'translate(-50%, -50%)';
shopUI.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
shopUI.style.color = 'white';
shopUI.style.padding = '30px';
shopUI.style.borderRadius = '15px';
shopUI.style.fontFamily = 'Dogica, monospace';
shopUI.style.zIndex = '1001';
shopUI.style.display = 'none';
shopUI.style.minWidth = '400px';

// Create cat profile UI
const catProfileUI = document.createElement('div');
catProfileUI.style.position = 'fixed';
catProfileUI.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
catProfileUI.style.color = 'white';
catProfileUI.style.padding = '15px';
catProfileUI.style.borderRadius = '10px';
catProfileUI.style.fontFamily = 'Dogica, monospace';
catProfileUI.style.zIndex = '1001';
catProfileUI.style.display = 'none';
catProfileUI.style.minWidth = '200px';
catProfileUI.style.maxWidth = '300px';
catProfileUI.style.fontSize = '14px';

function showCatProfile(event) {
  const x = event.clientX + 10;  // Offset from cursor
  const y = event.clientY + 10;
  
  catProfileUI.style.left = `${x}px`;
  catProfileUI.style.top = `${y}px`;
  
  catProfileUI.innerHTML = `
    <div style="margin-bottom: 10px;">
      <strong>${companionState.name}</strong>
    </div>
    <div style="margin-bottom: 5px;">
      <strong>Age:</strong> ${Math.floor(companionState.age)}s
    </div>
    <div style="margin-bottom: 5px;">
      <strong>Traits:</strong> ${companionState.traits.length}/${gameState.unlockedTraitSlots}
    </div>
    <div style="margin-bottom: 5px;">
      <strong>Status:</strong>
      <div>Happiness: ${Math.floor(companionState.happiness)}%</div>
      <div>Hunger: ${Math.floor(companionState.hunger)}%</div>
      <div>Cleanliness: ${Math.floor(companionState.cleanliness)}%</div>
      <div>Health: ${Math.floor(companionState.health)}%</div>
    </div>
  `;
  catProfileUI.style.display = 'block';
}

// Update the click handler to use hover instead
function setupCatProfileHandler() {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let isHovering = false;
  
  window.addEventListener('mousemove', (event) => {
    if (gameState.gamePhase !== 'caring' || companionState.isDead) return;
    
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(companionCat, true);
    
    if (intersects.length > 0 && !isHovering) {
      isHovering = true;
      showCatProfile(event);
      // Stop cat movement
      companionState.moveInterval = Infinity;
    } else if (intersects.length === 0 && isHovering) {
      isHovering = false;
      catProfileUI.style.display = 'none';
      // Resume cat movement
      companionState.moveInterval = 2000;
    }
  });
}

function updateHistoryPanel() {
  historyPanel.innerHTML = `
    <h3 style="margin-bottom: 15px;">History</h3>
    <div style="margin-bottom: 20px;">
      <h4>Sold Cats</h4>
      ${gameState.soldCats.map(cat => `
        <div style="margin-bottom: 10px; padding: 5px; border: 1px solid white; border-radius: 5px;">
          <strong>${cat.name}</strong><br>
          Age: ${Math.floor(cat.age)}s<br>
          Traits: ${cat.traits.map(t => traits[t].name).join(', ')}
        </div>
      `).join('')}
    </div>
    <div>
      <h4>Upcoming Buyers</h4>
      ${gameState.potentialBuyers.map(buyer => `
        <div style="margin-bottom: 10px; padding: 5px; border: 1px solid white; border-radius: 5px;">
          <strong>${buyer.name}</strong><br>
          Looking for: ${buyer.desiredTraits.map(t => traits[t].name).join(', ')}
        </div>
      `).join('')}
    </div>
  `;
}

// Function to show shop
function showShop() {
  shopUI.innerHTML = '';
  
  const title = document.createElement('h2');
  title.textContent = 'Shop';
  title.style.marginBottom = '20px';
  title.style.textAlign = 'center';
  shopUI.appendChild(title);
  
  // Create tabs
  const tabs = document.createElement('div');
  tabs.style.display = 'flex';
  tabs.style.marginBottom = '20px';
  tabs.style.gap = '10px';
  
  const consumablesTab = document.createElement('button');
  consumablesTab.textContent = 'Consumables';
  consumablesTab.style.padding = '10px 20px';
  consumablesTab.style.border = 'none';
  consumablesTab.style.borderRadius = '5px';
  consumablesTab.style.backgroundColor = '#4CAF50';
  consumablesTab.style.color = 'white';
  consumablesTab.style.cursor = 'pointer';
  
  const accessoriesTab = document.createElement('button');
  accessoriesTab.textContent = 'Accessories';
  accessoriesTab.style.padding = '10px 20px';
  accessoriesTab.style.border = 'none';
  accessoriesTab.style.borderRadius = '5px';
  accessoriesTab.style.backgroundColor = '#666';
  accessoriesTab.style.color = 'white';
  accessoriesTab.style.cursor = 'pointer';
  
  const upgradesTab = document.createElement('button');
  upgradesTab.textContent = 'Upgrades';
  upgradesTab.style.padding = '10px 20px';
  upgradesTab.style.border = 'none';
  upgradesTab.style.borderRadius = '5px';
  upgradesTab.style.backgroundColor = '#666';
  upgradesTab.style.color = 'white';
  upgradesTab.style.cursor = 'pointer';
  
  tabs.appendChild(consumablesTab);
  tabs.appendChild(accessoriesTab);
  tabs.appendChild(upgradesTab);
  shopUI.appendChild(tabs);
  
  // Create items container
  const itemsContainer = document.createElement('div');
  itemsContainer.id = 'shopItems';
  shopUI.appendChild(itemsContainer);
  
  function showUpgrades() {
    itemsContainer.innerHTML = '';
    Object.entries(shopItems.upgrades).forEach(([key, item]) => {
      const itemDiv = document.createElement('div');
      itemDiv.style.padding = '15px';
      itemDiv.style.border = '1px solid white';
      itemDiv.style.borderRadius = '5px';
      itemDiv.style.marginBottom = '10px';
      
      itemDiv.innerHTML = `
        <strong>${item.name}</strong><br>
        ${item.description}<br>
        Cost: $${item.cost}
      `;
      
      const buyButton = document.createElement('button');
      buyButton.textContent = gameState.unlockedTraitSlots >= 3 ? 'Maxed Out' : 'Buy';
      buyButton.style.marginTop = '10px';
      buyButton.style.padding = '5px 10px';
      buyButton.style.backgroundColor = gameState.money >= item.cost && gameState.unlockedTraitSlots < 3 ? '#4CAF50' : '#666';
      buyButton.style.border = 'none';
      buyButton.style.borderRadius = '3px';
      buyButton.style.color = 'white';
      buyButton.style.cursor = gameState.money >= item.cost && gameState.unlockedTraitSlots < 3 ? 'pointer' : 'not-allowed';
      
      buyButton.onclick = () => {
        if (gameState.money >= item.cost && gameState.unlockedTraitSlots < 3) {
          gameState.money -= item.cost;
          if (item.effect(gameState)) {
            updateGameInfo();
            updateCompanionUI();
            showShop();
          }
        }
      };
      
      itemDiv.appendChild(buyButton);
      itemsContainer.appendChild(itemDiv);
    });
  }
  
  function showConsumables() {
    itemsContainer.innerHTML = '';
    Object.entries(shopItems.consumables).forEach(([key, item]) => {
      const itemDiv = document.createElement('div');
      itemDiv.style.padding = '15px';
      itemDiv.style.border = '1px solid white';
      itemDiv.style.borderRadius = '5px';
      itemDiv.style.marginBottom = '10px';
      
      itemDiv.innerHTML = `
        <strong>${item.name}</strong><br>
        ${item.description}<br>
        Cost: $${item.cost}
      `;
      
      const buyButton = document.createElement('button');
      buyButton.textContent = 'Buy';
      buyButton.style.marginTop = '10px';
      buyButton.style.padding = '5px 10px';
      buyButton.style.backgroundColor = gameState.money >= item.cost ? '#4CAF50' : '#666';
      buyButton.style.border = 'none';
      buyButton.style.borderRadius = '3px';
      buyButton.style.color = 'white';
      buyButton.style.cursor = gameState.money >= item.cost ? 'pointer' : 'not-allowed';
      
      buyButton.onclick = () => {
        if (gameState.money >= item.cost) {
          gameState.money -= item.cost;
          // Initialize inventory slot if it doesn't exist
          if (!gameState.inventory[key]) {
            gameState.inventory[key] = 0;
          }
          gameState.inventory[key]++;
          updateGameInfo();
          updateCompanionUI();
          showShop();
        }
      };
      
      itemDiv.appendChild(buyButton);
      itemsContainer.appendChild(itemDiv);
    });
  }
  
  function showAccessories() {
    itemsContainer.innerHTML = '';
    Object.entries(shopItems.accessories).forEach(([key, item]) => {
      const itemDiv = document.createElement('div');
      itemDiv.style.padding = '15px';
      itemDiv.style.border = '1px solid white';
      itemDiv.style.borderRadius = '5px';
      itemDiv.style.marginBottom = '10px';
      
      itemDiv.innerHTML = `
        <strong>${item.name}</strong><br>
        ${item.description}<br>
        Cost: $${item.cost}
      `;
      
      const buyButton = document.createElement('button');
      buyButton.textContent = 'Buy';
      buyButton.style.marginTop = '10px';
      buyButton.style.padding = '5px 10px';
      buyButton.style.backgroundColor = gameState.money >= item.cost ? '#4CAF50' : '#666';
      buyButton.style.border = 'none';
      buyButton.style.borderRadius = '3px';
      buyButton.style.color = 'white';
      buyButton.style.cursor = gameState.money >= item.cost ? 'pointer' : 'not-allowed';
      
      buyButton.onclick = () => {
        if (gameState.money >= item.cost) {
          gameState.money -= item.cost;
          item.effect(companionState);
          updateGameInfo();
          updateCompanionUI();
          showShop();
        }
      };
      
      itemDiv.appendChild(buyButton);
      itemsContainer.appendChild(itemDiv);
    });
  }
  
  consumablesTab.onclick = () => {
    consumablesTab.style.backgroundColor = '#4CAF50';
    accessoriesTab.style.backgroundColor = '#666';
    upgradesTab.style.backgroundColor = '#666';
    showConsumables();
  };
  
  accessoriesTab.onclick = () => {
    consumablesTab.style.backgroundColor = '#666';
    accessoriesTab.style.backgroundColor = '#4CAF50';
    upgradesTab.style.backgroundColor = '#666';
    showAccessories();
  };
  
  upgradesTab.onclick = () => {
    consumablesTab.style.backgroundColor = '#666';
    accessoriesTab.style.backgroundColor = '#666';
    upgradesTab.style.backgroundColor = '#4CAF50';
    showUpgrades();
  };
  
  // Show consumables by default
  showConsumables();
  
  // Add back close button
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.padding = '5px 15px';
  closeButton.style.backgroundColor = '#666';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '5px';
  closeButton.style.color = 'white';
  closeButton.style.cursor = 'pointer';
  closeButton.style.display = 'block';
  closeButton.style.margin = '20px auto 0';
  
  closeButton.onclick = () => {
    shopUI.style.display = 'none';
  };
  
  shopUI.appendChild(closeButton);
  shopUI.style.display = 'block';
}

// Add UIs to document body
document.body.appendChild(historyPanel);
document.body.appendChild(statusPanel);
document.body.appendChild(shopUI);
document.body.appendChild(catProfileUI);

// Create companion UI
const companionUI = document.createElement('div');
companionUI.style.position = 'fixed';
companionUI.style.bottom = '20px';
companionUI.style.left = '50%';
companionUI.style.transform = 'translateX(-50%)';
companionUI.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
companionUI.style.color = 'white';
companionUI.style.padding = '20px';
companionUI.style.borderRadius = '10px';
companionUI.style.fontFamily = 'Dogica, monospace';
companionUI.style.zIndex = '1000';
companionUI.style.display = 'flex';
companionUI.style.flexDirection = 'column';
companionUI.style.gap = '10px';
companionUI.style.alignItems = 'center';

// Status bars
const statusContainer = document.createElement('div');
statusContainer.style.display = 'grid';
statusContainer.style.gridTemplateColumns = 'auto 1fr';
statusContainer.style.gap = '10px';
statusContainer.style.alignItems = 'center';
statusContainer.style.marginBottom = '10px';

const createStatusBar = (label, value) => {
  const container = document.createElement('div');
  container.style.display = 'contents';
  
  const text = document.createElement('div');
  text.textContent = label;
  
  const bar = document.createElement('div');
  bar.style.width = '200px';
  bar.style.height = '20px';
  bar.style.backgroundColor = '#333';
  bar.style.borderRadius = '10px';
  bar.style.overflow = 'hidden';
  
  const fill = document.createElement('div');
  fill.style.width = `${value}%`;
  fill.style.height = '100%';
  fill.style.backgroundColor = '#4CAF50';
  fill.style.transition = 'width 0.3s';
  bar.appendChild(fill);
  
  container.appendChild(text);
  container.appendChild(bar);
  return { container, fill };
};

const happinessBar = createStatusBar('Happiness:', companionState.happiness);
const hungerBar = createStatusBar('Hunger:', companionState.hunger);
const cleanlinessBar = createStatusBar('Cleanliness:', companionState.cleanliness);
const healthBar = createStatusBar('Health:', companionState.health);

statusContainer.appendChild(happinessBar.container);
statusContainer.appendChild(hungerBar.container);
statusContainer.appendChild(cleanlinessBar.container);
statusContainer.appendChild(healthBar.container);

companionUI.appendChild(statusContainer);

function updateStatusBars() {
  happinessBar.fill.style.width = `${companionState.happiness}%`;
  hungerBar.fill.style.width = `${companionState.hunger}%`;
  cleanlinessBar.fill.style.width = `${companionState.cleanliness}%`;
  healthBar.fill.style.width = `${companionState.health}%`;
  updateStatusPanel();
}

// Add UIs to document body
document.body.appendChild(companionUI);

// Create selling UI
const sellingUI = document.createElement('div');
sellingUI.style.position = 'fixed';
sellingUI.style.top = '50%';
sellingUI.style.left = '50%';
sellingUI.style.transform = 'translate(-50%, -50%)';
sellingUI.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
sellingUI.style.color = 'white';
sellingUI.style.padding = '30px';
sellingUI.style.borderRadius = '15px';
sellingUI.style.lineHeight = '1.5';
sellingUI.style.fontFamily = 'Dogica, monospace';
sellingUI.style.zIndex = '1001';
sellingUI.style.display = 'none';
sellingUI.style.minWidth = '400px';

// Add selling UI to document
document.body.appendChild(sellingUI);

// Function to show selling phase
function showSellingPhase() {
  console.log('showSellingPhase called'); // Debug log
  if (!companionState || !gameState) {
    console.log('Missing state:', { companionState: !!companionState, gameState: !!gameState }); // Debug log
    return;
  }
  
  gameState.gamePhase = 'selling';
  companionState.traits = calculateTraits();
  gameState.potentialBuyers = generateBuyers();
  
  sellingUI.innerHTML = '';
  
  const title = document.createElement('h2');
  title.textContent = 'Time to Sell Your Cat!';
  title.style.marginBottom = '20px';
  title.style.textAlign = 'center';
  sellingUI.appendChild(title);
  
  const traitsDiv = document.createElement('div');
  traitsDiv.style.marginBottom = '20px';
  traitsDiv.innerHTML = '<h3>Your Cat\'s Traits:</h3>';
  companionState.traits.forEach(traitKey => {
    const trait = traits[traitKey];
    if (trait) {
      traitsDiv.innerHTML += `<div>${trait.name} - ${trait.description}</div>`;
    }
  });
  sellingUI.appendChild(traitsDiv);
  
  const buyers = document.createElement('div');
  buyers.innerHTML = '<h3>Potential Buyers:</h3>';
  gameState.potentialBuyers.forEach((buyer, index) => {
    const buyerDiv = document.createElement('div');
    buyerDiv.style.marginBottom = '15px';
    buyerDiv.style.padding = '10px';
    buyerDiv.style.border = '1px solid white';
    buyerDiv.style.borderRadius = '5px';
    
    // Calculate price details
    const matchingTraits = companionState.traits.filter(traitKey => 
      buyer.desiredTraits.includes(traitKey)
    );
    const traitBonus = matchingTraits.length * buyer.traitBonus;
    const totalPrice = buyer.basePrice + traitBonus;
    
    const buyerInfo = document.createElement('div');
    buyerInfo.innerHTML = `
      <strong>${buyer.name}</strong><br>
      ${buyer.description}<br>
      Looking for: ${buyer.desiredTraits.map(t => traits[t]?.name || t).join(', ')}<br>
      <div style="margin-top: 10px;">
        <strong>Price Breakdown:</strong><br>
        Base Price: $${buyer.basePrice}<br>
        ${matchingTraits.length > 0 ? 
          `Matching Traits Bonus (${matchingTraits.length}): $${traitBonus}<br>` : 
          'No Matching Traits<br>'}
        <strong style="color: #4CAF50;">Total Offer: $${totalPrice}</strong>
      </div>
    `;
    buyerDiv.appendChild(buyerInfo);
    
    const sellButton = document.createElement('button');
    sellButton.textContent = 'Sell to this buyer';
    sellButton.style.marginTop = '10px';
    sellButton.style.padding = '5px 10px';
    sellButton.style.backgroundColor = '#4CAF50';
    sellButton.style.border = 'none';
    sellButton.style.borderRadius = '3px';
    sellButton.style.color = 'white';
    sellButton.style.cursor = 'pointer';
    
    sellButton.onclick = () => sellCat(buyer);
    buyerDiv.appendChild(sellButton);
    
    buyers.appendChild(buyerDiv);
  });
  sellingUI.appendChild(buyers);
  sellingUI.style.display = 'block';
  companionUI.style.display = 'none';
  
  console.log('Selling UI displayed'); // Debug log
}

// Function to calculate final traits
function calculateTraits() {
  if (!companionState || !companionState.history) return [];
  
  const history = companionState.history;
  history.punchPetRatio = history.punchCount / (Math.max(history.petCount, 1));
  
  // Calculate traits based on current stats and history
  const calculatedTraits = Object.keys(traits).filter(traitKey => {
    const trait = traits[traitKey];
    return trait && trait.condition(history);
  });
  
  // Remove duplicates and limit to unlocked slots
  return [...new Set(calculatedTraits)].slice(0, gameState.unlockedTraitSlots);
}

// Function to clamp values between 0 and 100
function clampStat(value) {
  return Math.max(0, Math.min(100, value));
}

// Function to generate random buyers
function generateBuyers() {
  if (!buyerTypes) return [];
  const shuffled = [...buyerTypes].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}

// Function to sell cat and start new round
function sellCat(buyer) {
  if (!buyer || !companionState) return;
  
  let price = buyer.basePrice;
  const matchingTraits = companionState.traits.filter(traitKey => 
    buyer.desiredTraits.includes(traitKey)
  );
  
  price += matchingTraits.length * buyer.traitBonus;
  gameState.money += price;
  
  // Start new round without resetting money
  startNewRound();
}

// Function to reset game state for new round
function resetGame() {
  if (!gameState || !companionState) return;
  
  gameState.gamePhase = 'caring';
  gameState.turnsLeft = 20;
  
  // Reset companion state
  companionState = {
    name: catNames[Math.floor(Math.random() * catNames.length)],
    age: 0,
    happiness: 50,  // Start at 50
    hunger: 50,     // Start at 50
    cleanliness: 50, // Start at 50
    health: 50,     // Start at 50
    traits: [],
    accessories: [],
    isDead: false,
    lastMoveTime: 0,
    moveInterval: 2000,
    currentDirection: new THREE.Vector3(),
    isBeingPet: false,
    isBeingFed: false,
    isBeingPunched: false,
    isBeingBathed: false,
    history: {
      punchCount: 0,
      petCount: 0,
      punchPetRatio: 0,
      lowHealthTime: 0,
      overfeeding: 0,
      lowHappinessTime: 0,
      allStatsLowTime: 0,
      allStatsHighTime: 0,
      lowCleanlinessTime: 0,
      highCleanlinessTime: 0,
      fishEaten: 0,
      catnipUsed: 0,
      milkDrunk: 0,
      isDead: false
    }
  };
  
  // Reset companion cat position and rotation
  if (companionCat) {
    companionCat.rotation.x = 0;
    companionCat.position.y = 0.75;
  }
  
  // Remove accessories from cat model
  if (catModel) {
    if (headphonesModel) {
      catModel.remove(headphonesModel);
      headphonesModel.visible = false;
    }
    if (starPinModel) {
      catModel.remove(starPinModel);
      starPinModel.visible = false;
    }
  }
  
  sellingUI.style.display = 'none';
  companionUI.style.display = 'flex';
  updateGameInfo();
  updateStatusBars();
}

// Add new function to start a new round without resetting money
function startNewRound() {
  if (!gameState || !companionState) return;
  
  gameState.gamePhase = 'caring';
  gameState.turnsLeft = 20;
  
  // Reset companion state
  companionState = {
    name: catNames[Math.floor(Math.random() * catNames.length)],
    age: 0,
    happiness: 50,  // Start at 50
    hunger: 50,     // Start at 50
    cleanliness: 50, // Start at 50
    health: 50,     // Start at 50
    traits: [],
    accessories: [],
    isDead: false,
    lastMoveTime: 0,
    moveInterval: 2000,
    currentDirection: new THREE.Vector3(),
    isBeingPet: false,
    isBeingFed: false,
    isBeingPunched: false,
    isBeingBathed: false,
    history: {
      punchCount: 0,
      petCount: 0,
      punchPetRatio: 0,
      lowHealthTime: 0,
      overfeeding: 0,
      lowHappinessTime: 0,
      allStatsLowTime: 0,
      allStatsHighTime: 0,
      lowCleanlinessTime: 0,
      highCleanlinessTime: 0,
      fishEaten: 0,
      catnipUsed: 0,
      milkDrunk: 0,
      isDead: false
    }
  };
  
  // Reset companion cat position and rotation
  if (companionCat) {
    companionCat.rotation.x = 0;
    companionCat.position.y = 0.75;
  }
  
  // Remove accessories from cat model
  if (catModel) {
    if (headphonesModel) {
      catModel.remove(headphonesModel);
      headphonesModel.visible = false;
    }
    if (starPinModel) {
      catModel.remove(starPinModel);
      starPinModel.visible = false;
    }
  }
  
  sellingUI.style.display = 'none';
  companionUI.style.display = 'flex';
  updateGameInfo();
  updateStatusBars();
}

// Action buttons
const buttonContainer = document.createElement('div');
buttonContainer.style.display = 'flex';
buttonContainer.style.gap = '10px';

function createActionButton(text, action) {
  const button = document.createElement('button');
  button.textContent = text;
  button.style.padding = '10px 20px';
  button.style.border = 'none';
  button.style.borderRadius = '5px';
  button.style.backgroundColor = '#4CAF50';
  button.style.color = 'white';
  button.style.cursor = 'pointer';
  button.style.fontFamily = 'Dogica, monospace';
  button.style.fontSize = '12px';
  
  button.onmouseover = () => {
    button.style.backgroundColor = '#45a049';
  };
  
  button.onmouseout = () => {
    button.style.backgroundColor = '#4CAF50';
  };
  
  button.onclick = () => {
    if (gameState.turnsLeft > 0 && gameState.gamePhase === 'caring' && !companionState.isDead) {
      action();
      gameState.turnsLeft--;
      updateGameInfo();
      
      // Check if turns are up and show selling phase
      if (gameState.turnsLeft <= 0) {
        console.log('Turns up, showing selling phase'); // Debug log
        gameState.gamePhase = 'selling';
        showSellingPhase();
      }
    }
  };
  
  return button;
}

const petButton = createActionButton('Pet', () => {
  companionState.isBeingPet = true;
  companionState.happiness += 15;
  companionState.hunger -= 5;
  companionState.cleanliness -= 3;
  companionState.history.petCount++;
  updateStatusBars();
  setTimeout(() => { companionState.isBeingPet = false; }, 1000);
});

const feedButton = createActionButton('Feed', () => {
  companionState.isBeingFed = true;
  const prevHunger = companionState.hunger;
  companionState.hunger += 20;
  companionState.happiness += 5;
  companionState.cleanliness -= 8;
  companionState.health += 10; // Added health restoration
  if (prevHunger > 80) {
    companionState.history.overfeeding++;
  }
  // Clamp all stats
  companionState.happiness = clampStat(companionState.happiness);
  companionState.hunger = clampStat(companionState.hunger);
  companionState.cleanliness = clampStat(companionState.cleanliness);
  companionState.health = clampStat(companionState.health);
  updateStatusBars();
  setTimeout(() => { companionState.isBeingFed = false; }, 1000);
});

const punchButton = createActionButton('Punch', () => {
  companionState.isBeingPunched = true;
  companionState.happiness -= 20;
  companionState.health -= 10;
  companionState.hunger -= 8;
  companionState.cleanliness -= 5;
  companionState.history.punchCount++;
  updateStatusBars();
  setTimeout(() => { companionState.isBeingPunched = false; }, 500);
});

const batheButton = createActionButton('Bathe', () => {
  companionState.isBeingBathed = true;
  companionState.cleanliness = 100;
  companionState.happiness -= 5;
  companionState.hunger -= 10;
  updateStatusBars();
  setTimeout(() => { companionState.isBeingBathed = false; }, 2000);
});

buttonContainer.appendChild(petButton);
buttonContainer.appendChild(feedButton);
buttonContainer.appendChild(punchButton);
buttonContainer.appendChild(batheButton);

companionUI.appendChild(buttonContainer);

// Function to setup action button event listeners
function setupActionButtons() {
  const buttons = companionUI.querySelectorAll('button');
  buttons.forEach(button => {
    const action = button.textContent.toLowerCase();
    button.onclick = () => {
      if (gameState.turnsLeft > 0 && gameState.gamePhase === 'caring' && !companionState.isDead) {
        switch(action) {
          case 'pet':
            companionState.isBeingPet = true;
            companionState.happiness += 15;
            companionState.hunger -= 5;
            companionState.cleanliness -= 3;
            companionState.history.petCount++;
            updateStatusBars();
            setTimeout(() => { companionState.isBeingPet = false; }, 1000);
            break;
          case 'feed':
            companionState.isBeingFed = true;
            const prevHunger = companionState.hunger;
            companionState.hunger += 20;
            companionState.happiness += 5;
            companionState.cleanliness -= 8;
            companionState.health += 10; // Added health restoration
            if (prevHunger > 80) {
              companionState.history.overfeeding++;
            }
            // Clamp all stats
            companionState.happiness = clampStat(companionState.happiness);
            companionState.hunger = clampStat(companionState.hunger);
            companionState.cleanliness = clampStat(companionState.cleanliness);
            companionState.health = clampStat(companionState.health);
            updateStatusBars();
            setTimeout(() => { companionState.isBeingFed = false; }, 1000);
            break;
          case 'punch':
            companionState.isBeingPunched = true;
            companionState.happiness -= 20;
            companionState.health -= 10;
            companionState.hunger -= 8;
            companionState.cleanliness -= 5;
            companionState.history.punchCount++;
            updateStatusBars();
            setTimeout(() => { companionState.isBeingPunched = false; }, 500);
            break;
          case 'bathe':
            companionState.isBeingBathed = true;
            companionState.cleanliness = 100;
            companionState.happiness -= 5;
            companionState.hunger -= 10;
            updateStatusBars();
            setTimeout(() => { companionState.isBeingBathed = false; }, 2000);
            break;
        }
        gameState.turnsLeft--;
        updateGameInfo();
        
        // Check if turns are up and show selling phase
        if (gameState.turnsLeft <= 0) {
          console.log('Turns up, showing selling phase'); // Debug log
          gameState.gamePhase = 'selling';
          showSellingPhase();
        }
      }
    };
  });
}

// Function to handle item usage
function handleItemUse(itemName) {
  console.log('handleItemUse called with:', itemName); // Debug log
  if (gameState.turnsLeft > 0 && gameState.inventory[itemName] > 0) {
    const item = shopItems.consumables[itemName];
    if (item) {
      console.log('Using item:', itemName); // Debug log
      
      // Apply item effects
      item.effect(companionState);
      
      // Decrease inventory and turns
      gameState.inventory[itemName]--;
      gameState.turnsLeft--;
      
      // Clamp all stats
      companionState.happiness = clampStat(companionState.happiness);
      companionState.hunger = clampStat(companionState.hunger);
      companionState.cleanliness = clampStat(companionState.cleanliness);
      companionState.health = clampStat(companionState.health);
      
      // Update UI
      updateGameInfo();
      updateCompanionUI();
      updateStatusBars();
      
      // Check if turns are up and show selling phase
      if (gameState.turnsLeft <= 0) {
        console.log('Turns up, showing selling phase'); // Debug log
        gameState.gamePhase = 'selling';
        showSellingPhase();
      }
    }
  }
}

// Update companion UI
function updateCompanionUI() {
  // Keep the existing buttons
  const existingButtons = buttonContainer.innerHTML;
  
  companionUI.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h3>Actions</h3>
      ${existingButtons}
    </div>
    <div>
      <h3>Inventory</h3>
      <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px;">
        ${Array(5).fill(null).map((_, index) => {
          const items = Object.entries(gameState.inventory).filter(([_, count]) => count > 0);
          const item = items[index];
          if (item) {
            const [itemName, count] = item;
            return `
              <div onclick="window.handleItemUse('${itemName}')" 
                   style="width: 40px; height: 40px; 
                          background-color: #4CAF50; 
                          border: 2px solid #333;
                          border-radius: 5px;
                          cursor: pointer;
                          display: flex;
                          flex-direction: column;
                          align-items: center;
                          justify-content: center;
                          color: white;
                          font-size: 12px;
                          position: relative;
                          overflow: hidden;">
                <div style="font-size: 14px;">${count}</div>
                <div style="position: absolute; bottom: 2px; font-size: 8px; width: 100%; text-align: center; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                  ${itemName}
                </div>
              </div>
            `;
          } else {
            return `
              <div style="width: 40px; height: 40px; 
                          background-color: #666; 
                          border: 2px solid #333;
                          border-radius: 5px;
                          cursor: not-allowed;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          color: white;
                          font-size: 12px;">
                -
              </div>
            `;
          }
        }).join('')}
      </div>
    </div>
  `;
  
  // Reattach event listeners
  setupActionButtons();
}

// Make handleItemUse available globally
window.handleItemUse = handleItemUse;

// Initialize
setupCatProfileHandler();
updateCompanionUI();
updateGameInfo();
updateHistoryPanel();

// Add accessory models
let starPinModel;
let headphonesModel;

// Load accessory models
const accessoryLoader = new FBXLoader();
accessoryLoader.load(
  '/models/starpin.fbx',
  (fbx) => {
    starPinModel = fbx;
    starPinModel.scale.set(0.05, 0.05, 0.05);
    starPinModel.visible = false;
    starPinModel.traverse((child) => {
      if (child.isMesh) {
        child.visible = true;
        child.castShadow = true;
        child.receiveShadow = true;
        // Ensure material is properly set up
        if (child.material) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.5,
            metalness: 0.5,
            transparent: true,
            opacity: 1.0
          });
        }
      }
    });
    scene.add(starPinModel);
    console.log('Star pin model loaded!', starPinModel);
  },
  (progress) => {
    console.log('Star pin loading progress:', (progress.loaded / progress.total) * 100 + '%');
  },
  (error) => {
    console.error('Error loading star pin model:', error);
  }
);

accessoryLoader.load(
  '/models/headphone.fbx',
  (fbx) => {
    headphonesModel = fbx;
    headphonesModel.scale.set(0.05, 0.05, 0.05);
    headphonesModel.visible = false;
    headphonesModel.traverse((child) => {
      if (child.isMesh) {
        child.visible = true;
        child.castShadow = true;
        child.receiveShadow = true;
        // Ensure material is properly set up
        if (child.material) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.5,
            metalness: 0.5,
            transparent: true,
            opacity: 1.0
          });
        }
      }
    });
    scene.add(headphonesModel);
    console.log('Headphones model loaded!', headphonesModel);
  },
  (progress) => {
    console.log('Headphones loading progress:', (progress.loaded / progress.total) * 100 + '%');
  },
  (error) => {
    console.error('Error loading headphones model:', error);
  }
);

// Update shop items to properly handle accessory equipping
shopItems.accessories.headphones.effect = (cat) => {
  console.log('Attempting to equip headphones...');
  console.log('Current cat model:', catModel);
  console.log('Current headphones model:', headphonesModel);
  
  cat.accessories.push("headphones");
  if (headphonesModel && catModel) {
    console.log('Models exist, proceeding with equipping...');
    
    // Remove from scene if it's already there
    if (headphonesModel.parent) {
      console.log('Removing headphones from previous parent:', headphonesModel.parent);
      headphonesModel.parent.remove(headphonesModel);
    }
    
    // Make visible and attach to cat
    headphonesModel.visible = true;
    headphonesModel.traverse((child) => {
      if (child.isMesh) {
        child.visible = true;
        child.castShadow = true;
        child.receiveShadow = true;
        // Ensure material is properly set up
        if (child.material) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.5,
            metalness: 0.5,
            transparent: true,
            opacity: 1.0
          });
        }
      }
    });
    
    // Set position and rotation relative to cat
    headphonesModel.position.set(0, 0.5, 0);
    headphonesModel.rotation.set(0, 0, 0);
    
    // Add to cat model
    catModel.add(headphonesModel);
    console.log('Headphones equipped successfully!');
    console.log('Headphones parent:', headphonesModel.parent);
    console.log('Headphones position:', headphonesModel.position);
    console.log('Headphones visible:', headphonesModel.visible);
    
    // Force update the scene
    scene.updateMatrixWorld(true);
  } else {
    console.log('Missing models:', { headphonesModel: !!headphonesModel, catModel: !!catModel });
  }
};

shopItems.accessories.starPin.effect = (cat) => {
  console.log('Attempting to equip star pin...');
  console.log('Current cat model:', catModel);
  console.log('Current star pin model:', starPinModel);
  
  cat.accessories.push("starPin");
  if (starPinModel && catModel) {
    console.log('Models exist, proceeding with equipping...');
    
    // Remove from scene if it's already there
    if (starPinModel.parent) {
      console.log('Removing star pin from previous parent:', starPinModel.parent);
      starPinModel.parent.remove(starPinModel);
    }
    
    // Make visible and attach to cat
    starPinModel.visible = true;
    starPinModel.traverse((child) => {
      if (child.isMesh) {
        child.visible = true;
        child.castShadow = true;
        child.receiveShadow = true;
        // Ensure material is properly set up
        if (child.material) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.5,
            metalness: 0.5,
            transparent: true,
            opacity: 1.0
          });
        }
      }
    });
    
    // Set position and rotation relative to cat
    starPinModel.position.set(0, 0.5, 0);
    starPinModel.rotation.set(0, 0, 0);
    
    // Add to cat model
    catModel.add(starPinModel);
    console.log('Star pin equipped successfully!');
    console.log('Star pin parent:', starPinModel.parent);
    console.log('Star pin position:', starPinModel.position);
    console.log('Star pin visible:', starPinModel.visible);
    
    // Force update the scene
    scene.updateMatrixWorld(true);
  } else {
    console.log('Missing models:', { starPinModel: !!starPinModel, catModel: !!catModel });
  }
};
