/**
 * Generate app icons from design/icon/kitapmi-icon.svg
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

// The Kitapmi mark (same as the landing page favicon): an oxblood feather on ink.
const svgContent = readFileSync(join(rootDir, 'design', 'icon', 'kitapmi-icon.svg'), 'utf8');

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
