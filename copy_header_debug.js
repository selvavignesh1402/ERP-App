const fs = require('fs');
const path = require('path');

const src = 'C:/Users/Hp/.gemini/antigravity/brain/c69157e6-9e0e-478d-8977-a0265fad650f/uploaded_image_0_1767522621435.png';
const dest = 'e:/ERP-Anti/RiceERP/assets/header_design.png';

console.log(`Copying from ${src} to ${dest}`);

try {
    if (!fs.existsSync(src)) {
        console.error('Source file does not exist!');
        process.exit(1);
    }
    fs.copyFileSync(src, dest);
    console.log('Copy command executed.');

    if (fs.existsSync(dest)) {
        const stats = fs.statSync(dest);
        console.log(`Destination file exists. Size: ${stats.size} bytes`);
    } else {
        console.error('Destination file NOT found after copy.');
    }
} catch (e) {
    console.error('Error during copy:', e);
}
