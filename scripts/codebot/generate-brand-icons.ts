import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { crc32, deflateSync } from "node:zlib";
import {
  APP_LOGO_CORNER,
  APP_LOGO_EYE_POINTS,
  APP_LOGO_EYE_STROKE,
  APP_LOGO_SIZE,
} from "@codebot/brand/app-logo-shape";
import {
  APP_LOGO_COLOR_HEX,
  DEFAULT_APP_LOGO_COLOR,
  DEFAULT_APP_LOGO_EYE_HEX,
} from "@codebot/contracts/app-logo-color";
import { createCodeBotLogger } from "@codebot/logging";

type Rgb = readonly [number, number, number];
type Point = readonly [number, number];

interface RgbaImage {
  width: number;
  height: number;
  pixels: Buffer;
}

interface MarkOptions {
  size: number;
  body: Rgb | null;
  eye: Rgb | null;
  inset: number;
  cornerRatio: number;
}

const ROOT = resolve(import.meta.dirname, "../..");
const BUILD = join(ROOT, "build");
const logger = createCodeBotLogger("generate-brand-icons");

const DEV_BODY = "#e3b866";
const PREVIEW_BODY = "#61c985";
const MACOS_SAFE_AREA = 824 / 1024;
const MACOS_CORNER_RATIO = 0.225;
const FULL_CORNER_RATIO = APP_LOGO_CORNER / APP_LOGO_SIZE;
const ICON_SIZE = 1600;
const ICO_SIZES = [16, 32, 48, 64, 128, 256] as const;
const ICNS_TYPES: ReadonlyArray<readonly [string, number]> = [
  ["icp4", 16],
  ["icp5", 32],
  ["icp6", 64],
  ["ic07", 128],
  ["ic08", 256],
  ["ic09", 512],
  ["ic10", 1024],
  ["ic11", 32],
  ["ic12", 64],
  ["ic13", 256],
  ["ic14", 512],
];
const TRAY_PADDING = 14;
const DMG_BACKGROUND: Rgb = [238, 241, 246];
const DMG_ARROW: Rgb = [112, 142, 184];

function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function parsePoints(points: string): Point[] {
  const values = points.split(/\s+/).map(Number);
  const parsed: Point[] = [];
  for (let index = 0; index + 1 < values.length; index += 2) {
    parsed.push([values[index] ?? 0, values[index + 1] ?? 0]);
  }
  return parsed;
}

const EYES: readonly Point[][] = [parsePoints(APP_LOGO_EYE_POINTS.left), parsePoints(APP_LOGO_EYE_POINTS.right)];

function segmentDistance(x: number, y: number, from: Point, to: Point): number {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const lengthSquared = dx * dx + dy * dy;
  const along =
    lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - from[0]) * dx + (y - from[1]) * dy) / lengthSquared));
  return Math.hypot(x - (from[0] + along * dx), y - (from[1] + along * dy));
}

function polylineDistance(x: number, y: number, points: readonly Point[]): number {
  let nearest = Number.POSITIVE_INFINITY;
  for (let index = 0; index + 1 < points.length; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    if (!from || !to) continue;
    nearest = Math.min(nearest, segmentDistance(x, y, from, to));
  }
  return nearest;
}

function roundedSquareDistance(x: number, y: number, center: number, half: number, radius: number): number {
  const qx = Math.abs(x - center) - (half - radius);
  const qy = Math.abs(y - center) - (half - radius);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
}

function coverage(distance: number): number {
  return Math.max(0, Math.min(1, 0.5 - distance));
}

function renderMark(options: MarkOptions): RgbaImage {
  const { size, body, eye, inset, cornerRatio } = options;
  const pixels = Buffer.alloc(size * size * 4);
  const side = size * inset;
  const origin = (size - side) / 2;
  const unit = side / APP_LOGO_SIZE;
  const center = size / 2;
  const half = side / 2;
  const radius = side * cornerRatio;
  const eyeHalfWidth = (APP_LOGO_EYE_STROKE / 2) * unit;
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const x = column + 0.5;
      const y = row + 0.5;
      const bodyAlpha = coverage(roundedSquareDistance(x, y, center, half, radius));
      if (bodyAlpha === 0) continue;
      const logoX = (x - origin) / unit;
      const logoY = (y - origin) / unit;
      let eyeDistance = Number.POSITIVE_INFINITY;
      for (const points of EYES) eyeDistance = Math.min(eyeDistance, polylineDistance(logoX, logoY, points));
      const eyeAlpha = coverage(eyeDistance * unit - eyeHalfWidth);
      const offset = (row * size + column) * 4;
      if (body === null) {
        const ink = eye ?? [0, 0, 0];
        pixels[offset] = ink[0];
        pixels[offset + 1] = ink[1];
        pixels[offset + 2] = ink[2];
        pixels[offset + 3] = Math.round(bodyAlpha * (1 - eyeAlpha) * 255);
        continue;
      }
      const ink = eye ?? body;
      pixels[offset] = Math.round(body[0] + (ink[0] - body[0]) * eyeAlpha);
      pixels[offset + 1] = Math.round(body[1] + (ink[1] - body[1]) * eyeAlpha);
      pixels[offset + 2] = Math.round(body[2] + (ink[2] - body[2]) * eyeAlpha);
      pixels[offset + 3] = Math.round(bodyAlpha * 255);
    }
  }
  return { width: size, height: size, pixels };
}

function renderEyes(width: number, height: number, eye: Rgb): RgbaImage {
  const pixels = Buffer.alloc(width * height * 4);
  const all = EYES.flat();
  const minX = Math.min(...all.map((point) => point[0])) - APP_LOGO_EYE_STROKE / 2;
  const maxX = Math.max(...all.map((point) => point[0])) + APP_LOGO_EYE_STROKE / 2;
  const minY = Math.min(...all.map((point) => point[1])) - APP_LOGO_EYE_STROKE / 2;
  const maxY = Math.max(...all.map((point) => point[1])) + APP_LOGO_EYE_STROKE / 2;
  const unit = Math.min(width / (maxX - minX), height / (maxY - minY));
  const originX = (width - (maxX - minX) * unit) / 2 - minX * unit;
  const originY = (height - (maxY - minY) * unit) / 2 - minY * unit;
  const eyeHalfWidth = (APP_LOGO_EYE_STROKE / 2) * unit;
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const logoX = (column + 0.5 - originX) / unit;
      const logoY = (row + 0.5 - originY) / unit;
      let eyeDistance = Number.POSITIVE_INFINITY;
      for (const points of EYES) eyeDistance = Math.min(eyeDistance, polylineDistance(logoX, logoY, points));
      const alpha = coverage(eyeDistance * unit - eyeHalfWidth);
      if (alpha === 0) continue;
      const offset = (row * width + column) * 4;
      pixels[offset] = eye[0];
      pixels[offset + 1] = eye[1];
      pixels[offset + 2] = eye[2];
      pixels[offset + 3] = Math.round(alpha * 255);
    }
  }
  return { width, height, pixels };
}

function renderDmgBackground(width: number, height: number): Buffer {
  const scale = width / 680;
  const from: Point = [262 * scale, 222 * scale];
  const to: Point = [418 * scale, 222 * scale];
  const head = 12 * scale;
  const shaft: Point[] = [from, to];
  const upper: Point[] = [to, [to[0] - head, to[1] - head]];
  const lower: Point[] = [to, [to[0] - head, to[1] + head]];
  const halfWidth = 1.75 * scale;
  const rows = Buffer.alloc((width * 3 + 1) * height);
  for (let row = 0; row < height; row += 1) {
    const start = row * (width * 3 + 1);
    rows[start] = 0;
    for (let column = 0; column < width; column += 1) {
      const x = column + 0.5;
      const y = row + 0.5;
      const distance = Math.min(
        polylineDistance(x, y, shaft),
        polylineDistance(x, y, upper),
        polylineDistance(x, y, lower),
      );
      const alpha = coverage(distance - halfWidth);
      const offset = start + 1 + column * 3;
      rows[offset] = Math.round(DMG_BACKGROUND[0] + (DMG_ARROW[0] - DMG_BACKGROUND[0]) * alpha);
      rows[offset + 1] = Math.round(DMG_BACKGROUND[1] + (DMG_ARROW[1] - DMG_BACKGROUND[1]) * alpha);
      rows[offset + 2] = Math.round(DMG_BACKGROUND[2] + (DMG_ARROW[2] - DMG_BACKGROUND[2]) * alpha);
    }
  }
  return encodePngRows(width, height, 2, rows);
}

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function pngChunk(type: string, body: Buffer): Buffer {
  const chunk = Buffer.alloc(12 + body.length);
  chunk.writeUInt32BE(body.length, 0);
  chunk.write(type, 4, "latin1");
  body.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 8 + body.length)), 8 + body.length);
  return chunk;
}

function encodePngRows(width: number, height: number, colorType: 2 | 6, rows: Buffer): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, colorType, 0, 0, 0], 8);
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(rows, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function encodePng(image: RgbaImage): Buffer {
  const stride = image.width * 4;
  const rows = Buffer.alloc((stride + 1) * image.height);
  for (let y = 0; y < image.height; y += 1) {
    rows[y * (stride + 1)] = 2;
    for (let x = 0; x < stride; x += 1) {
      const up = y > 0 ? (image.pixels[(y - 1) * stride + x] ?? 0) : 0;
      rows[y * (stride + 1) + 1 + x] = ((image.pixels[y * stride + x] ?? 0) - up) & 255;
    }
  }
  return encodePngRows(image.width, image.height, 6, rows);
}

function icoBitmap(image: RgbaImage): Buffer {
  const { width, height, pixels } = image;
  const maskStride = Math.ceil(width / 32) * 4;
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(width, 4);
  header.writeInt32LE(height * 2, 8);
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);
  header.writeUInt32LE(width * height * 4 + maskStride * height, 20);
  const color = Buffer.alloc(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const source = ((height - 1 - row) * width + column) * 4;
      const target = (row * width + column) * 4;
      color[target] = pixels[source + 2] ?? 0;
      color[target + 1] = pixels[source + 1] ?? 0;
      color[target + 2] = pixels[source] ?? 0;
      color[target + 3] = pixels[source + 3] ?? 0;
    }
  }
  return Buffer.concat([header, color, Buffer.alloc(maskStride * height)]);
}

function encodeIco(images: readonly RgbaImage[]): Buffer {
  const bodies = images.map((image) => (image.width >= 256 ? encodePng(image) : icoBitmap(image)));
  const directory = Buffer.alloc(6 + images.length * 16);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(images.length, 4);
  let offset = directory.length;
  for (const [index, image] of images.entries()) {
    const entry = 6 + index * 16;
    const body = bodies[index] ?? Buffer.alloc(0);
    directory[entry] = image.width >= 256 ? 0 : image.width;
    directory[entry + 1] = image.height >= 256 ? 0 : image.height;
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(body.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += body.length;
  }
  return Buffer.concat([directory, ...bodies]);
}

function encodeIcns(render: (size: number) => RgbaImage): Buffer {
  const cache = new Map<number, Buffer>();
  const chunks: Buffer[] = [];
  for (const [type, size] of ICNS_TYPES) {
    let png = cache.get(size);
    if (!png) {
      png = encodePng(render(size));
      cache.set(size, png);
    }
    const header = Buffer.alloc(8);
    header.write(type, 0, "latin1");
    header.writeUInt32BE(png.length + 8, 4);
    chunks.push(header, png);
  }
  const body = Buffer.concat(chunks);
  const header = Buffer.alloc(8);
  header.write("icns", 0, "latin1");
  header.writeUInt32BE(body.length + 8, 4);
  return Buffer.concat([header, body]);
}

function iconSvg(body: string, eye: string): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 ${APP_LOGO_SIZE} ${APP_LOGO_SIZE}">`,
    "  <title>CodeBot</title>",
    `  <rect width="${APP_LOGO_SIZE}" height="${APP_LOGO_SIZE}" rx="${APP_LOGO_CORNER}" fill="${body}"/>`,
    `  <g fill="none" stroke="${eye}" stroke-width="${APP_LOGO_EYE_STROKE}" stroke-linecap="round" stroke-linejoin="round">`,
    `    <polyline points="${APP_LOGO_EYE_POINTS.left}"/>`,
    `    <polyline points="${APP_LOGO_EYE_POINTS.right}"/>`,
    "  </g>",
    "</svg>",
    "",
  ].join("\n");
}

function traySvg(): string {
  const box = APP_LOGO_SIZE + TRAY_PADDING * 2;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="${-TRAY_PADDING} ${-TRAY_PADDING} ${box} ${box}">`,
    "  <title>CodeBot menu bar icon</title>",
    "  <defs>",
    `    <mask id="eyes" maskUnits="userSpaceOnUse" x="${-TRAY_PADDING}" y="${-TRAY_PADDING}" width="${box}" height="${box}">`,
    `      <rect x="${-TRAY_PADDING}" y="${-TRAY_PADDING}" width="${box}" height="${box}" fill="#fff"/>`,
    `      <g fill="none" stroke="#000" stroke-width="${APP_LOGO_EYE_STROKE}" stroke-linecap="round" stroke-linejoin="round">`,
    `        <polyline points="${APP_LOGO_EYE_POINTS.left}"/>`,
    `        <polyline points="${APP_LOGO_EYE_POINTS.right}"/>`,
    "      </g>",
    "    </mask>",
    "  </defs>",
    `  <rect width="${APP_LOGO_SIZE}" height="${APP_LOGO_SIZE}" rx="${APP_LOGO_CORNER}" fill="#000" mask="url(#eyes)"/>`,
    "</svg>",
    "",
  ].join("\n");
}

async function write(path: string, content: Buffer | string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
  logger.info(`Wrote ${path.slice(ROOT.length + 1).replaceAll("\\", "/")}`);
}

const eye = hexToRgb(DEFAULT_APP_LOGO_EYE_HEX);
const variants = {
  production: hexToRgb(APP_LOGO_COLOR_HEX[DEFAULT_APP_LOGO_COLOR]),
  dev: hexToRgb(DEV_BODY),
  preview: hexToRgb(PREVIEW_BODY),
} as const;

const fullMark = (body: Rgb, size: number) => renderMark({ size, body, eye, inset: 1, cornerRatio: FULL_CORNER_RATIO });
const safeAreaMark = (body: Rgb, size: number) =>
  renderMark({ size, body, eye, inset: MACOS_SAFE_AREA, cornerRatio: MACOS_CORNER_RATIO });

for (const [variant, body] of Object.entries(variants)) {
  const full = encodePng(fullMark(body, ICON_SIZE));
  await write(join(BUILD, `icon-${variant}.png`), full);
  await write(join(BUILD, `icon-${variant}-macos-safe-area.png`), encodePng(safeAreaMark(body, ICON_SIZE)));
  await write(join(BUILD, `icon-${variant}.ico`), encodeIco(ICO_SIZES.map((size) => fullMark(body, size))));
  await write(join(ROOT, "src", "renderer", "src", "assets", `codebot-logo-${variant}.png`), full);
}
await write(join(BUILD, "icon.ico"), encodeIco([fullMark(variants.production, 256)]));
await write(
  join(BUILD, "icon-production.icns"),
  encodeIcns((size) => safeAreaMark(variants.production, size)),
);
await write(join(BUILD, "icon.svg"), iconSvg(APP_LOGO_COLOR_HEX[DEFAULT_APP_LOGO_COLOR], DEFAULT_APP_LOGO_EYE_HEX));
await write(join(BUILD, "icon-production.icon", "Assets", "eyes.png"), encodePng(renderEyes(3480, 1584, eye)));

const trayInset = APP_LOGO_SIZE / (APP_LOGO_SIZE + TRAY_PADDING * 2);
for (const [name, size] of [
  ["trayTemplate.png", 18],
  ["trayTemplate@2x.png", 36],
] as const) {
  await write(
    join(BUILD, "macos", "tray", name),
    encodePng(renderMark({ size, body: null, eye: [0, 0, 0], inset: trayInset, cornerRatio: FULL_CORNER_RATIO })),
  );
}
await write(join(BUILD, "macos", "tray", "tray-template.svg"), traySvg());
await write(join(BUILD, "dmg-background.png"), renderDmgBackground(680, 478));
await write(join(BUILD, "dmg-background@2x.png"), renderDmgBackground(1360, 956));
