import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { deflateSync } from 'node:zlib';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(projectDir, 'public', 'samples');
await fs.mkdir(outputDir, { recursive: true });

const require = createRequire(import.meta.url);
const pdfjsDir = path.dirname(require.resolve('pdfjs-dist/package.json'));
await fs.copyFile(path.join(pdfjsDir, 'build', 'pdf.worker.min.mjs'), path.join(projectDir, 'public', 'pdf.worker.min.mjs'));

const fixturePath = path.join(projectDir, 'src', 'mock', 'scholarship-data.json');
const { officialSections } = JSON.parse(await fs.readFile(fixturePath, 'utf8'));

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function bannerPng() {
  const width = 500;
  const height = 82;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 3 + 1);
    for (let x = 0; x < width; x += 1) {
      const grid = x > 330 && ((x + y) % 36 < 4 || (x - y + 400) % 36 < 4);
      const band = x < 22 || (x > 60 && x < 73 && y > 18 && y < 64);
      const color = grid ? [171, 192, 236] : band ? [49, 92, 204] : [231, 238, 251];
      const offset = row + 1 + x * 3;
      raw[offset] = color[0]; raw[offset + 1] = color[1]; raw[offset + 2] = color[2];
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function linesFor(text, font, size, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(line); line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

const pdf = await PDFDocument.create();
pdf.setTitle('Nova Merit Scholarship 2026 - fictional sample guidelines');
pdf.setAuthor('Source Lantern sample demo');
pdf.setSubject('Fictional source for demonstrating evidence navigation');
const sans = await pdf.embedFont(StandardFonts.Helvetica);
const serif = await pdf.embedFont(StandardFonts.TimesRoman);
const banner = await pdf.embedPng(bannerPng());
for (const section of officialSections) {
  const page = pdf.addPage([595, 842]);
  page.drawText('NOVA', { x: 56, y: 783, size: 21, font: sans, color: rgb(0.15, 0.19, 0.25) });
  page.drawText('MERIT SCHOLARSHIP', { x: 131, y: 786, size: 8, font: sans, color: rgb(0.35, 0.39, 0.45) });
  page.drawLine({ start: { x: 56, y: 761 }, end: { x: 539, y: 761 }, thickness: 0.65, color: rgb(0.83, 0.86, 0.9) });
  page.drawText(`2026 GUIDELINES / ${String(section.page).padStart(2, '0')}`, { x: 56, y: 730, size: 8, font: sans, color: rgb(0.28, 0.37, 0.58) });
  let y = 687;
  for (const line of linesFor(section.title, serif, 29, 475)) {
    page.drawText(line, { x: 56, y, size: 29, font: serif, color: rgb(0.13, 0.17, 0.22) });
    y -= 36;
  }
  y -= 23;
  if (section.page === 1) {
    page.drawImage(banner, { x: 56, y: y - 78, width: 483, height: 79 });
    y -= 115;
  }
  for (const paragraph of section.text.split('\n\n')) {
    for (const rawLine of paragraph.split('\n')) {
      const width = rawLine.includes('Submit an income certificate') ? 330 : 470;
      for (const line of linesFor(rawLine, serif, 15.5, width)) {
        page.drawText(line, { x: 56, y, size: 15.5, font: serif, color: rgb(0.18, 0.21, 0.26) });
        y -= 25;
      }
    }
    y -= 16;
  }
  page.drawLine({ start: { x: 56, y: 65 }, end: { x: 539, y: 65 }, thickness: 0.65, color: rgb(0.83, 0.86, 0.9) });
  page.drawText('SAMPLE DEMO / FICTIONAL SOURCES FOR ILLUSTRATION', { x: 56, y: 46, size: 7, font: sans, color: rgb(0.4, 0.44, 0.5) });
  page.drawText(`${section.page} / ${officialSections.length}`, { x: 510, y: 46, size: 8, font: sans, color: rgb(0.4, 0.44, 0.5) });
}
await fs.writeFile(path.join(outputDir, 'nova-guidelines.pdf'), await pdf.save());

const scanned = await PDFDocument.create();
const scannedPage = scanned.addPage([595, 842]);
const scannedImage = await scanned.embedPng(bannerPng());
scannedPage.drawImage(scannedImage, { x: 35, y: 300, width: 525, height: 160 });
scanned.setTitle('Image-only sample - no selectable text');
await fs.writeFile(path.join(outputDir, 'image-only.pdf'), await scanned.save());

process.stdout.write(JSON.stringify({ stage: 'sample_generation', status: 'done', output: ['nova-guidelines.pdf', 'image-only.pdf', 'pdf.worker.min.mjs'], pages: officialSections.length }) + '\n');
