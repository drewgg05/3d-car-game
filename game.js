import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

let scene;
let camera;
let renderer;
let car;
let world;
let wheels = [];
let animationFrameId = null;
let lastFrameTime = 0;
let currentTrackName = 'monaco';
let currentTrack = null;
let trackLine = null;

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

const TRACKS = {
  monaco: {
    name: 'Monaco',
    roadWidth: 6.8,
    grassWidth: 4.5,
    color: 0x2d2d2d,
    start: [0, 58],
    points: [
      [0, 58], [12, 50], [25, 43], [36, 25], [34, 10], [20, -2], [6, -8],
      [-12, -10], [-24, -2], [-40, 12], [-38, 28], [-28, 40], [-18, 52], [-2, 58]
    ],
  },
  silverstone: {
    name: 'Silverstone',
    roadWidth: 8.4,
    grassWidth: 5.2,
    color: 0x353535,
    start: [0, 78],
    points: [
      [0, 78], [18, 70], [34, 57], [44, 38], [40, 18], [30, 0], [8, -12],
      [-18, -18], [-40, -8], [-52, 8], [-52, 28], [-38, 48], [-18, 62], [0, 78]
    ],
  },
  monza: {
    name: 'Monza',
    roadWidth: 8.8,
    grassWidth: 5.3,
    color: 0x2c2c2c,
    start: [0, 82],
    points: [
      [0, 82], [16, 76], [34, 68], [58, 62], [66, 46], [62, 18], [56, -8], [32, -28],
      [6, -42], [-20, -36], [-42, -18], [-56, 2], [-50, 34], [-24, 58], [0, 82]
    ],
  },
};

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function clearTrack() {
  if (world && world.userData.trackGroup) {
    world.remove(world.userData.trackGroup);
    world.userData.trackGroup = null;
  }
}

function buildTrackGeometry(trackKey) {
  clearTrack();
  const track = TRACKS[trackKey];
  const group = new THREE.Group();
  world.add(group);
  world.userData.trackGroup = group;

  const roadMaterial = new THREE.MeshStandardMaterial({
    color: track.color,
    roughness: 0.75,
    metalness: 0.15,
  });

  const lineMaterial = new THREE.MeshStandardMaterial({
    color: 0xf5f0d8,
    roughness: 0.4,
    emissive: 0x3a2d11,
  });

  const points = track.points.map(([x, z]) => new THREE.Vector3(x, 0.18, z));
  const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.2);
  const samples = curve.getPoints(1000);
  currentTrack = { ...track, samples, curve };

  const roadSegments = [];
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i];
    const b = samples[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    const segment = new THREE.Mesh(new THREE.BoxGeometry(track.roadWidth * 2, 0.25, Math.max(length, 0.5)), roadMaterial);
    segment.position.set((a.x + b.x) / 2, 0.15, (a.z + b.z) / 2);
    segment.rotation.y = Math.atan2(dx, dz);
    segment.receiveShadow = true;
    segment.castShadow = true;
    group.add(segment);
    roadSegments.push(segment);

    if (i % 6 === 0) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 2.8), lineMaterial);
      stripe.position.set((a.x + b.x) / 2, 0.28, (a.z + b.z) / 2);
      stripe.rotation.y = Math.atan2(dx, dz);
      group.add(stripe);
    }
  }

  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(500, 500),
    new THREE.MeshStandardMaterial({ color: 0x3a8b43, roughness: 0.95 })
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = 0;
  group.add(grass);

  const startMarker = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.05, 1.6),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
  );
  const startPos = new THREE.Vector3(track.points[0][0], 0.2, track.points[0][1]);
  startMarker.position.set(startPos.x, 0.22, startPos.z);
  const tangent = new THREE.Vector3().subVectors(samples[1], samples[0]).normalize();
  startMarker.rotation.y = Math.atan2(tangent.x, tangent.z);
  group.add(startMarker);

  trackLine = samples;
}

function getTrackTerrain(position) {
  if (!currentTrack || !currentTrack.samples) {
    return { type: 'tarmac', distance: 0, modifier: 1, traction: 1 };
  }

  let nearestDist = Infinity;
  let nearestPoint = currentTrack.samples[0];

  for (const point of currentTrack.samples) {
    const dist = Math.hypot(point.x - position.x, point.z - position.z);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestPoint = point;
    }
  }

  const roadWidth = currentTrack.roadWidth;
  const grassWidth = currentTrack.grassWidth;

  if (nearestDist <= roadWidth) {
    return { type: 'tarmac', distance: nearestDist, modifier: 1, traction: 1 };
  }

  if (nearestDist <= roadWidth + grassWidth) {
    return { type: 'grass', distance: nearestDist, modifier: 0.58, traction: 0.7 };
  }

  if (nearestDist <= roadWidth + grassWidth + 4.5) {
    return { type: 'gravel', distance: nearestDist, modifier: 0.38, traction: 0.5 };
  }

  return { type: 'offtrack', distance: nearestDist, modifier: 0.22, traction: 0.25 };
}

function updateTrackSelectionUI() {
  document.querySelectorAll('.track-btn').forEach((button) => {
    button.classList.toggle('selected', button.dataset.track === currentTrackName);
  });
}

function setSelectedTrack(trackName) {
  currentTrackName = trackName;
  updateTrackSelectionUI();
  if (world) buildTrackGeometry(trackName);
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

  buildTrackGeometry(currentTrackName);
  createF1Car();

  camera.position.set(0, 5, 10);

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('resize', handleResize);
}

function createF1Car() {
  car = new THREE.Group();
  scene.add(car);

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xdc0000,
    metalness: 0.4,
    roughness: 0.3,
    emissive: 0x440000,
  });

  const blackMaterial = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
  const carbonMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8, metalness: 0.3 });
  const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x7db8ff, transparent: true, opacity: 0.5, roughness: 0.1 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 4.8), bodyMaterial);
  chassis.position.y = 0.75;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  car.add(chassis);

  const frontWing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 0.4), carbonMaterial);
  frontWing.position.set(0, 0.5, 2.3);
  frontWing.castShadow = true;
  car.add(frontWing);

  const frontWingSupport = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.15), blackMaterial);
  frontWingSupport.position.set(0, 0.35, 2.15);
  car.add(frontWingSupport);

  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.55, 1.0), glassMaterial);
  cockpit.position.set(0, 1.15, -0.3);
  cockpit.castShadow = true;
  car.add(cockpit);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 1.2), bodyMaterial);
  hood.position.set(0, 0.95, 1.5);
  hood.castShadow = true;
  car.add(hood);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.8, 12), bodyMaterial);
  nose.rotation.z = Math.PI / 2;
  nose.position.set(0, 0.75, 2.35);
  nose.castShadow = true;
  car.add(nose);

  const rearWing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 0.35), carbonMaterial);
  rearWing.position.set(0, 0.65, -2.2);
  rearWing.castShadow = true;
  car.add(rearWing);

  const rearWingSupport = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.15), blackMaterial);
  rearWingSupport.position.set(0, 0.3, -2.1);
  car.add(rearWingSupport);

  const intakeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.4), blackMaterial);
  intakeLeft.position.set(-0.9, 0.85, 0.5);
  intakeLeft.castShadow = true;
  car.add(intakeLeft);

  const intakeRight = intakeLeft.clone();
  intakeRight.position.x = 0.9;
  car.add(intakeRight);

  const headlightLeft = new THREE.PointLight(0xfff4c7, 2.0, 20, 2);
  headlightLeft.position.set(-0.65, 0.9, 2.4);
  car.add(headlightLeft);

  const headlightRight = headlightLeft.clone();
  headlightRight.position.x = 0.65;
  car.add(headlightRight);

  const tailLightLeft = new THREE.PointLight(0xff2244, 1.5, 15, 2);
  tailLightLeft.position.set(-0.65, 0.9, -2.35);
  car.add(tailLightLeft);

  const tailLightRight = tailLightLeft.clone();
  tailLightRight.position.x = 0.65;
  car.add(tailLightRight);

  const wheelGeometry = new THREE.CylinderGeometry(0.45, 0.45, 0.35, 20);
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.85, metalness: 0.2 });
  const rimMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6, roughness: 0.4 });

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

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.38, 18), rimMaterial);
    rim.rotation.z = Math.PI / 2;
    wheel.add(rim);

    wheels.push(wheel);
    car.add(wheel);
  }

  placeCarOnTrack();
}

function placeCarOnTrack() {
  if (!currentTrack) return;
  const [x, z] = currentTrack.start;
  car.position.set(x, 0.2, z);
  car.rotation.y = Math.PI;
}

function resetRace() {
  state.velocity = 0;
  state.engineRPM = 0;
  state.steering = 0;
  state.drift = 0;
  state.yaw = Math.PI;
  state.turnInput = 0;
  state.throttle = 0;
  state.nitro = 100;
  state.nitroActive = false;

  placeCarOnTrack();
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

function getCurrentTrackNameLabel() {
  return TRACKS[currentTrackName].name;
}

function updateCar(dt) {
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

  const terrain = getTrackTerrain(car.position);
  const maxSpeedBase = state.nitroActive ? 52 : 36;
  const maxSpeed = maxSpeedBase * terrain.modifier;
  const reverseMax = -10 * terrain.modifier;

  let currentAcceleration = 0;
  if (state.throttle !== 0) {
    const accelDir = state.throttle > 0 ? 1 : -1;
    const currentSpeed = Math.abs(state.velocity);

    if (currentSpeed < maxSpeedBase * 0.3) currentAcceleration = 10;
    else if (currentSpeed < maxSpeedBase * 0.6) currentAcceleration = 7;
    else if (currentSpeed < maxSpeedBase * 0.9) currentAcceleration = 4;
    else currentAcceleration = 1.2;

    if (terrain.type !== 'tarmac') currentAcceleration *= terrain.modifier * 0.85;

    state.velocity += accelDir * currentAcceleration * dt;
    state.engineRPM = clamp((Math.abs(state.velocity) / maxSpeedBase) * 8000, 0, 8000);
  } else {
    state.engineRPM = lerp(state.engineRPM, 0, 0.1 * dt);
    state.velocity *= Math.max(0, 1 - 2.5 * dt * (terrain.type === 'tarmac' ? 0.5 : 1.2));
  }

  if (terrain.type !== 'tarmac') {
    state.velocity *= 1 - (terrain.type === 'grass' ? 0.9 : terrain.type === 'gravel' ? 1.5 : 2.2) * dt;
  }

  if (Math.abs(state.velocity) < 0.05) state.velocity = 0;
  state.velocity = clamp(state.velocity, reverseMax, maxSpeed);

  const steerPower = 1.8 + Math.min(Math.abs(state.velocity) / 18, 1.4);
  const driftBias = terrain.type === 'tarmac' ? (state.nitroActive ? 1.0 : 0.26) : 0.5 + (terrain.type === 'gravel' ? 0.2 : 0.05);

  state.steering = lerp(state.steering, state.turnInput * steerPower, terrain.type === 'tarmac' ? 0.12 : 0.09);
  state.drift = lerp(state.drift, Math.abs(state.velocity) > 3 ? Math.abs(state.steering) * driftBias : 0, 0.08);

  const steerFactor = state.steering * (0.55 + Math.abs(state.velocity) * 0.02) * terrain.traction;
  state.yaw += steerFactor * dt * (state.velocity >= 0 ? 1 : -1);

  const driftAmount = state.drift * Math.min(Math.abs(state.velocity) / 20, 1.9) * 1.6 * terrain.traction;
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

  const speedKmh = Math.round(Math.abs(state.velocity) * 7.2);
  maxSpeedRecord = Math.max(maxSpeedRecord, speedKmh);
  maxDriftRecord = Math.max(maxDriftRecord, Math.round(state.drift * 100));

  document.getElementById('speed').textContent = `${speedKmh} km/h`;
  document.getElementById('drift').textContent = `${Math.round(state.drift * 100)}%`;

  const circuitLabel = document.getElementById('circuitLabel');
  if (circuitLabel) circuitLabel.textContent = getCurrentTrackNameLabel();
}

function updateCamera(dt) {
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
  buildTrackGeometry(currentTrackName);
  gameRunning = true;
  gamePaused = false;
  gameOver = false;
  gameTime = 0;
  maxSpeedRecord = 0;
  maxDriftRecord = 0;

  const mainMenu = document.getElementById('mainMenu');
  mainMenu.classList.add('hidden');
  document.getElementById('pauseMenu').classList.remove('visible');
  document.getElementById('gameOver').classList.remove('visible');

  resetRace();
  updateTrackSelectionUI();

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

  renderer.render(scene, camera);
  animationFrameId = requestAnimationFrame(loop);
}

window.startGame = startGame;
window.resumeGame = resumeGame;
window.restartGame = restartGame;
window.mainMenu = mainMenu;
window.toggleControls = toggleControls;
window.setSelectedTrack = setSelectedTrack;

window.addEventListener('load', () => {
  updateTrackSelectionUI();

  document.getElementById('nitroProgress').style.width = '100%';
  document.getElementById('speed').textContent = '0 km/h';
  document.getElementById('drift').textContent = '0%';
  document.getElementById('time').textContent = '0:00';
  const circuitLabel = document.getElementById('circuitLabel');
  if (circuitLabel) circuitLabel.textContent = getCurrentTrackNameLabel();
});
