import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height, r, g, b, a = 255) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8 bits per channel
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdr = makeChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  // Draw an emerald badge with a shopping cart / dinner plate theme
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = width * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Dark blue gradient background (#1e40af to #1e3a8a)
        const grad = 1 - (y / height) * 0.35;
        rawData[pxOffset] = Math.round(30 * grad);     // R (#1e3a8a)
        rawData[pxOffset + 1] = Math.round(58 * grad); // G
        rawData[pxOffset + 2] = Math.round(138 * grad); // B
        rawData[pxOffset + 3] = 255;                    // A

        // Inner white fork/knife or shopping basket shape
        const inInnerSquare = Math.abs(dx) < width * 0.22 && Math.abs(dy) < height * 0.22;
        if (inInnerSquare) {
          rawData[pxOffset] = 255;
          rawData[pxOffset + 1] = 255;
          rawData[pxOffset + 2] = 255;
          rawData[pxOffset + 3] = 255;
        }
      } else {
        // Transparent
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);

  const crc = crc32(body);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([len, body, crcBuf]);
}

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  table[i] = c;
}

// Ensure public/icons directory exists
const publicDir = path.resolve('public');
const iconsDir = path.resolve('public/icons');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// Write icons (dark blue)
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPng(192, 192, 30, 58, 138));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPng(512, 512, 30, 58, 138));
fs.writeFileSync(path.join(iconsDir, 'icon-512-maskable.png'), createPng(512, 512, 23, 37, 84));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, 30, 58, 138));

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="128" fill="#1e3a8a"/>
  <circle cx="256" cy="256" r="180" fill="#2563eb"/>
  <path d="M170 170 H342 V310 C342 340 300 370 256 370 C212 370 170 340 170 310 Z" fill="#ffffff" opacity="0.95"/>
  <circle cx="256" cy="210" r="28" fill="#1e3a8a"/>
  <path d="M220 280 Q256 320 292 280" stroke="#1e3a8a" stroke-width="12" stroke-linecap="round" fill="none"/>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgIcon);
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgIcon);

console.log('Icons successfully generated!');
