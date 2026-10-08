import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';
import { VEHICLE } from '../config.js';

export class F1Car {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'F1Car';
    
    // Sistema de referencia físicas
    this.root.userData.physics = {
      velocity: new THREE.Vector3(),
      angularVelocity: 0,
      ready: false,
      placeholder: true,
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
    // Chasis principal (estructura tubular simplificada)
    const chassisMaterial = new THREE.MeshStandardMaterial({
      color: VEHICLE.bodyColor,
      metalness: 0.55,
      roughness: 0.25,
    });

    // Morro delantero (forma aerodinámica)
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

    // Chasis principal (cuerpo largo)
    const mainChassis = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.5, 3.2),
      chassisMaterial
    );
    mainChassis.position.y = 0.65;
    mainChassis.castShadow = true;
    mainChassis.receiveShadow = true;
    this.root.add(mainChassis);

    // Piso del monoplaza (plano inferior)
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

    // Capó del motor (frente)
    const bonnet = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.35, 0.9),
      chassisMaterial
    );
    bonnet.position.set(0, 0.95, 1.3);
    bonnet.castShadow = true;
    this.root.add(bonnet);

    // Difusor trasero (aerodinámica)
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

    // Alerón frontal
    const frontWingMain = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.08, 0.35),
      wingMaterial
    );
    frontWingMain.position.set(0, 0.45, 2.45);
    frontWingMain.castShadow = true;
    this.root.add(frontWingMain);

    // Flap frontal inferior
    const frontWingFlap = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.06, 0.25),
      wingMaterial
    );
    frontWingFlap.position.set(0, 0.25, 2.55);
    frontWingFlap.castShadow = true;
    this.root.add(frontWingFlap);

    // Soportes del alerón frontal
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

    // Alerón trasero
    const rearWingMain = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.12, 0.3),
      wingMaterial
    );
    rearWingMain.position.set(0, 0.62, -2.25);
    rearWingMain.castShadow = true;
    this.root.add(rearWingMain);

    // Ala trasera adicional
    const rearWingFlap = new THREE.Mesh(
      new THREE.BoxGeometry(1.85, 0.08, 0.2),
      wingMaterial
    );
    rearWingFlap.position.set(0, 0.42, -2.35);
    rearWingFlap.castShadow = true;
    this.root.add(rearWingFlap);

    // Soporte alerón trasero (Pylon)
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

    // Cristal del cockpit (parabrisas)
    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.5, 1.0),
      cockpitMaterial
    );
    windshield.position.set(0, 1.45, 0.15);
    windshield.castShadow = true;
    this.root.add(windshield);

    // Cockpit interior (asiento)
    const seatGeom = new THREE.BoxGeometry(0.6, 0.4, 0.8);
    const seat = new THREE.Mesh(seatGeom, cockpitRoll);
    seat.position.set(0, 1.2, 0);
    seat.castShadow = true;
    this.root.add(seat);

    // Cabina de estructura (carcasa)
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

    // Estructura de protección (Halo) - tubo circular simplificado
    const haloGeom = new THREE.TorusGeometry(0.65, 0.08, 12, 24);
    const halo = new THREE.Mesh(haloGeom, haloMaterial);
    halo.position.set(0, 1.75, 0.2);
    halo.rotation.x = Math.PI / 2.5;
    halo.castShadow = true;
    this.root.add(halo);

    // Soportes del Halo
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

    // Pontón izquierdo
    const pontoonLeftGeom = new THREE.BoxGeometry(0.35, 0.5, 2.0);
    const pontoonLeft = new THREE.Mesh(pontoonLeftGeom, pontoonMaterial);
    pontoonLeft.position.set(-1.15, 0.7, 0.2);
    pontoonLeft.castShadow = true;
    this.root.add(pontoonLeft);

    // Pontón derecho
    const pontoonRight = pontoonLeft.clone();
    pontoonRight.position.x = 1.15;
    this.root.add(pontoonRight);

    // Tomas de aire laterales (bargeboards)
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

    // Cubierta del motor trasero
    const engineCover = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.7, 1.2),
      engineCoverMaterial
    );
    engineCover.position.set(0, 1.0, -1.5);
    engineCover.castShadow = true;
    this.root.add(engineCover);

    // Respiraderos del motor (tomas de aire traseras)
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

    // Suspensión simplificada (cilindro visible)
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

    // Llanta (rim)
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

    // Neumático (tire)
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

    // Disco de freno visible
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
    // Faros delanteros
    const headlightLeft = new THREE.PointLight(0xfff9e6, 1.5, 30);
    headlightLeft.position.set(-0.7, 0.55, 2.55);
    headlightLeft.castShadow = true;
    this.root.add(headlightLeft);

    const headlightRight = headlightLeft.clone();
    headlightRight.position.x = 0.7;
    this.root.add(headlightRight);

    // Luces traseras
    const tailLightLeft = new THREE.PointLight(0xff3333, 1.2, 20);
    tailLightLeft.position.set(-0.65, 0.55, -2.5);
    this.root.add(tailLightLeft);

    const tailLightRight = tailLightLeft.clone();
    tailLightRight.position.x = 0.65;
    this.root.add(tailLightRight);
  }

  // Métodos de utilidad para futuras físicas
  getWheelPositions() {
    return this.wheels.map((w) => w.group.getWorldPosition(new THREE.Vector3()));
  }

  rotate(angle) {
    this.root.rotation.y = angle;
  }

  setPosition(x, y, z) {
    this.root.position.set(x, y, z);
  }

  getPosition() {
    return this.root.position.clone();
  }

  spinWheels(velocity, dt) {
    this.wheels.forEach((wheelAssembly) => {
      wheelAssembly.tire.rotation.x += (velocity / 0.48) * dt;
      wheelAssembly.rim.rotation.x += (velocity / 0.48) * dt;
      wheelAssembly.brakeDisc.rotation.x += (velocity / 0.48) * dt;
    });
  }

  steerWheels(steerAngle) {
    // Girar ruedas delanteras
    const frontWheels = this.wheels.slice(0, 2);
    frontWheels.forEach((wheelAssembly) => {
      wheelAssembly.group.rotation.y = steerAngle;
    });
  }
}
