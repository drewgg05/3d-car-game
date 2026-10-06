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
let trackCenterline = [];

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
    roadHalfWidth: 8.8,
    grassHalfWidth: 5,
    color: 0x282828,
    start: [0, 62],
    points: [
      [0, 62], [18, 62], [36, 58], [54, 46], [68, 26], [73, 2], [62, -18], [40, -32],
      [16, -42], [-10, -42], [-34, -30], [-52, -10], [-64, 12], [-58, 36], [-38, 52], [-12, 62], [0, 62]
    ],
  },
  silverstone: {
    name: 'Silverstone',
    roadHalfWidth: 9.5,
    grassHalfWidth: 5.4,
    color: 0x2f2d2d,
    start: [0, 76],
    points: [
      [0, 76], [18, 70], [40, 60], [62, 40], [74, 10], [70, -18], [54, -40], [28, -56],
      [-2, -64], [-32, -58], [-56, -38], [-70, -10], [-74, 18], [-62, 42], [-34, 60], [-6, 72], [0, 76]
    ],
  },
  monza: {
    name: 'Monza',
    roadHalfWidth: 10.2,
    grassHalfWidth: 5.6,
    color: 0x242424,
    start: [0, 82],
    points: [
      [0, 82], [18, 78], [40, 70], [60, 58], [76, 38], [82, 8], [76, -26], [56, -52], [24, -70],
      [-8, -76], [-38, -68], [-60, -46], [-76, -16], [-80, 18], [-64, 44], [-30, 64], [0, 82]
    ],
  },
};

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function updateTrackSelectionUI() {
  document.querySelectorAll('.track-btn').forEach((button) => {
    button.classList.toggle('selected', button.dataset.track === currentTrackName);
  });
  const label = document.getElementById('circuitLabel');
  if (label) label.textContent = TRACKS[currentTrackName].name;
}

function setSelectedTrack(trackName) {
  if (!TRACKS[trackName]) return;
  currentTrackName = trackName;
  if (world) buildTrackGeometry(trackName);
  updateTrackSelectionUI();
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

  const points = track.points.map(([x, z]) => new THREE.Vector3(x, 0.18, z));
  const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.35);
  const samples = curve.getPoints(1200);
  trackCenterline = samples;
  currentTrack = { ...track, samples, curve };

  const roadMaterial = new THREE.MeshStandardMaterial({
    color: track.color,
    roughness: 0.75,
    metalness: 0.15,
  });

  const lineMaterial = new THREE.MeshStandardMaterial({
    color: 0xf8f4d9,
    roughness: 0.45,
    emissive: 0x3f3010,
  });

  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i];
    const b = samples[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const length = Math.hypot(dx, dz);

    const segment = new THREE.Mesh(new THREE.BoxGeometry(track.roadHalfWidth * 2, 0.24, Math.max(length, 1.4)), roadMaterial);
    segment.position.set((a.x + b.x) / 2, 0.16, (a.z + b.z) / 2);
    segment.rotation.y = Math.atan2(dx, dz);
    segment.receiveShadow = true;
    segment.castShadow = true;
    group.add(segment);

    if (i % 10 === 0) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 2.8), lineMaterial);
      stripe.position.set((a.x + b.x) / 2, 0.28, (a.z + b.z) / 2);
      stripe.rotation.y = Math.atan2(dx, dz);
      group.add(stripe);
    }
  }

  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshStandardMaterial({ color: 0x366b3a, roughness: 0.96 })
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = 0;
  group.add(grass);

  const startMarker = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.09, 1.8),
    new THREE.MeshStandardMaterial({ color: 0xfffef0, roughness: 0.35 })
  );
  const [sx, sz] = track.start;
  startMarker.position.set(sx, 0.22, sz);
  const first = samples[1];
  const last = samples[0];
  const dir = new THREE.Vector3().subVectors(first, last).normalize();
  startMarker.rotation.y = Math.atan2(dir.x, dir.z);
  group.add(startMarker);

  const startSign = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.12, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x222222, roughness: 0.4 })
  );
  startSign.position.set(sx, 0.65, sz + 3.2);
  startSign.rotation.y = Math.atan2(dir.x, dir.z);
  group.add(startSign);

  placeCarOnTrack();
}

function placeCarOnTrack() {
  if (!currentTrack) return;
  const [sx, sz] = currentTrack.start;
  car.position.set(sx, 0.2, sz);
  car.rotation.y = Math.PI;
}

function getTrackTerrain(position) {
  if (!currentTrack || !currentTrack.samples) {
    return { type: 'tarmac', modifier: 1, traction: 1 };
  }

  let nearestDist = Infinity;
  for (const p of currentTrack.samples) {
    const d = Math.hypot(p.x - position.x, p.z - position.z);
    if (d < nearestDist) nearestDist = d;
  }

  const roadHalf = currentTrack.roadHalfWidth;
  const grassHalf = currentTrack.grassHalfWidth;

  if (nearestDist <= roadHalf) return { type: 'tarmac', modifier: 1, traction: 1 };
  if (nearestDist <= roadHalf + grassHalf) return { type: 'grass', modifier: 0.58, traction: 0.75 };
  if (nearestDist <= roadHalf + grassHalf + 5) return { type: 'gravel', modifier: 0.38, traction: 0.46 };
  return { type: 'offtrack', modifier: 0.22, traction: 0.25 };
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

  const red = new THREE.MeshStandardMaterial({ color: 0xdf0000, metalness: 0.45, roughness: 0.28, emissive: 0x360000 });
  const black = new THREE.MeshStandardMaterial({ color: 0x090909, roughness: 0.9 });
  const carbon = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.8, metalness: 0.35 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x7cb9ff, transparent: true, opacity: 0.5, roughness: 0.1 });

  const mainBody = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.68, 4.8), red);
  mainBody.position.set(0, 0.78, 0);
  mainBody.castShadow = true;
  mainBody.receiveShadow = true;
  car.add(mainBody);

  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 4.2), black);
  floor.position.set(0, 0.35, 0);
  car.add(floor);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.3, 12), red);
  nose.rotation.z = Math.PI / 2;
  nose.position.set(0, 0.72, 2.6);
  nose.castShadow = true;
  car.add(nose);

  const frontWing = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.15, 0.42), carbon);
  frontWing.position.set(0, 0.5, 2.4);
  frontWing.castShadow = true;
  car.add(frontWing);

  const rearWing = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.18, 0.4), carbon);
  rearWing.position.set(0, 0.65, -2.25);
  rearWing.castShadow = true;
  car.add(rearWing);

  const rearMount = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.18), black);
  rearMount.position.set(0, 0.32, -2.05);
  car.add(rearMount);

  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 1.3), glass);
  cockpit.position.set(0, 1.15, -0.15);
  cockpit.castShadow = true;
  car.add(cockpit);

  const engineCover = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 1.5), red);
  engineCover.position.set(0, 1.05, -1.2);
  engineCover.castShadow = true;
  car.add(engineCover);

  const sidePodLeft = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.75, 1.5), black);
  sidePodLeft.position.set(-1.05, 0.75, 0.4);
  sidePodLeft.castShadow = true;
  car.add(sidePodLeft);

  const sidePodRight = sidePodLeft.clone();
  sidePodRight.position.x = 1.05;
  car.add(sidePodRight);

  const intakeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.38, 0.45), black);
  intakeLeft.position.set(-0.9, 0.8, 0.9);
  car.add(intakeLeft);

  const intakeRight = intakeLeft.clone();
  intakeRight.position.x = 0.9;
  car.add(intakeRight);

  const headlightLeft = new THREE.PointLight(0xfff5cc, 2.5, 20, 2);
  headlightLeft.position.set(-0.7, 0.8, 2.42);
  car.add(headlightLeft);

  const headlightRight = headlightLeft.clone();
  headlightRight.position.x = 0.7;
  car.add(headlightRight);

  const tailLightLeft = new THREE.PointLight(0xff2352, 1.5, 18, 2);
  tailLightLeft.position.set(-0.7, 0.9, -2.42);
  car.add(tailLightLeft);

  const tailLightRight = tailLightLeft.clone();
  tailLightRight.position.x = 0.7;
  car.add(tailLightRight);

  const wheelGeometry = new THREE.CylinderGeometry(0.45, 0.45, 0.34, 20);
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.82, metalness: 0.15 });
  const rimMaterial = new THREE.MeshStandardMaterial({ color: 0x565656, roughness: 0.4, metalness: 0.7 });

  const positions = [
    [-1.15, 0.46, 1.4],
    [1.15, 0.46, 1.4],
    [-1.15, 0.46, -1.4],
    [1.15, 0.46, -1.4],
  ];

  wheels = [];
  for (const [x, y, z] of positions) {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    wheel.receiveShadow = true;

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.38, 18), rimMaterial);
    rim.rotation.z = Math.PI / 2;
    wheel.add(rim);

    wheels.push(wheel);
    car.add(wheel);
  }

  placeCarOnTrack();
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

function updateCar(dt) {
  const forward = keys.KeyW || keys.ArrowUp ? 1 : 0;
  const reverse = keys.KeyS || keys.ArrowDown ? 1 : 0;
  const steerLeft = keys.KeyA || keys.ArrowLeft ? 1 : 0;
  const steerRight = keys.KeyD || keys.ArrowRight ? 1 : 0;
  const nitroPressed = keys.Space;

  state.throttle = forward - reverse;
  state.turnInput = steerLeft - steerRight;
  state.nitroActive = nitroPressed && state.nitro > 0;

  if (state.nitroActive) state.nitro = Math.max(0, state.nitro - 22 * dt);
  else state.nitro = Math.min(100, state.nitro + 12 * dt);

  const nitroProgress = document.getElementById('nitroProgress');
  nitroProgress.style.width = `${state.nitro}%`;

  const terrain = getTrackTerrain(car.position);
  const baseMaxSpeed = state.nitroActive ? 54 : 38;
  const maxSpeed = baseMaxSpeed * terrain.modifier;
  const reverseMax = -11 * terrain.modifier;

  let currentAcceleration = 0;
  if (state.throttle !== 0) {
    const accelDir = state.throttle > 0 ? 1 : -1;
    const currentSpeed = Math.abs(state.velocity);

    if (currentSpeed < baseMaxSpeed * 0.3) currentAcceleration = 11;
    else if (currentSpeed < baseMaxSpeed * 0.6) currentAcceleration = 8;
    else if (currentSpeed < baseMaxSpeed * 0.9) currentAcceleration = 4.5;
    else currentAcceleration = 1.2;

    if (terrain.type !== 'tarmac') currentAcceleration *= terrain.modifier * 0.8;

    state.velocity += accelDir * currentAcceleration * dt;
    state.engineRPM = clamp((Math.abs(state.velocity) / baseMaxSpeed) * 8500, 0, 8500);
  } else {
    state.engineRPM = lerp(state.engineRPM, 0, 0.14 * dt);
    state.velocity *= Math.max(0, 1 - 2.8 * dt * (terrain.type === 'tarmac' ? 0.5 : 1.2));
  }

  if (terrain.type !== 'tarmac') {
    state.velocity *= 1 - (terrain.type === 'grass' ? 0.85 : terrain.type === 'gravel' ? 1.35 : 1.9) * dt;
  }

  if (Math.abs(state.velocity) < 0.06) state.velocity = 0;
  state.velocity = clamp(state.velocity, reverseMax, maxSpeed);

  const driftBias = terrain.type === 'tarmac'
    ? (state.nitroActive ? 1.0 : 0.26)
    : 0.5 + (terrain.type === 'gravel' ? 0.25 : 0.08);

  const steerPower = 1.9 + Math.min(Math.abs(state.velocity) / 18, 1.5);
  state.steering = lerp(state.steering, state.turnInput * steerPower, terrain.type === 'tarmac' ? 0.12 : 0.08);
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
  document.getElementById('circuitLabel').textContent = TRACKS[currentTrackName].name;
}

function updateCamera(dt) {
  const distance = 10.5;
  const height = 4.8;

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

  const mainMenu = document.getElementById('mainMenu');
  mainMenu.classList.add('hidden');
  document.getElementById('pauseMenu').classList.remove('visible');
  document.getElementById('gameOver').classList.remove('visible');

  resetRace();
  updateTrackSelectionUI();
  buildTrackGeometry(currentTrackName);

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
  document.getElementById('circuitLabel').textContent = TRACKS[currentTrackName].name;
});
