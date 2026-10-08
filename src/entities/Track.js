import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';
import { TRACK } from '../config.js';

export class Track {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'Track';

    this.checkpoints = [];
    this.trackPath = [];
    this.roadMaterial = null;
    this.grassMaterial = null;
    this.wallMaterial = null;

    this.build();
  }

  build() {
    this.createMaterials();
    this.createGround();
    this.createBarcelonaCircuit();
    this.createCheckpoints();
    this.createEnvironment();
  }

  createMaterials() {
    this.roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3d47,
      roughness: 0.75,
      metalness: 0.2,
    });

    this.grassMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d5a2d,
      roughness: 0.95,
      metalness: 0,
    });

    this.wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 0.8,
      metalness: 0.1,
    });
  }

  createGround() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 500),
      this.grassMaterial
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.position.y = -0.01;
    this.root.add(ground);
  }

  createBarcelonaCircuit() {
    // Referencia: Circuit de Barcelona-Catalunya
    // Longitud: ~4.6 km
    // Escalado para el juego: ~90 unidades

    const roadWidth = 12;
    const innerRoadWidth = 11;

    // Puntos principales del circuito (aproximados a Barcelona)
    const circuitPoints = [
      // Recta de salida/meta (Recta de meta)
      { pos: [0, 0], type: 'start', length: 18 },

      // Curva 1 (Viraje 1)
      { pos: [18, 0], type: 'fast', radius: 8, angle: Math.PI / 3 },
      { pos: [26, 12], type: 'fast' },

      // Recta de Campsa
      { pos: [26, 30], type: 'straight', length: 12 },

      // Curva 2-3 (Rascanya)
      { pos: [26, 42], type: 'slow', radius: 6, angle: Math.PI / 4 },
      { pos: [20, 48], type: 'slow' },

      // Chicane Rascanya
      { pos: [14, 50], type: 'chicane' },
      { pos: [8, 52], type: 'chicane' },

      // Curva 4 (Horquilla)
      { pos: [2, 50], type: 'slow', radius: 5, angle: Math.PI / 2.5 },
      { pos: [-5, 42], type: 'slow' },

      // Recta hacia Turns 5-6
      { pos: [-10, 30], type: 'straight', length: 15 },

      // Curva 5-6 (Renault)
      { pos: [-10, 15], type: 'fast', radius: 7, angle: Math.PI / 3.5 },
      { pos: [-2, 8], type: 'fast' },

      // Curva 7 (Caixa)
      { pos: [8, 6], type: 'medium', radius: 6, angle: Math.PI / 4 },
      { pos: [15, 10], type: 'medium' },

      // Recta de Campsa de vuelta
      { pos: [20, 20], type: 'straight', length: 10 },

      // Curva 8-9-10 (Campsa)
      { pos: [20, 30], type: 'medium', radius: 8, angle: Math.PI / 3 },
      { pos: [26, 38], type: 'medium' },

      // Horquilla 9-10
      { pos: [32, 44], type: 'slow', radius: 5, angle: Math.PI / 2.2 },
      { pos: [30, 55], type: 'slow' },

      // Curva 11 (Gran Premi)
      { pos: [20, 60], type: 'fast', radius: 8, angle: Math.PI / 3.5 },
      { pos: [8, 62], type: 'fast' },

      // Curva 12 (Suntuario)
      { pos: [-5, 58], type: 'medium', radius: 6, angle: Math.PI / 4 },
      { pos: [-12, 50], type: 'medium' },

      // Recta final de vuelta
      { pos: [-15, 35], type: 'straight', length: 20 },

      // Curva 13-14 (Chicane final)
      { pos: [-15, 15], type: 'chicane' },
      { pos: [-12, 5], type: 'chicane' },

      // Curva 15 (Nueva 3)
      { pos: [-2, 2], type: 'medium', radius: 6, angle: Math.PI / 5 },
    ];

    // Construir la pista dibujando segmentos
    this.buildTrackSegments(circuitPoints, roadWidth);

    // Guardar puntos para checkpoints
    this.trackPath = circuitPoints;
  }

  buildTrackSegments(points, roadWidth) {
    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];

      const x1 = current.pos[0];
      const z1 = current.pos[1];
      const x2 = next.pos[0];
      const z2 = next.pos[1];

      // Calcular dirección
      const dx = x2 - x1;
      const dz = z2 - z1;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance < 0.1) continue;

      // Crear segmento de pista
      const roadSegment = new THREE.Mesh(
        new THREE.PlaneGeometry(roadWidth, distance),
        this.roadMaterial
      );

      // Posicionar y rotar
      const midX = (x1 + x2) / 2;
      const midZ = (z1 + z2) / 2;
      roadSegment.position.set(midX, 0.01, midZ);

      const angle = Math.atan2(dx, dz);
      roadSegment.rotation.x = -Math.PI / 2;
      roadSegment.rotation.z = angle;

      roadSegment.receiveShadow = true;
      this.root.add(roadSegment);

      // Zonas de escapatoria (grass)
      const escapeWidth = 8;
      const escape = new THREE.Mesh(
        new THREE.PlaneGeometry(roadWidth + escapeWidth * 2, distance + 2),
        this.grassMaterial
      );
      escape.position.set(midX, -0.01, midZ);
      escape.rotation.x = -Math.PI / 2;
      escape.rotation.z = angle;
      escape.receiveShadow = true;
      this.root.add(escape);

      // Añadir muros/barreras laterales
      this.addBarriers(x1, z1, x2, z2, roadWidth, angle);
    }

    // Línea de meta
    this.createStartFinishLine();
  }

  addBarriers(x1, z1, x2, z2, roadWidth, angle) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;

    const barierHeight = 0.8;
    const barrierThickness = 0.3;

    // Barrera izquierda
    const leftBarrier = new THREE.Mesh(
      new THREE.BoxGeometry(barrierThickness, barierHeight, distance),
      this.wallMaterial
    );
    leftBarrier.position.set(
      midX + Math.cos(angle + Math.PI / 2) * (roadWidth / 2 + 0.2),
      barierHeight / 2,
      midZ + Math.sin(angle + Math.PI / 2) * (roadWidth / 2 + 0.2)
    );
    leftBarrier.rotation.y = angle;
    leftBarrier.castShadow = true;
    leftBarrier.receiveShadow = true;
    this.root.add(leftBarrier);

    // Barrera derecha
    const rightBarrier = new THREE.Mesh(
      new THREE.BoxGeometry(barrierThickness, barierHeight, distance),
      this.wallMaterial
    );
    rightBarrier.position.set(
      midX + Math.cos(angle - Math.PI / 2) * (roadWidth / 2 + 0.2),
      barierHeight / 2,
      midZ + Math.sin(angle - Math.PI / 2) * (roadWidth / 2 + 0.2)
    );
    rightBarrier.rotation.y = angle;
    rightBarrier.castShadow = true;
    rightBarrier.receiveShadow = true;
    this.root.add(rightBarrier);
  }

  createStartFinishLine() {
    // Línea de salida/meta visual
    const startLineGeom = new THREE.PlaneGeometry(12, 0.5);
    const startLineMat = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0x666600,
    });
    const startLine = new THREE.Mesh(startLineGeom, startLineMat);
    startLine.position.set(0, 0.02, 0);
    startLine.rotation.x = -Math.PI / 2;
    this.root.add(startLine);

    // Patrón a cuadros
    const squareSize = 1;
    for (let x = -6; x < 6; x += squareSize * 2) {
      for (let z = -0.25; z < 0.25; z += squareSize) {
        if ((x + z) % 2 === 0) {
          const square = new THREE.Mesh(
            new THREE.PlaneGeometry(squareSize, squareSize),
            new THREE.MeshStandardMaterial({ color: 0x000000 })
          );
          square.position.set(x, 0.025, z);
          square.rotation.x = -Math.PI / 2;
          this.root.add(square);
        }
      }
    }
  }

  createCheckpoints() {
    // Crear checkpoints distribuidos por el circuito
    const checkpointPositions = [
      { pos: [0, 0], id: 0, name: 'Start/Finish' },
      { pos: [22, 6], id: 1, name: 'Turn 1' },
      { pos: [26, 36], id: 2, name: 'Recta Campsa' },
      { pos: [20, 50], id: 3, name: 'Rascanya' },
      { pos: [0, 52], id: 4, name: 'Chicane' },
      { pos: [-8, 46], id: 5, name: 'Horquilla' },
      { pos: [-10, 22], id: 6, name: 'Recta Central' },
      { pos: [6, 8], id: 7, name: 'Turn 7' },
      { pos: [25, 35], id: 8, name: 'Campsa' },
      { pos: [30, 50], id: 9, name: 'Horquilla 2' },
      { pos: [10, 60], id: 10, name: 'Gran Premi' },
      { pos: [-10, 55], id: 11, name: 'Sanctuary' },
      { pos: [-15, 25], id: 12, name: 'Recta Final' },
      { pos: [-10, 3], id: 13, name: 'Chicane Final' },
    ];

    checkpointPositions.forEach((cp) => {
      const checkpoint = {
        id: cp.id,
        name: cp.name,
        position: new THREE.Vector3(cp.pos[0], 0.5, cp.pos[1]),
        radius: 6,
        passed: false,
      };

      this.checkpoints.push(checkpoint);

      // Crear visualización invisible pero presente
      const cpGeom = new THREE.SphereGeometry(checkpoint.radius, 8, 8);
      const cpMat = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.0,
        wireframe: false,
      });
      const cpMesh = new THREE.Mesh(cpGeom, cpMat);
      cpMesh.position.copy(checkpoint.position);
      cpMesh.userData.checkpointId = cp.id;
      this.root.add(cpMesh);
    });
  }

  createEnvironment() {
    // Tribuna simplificada
    const standMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a4a6a,
      roughness: 0.7,
      metalness: 0,
    });

    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(25, 5, 8),
      standMaterial
    );
    stand.position.set(-35, 2.5, 5);
    stand.castShadow = true;
    stand.receiveShadow = true;
    this.root.add(stand);

    // Zona VIP
    const vipZone = new THREE.Mesh(
      new THREE.BoxGeometry(20, 4, 6),
      new THREE.MeshStandardMaterial({
        color: 0x6a7a8a,
        roughness: 0.6,
        metalness: 0.2,
      })
    );
    vipZone.position.set(38, 2, 8);
    vipZone.castShadow = true;
    this.root.add(vipZone);

    // Árboles de decoración
    this.createTrees();

    // Postes de iluminación
    this.createLightPoles();
  }

  createTrees() {
    const treeMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d5a2d,
      roughness: 0.95,
    });

    const treePositions = [
      [-50, -30],
      [-50, 0],
      [-50, 30],
      [50, -30],
      [50, 0],
      [50, 30],
      [0, -80],
      [-20, -80],
      [20, -80],
    ];

    treePositions.forEach((pos) => {
      const tree = new THREE.Group();

      // Tronco
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 1.0, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0x5c3d2e,
          roughness: 0.9,
        })
      );
      trunk.position.y = 4;
      trunk.castShadow = true;
      tree.add(trunk);

      // Follaje
      const foliage = new THREE.Mesh(
        new THREE.SphereGeometry(6, 8, 8),
        treeMaterial
      );
      foliage.position.y = 10;
      foliage.castShadow = true;
      tree.add(foliage);

      tree.position.set(pos[0], 0, pos[1]);
      this.root.add(tree);
    });
  }

  createLightPoles() {
    const polePositions = [
      [-30, -60],
      [0, -70],
      [30, -60],
      [40, 0],
      [35, 40],
      [-35, 60],
      [-40, 20],
    ];

    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.7,
      roughness: 0.3,
    });

    polePositions.forEach((pos) => {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 12, 8),
        poleMaterial
      );
      pole.position.set(pos[0], 6, pos[1]);
      pole.castShadow = true;
      this.root.add(pole);

      // Luz
      const light = new THREE.PointLight(0xffd700, 1.2, 50);
      light.position.set(pos[0], 12, pos[1]);
      this.root.add(light);
    });
  }

  // Métodos de utilidad
  getCheckpoints() {
    return this.checkpoints;
  }

  resetCheckpoints() {
    this.checkpoints.forEach((cp) => {
      cp.passed = false;
    });
  }

  checkPointCrossing(carPosition, checkpointId) {
    const cp = this.checkpoints.find((c) => c.id === checkpointId);
    if (!cp) return false;

    const distance = carPosition.distanceTo(cp.position);
    return distance < cp.radius;
  }

  getTrackBounds() {
    return TRACK.bounds;
  }

  isOutOfBounds(position) {
    const bounds = this.getTrackBounds();
    return (
      position.x < bounds.minX ||
      position.x > bounds.maxX ||
      position.z < bounds.minZ ||
      position.z > bounds.maxZ
    );
  }

  getStartPosition() {
    return new THREE.Vector3(0, 0.5, -8);
  }

  getStartRotation() {
    return Math.PI;
  }
}
