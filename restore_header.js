const fs = require('fs');
const path = require('path');

const src = 'C:/Users/Hp/.gemini/antigravity/brain/c69157e6-9e0e-478d-8977-a0265fad650f/uploaded_image_0_1767522621435.png';
const dest = 'e:/ERP-Anti/RiceERP/assets/header_design.png';

try {
    fs.copyFileSync(src, dest);
    console.log('Successfully copied header_design.png');
} catch (e) {
    console.error('Error copying file:', e);
}
