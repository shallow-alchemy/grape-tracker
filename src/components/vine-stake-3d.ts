import QRCode from 'qrcode';
// @ts-ignore - No type definitions available for JSCAD libraries
import { primitives, booleans } from '@jscad/modeling';
// @ts-ignore - No type definitions available for JSCAD libraries
import { serialize as serializeSTL } from '@jscad/stl-serializer';

const { cuboid } = primitives;
const { union } = booleans;

const QR_SIZE = 2.0;
const QR_HEIGHT = 0.079;

const createQRCodeJSCAD = async (vineUrl: string) => {
  const qrMatrix = await QRCode.create(vineUrl, {
    errorCorrectionLevel: 'M',
  });

  const modules = qrMatrix.modules;
  const size = modules.size;
  const moduleSize = QR_SIZE / size;

  console.log(`QR Code: ${size}x${size} modules, moduleSize: ${moduleSize.toFixed(3)}mm`);

  const blackCubes: any[] = [];
  let cubeCount = 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (modules.get(x, y)) {
        const centerX = (x - size / 2 + 0.5) * moduleSize;
        const centerY = (y - size / 2 + 0.5) * moduleSize;
        const centerZ = QR_HEIGHT / 2;

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
  console.log('Unioning QR cubes...');
  const blackPattern = union(...blackCubes);
  console.log('QR union complete');

  return blackPattern;
};

export const generate3MF = async (
  vineUrl: string
): Promise<Blob> => {
  console.log('Generating QR code STL using JSCAD...');

  const blackPattern = await createQRCodeJSCAD(vineUrl);

  console.log('Exporting QR pattern as STL...');
  const blackSTL = serializeSTL({ binary: true }, blackPattern);

  console.log('STL export complete');

  return new Blob(blackSTL, { type: 'application/octet-stream' });
};
