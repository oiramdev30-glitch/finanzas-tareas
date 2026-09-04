const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function writePng(filepath, width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    for (let x = 0; x < stride; x++) {
      raw[y * (stride + 1) + 1 + x] = rgba[y * stride + x];
    }
  }
  const compressed = zlib.deflateSync(raw);
  const png = Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(filepath, png);
}

function makeIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const bg = [0x0a, 0x0a, 0x0c];
  const accent = [0x8b, 0x7c, 0xf7];
  const radius = size * 0.22;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // rounded rect background
      const minX = radius, maxX = size - radius;
      const minY = radius, maxY = size - radius;
      const nx = x < minX ? minX - x : x > maxX ? x - maxX : 0;
      const ny = y < minY ? minY - y : y > maxY ? y - maxY : 0;
      const dist = Math.sqrt(nx * nx + ny * ny);
      let onBg = true;
      if (x < minX || x > maxX || y < minY || y > maxY) {
        onBg = dist <= radius;
      } else {
        onBg = true;
      }
      let r = bg[0], g = bg[1], b = bg[2], a = 255;
      if (onBg) {
        // brand circle
        const d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        const circleR = size * 0.3;
        if (d <= circleR) {
          r = accent[0]; g = accent[1]; b = accent[2];
        } else {
          const t = (y / size);
          r = Math.round(10 + 8 * t);
          g = Math.round(10 + 10 * t);
          b = Math.round(12 + 10 * t);
        }
      }
      const i = (y * size + x) * 4;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = a;
    }
  }
  return rgba;
}

const outDir = path.join(__dirname, 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });
const [,, sizeArg, nameArg] = process.argv;
const size = Number(sizeArg) || 512;
const name = nameArg || `icon-${size}.png`;
writePng(path.join(outDir, name), size, size, makeIcon(size));
console.log('wrote', name, size);
