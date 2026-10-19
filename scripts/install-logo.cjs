const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const srcPath = 'C:/Users/HomePC/Downloads/9jalive-logo.jpg';
const root = path.join(__dirname, '..');

async function main() {
  console.log('Reading source logo:', srcPath);
  if (!fs.existsSync(srcPath)) {
    throw new Error('Source logo file does not exist: ' + srcPath);
  }

  // 1. Copy raw file to public/images/9jalive-logo.jpg and public/logo.jpg
  fs.copyFileSync(srcPath, path.join(root, 'public/images/9jalive-logo.jpg'));
  fs.copyFileSync(srcPath, path.join(root, 'public/logo.jpg'));
  console.log('Copied raw logo to public/images/9jalive-logo.jpg and public/logo.jpg');

  // 2. Generate high-res PNG logo
  await sharp(srcPath)
    .png({ quality: 100 })
    .toFile(path.join(root, 'public/logo.png'));
  console.log('Generated public/logo.png');

  // 3. Generate PWA and app icons
  await sharp(srcPath)
    .resize(512, 512)
    .png()
    .toFile(path.join(root, 'app/icon.png'));
  console.log('Generated app/icon.png (512x512)');

  await sharp(srcPath)
    .resize(512, 512)
    .png()
    .toFile(path.join(root, 'public/icons/icon-512.png'));
  console.log('Generated public/icons/icon-512.png');

  await sharp(srcPath)
    .resize(192, 192)
    .png()
    .toFile(path.join(root, 'public/icons/icon-192.png'));
  console.log('Generated public/icons/icon-192.png');

  await sharp(srcPath)
    .resize(180, 180)
    .png()
    .toFile(path.join(root, 'public/apple-touch-icon.png'));
  console.log('Generated public/apple-touch-icon.png');

  // 4. Generate 32x32 favicon
  const fav32 = await sharp(srcPath)
    .resize(32, 32)
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(root, 'public/favicon.ico'), fav32);
  fs.writeFileSync(path.join(root, 'public/favicon.png'), fav32);
  fs.writeFileSync(path.join(root, 'app/favicon.ico'), fav32);
  console.log('Generated public/favicon.ico, public/favicon.png, app/favicon.ico');

  console.log('All logo and favicon assets successfully generated!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
