export const RENDER = {
  antialias: true,
  powerPreference: 'high-performance',
  maxPixelRatio: 2,
};

export const CAMERA = {
  fov: 60,
  near: 0.1,
  far: 500,
  distance: 10,
  height: 4.5,
};

export const WORLD = {
  groundSize: 400,
  fogNear: 60,
  fogFar: 220,
};

export const VEHICLE = {
  bodyColor: 0xff3b30,
  accentColor: 0x1f2937,
  wheelColor: 0x111827,
};

export const PHYSICS = {
  ready: false,
  placeholder: true,
};

export const MOVEMENT = {
  maxSpeed: 50,
  reverseSpeed: -15,
  acceleration: 35,
  deceleration: 25,
  brakingForce: 40,
  maxSteerAngle: 0.5, // radianes
  steerSensitivity: 4.5,
  steerReturnSpeed: 8.0,
  inertiaDamping: 0.92,
  speedDependentSteer: true,
};

export const TRACK = {
  bounds: {
    minX: -180,
    maxX: 180,
    minZ: -150,
    maxZ: 150,
  },
};
