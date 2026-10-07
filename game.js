import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

let scene;
let camera;
let renderer;
let car;
let world;
let wheels = [];
let animationFrameId = null;
let lastFrameTime = 0;

let gameRunning = false;
let gamePaused = false;
let gameOver = false;
let gameTime = 0;
let maxSpeedRecord = 0;
let maxDriftRecord = 0;
let currentTrack = 0;

const state = {
  velocity: 0,
  engineRPM: 0,
  steering: 0,
  drift: 0,
  yaw: Math.PI,
  turnInput: 0,
  throttle: 0,
  nitro: 100,
  nitroActive: false,
};

const keys = {};

// CIRCUITOS: definición de pistas
const tracks = [
  { name: 'Mónaco', color: 0x333344, width: 12, length: 200 },
  { name: 'Suzuka', color: 0x2a2a2a, width: 14, length: 280 },
  { name: 'Monte Carlo', color: 0x404050, width: 13, length: 240 }
];

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function initScene() {
  if (renderer) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1f2e);
  scene.fog = new THREE.Fog(0x1a1f2e, 120, 600);

  camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 2000);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  document.body.appendChild(renderer.domElement);

  // Iluminación dinámica
  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a5c3a, 1.2);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffeb99, 2.0);
  sun.position.set(120, 150, 80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.left = -300;
  sun.shadow.camera.right = 300;
  sun.shadow.camera.top = 300;
  sun.shadow.camera.bottom = -300;
  sun.shadow.camera.far = 600;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // Luz ambiente azul para sombras
  const ambientLight = new THREE.AmbientLight(0x4a7fbf, 0.5);
  scene.add(ambientLight);

  world = new THREE.Group();
  scene.add(world);

  buildTrack(currentTrack);
  createF1Car();

  camera.position.set(0, 5, 10);

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('resize', handleResize);
}

function buildTrack(trackIndex) {
  // Limpiar mundo anterior
  while (world.children.length > 0) {
    world.removeChild(world.children[0]);
  }

  const track = tracks[trackIndex];
  document.getElementById('trackName').textContent = `Pista: ${track.name}`;

  // Terreno base
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 800),
    new THREE.MeshStandardMaterial({
      color: 0x2d4a2d,
      roughness: 0.95,
      metalness: 0
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  world.add(ground);

  // Carretera principal con diferentes estilos por pista
  const roadMaterial = new THREE.MeshStandardMaterial({
    color: track.color,
    roughness: 0.6,
    metalness: 0.2
  });

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(track.width, 0.4, track.length),
    roadMaterial
  );
  road.position.y = 0.2;
  road.receiveShadow = true;
  world.add(road);

  // Líneas blancas centrales
  const lineCount = Math.floor(track.length / 12);
  const lineMaterial = new THREE.MeshStandardMaterial({
    color: 0xf5f5f5,
    emissive: 0x888888,
    roughness: 0.4,
    metalness: 0.1
  });

  for (let z = -track.length / 2; z < track.length / 2; z += 12) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.15, 6),
      lineMaterial
    );
    stripe.position.set(0, 0.25, z);
    world.add(stripe);
  }

  // Marcas laterales de seguridad
  const safetyMaterial = new THREE.MeshStandardMaterial({
    color: 0xffff00,
    emissive: 0x666600,
    roughness: 0.3
  });

  const leftBarrier = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.2, track.length),
    safetyMaterial
  );
  leftBarrier.position.set(-track.width / 2 - 0.5, 0.25, 0);
  world.add(leftBarrier);

  const rightBarrier = leftBarrier.clone();
  rightBarrier.position.x = track.width / 2 + 0.5;
  world.add(rightBarrier);

  // Vegetación según pista
  if (trackIndex === 0) createMonacoEnvironment(track);
  else if (trackIndex === 1) createSuzukaEnvironment(track);
  else createMonteCarlo(track);

  // Posición de inicio
  const startBoxGeometry = new THREE.BoxGeometry(track.width * 0.8, 0.05, 4);
  const startBoxMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const startBox = new THREE.Mesh(startBoxGeometry, startBoxMaterial);
  startBox.position.y = 0.3;
  startBox.position.z = track.length / 2 - 10;
  world.add(startBox);
}

function createMonacoEnvironment(track) {
  // Edificios de Mónaco
  const buildingMaterial = new THREE.MeshStandardMaterial({
    color: 0xc9a876,
    roughness: 0.7,
    metalness: 0
  });

  for (let i = 0; i < 8; i++) {
    const buildingHeight = 15 + Math.random() * 25;
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(6 + Math.random() * 4, buildingHeight, 6 + Math.random() * 4),
      buildingMaterial
    );
    const side = i % 2 === 0 ? -1 : 1;
    building.position.set(
      side * (track.width / 2 + 8 + Math.random() * 15),
      buildingHeight / 2,
      -track.length / 2 + i * (track.length / 8)
    );
    building.castShadow = true;
    building.receiveShadow = true;
    world.add(building);

    // Ventanas
    for (let floor = 0; floor < Math.ceil(buildingHeight / 3); floor++) {
      for (let win = 0; win < 2; win++) {
        const windowLight = new THREE.PointLight(0xffeb99, 0.5, 10);
        windowLight.position.set(
          building.position.x + (win - 0.5) * 2,
          floor * 3 + 1,
          building.position.z + 3
        );
        world.add(windowLight);
      }
    }
  }

  // Palmeras
  for (let i = 0; i < 12; i++) {
    const palm = createPalmTree();
    const side = i % 2 === 0 ? -1 : 1;
    palm.position.set(
      side * (track.width / 2 + 15),
      0,
      -track.length / 2 + (i * track.length / 12)
    );
    world.add(palm);
  }
}

function createSuzukaEnvironment(track) {
  // Ambiente de bosque japonés
  const treeMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d5a2d,
    roughness: 1
  });

  for (let i = 0; i < 30; i++) {
    const tree = new THREE.Group();
    
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.7, 8, 12),
      new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 1 })
    );
    trunk.position.y = 4;
    trunk.castShadow = true;
    tree.add(trunk);

    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(3.5, 16, 16),
      treeMaterial
    );
    crown.position.y = 7;
    crown.castShadow = true;
    tree.add(crown);

    const side = i % 2 === 0 ? -1 : 1;
    tree.position.set(
      side * (track.width / 2 + 12 + Math.random() * 20),
      0,
      -track.length / 2 + (i * track.length / 30)
    );
    world.add(tree);
  }

  // Postes de luces
  for (let i = 0; i < 15; i++) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6 })
    );
    pole.position.set(
      track.width / 2 + 8,
      5,
      -track.length / 2 + (i * track.length / 15)
    );
    pole.castShadow = true;
    world.add(pole);

    const light = new THREE.PointLight(0xffd700, 1.5, 40);
    light.position.set(
      track.width / 2 + 8,
      10,
      -track.length / 2 + (i * track.length / 15)
    );
    world.add(light);
  }
}

function createMonteCarlo(track) {
  // Montañas con texturas
  const mountainMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b5d5d,
    roughness: 0.9,
    metalness: 0
  });

  for (let i = 0; i < 4; i++) {
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(50 + i * 20, 60 + i * 30, 8),
      mountainMaterial
    );
    mountain.position.set(
      (i % 2 === 0 ? -1 : 1) * (track.width / 2 + 80 + i * 40),
      30 + i * 20,
      -track.length / 2 + i * (track.length / 4)
    );
    mountain.castShadow = true;
    mountain.receiveShadow = true;
    world.add(mountain);
  }

  // Agua del mar
  const seaMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a4d7a,
    roughness: 0.5,
    metalness: 0.3
  });

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 600),
    seaMaterial
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-200, 0.1, 0);
  sea.receiveShadow = true;
  world.add(sea);

  // Farola costera
  const lighthouse = new THREE.Group();
  const lightTower = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 2.5, 30, 16),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })
  );
  lightTower.position.y = 15;
  lightTower.castShadow = true;
  lighthouse.add(lightTower);

  const lightTop = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff8800 })
  );
  lightTop.position.y = 31;
  lightTop.castShadow = true;
  lighthouse.add(lightTop);

  const beacon = new THREE.PointLight(0xffaa00, 3, 200);
  beacon.position.set(0, 32, 0);
  lighthouse.add(beacon);

  lighthouse.position.set(-150, 0, -track.length / 2 + 40);
  world.add(lighthouse);
}

function createPalmTree() {
  const palm = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.6, 6, 8),
    new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 1 })
  );
  trunk.position.y = 3;
  trunk.castShadow = true;
  palm.add(trunk);

  const fronds = new THREE.Mesh(
    new THREE.SphereGeometry(3, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0x2d8a2d, roughness: 1 })
  );
  fronds.position.y = 8;
  fronds.castShadow = true;
  palm.add(fronds);

  return palm;
}

function createF1Car() {
  car = new THREE.Group();
  scene.add(car);

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xdc0000,
    metalness: 0.4,
    roughness: 0.3,
    emissive: 0x440000
  });

  const blackMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a,
    roughness: 0.9
  });

  const carbonMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.8,
    metalness: 0.3
  });

  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x7db8ff,
    transparent: true,
    opacity: 0.5,
    roughness: 0.1
  });

  // Chasis
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.6, 4.8),
    bodyMaterial
  );
  chassis.position.y = 0.75;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  car.add(chassis);

  // Alerón frontal
  const frontWing = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.15, 0.4),
    carbonMaterial
  );
  frontWing.position.set(0, 0.5, 2.3);
  frontWing.castShadow = true;
  car.add(frontWing);

  const frontWingSupport = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.35, 0.15),
    blackMaterial
  );
  frontWingSupport.position.set(0, 0.35, 2.15);
  car.add(frontWingSupport);

  // Cockpit
  const cockpit = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.55, 1.0),
    glassMaterial
  );
  cockpit.position.set(0, 1.15, -0.3);
  cockpit.castShadow = true;
  car.add(cockpit);

  // Capó
  const hood = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.35, 1.2),
    bodyMaterial
  );
  hood.position.set(0, 0.95, 1.5);
  hood.castShadow = true;
  car.add(hood);

  // Narriz
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 0.8, 12),
    bodyMaterial
  );
  nose.rotation.z = Math.PI / 2;
  nose.position.set(0, 0.75, 2.35);
  nose.castShadow = true;
  car.add(nose);

  // Alerón trasero
  const rearWing = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.2, 0.35),
    carbonMaterial
  );
  rearWing.position.set(0, 0.65, -2.2);
  rearWing.castShadow = true;
  car.add(rearWing);

  const rearWingSupport = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.4, 0.15),
    blackMaterial
  );
  rearWingSupport.position.set(0, 0.3, -2.1);
  car.add(rearWingSupport);

  // Luces
  const headlightLeft = new THREE.PointLight(0xfff4c7, 2.0, 20);
  headlightLeft.position.set(-0.65, 0.9, 2.4);
  car.add(headlightLeft);

  const headlightRight = headlightLeft.clone();
  headlightRight.position.x = 0.65;
  car.add(headlightRight);

  const tailLightLeft = new THREE.PointLight(0xff2244, 1.5, 15);
  tailLightLeft.position.set(-0.65, 0.9, -2.35);
  car.add(tailLightLeft);

  const tailLightRight = tailLightLeft.clone();
  tailLightRight.position.x = 0.65;
  car.add(tailLightRight);

  // Ruedas
  const wheelGeometry = new THREE.CylinderGeometry(0.45, 0.45, 0.35, 20);
  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0x0d0d0d,
    roughness: 0.85,
    metalness: 0.2
  });

  const wheelPositions = [
    [-1.0, 0.5, 1.2],
    [1.0, 0.5, 1.2],
    [-1.0, 0.5, -1.4],
    [1.0, 0.5, -1.4],
  ];

  wheels = [];
  for (const [x, y, z] of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    wheel.receiveShadow = true;

    const rimGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.38, 18);
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.6,
      roughness: 0.4
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.z = Math.PI / 2;
    wheel.add(rim);

    wheels.push(wheel);
    car.add(wheel);
  }

  car.position.set(0, 0.2, tracks[currentTrack].length / 2 - 15);
  car.rotation.y = Math.PI;
}

function resetRace() {
  if (!car) return;

  state.velocity = 0;
  state.engineRPM = 0;
  state.steering = 0;
  state.drift = 0;
  state.yaw = Math.PI;
  state.turnInput = 0;
  state.throttle = 0;
  state.nitro = 100;
  state.nitroActive = false;

  const track = tracks[currentTrack];
  car.position.set(0, 0.2, track.length / 2 - 15);
  car.rotation.y = Math.PI;
}

function handleKeyDown(event) {
  keys[event.code] = true;

  if (event.code === 'KeyP' && gameRunning) {
    gamePaused = !gamePaused;
    const pausePanel = document.getElementById('pauseMenu');
    if (gamePaused) pausePanel.classList.add('visible');
    else pausePanel.classList.remove('visible');
  }

  if (event.code === 'Space') event.preventDefault();
}

function handleKeyUp(event) {
  keys[event.code] = false;
}

function handleResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function updateCar(dt) {
  if (!car) return;

  const track = tracks[currentTrack];
  const forward = keys.KeyW || keys.ArrowUp ? 1 : 0;
  const reverse = keys.KeyS || keys.ArrowDown ? 1 : 0;
  const steerLeft = keys.KeyA || keys.ArrowLeft ? 1 : 0;
  const steerRight = keys.KeyD || keys.ArrowRight ? 1 : 0;
  const nitroPressed = keys.Space;

  state.throttle = forward - reverse;
  state.turnInput = steerLeft - steerRight;
  state.nitroActive = nitroPressed && state.nitro > 0;

  if (state.nitroActive) state.nitro = Math.max(0, state.nitro - 24 * dt);
  else state.nitro = Math.min(100, state.nitro + 14 * dt);

  const nitroProgress = document.getElementById('nitroProgress');
  if (nitroProgress) nitroProgress.style.width = `${state.nitro}%`;

  const maxSpeed = state.nitroActive ? 52 : 36;
  const reverseMax = -12;

  if (state.throttle !== 0) {
    const accelDir = state.throttle > 0 ? 1 : -1;
    const currentSpeed = Math.abs(state.velocity);

    let currentAcceleration = 0;
    if (currentSpeed < maxSpeed * 0.3) currentAcceleration = 12;
    else if (currentSpeed < maxSpeed * 0.6) currentAcceleration = 8;
    else if (currentSpeed < maxSpeed * 0.9) currentAcceleration = 4;
    else currentAcceleration = 1;

    state.velocity += accelDir * currentAcceleration * dt;
    state.engineRPM = clamp((Math.abs(state.velocity) / maxSpeed) * 8000, 0, 8000);
  } else {
    state.engineRPM = lerp(state.engineRPM, 0, 0.1 * dt);
    state.velocity *= Math.max(0, 1 - 2.5 * dt * 0.6);
  }

  if (Math.abs(state.velocity) < 0.05) state.velocity = 0;
  state.velocity = clamp(state.velocity, reverseMax, maxSpeed);

  const steerPower = 1.8 + Math.min(Math.abs(state.velocity) / 18, 1.4);
  const driftBias = state.nitroActive ? 1.0 : 0.26;

  state.steering = lerp(state.steering, state.turnInput * steerPower, 0.12);
  state.drift = lerp(state.drift, Math.abs(state.velocity) > 3 ? Math.abs(state.steering) * driftBias : 0, 0.08);

  const steerFactor = state.steering * (0.55 + Math.abs(state.velocity) * 0.02);
  state.yaw += steerFactor * dt * (state.velocity >= 0 ? 1 : -1);

  const driftAmount = state.drift * Math.min(Math.abs(state.velocity) / 20, 1.9) * 1.6;
  const forwardX = Math.sin(state.yaw);
  const forwardZ = Math.cos(state.yaw);
  const sideX = Math.sin(state.yaw + Math.PI / 2);
  const sideZ = Math.cos(state.yaw + Math.PI / 2);

  const driftX = sideX * driftAmount * (state.turnInput !== 0 ? 1 : 0.2);
  const driftZ = sideZ * driftAmount * (state.turnInput !== 0 ? 1 : 0.2);

  car.position.x += (forwardX * state.velocity + driftX) * dt;
  car.position.z += (forwardZ * state.velocity + driftZ) * dt;
  car.rotation.y = state.yaw;

  for (let i = 0; i < wheels.length; i++) {
    wheels[i].rotation.x -= state.velocity * dt * 1.4;
    if (Math.abs(state.turnInput) > 0) {
      const wheelTurn = state.turnInput * 0.28;
      if (i < 2) wheels[i].rotation.y = wheelTurn;
      else wheels[i].rotation.y = 0;
    } else {
      wheels[i].rotation.y = 0;
    }
  }

  const roadHalfWidth = track.width / 2;
  if (car.position.x > roadHalfWidth) car.position.x = roadHalfWidth;
  if (car.position.x < -roadHalfWidth) car.position.x = -roadHalfWidth;
  if (car.position.z > track.length / 2) car.position.z = -track.length / 2;
  if (car.position.z < -track.length / 2) car.position.z = track.length / 2;

  const speedKmh = Math.round(Math.abs(state.velocity) * 7.2);
  maxSpeedRecord = Math.max(maxSpeedRecord, speedKmh);
  maxDriftRecord = Math.max(maxDriftRecord, Math.round(state.drift * 100));

  const speedDisplay = document.getElementById('speed');
  const driftDisplay = document.getElementById('drift');
  if (speedDisplay) speedDisplay.textContent = `${speedKmh} km/h`;
  if (driftDisplay) driftDisplay.textContent = `${Math.round(state.drift * 100)}%`;
}

function updateCamera(dt) {
  if (!camera || !car) return;

  const distance = 9.5;
  const height = 4.7;

  const cameraOffset = new THREE.Vector3(
    Math.sin(state.yaw + Math.PI) * distance,
    height,
    Math.cos(state.yaw + Math.PI) * distance
  );

  const target = new THREE.Vector3(car.position.x, 1.8, car.position.z);
  const desired = new THREE.Vector3(
    car.position.x + cameraOffset.x,
    car.position.y + height,
    car.position.z + cameraOffset.z
  );

  camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
  camera.lookAt(target);
}

function updateGameTime(dt) {
  gameTime += dt;
  const timeDisplay = document.getElementById('time');
  if (timeDisplay) timeDisplay.textContent = formatTime(gameTime);
}

function endGame() {
  if (gameOver) return;
  gameOver = true;
  gameRunning = false;

  document.getElementById('finalTime').textContent = formatTime(gameTime);
  document.getElementById('maxSpeed').textContent = String(maxSpeedRecord);
  document.getElementById('maxDrift').textContent = String(maxDriftRecord);
  document.getElementById('gameOver').classList.add('visible');
}

function startGame() {
  initScene();
  gameRunning = true;
  gamePaused = false;
  gameOver = false;
  gameTime = 0;
  maxSpeedRecord = 0;
  maxDriftRecord = 0;
  document.getElementById('mainMenu').classList.add('hidden');
  document.getElementById('pauseMenu').classList.remove('visible');
  document.getElementById('gameOver').classList.remove('visible');
  resetRace();

  if (!animationFrameId) {
    lastFrameTime = 0;
    animationFrameId = requestAnimationFrame(loop);
  }
}

function resumeGame() {
  gamePaused = false;
  document.getElementById('pauseMenu').classList.remove('visible');
}

function restartGame() {
  document.getElementById('pauseMenu').classList.remove('visible');
  document.getElementById('gameOver').classList.remove('visible');
  resetRace();
  gameTime = 0;
  maxSpeedRecord = 0;
  maxDriftRecord = 0;
  gameRunning = true;
  gameOver = false;
  gamePaused = false;
}

function selectTrack(trackIndex) {
  currentTrack = trackIndex;
  buildTrack(trackIndex);
  resetRace();
}

function mainMenu() {
  gameRunning = false;
  gamePaused = false;
  gameOver = false;
  document.getElementById('mainMenu').classList.remove('hidden');
  document.getElementById('pauseMenu').classList.remove('visible');
  document.getElementById('gameOver').classList.remove('visible');
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function toggleControls() {
  alert('CONTROLES\n\nW / ↑ = acelerar\nS / ↓ = frenar / marcha atrás\nA / D o ← / → = girar\nESPACIO = nitro\nP = pausa');
}

function loop(timestamp) {
  if (!gameRunning) {
    animationFrameId = null;
    return;
  }

  if (!lastFrameTime) lastFrameTime = timestamp;
  const dt = Math.min((timestamp - lastFrameTime) / 1000, 0.033);
  lastFrameTime = timestamp;

  if (!gamePaused) {
    updateCar(dt);
    updateCamera(dt);
    updateGameTime(dt);

    if (gameTime > 300) {
      endGame();
    }
  }

  if (renderer && camera) {
    renderer.render(scene, camera);
  }
  animationFrameId = requestAnimationFrame(loop);
}

window.startGame = startGame;
window.resumeGame = resumeGame;
window.restartGame = restartGame;
window.mainMenu = mainMenu;
window.toggleControls = toggleControls;
window.selectTrack = selectTrack;

window.addEventListener('load', () => {
  const nitroProgress = document.getElementById('nitroProgress');
  if (nitroProgress) nitroProgress.style.width = '100%';
  const speedDisplay = document.getElementById('speed');
  if (speedDisplay) speedDisplay.textContent = '0 km/h';
  const driftDisplay = document.getElementById('drift');
  if (driftDisplay) driftDisplay.textContent = '0%';
  const timeDisplay = document.getElementById('time');
  if (timeDisplay) timeDisplay.textContent = '0:00';
});
