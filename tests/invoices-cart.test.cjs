const test = require('node:test');
const assert = require('node:assert/strict');

function addToCart(cartItems, product) {
    const qtyVal = parseFloat(product.quantity);
    const priceVal = parseFloat(product.price);
    const existingItemIndex = cartItems.findIndex((i) => i.productId === product.productId);
    if (existingItemIndex > -1) {
        const updated = [...cartItems];
        const existing = updated[existingItemIndex];
        const totalAmount = existing.quantity * existing.price + qtyVal * priceVal;
        const newQuantity = Number((existing.quantity + qtyVal).toPrecision(15));
        const weightedUnitPrice = Number((totalAmount / newQuantity).toFixed(2));
        updated[existingItemIndex] = {
            ...existing,
            quantity: newQuantity,
            price: weightedUnitPrice,
        };
        return updated;
    }
    return [
        ...cartItems,
        {
            productId: product.productId,
            productName: product.productName,
            quantity: qtyVal,
            price: priceVal,
        },
    ];
}

test('invoices cart: weighted average unit price when re-adding existing items', () => {
    let cart = [];
    // Add 10 @ ₹2,800
    cart = addToCart(cart, { productId: 1, productName: 'Sona Masoori', quantity: '10', price: '2800' });
    assert.equal(cart.length, 1);
    assert.equal(cart[0].quantity, 10);
    assert.equal(cart[0].price, 2800);

    // Re-add 5 @ ₹3,000
    cart = addToCart(cart, { productId: 1, productName: 'Sona Masoori', quantity: '5', price: '3000' });
    assert.equal(cart.length, 1);
    assert.equal(cart[0].quantity, 15);
    // (10 * 2800 + 5 * 3000) / 15 = 43000 / 15 = 2866.67
    assert.equal(cart[0].price, 2866.67);
    const totalAmount = cart[0].quantity * cart[0].price;
    assert.ok(Math.abs(totalAmount - 43000) < 1, `Expected ~43000, got ${totalAmount}`);
});
