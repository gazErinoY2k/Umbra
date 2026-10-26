import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const c = crc32(typeAndData);
  chunk.writeUInt32BE(c, 8 + len);
  return chunk;
}

function createPng(width, height, isMaskable = false) {
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const outerR = width * (isMaskable ? 0.38 : 0.44);
  const innerR = width * (isMaskable ? 0.32 : 0.38);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Void dark background (#0b0d11)
      let r = 11, g = 13, b = 17, a = 255;

      // Outer circle border (#c0a062 = [192, 160, 98])
      if (Math.abs(dist - outerR) < (width * 0.015)) {
        r = 192; g = 160; b = 98;
      } else if (dist < innerR && dist > innerR * 0.95) {
        r = 38; g = 44; b = 56;
      }

      // Occult Sigil center drawing approximation
      // Ghost body: top rounded, bottom frills
      const ny = (y - cy) / (height * (isMaskable ? 0.45 : 0.55));
      const nx = (x - cx) / (width * (isMaskable ? 0.45 : 0.55));

      // Head arc
      const headDist = Math.sqrt(nx * nx + (ny + 0.25) * (ny + 0.25));
      if (headDist < 0.28 && ny <= -0.1) {
        // Outline
        if (Math.abs(headDist - 0.28) < 0.03) {
          r = 192; g = 160; b = 98;
        }
      }
      // Body sides
      if (ny > -0.1 && ny < 0.45 && Math.abs(nx) < 0.28) {
        if (Math.abs(Math.abs(nx) - 0.28) < 0.03) {
          r = 192; g = 160; b = 98;
        }
      }
      // Eyes
      const leftEyeDist = Math.sqrt((nx + 0.12) * (nx + 0.12) + (ny + 0.08) * (ny + 0.08));
      const rightEyeDist = Math.sqrt((nx - 0.12) * (nx - 0.12) + (ny + 0.08) * (ny + 0.08));
      if (leftEyeDist < 0.045 || rightEyeDist < 0.045) {
        r = 192; g = 160; b = 98;
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // Deflate
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPng(64, 64, false));

console.log('Successfully generated all PWA icons!');
