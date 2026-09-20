const { chromium } = require('playwright');
const path = require('path');
const axios = require('axios');

async function testS25() {
    console.log('Logging in via backend API...');
    let token = null;
    let userInfo = null;
    for (const phone of ['9994645285', '+919994645285']) {
        try {
            const loginRes = await axios.post('http://127.0.0.1:8083/auth/login-password', {
                phoneNumber: phone,
                password: 'Sam123'
            });
            token = loginRes.data.token;
            userInfo = JSON.stringify(loginRes.data);
            console.log(`Login successful with ${phone}, got token:`, token.substring(0, 20) + '...');
            break;
        } catch (e) {
            console.log(`Login failed for ${phone}:`, e.response?.data?.message || e.message);
        }
    }

    const browser = await chromium.launch({ headless: true });
    // Samsung Galaxy S25: 390x844 (or 412x915)
    const context = await browser.newContext({
        viewport: { width: 384, height: 832 },
        deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    // Navigate to base
    await page.goto('http://localhost:8081/', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Set token in localStorage
    if (token) {
        await page.evaluate(({ t, u }) => {
            localStorage.setItem('auth_token', t);
            if (u) localStorage.setItem('user_info', u);
        }, { t: token, u: userInfo });
    }

    console.log('Navigating directly to /delivery...');
    await page.goto('http://localhost:8081/delivery', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    const artifactDir = 'C:\\Users\\ELCOT\\.gemini\\antigravity-ide\\brain\\4a0f5b1e-3c32-4e9c-a468-41df19395daf';

    // 1. Warehouse Queue on S25
    await page.screenshot({ path: path.join(artifactDir, 's25_warehouse_queue_2stage.png'), fullPage: false });
    console.log('Saved s25_warehouse_queue_2stage.png');

    // 2. Click the first order in Warehouse Queue (Stage 1: To Pack or Stage 2: Ready)
    const orderCards = page.locator('text=#SO-');
    if (await orderCards.count() > 0) {
        await orderCards.nth(0).click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(artifactDir, 's25_warehouse_modal_click1.png'), fullPage: false });
        console.log('Saved s25_warehouse_modal_click1.png');
    }

    // 3. Switch to Driver Trips (Delivery Queue)
    console.log('Switching to Driver Trips tab...');
    const tripsTab = page.locator('text=Driver Trips');
    if (await tripsTab.count() > 0) {
        await tripsTab.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(artifactDir, 's25_delivery_queue_fixed.png'), fullPage: false });
        console.log('Saved s25_delivery_queue_fixed.png');

        // 4. Click a delivery card
        const deliveryCards = page.locator('text=#DN-');
        if (await deliveryCards.count() > 0) {
            await deliveryCards.nth(0).click();
            await page.waitForTimeout(1500);
            await page.screenshot({ path: path.join(artifactDir, 's25_delivery_detail_modal_fixed.png'), fullPage: false });
            console.log('Saved s25_delivery_detail_modal_fixed.png');
        }
    }

    await browser.close();
}

testS25().catch(console.error);
