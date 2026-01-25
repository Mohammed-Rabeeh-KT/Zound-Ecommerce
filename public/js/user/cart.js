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

// Show toast notification
function showToast(message, type = 'success') {
    if (typeof Swal !== 'undefined') {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });

        Toast.fire({
            icon: type,
            title: message
        });
    } else {
        alert(message);
    }
}

// Change quantity - reads current quantity from input and calls updateQuantity
function changeQuantity(productId, variantId, action, btnElement) {
    const cartItem = btnElement.closest('.cart-item');
    const qtyInput = cartItem.querySelector('.qty-input');
    const currentQty = parseInt(qtyInput.value) || 1;
    const stock = parseInt(cartItem.dataset.stock) || 10;
    const maxQty = Math.min(10, stock);

    let newQuantity;


    if (currentQty > stock) {
        if (action === 'decrement') {
            // Snap immediately to the max available stock
            newQuantity = stock;
            showToast(`Quantity adjusted to maximum available (${stock})`, 'info');
        } else {
            // Prevent increasing further
            showToast(`Cannot increase. Only ${stock} items available`, 'warning');
            return;
        }
    } else if (action === 'increment') {
        // Normal increment logic
        // Check if already at max limit
        if (currentQty >= maxQty) {
            // Show toast warning for stock limit
            if (stock <= 10) {
                showToast(`Only ${stock} items available in stock`, 'warning');
            } else {
                showToast(`Maximum 10 items allowed per product`, 'warning');
            }
            return;
        }
        newQuantity = currentQty + 1;
    } else {
        // Normal decrement logic
        // Check if already at min limit
        if (currentQty <= 1) {
            showToast('Minimum quantity is 1', 'warning');
            return;
        }
        newQuantity = currentQty - 1;
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
        // Show toast warning for stock limit
        showToast(`Only ${stock} items available in stock`, 'warning');
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
            qtyInput.value = newQuantity;

            // Update item total
            const newItemTotal = price * newQuantity;
            itemTotalEl.textContent = formatCurrency(newItemTotal);
            itemTotalEl.dataset.itemTotal = newItemTotal;

            // Re-enable buttons (no more disabling based on limits)
            minusBtn.disabled = false;
            plusBtn.disabled = false;

            // Recalculate order summary
            recalculateOrderSummary();

            // basic client-side check to enable/disable button
            checkCheckoutStatus();

            // Show subtle success feedback
            cartItem.classList.add('updated');
            setTimeout(() => cartItem.classList.remove('updated'), 500);

        } else {
            showToast(response.data.message || 'Failed to update quantity', 'error');
            // Re-enable buttons
            minusBtn.disabled = false;
            plusBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error updating quantity:', error);
        showToast(error.response?.data?.message || 'Something went wrong. Please try again.', 'error');
        // Re-enable buttons
        minusBtn.disabled = false;
        plusBtn.disabled = false;
    } finally {
        cartItem.classList.remove('updating');
    }
}

// Check if checkout should be enabled (client-side check)
function checkCheckoutStatus() {
    const cartItems = document.querySelectorAll('.cart-item');
    const checkoutBtn = document.querySelector('.checkout-btn');
    let hasIssues = false;

    if (!checkoutBtn) return;

    cartItems.forEach(item => {
        const qtyInput = item.querySelector('.qty-input');
        const stock = parseInt(item.dataset.stock) || 0;
        const currentQty = parseInt(qtyInput.value) || 0;

        if (currentQty > stock || stock <= 0) {
            hasIssues = true;
        }
    });

    // If out of stock items exist (global check)
    const outOfStockItems = document.querySelectorAll('.cart-item.out-of-stock-item');
    if (outOfStockItems.length > 0) hasIssues = true;

    checkoutBtn.disabled = hasIssues;
}

// Run check on load
document.addEventListener('DOMContentLoaded', checkCheckoutStatus);

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
async function proceedToCheckout() {
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

    // Show loading state
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.innerHTML = '<span class="material-icons spinning">sync</span> Checking...';
    }

    try {
        // Validate cart stock before proceeding
        const response = await axios.get('/user/cart/validate-stock');

        if (response.data.success) {
            // All good - proceed to checkout
            window.location.href = '/user/checkout';
        } else {
            // Stock issues found
            if (checkoutBtn) {
                checkoutBtn.disabled = false;
                checkoutBtn.innerHTML = '<span>Proceed to Checkout</span><span class="material-icons">arrow_forward</span>';
            }

            // Show error message
            if (response.data.insufficientItems && response.data.insufficientItems.length > 0) {
                let errorHtml = '<ul style="text-align: left;">';

                // Reset previous errors
                document.querySelectorAll('.stock-error-message').forEach(el => el.remove());
                document.querySelectorAll('.stock-issue').forEach(el => el.classList.remove('stock-issue'));

                response.data.insufficientItems.forEach(item => {
                    errorHtml += `<li><strong>${item.productName}</strong>: Only ${item.availableStock} available</li>`;

                    // Highlight item in cart DOM
                    const itemEl = document.querySelector(`.cart-item[data-item-id="${item.productId}"]${item.variantId ? `[data-variant-id="${item.variantId}"]` : ''}`);
                    if (itemEl) {
                        itemEl.classList.add('stock-issue');

                        // Add inline error message if not exists
                        const detailsEl = itemEl.querySelector('.item-details');
                        if (detailsEl) {
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'stock-error-message';
                            errorDiv.style.marginTop = '8px';
                            errorDiv.style.padding = '8px 12px';
                            errorDiv.style.background = '#fee2e2';
                            errorDiv.style.borderRadius = '8px';
                            errorDiv.style.border = '1px solid #fca5a5';
                            errorDiv.style.display = 'flex';
                            errorDiv.style.flexDirection = 'column';
                            errorDiv.style.gap = '8px';

                            const msgSpan = document.createElement('span');
                            msgSpan.innerHTML = `<span class="material-icons" style="font-size: 16px; vertical-align: text-bottom;">info</span> Limited Stock: Only <strong>${item.availableStock}</strong> unit${item.availableStock !== 1 ? 's' : ''} available`;
                            msgSpan.style.color = '#b45309'; // Premium amber/orange color
                            msgSpan.style.fontSize = '0.85rem';
                            msgSpan.style.fontWeight = '500';

                            errorDiv.appendChild(msgSpan);
                            detailsEl.appendChild(errorDiv);
                        }

                        // update max attribute on input to prevent increasing again
                        const input = itemEl.querySelector('.qty-input');
                        if (input) {
                            input.max = item.availableStock;
                            input.dataset.maxQty = item.availableStock;

                            // Update the plus button data-max-qty as well
                            const plusBtn = itemEl.querySelector('.qty-btn.plus');
                            if (plusBtn) {
                                plusBtn.dataset.maxQty = item.availableStock;
                            }
                        }
                    }
                });
                errorHtml += '</ul>';

                Swal.fire({
                    icon: 'warning',
                    title: 'Quantity Adjustment Needed',
                    html: `Some items in your cart exceed our current stock.<br><br>Please decrease the quantity for the highlighted items to proceed.`,
                    confirmButtonColor: '#002366',
                    confirmButtonText: 'Okay, I will adjust'
                });
            } else {
                showToast(response.data.message || 'Please review your cart', 'warning');
            }
        }
    } catch (error) {
        console.error('Error validating cart:', error);
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = '<span>Proceed to Checkout</span><span class="material-icons">arrow_forward</span>';
        }
        showToast(error.response?.data?.message || 'Unable to validate cart. Please try again.', 'error');
    }
}

// Clear entire cart
async function clearCart() {
    const result = await Swal.fire({
        title: 'Clear Cart?',
        text: 'All items will be removed from your cart. This cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, Clear All',
        cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
        try {
            const response = await axios.delete('/user/cart/clear');

            if (response.data.success) {
                // Animate removal of all cards
                const cartItems = document.querySelectorAll('.cart-item');
                cartItems.forEach((item, index) => {
                    setTimeout(() => {
                        item.classList.add('removing');
                    }, index * 50);
                });

                Swal.fire({
                    icon: 'success',
                    title: 'Cleared!',
                    text: 'Your cart has been cleared.',
                    timer: 1500,
                    showConfirmButton: false
                });

                // Reload page after animation
                setTimeout(() => {
                    location.reload();
                }, 500);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: response.data.message || 'Failed to clear cart',
                    confirmButtonColor: '#002366'
                });
            }
        } catch (error) {
            console.error('Error clearing cart:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Something went wrong. Please try again.',
                confirmButtonColor: '#002366'
            });
        }
    }
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