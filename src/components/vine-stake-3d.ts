import * as THREE from 'three';
import QRCode from 'qrcode';
import JSZip from 'jszip';
// @ts-ignore - No type definitions available for JSCAD libraries
import { primitives, booleans } from '@jscad/modeling';
// @ts-ignore - No type definitions available for JSCAD libraries
import { serialize as serializeSTL } from '@jscad/stl-serializer';

const { cuboid } = primitives;
const { union } = booleans;

const STAKE_HEIGHT = 150;
const STAKE_WIDTH = 25;
const STAKE_THICKNESS = 3;
const QR_SIZE = 25;
const QR_HEIGHT = 2.0;

// JSCAD geometry creation
const createQRCodeJSCAD = async (vineUrl: string) => {
  const qrMatrix = await QRCode.create(vineUrl, {
    errorCorrectionLevel: 'M',
  });

  const modules = qrMatrix.modules;
  const size = modules.size;
  const moduleSize = QR_SIZE / size;

  console.log(`QR Code: ${size}x${size} modules, moduleSize: ${moduleSize.toFixed(3)}mm`);

  // Create black QR cubes (we'll merge them with white base later)
  const blackCubes: any[] = [];
  let cubeCount = 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (modules.get(x, y)) {
        const centerX = (x - size / 2 + 0.5) * moduleSize;
        const centerY = (y - size / 2 + 0.5) * moduleSize;
        const centerZ = STAKE_THICKNESS + QR_HEIGHT / 2;

        const cube = cuboid({
          size: [moduleSize, moduleSize, QR_HEIGHT],
          center: [centerX, centerY, centerZ]
        });

        blackCubes.push(cube);
        cubeCount++;
      }
    }
  }

  console.log(`Created ${cubeCount} black cubes for QR pattern`);

  // Create white base
  const whiteBase = cuboid({
    size: [QR_SIZE, QR_SIZE, STAKE_THICKNESS],
    center: [0, 0, STAKE_THICKNESS / 2]
  });

  // Union all QR cubes together
  console.log('Unioning QR cubes...');
  const blackPattern = union(...blackCubes);
  console.log('QR union complete');

  return { whiteBase, blackPattern };
};

export const createBaseStake = (): THREE.Mesh => {
  const stakeGeometry = new THREE.BoxGeometry(
    STAKE_WIDTH,
    STAKE_HEIGHT,
    STAKE_THICKNESS
  );

  stakeGeometry.computeBoundingBox();
  stakeGeometry.computeVertexNormals();

  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const stake = new THREE.Mesh(stakeGeometry, material);

  stake.geometry.computeBoundingBox();

  return stake;
};

export const createQRMesh = async (vineUrl: string): Promise<THREE.Group> => {
  const qrMatrix = await QRCode.create(vineUrl, {
    errorCorrectionLevel: 'M',
  });

  const modules = qrMatrix.modules;
  const size = modules.size;
  const moduleSize = QR_SIZE / size;

  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: 0x000000 });

  // Add black cubes for the QR pattern only (no backing needed - base stake is the backing)
  const cubeSize = moduleSize * 0.98; // Slightly smaller to prevent merging issues

  let cubeCount = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (modules.get(x, y)) {
        const geometry = new THREE.BoxGeometry(
          cubeSize,
          cubeSize,
          QR_HEIGHT
        );

        geometry.computeBoundingBox();
        geometry.computeVertexNormals();

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
          (x - size / 2 + 0.5) * moduleSize,
          (y - size / 2 + 0.5) * moduleSize,
          QR_HEIGHT / 2
        );

        group.add(mesh);
        cubeCount++;
      }
    }
  }

  console.log(`QR Code: ${size}x${size} modules, created ${cubeCount} cubes, moduleSize: ${moduleSize.toFixed(3)}mm`);

  return group;
};

// Old THREE.js-based helper functions removed - now using JSCAD serializer

export const generate3MF = async (
  vineId: string,
  blockId: string,
  vineUrl: string
): Promise<Blob> => {
  console.log('Generating STL files using JSCAD...');

  // Create QR code geometry using JSCAD
  const { whiteBase, blackPattern } = await createQRCodeJSCAD(vineUrl);

  // Serialize both to STL format (binary)
  console.log('Exporting white base as STL...');
  const whiteSTL = serializeSTL({ binary: true }, whiteBase);

  console.log('Exporting black QR pattern as STL...');
  const blackSTL = serializeSTL({ binary: true }, blackPattern);

  console.log('STL export complete');

  // Create a ZIP file with both STLs
  const zip = new JSZip();
  zip.file(`vine-${blockId}-${vineId}-base-white.stl`, new Blob(whiteSTL));
  zip.file(`vine-${blockId}-${vineId}-qr-black.stl`, new Blob(blackSTL));
  zip.file('README.txt',
    `To create the final 3MF file, use stlto3mf:\n\n` +
    `stlto3mf vine-${blockId}-${vineId}-base-white.stl vine-${blockId}-${vineId}-qr-black.stl -o vine-${blockId}-${vineId}.3mf\n\n` +
    `Install from: https://github.com/mpapierski/stlto3mf`
  );

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return zipBlob;
};
