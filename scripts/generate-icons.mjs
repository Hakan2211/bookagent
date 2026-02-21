/**
 * Generate app icons from favicon.svg
 * Produces: icon.png (1024x1024), icon.ico, icon.icns
 * into the resources/ directory
 */
import sharp from 'sharp';
import png2icons from 'png2icons';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const resourcesDir = join(rootDir, 'resources');

// The favicon SVG from the landing page
const svgContent = `<svg width="1024" height="1024" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="6" fill="#0A0A0A"/>
  <rect x="4" y="2" width="24" height="28" rx="3" fill="#0A0A0A" stroke="#D4A853" stroke-width="2"/>
  <rect x="7" y="2" width="21" height="28" rx="3" fill="#0A0A0A" stroke="#D4A853" stroke-width="2"/>
  <line x1="12" y1="10" x2="23" y2="10" stroke="#D4A853" stroke-width="2" stroke-linecap="round"/>
  <line x1="12" y1="16" x2="21" y2="16" stroke="#D4A853" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
  <line x1="12" y1="22" x2="19" y2="22" stroke="#D4A853" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
</svg>`;

async function main() {
  mkdirSync(resourcesDir, { recursive: true });

  console.log('Generating 1024x1024 PNG...');
  const pngBuffer = await sharp(Buffer.from(svgContent))
    .resize(1024, 1024)
    .png()
    .toBuffer();
  
  const pngPath = join(resourcesDir, 'icon.png');
  writeFileSync(pngPath, pngBuffer);
  console.log(`  -> ${pngPath}`);

  // Also generate a 256x256 version for electron-builder (some targets need smaller)
  const png256 = await sharp(Buffer.from(svgContent))
    .resize(256, 256)
    .png()
    .toBuffer();

  console.log('Generating ICO (Windows)...');
  const icoBuffer = png2icons.createICO(pngBuffer, png2icons.BILINEAR, 0, true, true);
  if (icoBuffer) {
    const icoPath = join(resourcesDir, 'icon.ico');
    writeFileSync(icoPath, icoBuffer);
    console.log(`  -> ${icoPath}`);
  } else {
    console.error('  Failed to create ICO');
  }

  console.log('Generating ICNS (macOS)...');
  const icnsBuffer = png2icons.createICNS(pngBuffer, png2icons.BILINEAR, 0);
  if (icnsBuffer) {
    const icnsPath = join(resourcesDir, 'icon.icns');
    writeFileSync(icnsPath, icnsBuffer);
    console.log(`  -> ${icnsPath}`);
  } else {
    console.error('  Failed to create ICNS');
  }

  console.log('Done! Icons generated in resources/');
}

main().catch(console.error);
