#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const QRCode = require('qrcode');

const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
};

const inputPath = process.argv[2];
const rootUrl = process.argv[3];
if (!inputPath || !rootUrl) {
  console.error('Usage: node pack-html.js <path-to-html-file> <root-url> [output-qr-path]');
  process.exit(1);
}

const baseDir = path.dirname(inputPath);
let html = fs.readFileSync(inputPath, 'utf8');

html = html.replace(/(<img\b[^>]*\bsrc\s*=\s*)(["'])(.*?)\2/gi, (match, prefix, quote, src) => {
  if (/^(data:|https?:\/\/|\/\/)/i.test(src)) return match; // already inlined or remote

  const imgPath = path.resolve(baseDir, src);
  const ext = path.extname(imgPath).toLowerCase();
  const mime = MIME_TYPES[ext];
  if (!mime) {
    console.error(`Warning: unrecognized image extension for "${src}", leaving as-is`);
    return match;
  }

  const buffer = fs.readFileSync(imgPath);
  const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
  return `${prefix}${quote}${dataUrl}${quote}`;
});

const gzipped = zlib.gzipSync(Buffer.from(html, 'utf8'));
const dataUrl = `data:text/html;gzip;base64,${gzipped.toString('base64')}`;
const target = `${rootUrl.replace(/\/$/, '')}/?${encodeURIComponent(dataUrl)}`;

const outputPath = process.argv[4] || `${path.basename(inputPath, path.extname(inputPath))}.qr.png`;

QRCode.toFile(outputPath, target, { errorCorrectionLevel: 'L' }, (err) => {
  if (err) {
    console.error(`Failed to generate QR code: ${err.message}`);
    process.exit(1);
  }
  console.log(`QR code written to ${outputPath}`);
  console.log(target);
});
