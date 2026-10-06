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

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function initScene() {
  if (renderer) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8ec5ff);
  scene.fog = new THREE.Fog(0x8ec5ff, 80, 500);

  camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xeaf6ff, 0x2a3d2a, 1.6);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(50, 90, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -180;
  sun.shadow.camera.right = 180;
  sun.shadow.camera.top = 180;
  sun.shadow.camera.bottom = -180;
  sun.shadow.camera.far = 400;
  scene.add(sun);

  world = new THREE.Group();
  scene.add(world);

  createEnvironment();
  createF1Car();

  camera.position.set(0, 5, 10);

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('resize', handleResize);
}

function createEnvironment() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshStandardMaterial({ color: 0x2f6d3a, roughness: 0.96 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  world.add(ground);

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(16, 0.3, 300),
    new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 0.72, metalness: 0.12 })
  );
  road.position.y = 0.15;
  road.receiveShadow = true;
  world.add(road);

  const lineMaterial = new THREE.MeshStandardMaterial({
    color: 0xf7f3da,
    emissive: 0x5a4b19,
    roughness: 0.3,
  });

  for (let z = -150; z < 150; z += 12) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 5.5), lineMaterial);
    stripe.position.set(0, 0.2, z);
    world.add(stripe);
  }

  const sideLineMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const leftMarker = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 300), sideLineMaterial);
  leftMarker.position.set(-8.6, 0.2, 0);
  world.add(leftMarker);

  const rightMarker = leftMarker.clone();
  rightMarker.position.x = 8.6;
  world.add(rightMarker);

  for (let i = 0; i < 26; i++) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.45, 4.2, 12),
      new THREE.MeshStandardMaterial({ color: 0x7e4f27, roughness: 1 })
    );
    trunk.position.y = 2.1;
    trunk.castShadow = true;
    tree.add(trunk);

    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 18, 18),
      new THREE.MeshStandardMaterial({ color: 0x2a8f42, roughness: 1 })
    );
    crown.position.y = 5.3;
    crown.castShadow = true;
    tree.add(crown);

    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (28 + (i % 6) * 6);
    const z = -150 + i * 12;
    tree.position.set(x, 0, z);
    world.add(tree);
  }
}

function createF1Car() {
  car = new THREE.Group();
  scene.add(car);

  // Material principal rojo F1
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

  // Chasis F1 - largo y bajo
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 4.8), bodyMaterial);
  chassis.position.y = 0.75;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  car.add(chassis);

  // Alerón frontal (ala delantera)
  const frontWing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 0.4), carbonMaterial);
  frontWing.position.set(0, 0.5, 2.3);
  frontWing.castShadow = true;
  car.add(frontWing);

  // Soporte del ala delantera
  const frontWingSupport = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.15), blackMaterial);
  frontWingSupport.position.set(0, 0.35, 2.15);
  car.add(frontWingSupport);

  // Cockpit/Piloto (cabina muy pequeña)
  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.55, 1.0), glassMaterial);
  cockpit.position.set(0, 1.15, -0.3);
  cockpit.castShadow = true;
  car.add(cockpit);

  // Capó motor (punta afilada)
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 1.2), bodyMaterial);
  hood.position.set(0, 0.95, 1.5);
  hood.castShadow = true;
  car.add(hood);

  // Punta delantera (narriz típica F1)
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.8, 12), bodyMaterial);
  nose.rotation.z = Math.PI / 2;
  nose.position.set(0, 0.75, 2.35);
  nose.castShadow = true;
  car.add(nose);

  // Difusor trasero/Alerón trasero
  const rearWing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 0.35), carbonMaterial);
  rearWing.position.set(0, 0.65, -2.2);
  rearWing.castShadow = true;
  car.add(rearWing);

  // Soporte del ala trasera
  const rearWingSupport = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.15), blackMaterial);
  rearWingSupport.position.set(0, 0.3, -2.1);
  car.add(rearWingSupport);

  // Tomas de aire laterales
  const intakeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.4), blackMaterial);
  intakeLeft.position.set(-0.9, 0.85, 0.5);
  intakeLeft.castShadow = true;
  car.add(intakeLeft);

  const intakeRight = intakeLeft.clone();
  intakeRight.position.x = 0.9;
  car.add(intakeRight);

  // Luces LED delanteras
  const headlightLeft = new THREE.PointLight(0xfff4c7, 2.0, 20, 2);
  headlightLeft.position.set(-0.65, 0.9, 2.4);
  car.add(headlightLeft);

  const headlightRight = headlightLeft.clone();
  headlightRight.position.x = 0.65;
  car.add(headlightRight);

  // Luces traseras
  const tailLightLeft = new THREE.PointLight(0xff2244, 1.5, 15, 2);
  tailLightLeft.position.set(-0.65, 0.9, -2.35);
  car.add(tailLightLeft);

  const tailLightRight = tailLightLeft.clone();
  tailLightRight.position.x = 0.65;
  car.add(tailLightRight);

  // Ruedas F1 - más estrechas y grandes
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

    // Llanta (rim)
    const rimGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.38, 18);
    const rimMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x444444, 
      metalness: 0.6, 
      roughness: 0.4 
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(0, 0, 0);
    wheel.add(rim);

    wheels.push(wheel);
    car.add(wheel);
  }

  car.position.set(0, 0.2, 55);
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

  car.position.set(0, 0.2, 55);
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

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updateCar(dt) {
  if (!car) return;

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
  nitroProgress.style.width = `${state.nitro}%`;

  // ACELERACIÓN REALISTA Y PROGRESIVA
  const maxSpeed = state.nitroActive ? 52 : 36; // km/h
  const reverseMax = -12;
  
  // Aceleración progresiva basada en velocidad actual
  let currentAcceleration = 0;
  if (state.throttle !== 0) {
    const accelDir = state.throttle > 0 ? 1 : -1;
    const currentSpeed = Math.abs(state.velocity);
    
    // Aceleración más alta al principio, luego disminuye
    if (currentSpeed < maxSpeed * 0.3) {
      currentAcceleration = 12; // 0-30% velocidad: aceleración fuerte
    } else if (currentSpeed < maxSpeed * 0.6) {
      currentAcceleration = 8; // 30-60% velocidad: aceleración media
    } else if (currentSpeed < maxSpeed * 0.9) {
      currentAcceleration = 4; // 60-90% velocidad: aceleración baja
    } else {
      currentAcceleration = 1; // 90%+ velocidad: casi sin aceleración (asintótica)
    }

    state.velocity += accelDir * currentAcceleration * dt;

    // Motor RPM
    state.engineRPM = clamp((Math.abs(state.velocity) / maxSpeed) * 8000, 0, 8000);
  } else {
    state.engineRPM = lerp(state.engineRPM, 0, 0.1 * dt);
    state.velocity *= Math.max(0, 1 - 2.5 * dt * 0.6); // Resistencia al aire
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

  const roadHalfWidth = 8.2;
  if (car.position.x > roadHalfWidth) car.position.x = roadHalfWidth;
  if (car.position.x < -roadHalfWidth) car.position.x = -roadHalfWidth;
  if (car.position.z > 150) car.position.z = -150;
  if (car.position.z < -150) car.position.z = 150;

  const speedKmh = Math.round(Math.abs(state.velocity) * 7.2);
  maxSpeedRecord = Math.max(maxSpeedRecord, speedKmh);
  maxDriftRecord = Math.max(maxDriftRecord, Math.round(state.drift * 100));

  document.getElementById('speed').textContent = `${speedKmh} km/h`;
  document.getElementById('drift').textContent = `${Math.round(state.drift * 100)}%`;
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
  document.getElementById('time').textContent = formatTime(gameTime);
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
  startGame();
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

    if (gameTime > 180) {
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

window.addEventListener('load', () => {
  document.getElementById('nitroProgress').style.width = '100%';
  document.getElementById('speed').textContent = '0 km/h';
  document.getElementById('drift').textContent = '0%';
  document.getElementById('time').textContent = '0:00';
});
