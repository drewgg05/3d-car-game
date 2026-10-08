import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';
import { VEHICLE, MOVEMENT } from '../config.js';

export class F1Car {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'F1Car';

    // Propiedades físicas
    this.physics = {
      // Masa y resistencia
      mass: 800, // kg
      dragCoefficient: 0.35,
      rollingResistance: 0.015,
      frontalArea: 1.5,

      // Velocidades
      velocity: new THREE.Vector3(0, 0, 0),
      speed: 0, // Velocidad escalar
      maxSpeed: MOVEMENT.maxSpeed,
      reverseSpeed: MOVEMENT.reverseSpeed,

      // Dirección y giro
      yaw: 0, // Ángulo de orientación (radianes)
      steerAngle: 0, // Ángulo actual de dirección
      targetSteerAngle: 0, // Ángulo deseado

      // Control
      throttleInput: 0, // -1 a 1
      steerInput: 0, // -1 a 1
      brakeInput: 0, // 0 a 1

      // Fuerzas
      traction: 0, // Fuerza de tracción actual
      lateralForce: 0, // Fuerza lateral en curvas
      engineForce: 0,

      // Estado de agarre
      tireGrip: 1.0, // Factor de agarre (1.0 = total agarre)
      isSlipping: false,
      slipAngle: 0, // Ángulo de deslizamiento

      // Inercia y suavizado
      angularVelocity: 0, // Velocidad angular en yaw
      weightTransfer: 0.0, // Transferencia de peso en aceleraciones laterales
    };

    this.wheels = [];
    this.build();
  }

  build() {
    this.createChassisAndBody();
    this.createWings();
    this.createCockpit();
    this.createHalo();
    this.createPontoones();
    this.createEngine();
    this.createWheelsAndSuspension();
    this.createLights();
  }

  createChassisAndBody() {
    const chassisMaterial = new THREE.MeshStandardMaterial({
      color: VEHICLE.bodyColor,
      metalness: 0.55,
      roughness: 0.25,
    });

    const noseGeom = new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.8, 0),
        new THREE.Vector2(0.85, 0.15),
        new THREE.Vector2(0.75, 0.4),
        new THREE.Vector2(0.5, 0.6),
        new THREE.Vector2(0.3, 0.8),
      ],
      16
    );
    const nose = new THREE.Mesh(noseGeom, chassisMaterial);
    nose.position.z = 2.6;
    nose.position.y = 0.4;
    nose.rotation.x = Math.PI / 2;
    nose.castShadow = true;
    this.root.add(nose);

    const mainChassis = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.5, 3.2),
      chassisMaterial
    );
    mainChassis.position.y = 0.65;
    mainChassis.castShadow = true;
    mainChassis.receiveShadow = true;
    this.root.add(mainChassis);

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.7,
      roughness: 0.3,
    });

    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.08, 3.0),
      floorMaterial
    );
    floor.position.y = 0.25;
    floor.receiveShadow = true;
    this.root.add(floor);

    const bonnet = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.35, 0.9),
      chassisMaterial
    );
    bonnet.position.set(0, 0.95, 1.3);
    bonnet.castShadow = true;
    this.root.add(bonnet);

    const diffusorGeom = new THREE.BoxGeometry(1.6, 0.25, 0.8);
    const diffusor = new THREE.Mesh(diffusorGeom, floorMaterial);
    diffusor.position.set(0, 0.35, -2.1);
    diffusor.castShadow = true;
    this.root.add(diffusor);
  }

  createWings() {
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f0f0f,
      metalness: 0.8,
      roughness: 0.2,
    });

    const supportMaterial = new THREE.MeshStandardMaterial({
      color: 0x1f1f2f,
      metalness: 0.6,
      roughness: 0.3,
    });

    const frontWingMain = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.08, 0.35),
      wingMaterial
    );
    frontWingMain.position.set(0, 0.45, 2.45);
    frontWingMain.castShadow = true;
    this.root.add(frontWingMain);

    const frontWingFlap = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.06, 0.25),
      wingMaterial
    );
    frontWingFlap.position.set(0, 0.25, 2.55);
    frontWingFlap.castShadow = true;
    this.root.add(frontWingFlap);

    const frontWingSupport = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.35, 0.2),
      supportMaterial
    );
    frontWingSupport.position.set(0.9, 0.35, 2.45);
    frontWingSupport.castShadow = true;
    this.root.add(frontWingSupport);

    const frontWingSupportRight = frontWingSupport.clone();
    frontWingSupportRight.position.x = -0.9;
    this.root.add(frontWingSupportRight);

    const rearWingMain = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.12, 0.3),
      wingMaterial
    );
    rearWingMain.position.set(0, 0.62, -2.25);
    rearWingMain.castShadow = true;
    this.root.add(rearWingMain);

    const rearWingFlap = new THREE.Mesh(
      new THREE.BoxGeometry(1.85, 0.08, 0.2),
      wingMaterial
    );
    rearWingFlap.position.set(0, 0.42, -2.35);
    rearWingFlap.castShadow = true;
    this.root.add(rearWingFlap);

    const rearWingPylon = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.5, 0.25),
      supportMaterial
    );
    rearWingPylon.position.set(0, 0.38, -2.1);
    rearWingPylon.castShadow = true;
    this.root.add(rearWingPylon);
  }

  createCockpit() {
    const cockpitMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a4d7a,
      transparent: true,
      opacity: 0.6,
      metalness: 0.3,
      roughness: 0.15,
    });

    const cockpitRoll = new THREE.MeshStandardMaterial({
      color: 0x0d0d0d,
      metalness: 0.7,
      roughness: 0.3,
    });

    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.5, 1.0),
      cockpitMaterial
    );
    windshield.position.set(0, 1.45, 0.15);
    windshield.castShadow = true;
    this.root.add(windshield);

    const seatGeom = new THREE.BoxGeometry(0.6, 0.4, 0.8);
    const seat = new THREE.Mesh(seatGeom, cockpitRoll);
    seat.position.set(0, 1.2, 0);
    seat.castShadow = true;
    this.root.add(seat);

    const cabinBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.8, 1.2),
      new THREE.MeshStandardMaterial({
        color: VEHICLE.bodyColor,
        metalness: 0.5,
        roughness: 0.3,
      })
    );
    cabinBox.position.set(0, 1.1, 0.1);
    cabinBox.castShadow = true;
    this.root.add(cabinBox);
  }

  createHalo() {
    const haloMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      metalness: 0.8,
      roughness: 0.25,
    });

    const haloGeom = new THREE.TorusGeometry(0.65, 0.08, 12, 24);
    const halo = new THREE.Mesh(haloGeom, haloMaterial);
    halo.position.set(0, 1.75, 0.2);
    halo.rotation.x = Math.PI / 2.5;
    halo.castShadow = true;
    this.root.add(halo);

    const haloSupport = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.6, 0.1),
      haloMaterial
    );
    haloSupport.position.set(0.55, 1.3, 0.2);
    haloSupport.castShadow = true;
    this.root.add(haloSupport);

    const haloSupportRight = haloSupport.clone();
    haloSupportRight.position.x = -0.55;
    this.root.add(haloSupportRight);
  }

  createPontoones() {
    const pontoonMaterial = new THREE.MeshStandardMaterial({
      color: VEHICLE.bodyColor,
      metalness: 0.5,
      roughness: 0.3,
    });

    const pontoonLeftGeom = new THREE.BoxGeometry(0.35, 0.5, 2.0);
    const pontoonLeft = new THREE.Mesh(pontoonLeftGeom, pontoonMaterial);
    pontoonLeft.position.set(-1.15, 0.7, 0.2);
    pontoonLeft.castShadow = true;
    this.root.add(pontoonLeft);

    const pontoonRight = pontoonLeft.clone();
    pontoonRight.position.x = 1.15;
    this.root.add(pontoonRight);

    const bargeboard = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.6, 1.2),
      new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        metalness: 0.7,
        roughness: 0.3,
      })
    );
    bargeboard.position.set(0.95, 0.5, 0.5);
    bargeboard.rotation.z = 0.3;
    bargeboard.castShadow = true;
    this.root.add(bargeboard);

    const bargeboardLeft = bargeboard.clone();
    bargeboardLeft.position.x = -0.95;
    bargeboardLeft.rotation.z = -0.3;
    this.root.add(bargeboardLeft);
  }

  createEngine() {
    const engineCoverMaterial = new THREE.MeshStandardMaterial({
      color: VEHICLE.bodyColor,
      metalness: 0.5,
      roughness: 0.3,
    });

    const engineCover = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.7, 1.2),
      engineCoverMaterial
    );
    engineCover.position.set(0, 1.0, -1.5);
    engineCover.castShadow = true;
    this.root.add(engineCover);

    const intakeLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.4, 0.35),
      new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        metalness: 0.6,
        roughness: 0.4,
      })
    );
    intakeLeft.position.set(-0.7, 1.35, -1.95);
    intakeLeft.castShadow = true;
    this.root.add(intakeLeft);

    const intakeRight = intakeLeft.clone();
    intakeRight.position.x = 0.7;
    this.root.add(intakeRight);
  }

  createWheelsAndSuspension() {
    const wheelPositions = [
      { x: -0.95, z: 1.2, name: 'FL' },
      { x: 0.95, z: 1.2, name: 'FR' },
      { x: -0.95, z: -1.2, name: 'RL' },
      { x: 0.95, z: -1.2, name: 'RR' },
    ];

    wheelPositions.forEach((pos) => {
      const wheelAssembly = this.createWheelAssembly(pos.x, pos.z);
      this.root.add(wheelAssembly.group);
      this.wheels.push(wheelAssembly);
    });
  }

  createWheelAssembly(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0.5, z);

    const suspensionMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      metalness: 0.6,
      roughness: 0.4,
    });

    const suspension = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.35, 8),
      suspensionMaterial
    );
    suspension.position.y = -0.15;
    suspension.rotation.z = Math.PI / 2;
    suspension.castShadow = true;
    group.add(suspension);

    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      metalness: 0.85,
      roughness: 0.35,
    });

    const rimGeom = new THREE.CylinderGeometry(0.42, 0.42, 0.38, 16);
    const rim = new THREE.Mesh(rimGeom, rimMaterial);
    rim.rotation.z = Math.PI / 2;
    rim.castShadow = true;
    rim.receiveShadow = true;
    group.add(rim);

    const tireMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f0f0f,
      roughness: 0.9,
      metalness: 0.05,
    });

    const tireGeom = new THREE.TorusGeometry(0.48, 0.12, 12, 32);
    const tire = new THREE.Mesh(tireGeom, tireMaterial);
    tire.rotation.y = Math.PI / 2;
    tire.castShadow = true;
    tire.receiveShadow = true;
    group.add(tire);

    const brakeDiscMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      metalness: 0.7,
      roughness: 0.5,
    });

    const brakeDiscGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 16);
    const brakeDisc = new THREE.Mesh(brakeDiscGeom, brakeDiscMaterial);
    brakeDisc.rotation.z = Math.PI / 2;
    brakeDisc.position.x = -0.15;
    brakeDisc.castShadow = true;
    group.add(brakeDisc);

    return {
      group,
      rim,
      tire,
      suspension,
    };
  }

  createLights() {
    const headlightLeft = new THREE.PointLight(0xfff9e6, 1.5, 30);
    headlightLeft.position.set(-0.7, 0.55, 2.55);
    headlightLeft.castShadow = true;
    this.root.add(headlightLeft);

    const headlightRight = headlightLeft.clone();
    headlightRight.position.x = 0.7;
    this.root.add(headlightRight);

    const tailLightLeft = new THREE.PointLight(0xff3333, 1.2, 20);
    tailLightLeft.position.set(-0.65, 0.55, -2.5);
    this.root.add(tailLightLeft);

    const tailLightRight = tailLightLeft.clone();
    tailLightRight.position.x = 0.65;
    this.root.add(tailLightRight);
  }

  // ========== SISTEMA DE FÍSICA ARCADE-REALISTA ==========

  setInputs(throttle, brake, steer) {
    this.physics.throttleInput = THREE.MathUtils.clamp(throttle, -1, 1);
    this.physics.brakeInput = THREE.MathUtils.clamp(brake, 0, 1);
    this.physics.steerInput = THREE.MathUtils.clamp(steer, -1, 1);
  }

  update(dt) {
    if (dt > 0.05) dt = 0.05; // Limitar delta time para estabilidad

    this.updateEngine(dt);
    this.updateSteering(dt);
    this.updateTireGrip(dt);
    this.updateForces(dt);
    this.updateVelocity(dt);
    this.updatePosition(dt);
    this.updateWheels(dt);
  }

  updateEngine(dt) {
    const { throttleInput, brakeInput, speed, maxSpeed, reverseSpeed, mass } = this.physics;

    // Determinar dirección de movimiento deseada
    let desiredDirection = 0;
    if (throttleInput > 0) desiredDirection = 1;
    else if (throttleInput < 0) desiredDirection = -1;

    // Calcular fuerza del motor
    let maxEngineForce = 0;

    if (throttleInput > 0) {
      // Aceleración
      const speedFraction = Math.abs(speed) / maxSpeed;
      const accelerationCurve = Math.max(0, 1 - speedFraction * speedFraction);
      maxEngineForce = 45000 * throttleInput * accelerationCurve;
    } else if (brakeInput > 0) {
      // Frenada
      maxEngineForce = -55000 * brakeInput;
    }

    this.physics.engineForce = maxEngineForce;
  }

  updateSteering(dt) {
    const { steerInput, speed, maxSpeed, targetSteerAngle } = this.physics;
    const maxSteerAngle = MOVEMENT.maxSteerAngle;

    // Dependencia de velocidad: a mayor velocidad, menos giro disponible
    const speedFraction = Math.abs(speed) / maxSpeed;
    const steerReduction = 0.3 + speedFraction * 0.7; // 0.3 a 1.0
    const availableSteerAngle = maxSteerAngle / steerReduction;

    // Ángulo deseado de dirección
    this.physics.targetSteerAngle = steerInput * availableSteerAngle;

    // Suavizar el cambio de ángulo (no cambiar instantáneamente)
    const steerSpeed = MOVEMENT.steerSensitivity;
    const steerDiff = this.physics.targetSteerAngle - this.physics.steerAngle;
    this.physics.steerAngle += steerDiff * steerSpeed * dt;
  }

  updateTireGrip(dt) {
    const { speed, slipAngle, isSlipping } = this.physics;
    const maxSpeed = this.physics.maxSpeed;

    // Calcular ángulo de deslizamiento
    const speedFraction = Math.abs(speed) / maxSpeed;
    const lateralAccel = Math.abs(this.physics.lateralForce) / this.physics.mass;

    // A mayor velocidad y mayor aceleración lateral, menos agarre
    const maxLateralG = 1.5; // Máxima aceleración lateral en G
    const lateralGFraction = Math.min(lateralAccel / (maxLateralG * 9.81), 1.0);

    // Curva de agarre no lineal
    let gripFactor = 1.0;
    if (lateralGFraction > 0.85) {
      // Pérdida progresiva de agarre
      gripFactor = 1.0 - (lateralGFraction - 0.85) * 3.0;
      this.physics.isSlipping = true;
    } else {
      this.physics.isSlipping = false;
      gripFactor = 1.0;
    }

    this.physics.tireGrip = Math.max(0.3, gripFactor); // Mínimo 30% de agarre

    // Almacenar ángulo de deslizamiento para visualización futura
    this.physics.slipAngle = lateralGFraction * 0.5;
  }

  updateForces(dt) {
    const { speed, steerAngle, tireGrip, mass, dragCoefficient, rollingResistance } = this.physics;

    // ===== FUERZA DE TRACCIÓN =====
    this.physics.traction = this.physics.engineForce;

    // ===== RESISTENCIA AL AVANCE =====
    // Drag aerodinámico (proporcional a v²)
    const dragForce = -dragCoefficient * speed * Math.abs(speed);

    // Resistencia a la rodadura
    const rollingForce = -rollingResistance * mass * 9.81 * Math.sign(speed);

    // ===== FUERZA LATERAL EN CURVAS =====
    // Depende del ángulo de dirección, velocidad y agarre
    const lateralAcceleration = speed * steerAngle * (1 + Math.abs(speed) / 30) * tireGrip;
    this.physics.lateralForce = mass * lateralAcceleration;

    // ===== FUERZA TOTAL EN EJE LONGITUDINAL =====
    const totalLongitudinalForce = this.physics.traction + dragForce + rollingForce;
    const acceleration = totalLongitudinalForce / mass;

    // Aplicar aceleración a la velocidad
    const newSpeed = speed + acceleration * dt;

    // Limitar velocidad máxima
    if (newSpeed > 0) {
      this.physics.speed = Math.min(newSpeed, this.physics.maxSpeed);
    } else if (newSpeed < 0) {
      this.physics.speed = Math.max(newSpeed, this.physics.reverseSpeed);
    } else {
      this.physics.speed = 0;
    }

    // Inercia: reducir velocidad lentamente si no hay input
    if (this.physics.throttleInput === 0 && this.physics.brakeInput === 0) {
      this.physics.speed *= MOVEMENT.inertiaDamping;
      if (Math.abs(this.physics.speed) < 0.1) this.physics.speed = 0;
    }
  }

  updateVelocity(dt) {
    const { speed, yaw, steerAngle, tireGrip, lateralForce, mass } = this.physics;

    // Cambio de yaw basado en dirección y velocidad
    // Radio de giro: r = v / (v * tan(steerAngle))
    if (Math.abs(speed) > 0.5) {
      const turnRate = (speed * Math.tan(steerAngle)) / 3.0; // 3.0 es wheelbase simplificado
      this.physics.angularVelocity = turnRate;
      this.physics.yaw += turnRate * dt;
    } else {
      this.physics.angularVelocity *= 0.9;
    }

    // Vector de velocidad en dirección del yaw
    this.physics.velocity.x = Math.sin(this.physics.yaw) * speed;
    this.physics.velocity.z = Math.cos(this.physics.yaw) * speed;
  }

  updatePosition(dt) {
    const { velocity } = this.physics;

    // Actualizar posición del coche
    this.root.position.x += velocity.x * dt;
    this.root.position.z += velocity.z * dt;

    // Actualizar rotación visual
    this.root.rotation.y = this.physics.yaw;
  }

  updateWheels(dt) {
    const { speed, steerAngle } = this.physics;
    const wheelRadius = 0.48;

    // Rotar ruedas según velocidad
    const rotationDelta = (speed / wheelRadius) * dt;

    this.wheels.forEach((wheelAssembly, index) => {
      // Todas las ruedas rotan
      wheelAssembly.tire.rotation.x += rotationDelta;
      wheelAssembly.rim.rotation.x += rotationDelta;
      wheelAssembly.suspension.rotation.x += rotationDelta;

      // Ruedas delanteras giran lateralmente
      if (index < 2) {
        wheelAssembly.group.rotation.y = steerAngle;
      } else {
        wheelAssembly.group.rotation.y = 0;
      }
    });
  }

  // ========== MÉTODOS DE UTILIDAD ==========

  getPosition() {
    return this.root.position.clone();
  }

  setPosition(x, y, z) {
    this.root.position.set(x, y, z);
  }

  getVelocity() {
    return this.physics.speed;
  }

  getYaw() {
    return this.physics.yaw;
  }

  reset(startPos, startYaw = Math.PI) {
    this.physics.velocity.set(0, 0, 0);
    this.physics.speed = 0;
    this.physics.yaw = startYaw;
    this.physics.steerAngle = 0;
    this.physics.targetSteerAngle = 0;
    this.physics.throttleInput = 0;
    this.physics.brakeInput = 0;
    this.physics.steerInput = 0;
    this.physics.tireGrip = 1.0;
    this.physics.isSlipping = false;

    this.root.position.copy(startPos);
    this.root.rotation.y = startYaw;
  }

  getPhysicsState() {
    return {
      speed: this.physics.speed,
      isSlipping: this.physics.isSlipping,
      tireGrip: this.physics.tireGrip,
      steerAngle: this.physics.steerAngle,
      engineForce: this.physics.engineForce,
    };
  }
}
