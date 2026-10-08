import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';
import { F1Car } from './F1Car.js';

export class BotDriver extends F1Car {
  constructor(id, spawnPoint, waypointPath, config = {}) {
    super();
    this.id = id;
    this.name = `Bot ${id}`;
    this.spawnPoint = spawnPoint.clone();
    this.waypointPath = waypointPath || [];
    this.currentWaypointIndex = 0;
    this.lapProgress = 0;

    this.setup = {
      aggression: config.aggression ?? 0.5,
      skill: config.skill ?? 0.5,
      topSpeed: config.topSpeed ?? 1.0,
      brakeBias: config.brakeBias ?? 0.5,
      lineOffset: config.lineOffset ?? 0,
      response: config.response ?? 0.8,
      aggressiveness: config.aggressiveness ?? 0.5,
      targetSpeed: config.targetSpeed ?? 1.0,
    };

    this.aiState = {
      throttle: 0,
      brake: 0,
      steer: 0,
      targetYaw: 0,
      steeringAssist: 0,
      lastWaypointDistance: Infinity,
      isOvertaking: false,
      overtakeCooldown: 0,
      avoidOffset: 0,
      canBrake: true,
    };

    this.reset();
  }

  reset() {
    this.root.position.copy(this.spawnPoint);
    this.root.rotation.y = Math.PI;
    this.physics.speed = 0;
    this.physics.velocity.set(0, 0, 0);
    this.currentWaypointIndex = 0;
    this.lapProgress = 0;
    this.aiState.steer = 0;
    this.aiState.throttle = 0;
    this.aiState.brake = 0;
    this.aiState.avoidOffset = 0;
    this.aiState.overtakeCooldown = 0;
  }

  getCurrentWaypoint() {
    if (!this.waypointPath.length) return null;
    return this.waypointPath[this.currentWaypointIndex % this.waypointPath.length];
  }

  update(dt, playerCar, track, opponents = []) {
    if (!this.waypointPath.length) return;

    this.aiState.overtakeCooldown = Math.max(0, this.aiState.overtakeCooldown - dt);
    this.updateWaypoints(playerCar, track);
    this.updateDrivingLogic(dt, playerCar, track, opponents);
    this.applyInputs();
    this.updatePhysics(dt);
  }

  updateWaypoints(playerCar, track) {
    const currentWaypoint = this.getCurrentWaypoint();
    if (!currentWaypoint) return;

    const waypointPosition = currentWaypoint.clone();
    const toWaypoint = waypointPosition.clone().sub(this.root.position);
    const dist = toWaypoint.length();
    this.aiState.lastWaypointDistance = dist;

    if (dist < 5 && this.currentWaypointIndex < this.waypointPath.length - 1) {
      this.currentWaypointIndex += 1;
      this.lapProgress += 1;
    } else if (dist < 5 && this.currentWaypointIndex >= this.waypointPath.length - 1) {
      this.currentWaypointIndex = 0;
      this.lapProgress = 0;
    }
  }

  updateDrivingLogic(dt, playerCar, track, opponents) {
    const waypoint = this.getCurrentWaypoint();
    if (!waypoint) return;

    const targetPos = waypoint.clone();
    const localTarget = targetPos.clone().sub(this.root.position);
    localTarget.y = 0;

    const desiredYaw = Math.atan2(localTarget.x, localTarget.z);
    const yawDelta = this.normalizeAngle(desiredYaw - this.physics.yaw);

    const speedFactor = Math.min(Math.abs(this.physics.speed) / this.physics.maxSpeed, 1);
    const distanceToWaypoint = localTarget.length();
    const curveFactor = Math.abs(yawDelta) * 3.5;

    // Frenar antes de curvas
    const brakeTarget = Math.min(1, curveFactor * (0.7 + speedFactor * 0.8));
    const throttleTarget = this.physics.speed < this.physics.maxSpeed * this.setup.topSpeed
      ? 1 - Math.min(1, brakeTarget)
      : 0.15;

    // Ajuste por curva lenta/rápida
    const slowTurn = Math.abs(yawDelta) > 0.6 ? 1 : 0;
    const slowSpeed = slowTurn > 0 ? 0.35 : 0.9;

    let throttle = throttleTarget * slowSpeed;
    let brake = brakeTarget * (0.5 + this.setup.brakeBias * 0.5);

    // Acelerar en rectas
    if (distanceToWaypoint > 18 && Math.abs(yawDelta) < 0.2) {
      throttle = Math.min(1, throttle + 0.35);
      brake *= 0.5;
    }

    // Rectas largas / curvas rápidas
    if (Math.abs(yawDelta) < 0.1) {
      throttle = 1;
      brake = 0;
    }

    // Reducir velocidad al entrar en curvas lentas
    if (Math.abs(yawDelta) > 0.9) {
      brake = Math.min(1, brake + 0.6);
      throttle *= 0.2;
    }

    // Mantenerse dentro de la pista
    const trackBounds = track.getTrackBounds ? track.getTrackBounds() : {
      minX: -180,
      maxX: 180,
      minZ: -150,
      maxZ: 150,
    };

    const roadBiasX = this.root.position.x > trackBounds.maxX - 15 ? -1 : this.root.position.x < trackBounds.minX + 15 ? 1 : 0;
    const roadBiasZ = this.root.position.z > trackBounds.maxZ - 15 ? -1 : this.root.position.z < trackBounds.minZ + 15 ? 1 : 0;
    if (roadBiasX !== 0 || roadBiasZ !== 0) {
      const correction = Math.atan2(roadBiasX, roadBiasZ || 1);
      this.aiState.avoidOffset = correction * 0.5;
      brake = Math.min(1, brake + 0.4);
    } else {
      this.aiState.avoidOffset *= 0.8;
    }

    // Adversarios: evitar colisiones / adelantar si es posible
    let overtakeSteer = 0;
    let lateralAvoid = 0;

    opponents.forEach((other) => {
      if (other === this) return;

      const delta = other.root.position.clone().sub(this.root.position);
      const dist = delta.length();
      if (dist > 0 && dist < 12) {
        const avoidDir = Math.sign(delta.x) || 1;
        lateralAvoid += avoidDir * (1.2 - dist / 12);
        brake = Math.min(1, brake + 0.35);
      }
    });

    // Overtake / adelantamiento: si el rival está delante y va más lento
    const playerDelta = playerCar.root.position.clone().sub(this.root.position);
    const playerDist = playerDelta.length();
    if (playerDist < 25 && playerDist > 4) {
      const playerSpeed = Math.abs(playerCar.physics.speed);
      const mySpeed = Math.abs(this.physics.speed);
      if (playerSpeed < mySpeed) {
        this.aiState.isOvertaking = true;
        this.aiState.overtakeCooldown = 1.2;
      }
    }

    if (this.aiState.isOvertaking && this.aiState.overtakeCooldown > 0) {
      throttle = Math.min(1, throttle + 0.2);
      overtakeSteer = Math.sign(playerDelta.x || 1) * 0.2;
    } else {
      this.aiState.isOvertaking = false;
    }

    const steerTarget = this.clamp(yawDelta * (1.5 + this.setup.response), -1, 1);
    let steerValue = steerTarget + lateralAvoid * 0.35 + overtakeSteer + this.aiState.avoidOffset;
    steerValue = this.clamp(steerValue, -1, 1);

    this.aiState.throttle = this.clamp(throttle, 0, 1);
    this.aiState.brake = this.clamp(brake, 0, 1);
    this.aiState.steer = steerValue;
  }

  applyInputs() {
    this.setInputs(this.aiState.throttle, this.aiState.brake, this.aiState.steer);
  }

  updatePhysics(dt) {
    this.update(dt);
  }

  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }
}

export class BotManager {
  constructor(track, playerCar) {
    this.track = track;
    this.playerCar = playerCar;
    this.bots = [];
    this.spawnPoints = this.buildSpawnPoints();
  }

  buildSpawnPoints() {
    return [
      new THREE.Vector3(-8, 0.5, 10),
      new THREE.Vector3(10, 0.5, 18),
      new THREE.Vector3(-14, 0.5, 26),
      new THREE.Vector3(15, 0.5, 35),
      new THREE.Vector3(-18, 0.5, 44),
    ];
  }

  createBots() {
    const waypoints = this.buildWaypointPath();

    this.spawnPoints.forEach((spawn, index) => {
      const bot = new BotDriver(index + 1, spawn, waypoints, {
        aggression: 0.4 + index * 0.12,
        skill: 0.5 + index * 0.08,
        topSpeed: 0.9 + index * 0.04,
        brakeBias: 0.4 + (index % 3) * 0.15,
        response: 0.75 + index * 0.06,
      });
      this.bots.push(bot);
    });

    return this.bots;
  }

  buildWaypointPath() {
    return [
      new THREE.Vector3(0, 0.5, 20),
      new THREE.Vector3(25, 0.5, 36),
      new THREE.Vector3(22, 0.5, 54),
      new THREE.Vector3(-2, 0.5, 52),
      new THREE.Vector3(-12, 0.5, 30),
      new THREE.Vector3(-6, 0.5, 10),
      new THREE.Vector3(10, 0.5, 8),
      new THREE.Vector3(26, 0.5, 18),
      new THREE.Vector3(32, 0.5, 48),
      new THREE.Vector3(10, 0.5, 62),
      new THREE.Vector3(-12, 0.5, 58),
      new THREE.Vector3(-15, 0.5, 18),
      new THREE.Vector3(-10, 0.5, 2),
      new THREE.Vector3(0, 0.5, 0),
    ];
  }

  update(dt) {
    this.bots.forEach((bot) => {
      bot.update(dt, this.playerCar, this.track, this.bots);
    });
  }
}
