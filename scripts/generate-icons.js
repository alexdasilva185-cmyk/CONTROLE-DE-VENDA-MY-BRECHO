import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createPNG(width, height, getPixel) {
  // RGBA buffer with filter byte per scanline
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(scanlineLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);

    const crc = crc32(typeAndData);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc >>> 0, 0);

    return Buffer.concat([len, typeAndData, crcBuf]);
  }

  // PNG Signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // Color type 6: RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT chunk
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Simple CRC32 implementation
function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }

  let c = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ (-1)) >>> 0;
}

function renderAppIcon(x, y, w, h) {
  // Normalized coords
  const nx = x / w;
  const ny = y / h;
  const cx = 0.5;
  const cy = 0.5;
  const dx = nx - cx;
  const dy = ny - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Base background emerald gradient
  const rBg = Math.floor(5 + ny * 2);
  const gBg = Math.floor(150 - ny * 35);
  const bBg = Math.floor(105 - ny * 20);

  // Check center circle or shopping/chart icon area
  if (dist < 0.28) {
    // Dark card inner
    if (Math.abs(dx) < 0.22 && Math.abs(dy - 0.05) < 0.18) {
      // Accent dollar / chart lines
      if (dist < 0.1) {
        // Bright emerald green badge
        return [52, 211, 153, 255];
      }
      return [15, 23, 42, 255]; // Slate 900
    }
  }

  // Rounded outer squircle
  const cornerRadius = 0.22;
  const qx = Math.max(0, Math.abs(dx) - (0.5 - cornerRadius));
  const qy = Math.max(0, Math.abs(dy) - (0.5 - cornerRadius));
  const cornerDist = Math.sqrt(qx * qx + qy * qy);

  if (cornerDist > cornerRadius) {
    return [0, 0, 0, 0]; // Transparent outside squircle
  }

  return [rBg, gBg, bBg, 255];
}

function renderMaskableIcon(x, y, w, h) {
  const ny = y / h;
  const cx = 0.5;
  const cy = 0.5;
  const dx = (x / w) - cx;
  const dy = ny - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Full-bleed background emerald gradient (no transparency for maskable)
  const rBg = Math.floor(5 + ny * 2);
  const gBg = Math.floor(150 - ny * 35);
  const bBg = Math.floor(105 - ny * 20);

  // Center logo within safe-zone
  if (Math.abs(dx) < 0.2 && Math.abs(dy - 0.04) < 0.16) {
    if (dist < 0.08) {
      return [52, 211, 153, 255];
    }
    return [15, 23, 42, 255];
  }

  return [rBg, gBg, bBg, 255];
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PWA icons...');

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192, renderAppIcon));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512, renderAppIcon));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180, renderAppIcon));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, renderMaskableIcon));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPNG(32, 32, renderAppIcon));

console.log('Icons generated successfully!');
