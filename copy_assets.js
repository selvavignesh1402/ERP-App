const fs = require('fs');
const path = require('path');

const src = 'C:/Users/Hp/.gemini/antigravity/brain/c69157e6-9e0e-478d-8977-a0265fad650f/rice_erp_icon_1767520959351.png';
const destDir = 'assets';
const files = ['icon.png', 'splash.png', 'adaptive-icon.png', 'favicon.png'];

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir);
}

files.forEach(file => {
    fs.copyFileSync(src, path.join(destDir, file));
    console.log(`Copied to ${file}`);
});
