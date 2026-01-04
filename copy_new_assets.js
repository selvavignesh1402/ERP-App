const fs = require('fs');
const path = require('path');

const file1 = 'C:/Users/Hp/.gemini/antigravity/brain/c69157e6-9e0e-478d-8977-a0265fad650f/uploaded_image_0_1767522621435.png';
const file2 = 'C:/Users/Hp/.gemini/antigravity/brain/c69157e6-9e0e-478d-8977-a0265fad650f/uploaded_image_1_1767522621435.png';
const destDir = 'assets';

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir);
}

try {
    fs.copyFileSync(file1, path.join(destDir, 'header_design.png'));
    console.log('Copied header_design.png');
    fs.copyFileSync(file2, path.join(destDir, 'rice_bag.png'));
    console.log('Copied rice_bag.png');
} catch (e) {
    console.error('Error copying files:', e);
}
