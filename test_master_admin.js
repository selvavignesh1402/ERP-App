const { chromium } = require('./node_modules/playwright');

(async () => {
    try {
        const l = await fetch('http://localhost:8083/auth/login-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: '9999999999', password: 'admin123' })
        }).then(r => r.json());

        const b = await chromium.launch();
        const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
        const p = await c.newPage();

        await p.goto('http://localhost:8081');
        await p.evaluate(jwt => window.localStorage.setItem('auth_token', jwt), l.token);
        await p.goto('http://localhost:8081/master-admin');
        await p.waitForTimeout(2000);

        // Capture initial overview
        await p.screenshot({ path: 'test_screenshots/73_master_admin_overview.png' });
        console.log('73 taken');

        // Click Add Shop button
        const addBtn = await p.locator('text=Add Shop').first();
        if (await addBtn.count() > 0) {
            await addBtn.click();
            await p.waitForTimeout(800);

            const input = await p.locator('input').first();
            if (await input.count() > 0) {
                await input.fill('Golden Harvest Rice Mill');
            }
            await p.screenshot({ path: 'test_screenshots/74_master_admin_add_shop_modal.png' });
            console.log('74 taken');

            const createBtn = await p.locator('text=Create & Onboard Shop').first();
            if (await createBtn.count() > 0) {
                await createBtn.click();
                await p.waitForTimeout(1500);
            }
        }

        // Navigate to Shops tab
        const shopsBtn = await p.locator('text=Shops').first();
        if (await shopsBtn.count() > 0) {
            await shopsBtn.click();
            await p.waitForTimeout(1000);
            await p.screenshot({ path: 'test_screenshots/75_master_admin_shops_with_new_shop.png' });
            console.log('75 taken');
        }

        await b.close();
        console.log('Master Admin test completed successfully!');
    } catch (e) {
        console.error(e);
    }
})();
