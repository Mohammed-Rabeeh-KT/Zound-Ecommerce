// =============================================
// ZOUND Cart Page - JavaScript Functions
// =============================================

// Format currency in Indian format with 2 decimal places
function formatCurrency(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Change quantity - reads current quantity from input and calls updateQuantity
function changeQuantity(productId, variantId, action, btnElement) {
    const cartItem = btnElement.closest('.cart-item');
    const qtyInput = cartItem.querySelector('.qty-input');
    const currentQty = parseInt(qtyInput.value) || 1;
    const stock = parseInt(cartItem.dataset.stock) || 10;
    const maxQty = Math.min(10, stock);

    let newQuantity;
    if (action === 'increment') {
        newQuantity = currentQty + 1;
        if (newQuantity > maxQty) {
            Swal.fire({
                icon: 'warning',
                title: 'Limit Reached',
                text: `Maximum ${maxQty} items allowed`,
                confirmButtonColor: '#002366'
            });
            return;
        }
    } else {
        newQuantity = currentQty - 1;
        if (newQuantity < 1) return;
    }

    updateQuantity(productId, variantId, newQuantity, btnElement);
}

// Update item quantity using AJAX (no page reload)
async function updateQuantity(productId, variantId, newQuantity, btnElement) {
    if (newQuantity < 1 || newQuantity > 10) return;

    // Get the cart item element
    const cartItem = btnElement.closest('.cart-item');
    const qtyInput = cartItem.querySelector('.qty-input');
    const minusBtn = cartItem.querySelector('.qty-btn.minus');
    const plusBtn = cartItem.querySelector('.qty-btn.plus');
    const itemTotalEl = cartItem.querySelector('.total-price');
    const price = parseFloat(cartItem.dataset.price);
    const stock = parseInt(cartItem.dataset.stock);

    // Validate against stock
    if (newQuantity > stock) {
        Swal.fire({
            icon: 'warning',
            title: 'Stock Limit',
            text: `Only ${stock} items available in stock`,
            confirmButtonColor: '#002366'
        });
        return;
    }

    // Disable buttons during update
    minusBtn.disabled = true;
    plusBtn.disabled = true;
    cartItem.classList.add('updating');

    try {
        const response = await axios.put('/user/cart/update', {
            productId,
            variantId: variantId || null,
            quantity: newQuantity
        });

        if (response.data.success) {
            // Update UI without reload
            const oldQuantity = parseInt(qtyInput.value);
            qtyInput.value = newQuantity;

            // Update item total
            const newItemTotal = price * newQuantity;
            itemTotalEl.textContent = formatCurrency(newItemTotal);
            itemTotalEl.dataset.itemTotal = newItemTotal;

            // Update button states
            minusBtn.disabled = newQuantity <= 1;
            plusBtn.disabled = newQuantity >= Math.min(10, stock);

            // Recalculate order summary
            recalculateOrderSummary();

            // Show subtle success feedback
            cartItem.classList.add('updated');
            setTimeout(() => cartItem.classList.remove('updated'), 500);

        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: response.data.message || 'Failed to update quantity',
                confirmButtonColor: '#002366'
            });
            // Restore button states
            minusBtn.disabled = parseInt(qtyInput.value) <= 1;
            plusBtn.disabled = parseInt(qtyInput.value) >= Math.min(10, stock);
        }
    } catch (error) {
        console.error('Error updating quantity:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.response?.data?.message || 'Something went wrong. Please try again.',
            confirmButtonColor: '#002366'
        });
        // Restore button states
        minusBtn.disabled = parseInt(qtyInput.value) <= 1;
        plusBtn.disabled = parseInt(qtyInput.value) >= Math.min(10, stock);
    } finally {
        cartItem.classList.remove('updating');
    }
}

// Recalculate order summary totals including savings
function recalculateOrderSummary() {
    let subtotal = 0;
    let savings = 0;
    const cartItems = document.querySelectorAll('.cart-item:not(.out-of-stock-item)');

    cartItems.forEach(item => {
        const totalEl = item.querySelector('.total-price');
        const qtyInput = item.querySelector('.qty-input');
        const price = parseFloat(item.dataset.price) || 0;
        const basePrice = parseFloat(item.dataset.basePrice) || 0;
        const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

        if (totalEl) {
            subtotal += parseFloat(totalEl.dataset.itemTotal) || 0;
        }

        // Calculate savings (basePrice - salePrice) * quantity
        if (basePrice > price) {
            savings += (basePrice - price) * quantity;
        }
    });

    // Update subtotal
    const subtotalEl = document.getElementById('subtotalValue');
    if (subtotalEl) {
        subtotalEl.textContent = formatCurrency(subtotal);
    }

    // Update savings
    const savingsRow = document.querySelector('.summary-row.savings');
    const savingsEl = document.getElementById('savingsValue');
    if (savingsEl) {
        savingsEl.textContent = '-' + formatCurrency(savings);
    }
    if (savingsRow) {
        savingsRow.style.display = savings > 0 ? 'flex' : 'none';
    }

    // Calculate shipping
    const shipping = subtotal >= 1000 ? 0 : 99;
    const shippingEl = document.getElementById('shippingValue');
    if (shippingEl) {
        shippingEl.textContent = shipping === 0 ? 'FREE' : formatCurrency(shipping);
        shippingEl.className = shipping === 0 ? 'summary-value shipping-free' : 'summary-value';
    }

    // Get discount if applied
    const discountEl = document.getElementById('discountValue');
    const discountSection = document.getElementById('discountApplied');
    let discount = 0;
    if (discountSection && discountSection.style.display !== 'none' && discountEl) {
        discount = parseFloat(discountEl.dataset.discountAmount) || 0;
    }

    // Calculate total
    const total = Math.max(0, subtotal - discount + shipping);
    const totalEl = document.getElementById('totalValue');
    if (totalEl) {
        totalEl.textContent = formatCurrency(total);
    }
}

// Remove item from cart
async function removeFromCart(productId, variantId) {
    const result = await Swal.fire({
        title: 'Remove Item?',
        text: 'Are you sure you want to remove this item from your cart?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#002366',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, Remove',
        cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
        try {
            const url = variantId
                ? `/user/cart/remove/${productId}?variantId=${variantId}`
                : `/user/cart/remove/${productId}`;
            const response = await axios.delete(url);

            if (response.data.success) {
                // Animate removal
                const cartItem = document.querySelector(
                    `.cart-item[data-item-id="${productId}"][data-variant-id="${variantId || ''}"]`
                ) || document.querySelector(`.cart-item[data-item-id="${productId}"]`);

                if (cartItem) {
                    cartItem.classList.add('removing');
                    setTimeout(() => {
                        cartItem.remove();

                        // Update item count
                        const itemCountEl = document.getElementById('itemCount');
                        const remainingItems = document.querySelectorAll('.cart-item').length;
                        if (itemCountEl) {
                            itemCountEl.textContent = remainingItems;
                        }

                        // Recalculate totals
                        recalculateOrderSummary();

                        // Check if cart is empty
                        if (remainingItems === 0) {
                            location.reload(); // Reload to show empty cart state
                        }

                        // Check for out of stock items
                        updateCheckoutButtonState();
                    }, 300);
                }

                Swal.fire({
                    icon: 'success',
                    title: 'Removed!',
                    text: 'Item has been removed from your cart.',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: response.data.message || 'Failed to remove item',
                    confirmButtonColor: '#002366'
                });
            }
        } catch (error) {
            console.error('Error removing item:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Something went wrong. Please try again.',
                confirmButtonColor: '#002366'
            });
        }
    }
}

// Update checkout button state based on out of stock items
function updateCheckoutButtonState() {
    const checkoutBtn = document.querySelector('.checkout-btn');
    const warningEl = document.querySelector('.checkout-warning');
    const outOfStockItems = document.querySelectorAll('.cart-item.out-of-stock-item');

    if (checkoutBtn) {
        if (outOfStockItems.length > 0) {
            checkoutBtn.disabled = true;
            if (warningEl) warningEl.style.display = 'flex';
        } else {
            checkoutBtn.disabled = false;
            if (warningEl) warningEl.style.display = 'none';
        }
    }
}

// Apply discount code
async function applyDiscount() {
    const codeInput = document.getElementById('discountCode');
    const code = codeInput.value.trim().toUpperCase();
    const applyBtn = document.getElementById('applyDiscountBtn');
    const errorEl = document.getElementById('discountError');

    if (!code) {
        showDiscountError('Please enter a coupon code');
        codeInput.focus();
        return;
    }

    // Show loading state
    applyBtn.disabled = true;
    applyBtn.querySelector('.btn-text').style.display = 'none';
    applyBtn.querySelector('.btn-loader').style.display = 'inline-flex';
    hideDiscountError();

    try {
        const response = await axios.post('/user/cart/apply-discount', { code });

        if (response.data.success) {
            // Show applied discount
            const discountSection = document.getElementById('discountApplied');
            const discountCodeText = document.getElementById('discountCodeText');
            const discountValueEl = document.getElementById('discountValue');

            discountCodeText.textContent = code;
            discountValueEl.textContent = '-' + formatCurrency(response.data.data.discountAmount);
            discountValueEl.dataset.discountAmount = response.data.data.discountAmount;
            discountSection.style.display = 'block';

            // Clear input
            codeInput.value = '';
            codeInput.disabled = true;

            // Recalculate totals
            recalculateOrderSummary();

            Swal.fire({
                icon: 'success',
                title: 'Coupon Applied!',
                text: response.data.message || 'Discount has been applied',
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            showDiscountError(response.data.message || 'Invalid coupon code');
        }
    } catch (error) {
        console.error('Error applying discount:', error);
        showDiscountError(error.response?.data?.message || 'Failed to apply coupon. Please try again.');
    } finally {
        applyBtn.disabled = false;
        applyBtn.querySelector('.btn-text').style.display = 'inline';
        applyBtn.querySelector('.btn-loader').style.display = 'none';
    }
}

// Remove applied discount
function removeDiscount() {
    const discountSection = document.getElementById('discountApplied');
    const codeInput = document.getElementById('discountCode');

    discountSection.style.display = 'none';
    codeInput.disabled = false;
    codeInput.value = '';

    recalculateOrderSummary();
}

// Show discount error message
function showDiscountError(message) {
    const errorEl = document.getElementById('discountError');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

// Hide discount error message
function hideDiscountError() {
    const errorEl = document.getElementById('discountError');
    errorEl.style.display = 'none';
}

// Proceed to checkout
function proceedToCheckout() {
    const outOfStockItems = document.querySelectorAll('.cart-item.out-of-stock-item');

    if (outOfStockItems.length > 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Out of Stock Items',
            text: 'Please remove out of stock items before proceeding to checkout.',
            confirmButtonColor: '#002366'
        });
        return;
    }

    window.location.href = '/user/checkout';
}

// Handle Enter key on discount input
document.addEventListener('DOMContentLoaded', function () {
    const discountInput = document.getElementById('discountCode');
    if (discountInput) {
        discountInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                applyDiscount();
            }
        });
    }

    // Initial checkout button state check
    updateCheckoutButtonState();
});