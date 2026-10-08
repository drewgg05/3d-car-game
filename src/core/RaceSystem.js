import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

export class RaceSystem {
  constructor(track, playerCar, bots = []) {
    this.track = track;
    this.playerCar = playerCar;
    this.bots = bots;

    this.totalLaps = 10;
    this.currentLap = 1;
    this.playerPosition = 1;
    this.totalCars = 1 + bots.length;

    this.elapsedTime = 0;
    this.currentLapTime = 0;
    this.lastLapTime = null;
    this.bestLapTime = null;
    this.totalRaceTime = 0;

    this.started = false;
    this.finished = false;
    this.raceCompleted = false;

    this.gridOrder = [];
    this.playerCompletedLaps = 0;
    this.playerCurrentCheckpointIndex = 0;
    this.playerLastCheckpoint = -1;
    this.playerLapValid = false;

    this.startPosition = track.getStartPosition ? track.getStartPosition() : new THREE.Vector3(0, 0.5, -8);
    this.startYaw = track.getStartRotation ? track.getStartRotation() : Math.PI;

    this.reset();
  }

  reset() {
    this.currentLap = 1;
    this.elapsedTime = 0;
    this.currentLapTime = 0;
    this.lastLapTime = null;
    this.bestLapTime = null;
    this.totalRaceTime = 0;
    this.finished = false;
    this.raceCompleted = false;
    this.playerCompletedLaps = 0;
    this.playerCurrentCheckpointIndex = 0;
    this.playerLastCheckpoint = -1;
    this.playerLapValid = false;
    this.started = false;
    this.gridOrder = this.buildGridOrder();
    this.playerPosition = 1;
  }

  buildGridOrder() {
    const order = [{ id: 'player', car: this.playerCar, laps: 0, currentLap: 1 }];
    this.bots.forEach((bot, index) => {
      order.push({ id: `bot-${index + 1}`, car: bot, laps: 0, currentLap: 1 });
    });
    return order;
  }

  startRace() {
    this.started = true;
    this.finished = false;
    this.playerLapValid = false;
    this.playerCurrentCheckpointIndex = 0;
    this.playerLastCheckpoint = -1;
  }

  update(dt) {
    if (!this.started || this.finished) return;

    this.elapsedTime += dt;
    this.currentLapTime += dt;
    this.totalRaceTime += dt;

    this.updatePlayerProgress();
    this.updatePosition();
    this.updateLapState();
  }

  updatePlayerProgress() {
    const checkpoints = this.track.getCheckpoints ? this.track.getCheckpoints() : [];
    if (!checkpoints.length) return;

    const playerPos = this.playerCar.getPosition();
    const nextCheckpoint = checkpoints[this.playerCurrentCheckpointIndex];
    if (!nextCheckpoint) return;

    const distance = playerPos.distanceTo(nextCheckpoint.position);
    const checkpointRadius = nextCheckpoint.radius || 6;

    if (distance <= checkpointRadius) {
      if (this.playerLastCheckpoint !== this.playerCurrentCheckpointIndex) {
        this.playerLastCheckpoint = this.playerCurrentCheckpointIndex;
        this.playerCurrentCheckpointIndex += 1;
      }
    }

    if (this.playerCurrentCheckpointIndex >= checkpoints.length) {
      this.playerCurrentCheckpointIndex = 0;
      this.playerLapValid = true;
    }
  }

  updateLapState() {
    if (!this.playerLapValid) return;

    const playerPosition = this.playerCar.getPosition();
    const startPosition = this.startPosition;
    const finishDistance = playerPosition.distanceTo(startPosition);

    if (finishDistance <= 12) {
      const lapTime = this.currentLapTime;
      this.lastLapTime = lapTime;
      this.bestLapTime = this.bestLapTime === null ? lapTime : Math.min(this.bestLapTime, lapTime);

      this.playerCompletedLaps += 1;
      this.currentLap += 1;
      this.currentLapTime = 0;
      this.playerLapValid = false;
      this.playerCurrentCheckpointIndex = 0;
      this.playerLastCheckpoint = -1;

      if (this.playerCompletedLaps >= this.totalLaps) {
        this.finishRace();
      }
    }
  }

  updatePosition() {
    this.playerPosition = 1;
    const allCars = [this.playerCar, ...this.bots];

    allCars.forEach((car) => {
      const lapValue = car.lapProgress || car.playerCompletedLaps || 0;
      const carPosition = car.getPosition ? car.getPosition() : new THREE.Vector3();
      const isPlayer = car === this.playerCar;
      if (isPlayer) {
        this.playerPosition = 1;
      }
    });

    // Posición relativa del jugador respecto a los bots
    let position = 1;
    const playerLap = this.playerCompletedLaps + 1;

    for (const bot of this.bots) {
      const botLap = bot.lapProgress || 0;
      if (botLap > playerLap || (botLap === playerLap && bot.getVelocity() > this.playerCar.getVelocity())) {
        position += 1;
      }
    }

    this.playerPosition = position;
  }

  finishRace() {
    this.finished = true;
    this.raceCompleted = true;
    this.started = false;
  }

  formatTime(ms) {
    if (ms === null || ms === undefined) return '--:--.---';
    const totalMs = Math.max(0, Math.floor(ms * 1000));
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const millis = totalMs % 1000;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
  }

  getHUDState() {
    const lapDisplay = Math.min(this.currentLap, this.totalLaps);
    const bestDisplay = this.bestLapTime === null ? '--:--.---' : this.formatTime(this.bestLapTime);
    const currentDisplay = this.currentLapTime === null ? '--:--.---' : this.formatTime(this.currentLapTime);

    return {
      currentLap: lapDisplay,
      totalLaps: this.totalLaps,
      position: this.playerPosition,
      totalCars: this.totalCars,
      currentLapTime: currentDisplay,
      lastLapTime: this.lastLapTime === null ? '--:--.---' : this.formatTime(this.lastLapTime),
      bestLapTime: bestDisplay,
      totalRaceTime: this.formatTime(this.totalRaceTime),
      finished: this.finished,
    };
  }
}
