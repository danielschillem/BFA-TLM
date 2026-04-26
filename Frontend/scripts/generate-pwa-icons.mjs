/**
 * Génère les icônes PWA à partir du logo BFA TLM.
 * Usage : node scripts/generate-pwa-icons.mjs
 */
import sharp from "sharp";
import { mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ICONS_DIR = resolve(ROOT, "public/icons");
const SOURCE = resolve(ROOT, "src/assets/logo.jpeg");

if (!existsSync(ICONS_DIR)) mkdirSync(ICONS_DIR, { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generate() {
  for (const size of sizes) {
    await sharp(SOURCE)
      .resize(size, size, { fit: "cover" })
      .png()
      .toFile(resolve(ICONS_DIR, `icon-${size}x${size}.png`));
    console.log(`✓ icon-${size}x${size}.png`);
  }

  // Maskable icons (with padding for safe zone)
  for (const size of [192, 512]) {
    const padding = Math.round(size * 0.1);
    const innerSize = size - padding * 2;
    const inner = await sharp(SOURCE)
      .resize(innerSize, innerSize, { fit: "cover" })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 30, g: 64, b: 175, alpha: 1 }, // #1e40af
      },
    })
      .composite([{ input: inner, left: padding, top: padding }])
      .png()
      .toFile(resolve(ICONS_DIR, `icon-maskable-${size}x${size}.png`));
    console.log(`✓ icon-maskable-${size}x${size}.png`);
  }

  // Apple touch icon 180x180
  await sharp(SOURCE)
    .resize(180, 180, { fit: "cover" })
    .png()
    .toFile(resolve(ICONS_DIR, "apple-touch-icon.png"));
  console.log("✓ apple-touch-icon.png");

  console.log("\nToutes les icônes PWA ont été générées dans public/icons/");
}

generate().catch(console.error);
