import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const WIDTH = 1024;
const HEIGHT = 1024;
const SCALE = 2;
const W = WIDTH * SCALE;
const H = HEIGHT * SCALE;
const pixels = Buffer.alloc(W * H * 4);
const colors = {
  ink: '#071824',
  deep: '#0b2635',
  panel: '#102d3a',
  grid: '#17404b',
  ocean: '#123c4b',
  land: '#d8c495',
  landShade: '#b8a779',
  cream: '#f5ead1',
  muted: '#a9bdba',
  red: '#f16d5d',
  amber: '#f2b45d',
  teal: '#69c5b4',
  blue: '#80b9df',
  darkText: '#08212a',
};

function rgba(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, 255];
}

function rect(x, y, width, height, color) {
  const c = rgba(color);
  const x0 = Math.max(0, Math.floor(x * SCALE));
  const y0 = Math.max(0, Math.floor(y * SCALE));
  const x1 = Math.min(W, Math.ceil((x + width) * SCALE));
  const y1 = Math.min(H, Math.ceil((y + height) * SCALE));
  for (let py = y0; py < y1; py += 1) {
    let offset = (py * W + x0) * 4;
    for (let px = x0; px < x1; px += 1, offset += 4) {
      pixels[offset] = c[0];
      pixels[offset + 1] = c[1];
      pixels[offset + 2] = c[2];
      pixels[offset + 3] = 255;
    }
  }
}

function circle(cx, cy, radius, color) {
  const c = rgba(color);
  const x0 = Math.max(0, Math.floor((cx - radius) * SCALE));
  const y0 = Math.max(0, Math.floor((cy - radius) * SCALE));
  const x1 = Math.min(W, Math.ceil((cx + radius) * SCALE));
  const y1 = Math.min(H, Math.ceil((cy + radius) * SCALE));
  const r2 = radius * radius * SCALE * SCALE;
  for (let py = y0; py < y1; py += 1) {
    for (let px = x0; px < x1; px += 1) {
      const dx = px + 0.5 - cx * SCALE;
      const dy = py + 0.5 - cy * SCALE;
      if (dx * dx + dy * dy > r2) continue;
      const offset = (py * W + px) * 4;
      pixels[offset] = c[0];
      pixels[offset + 1] = c[1];
      pixels[offset + 2] = c[2];
      pixels[offset + 3] = 255;
    }
  }
}

function line(x0, y0, x1, y1, color, thickness = 1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(length * SCALE));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    circle(x0 + dx * t, y0 + dy * t, thickness / 2, color);
  }
}

function polygon(points, color) {
  const c = rgba(color);
  const vertices = points.map(([x, y]) => [x * SCALE, y * SCALE]);
  const minY = Math.max(0, Math.floor(Math.min(...vertices.map((p) => p[1]))));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(...vertices.map((p) => p[1]))));
  for (let y = minY; y <= maxY; y += 1) {
    const intersections = [];
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i, i += 1) {
      const [xi, yi] = vertices[i];
      const [xj, yj] = vertices[j];
      if ((yi > y) === (yj > y)) continue;
      intersections.push(xi + ((y - yi) * (xj - xi)) / (yj - yi));
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i + 1 < intersections.length; i += 2) {
      const start = Math.max(0, Math.ceil(intersections[i]));
      const end = Math.min(W - 1, Math.floor(intersections[i + 1]));
      let offset = (y * W + start) * 4;
      for (let x = start; x <= end; x += 1, offset += 4) {
        pixels[offset] = c[0];
        pixels[offset + 1] = c[1];
        pixels[offset + 2] = c[2];
        pixels[offset + 3] = 255;
      }
    }
  }
}

function ellipse(cx, cy, rx, ry, color, thickness = 1) {
  let previous = null;
  for (let degree = 0; degree <= 360; degree += 2) {
    const angle = (degree * Math.PI) / 180;
    const point = [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
    if (previous) line(previous[0], previous[1], point[0], point[1], color, thickness);
    previous = point;
  }
}

const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  6: ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  ':': ['00000', '00110', '00110', '00000', '00110', '00110', '00000'],
  ',': ['00000', '00000', '00000', '00000', '00110', '00110', '00100'],
  '.': ['00000', '00000', '00000', '00000', '00000', '00110', '00110'],
};

function text(value, x, y, scale, color) {
  let cursor = x;
  for (const character of value) {
    if (character === ' ') {
      cursor += 4 * scale;
      continue;
    }
    const glyph = FONT[character];
    if (!glyph) throw new Error(`Unsupported glyph: ${character}`);
    for (let row = 0; row < glyph.length; row += 1) {
      for (let column = 0; column < glyph[row].length; column += 1) {
        if (glyph[row][column] === '1') {
          rect(cursor + column * scale, y + row * scale, scale, scale, color);
        }
      }
    }
    cursor += 6 * scale;
  }
}

function seededDots() {
  let state = 0x20_11_2026;
  for (let i = 0; i < 180; i += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const x = 28 + (state % 968);
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const y = 290 + (state % 470);
    circle(x, y, (i % 5 === 0) ? 1.4 : 0.7, i % 4 === 0 ? colors.grid : colors.deep);
  }
}

function drawGlobe() {
  const cx = 512;
  const cy = 535;
  circle(cx, cy, 236, colors.deep);
  circle(cx, cy, 226, colors.ocean);

  polygon([[351, 429], [370, 398], [403, 380], [435, 388], [459, 407], [466, 430], [448, 449], [427, 452], [414, 472], [388, 466], [373, 449], [352, 447]], colors.land);
  polygon([[427, 463], [448, 469], [459, 487], [451, 499], [436, 486]], colors.landShade);
  polygon([[447, 488], [466, 496], [474, 525], [466, 557], [452, 590], [442, 621], [431, 592], [437, 557], [425, 530], [430, 506]], colors.land);
  polygon([[492, 421], [505, 402], [524, 394], [545, 399], [560, 412], [584, 406], [604, 414], [626, 407], [652, 421], [674, 443], [662, 460], [638, 455], [618, 470], [592, 464], [580, 477], [558, 466], [541, 453], [520, 459], [506, 443], [489, 438]], colors.land);
  polygon([[523, 466], [547, 458], [571, 466], [585, 490], [582, 516], [570, 551], [554, 582], [541, 565], [531, 540], [516, 515], [518, 489]], colors.landShade);
  polygon([[581, 480], [598, 473], [613, 486], [610, 505], [600, 513], [589, 499]], colors.land);
  polygon([[625, 492], [652, 487], [669, 502], [658, 520], [637, 514]], colors.land);
  polygon([[631, 556], [655, 551], [674, 562], [668, 580], [644, 582], [630, 572]], colors.land);

  ellipse(cx, cy, 215, 72, colors.grid, 1.2);
  ellipse(cx, cy, 215, 145, colors.grid, 1.1);
  ellipse(cx, cy, 88, 215, colors.grid, 1.1);
  ellipse(cx, cy, 158, 215, colors.grid, 1.1);
  line(cx - 216, cy, cx + 216, cy, colors.grid, 1);
  ellipse(cx, cy, 226, 226, colors.teal, 1.3);
  ellipse(cx, cy, 236, 236, colors.landShade, 1.5);

  line(581, 439, 596, 450, colors.red, 4);
  line(596, 450, 613, 458, colors.red, 2.5);
  circle(581, 439, 5, colors.cream);
  circle(613, 458, 7, colors.red);
  circle(613, 458, 12, colors.red);
  rect(599, 442, 4, 17, colors.cream);
  rect(593, 448, 17, 4, colors.cream);

  circle(552, 565, 28, colors.amber);
  circle(552, 565, 20, colors.deep);
  for (let i = 0; i < 8; i += 1) {
    const a = (i * Math.PI) / 4;
    line(552 + Math.cos(a) * 34, 565 + Math.sin(a) * 34,
      552 + Math.cos(a) * 43, 565 + Math.sin(a) * 43, colors.amber, 2);
  }
  line(517, 603, 544, 593, colors.amber, 2);
  line(544, 593, 572, 600, colors.amber, 2);
  line(572, 600, 600, 588, colors.amber, 2);

  const ux = 661;
  const uy = 390;
  rect(ux - 4, uy - 7, 42, 4, colors.blue);
  rect(ux, uy - 3, 34, 4, colors.blue);
  for (let i = 0; i < 5; i += 1) rect(ux + i * 7, uy + 1, 3, 19, colors.blue);
  rect(ux - 3, uy + 20, 40, 4, colors.blue);
  circle(ux + 17, uy - 15, 5, colors.blue);
}

function drawCard(x, accent, number, first, second, detail) {
  rect(x, 786, 296, 150, colors.panel);
  rect(x, 786, 296, 4, accent);
  circle(x + 29, 818, 16, accent);
  text(number, x + 20, 812, 2, colors.darkText);
  text(first, x + 56, 802, 3, colors.cream);
  text(second, x + 56, 827, 3, colors.cream);
  rect(x + 16, 865, 264, 1, colors.grid);
  text(detail, x + 12, 883, 2, colors.muted);
}

function render() {
  rect(0, 0, WIDTH, HEIGHT, colors.ink);
  rect(0, 0, WIDTH, 7, colors.red);
  for (let y = 286; y < 775; y += 24) rect(36, y, 952, 1, colors.deep);
  seededDots();

  rect(52, 33, 134, 30, colors.red);
  text('WORLD NEWS', 60, 41, 2, colors.darkText);
  text('FRIDAY', 777, 41, 2, colors.muted);
  text('20 NOV 2026', 855, 41, 2, colors.cream);
  text('ONE PLANET', 58, 91, 8, colors.cream);
  text('UNDER PRESSURE', 58, 160, 7, colors.cream);
  text('THREE STORIES SHAPING THE DAY', 61, 229, 3, colors.teal);
  rect(52, 270, 920, 2, colors.grid);

  drawGlobe();

  drawCard(48, colors.red, '01', 'WAR SPILLS', 'INTO POLAND', 'UKRAINE / NATO AIRSPACE');
  drawCard(364, colors.amber, '02', 'COP31 CLIMATE', 'TALKS STALL', 'FOSSIL FUELS / FINANCE');
  drawCard(680, colors.blue, '03', 'UN TOP JOB', 'POWER SPLIT', 'UAE BID / VETO REPORTED');

  text('SOURCES: THE GUARDIAN / WORLD, 20 NOV 2026', 212, 963, 2, colors.muted);
}

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function png() {
  const rowBytes = WIDTH * 4;
  const raw = Buffer.alloc((rowBytes + 1) * HEIGHT);
  for (let y = 0; y < HEIGHT; y += 1) {
    const target = y * (rowBytes + 1);
    raw[target] = 0;
    for (let x = 0; x < WIDTH; x += 1) {
      const outputOffset = target + 1 + x * 4;
      const inputOffset = ((y * SCALE) * W + x * SCALE) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        raw[outputOffset + channel] = Math.round((
          pixels[inputOffset + channel]
          + pixels[inputOffset + 4 + channel]
          + pixels[inputOffset + W * 4 + channel]
          + pixels[inputOffset + W * 4 + 4 + channel]
        ) / 4);
      }
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(WIDTH, 0);
  header.writeUInt32BE(HEIGHT, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

render();
writeFileSync(new URL('./entry.png', import.meta.url), png());
