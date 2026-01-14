// =============================================
// ZOUND - CHECKOUT PAGE JAVASCRIPT
// =============================================

// State
let selectedAddressId = document.getElementById('selectedAddressId')?.value || null;

// =============================================
// ADDRESS SELECTION
// =============================================

function selectAddress(addressId) {
    // Update state
    selectedAddressId = addressId;
    document.getElementById('selectedAddressId').value = addressId;

    // Update UI
    document.querySelectorAll('.address-card').forEach(card => {
        card.classList.remove('selected');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = false;
    });

    const selectedCard = document.querySelector(`.address-card[data-address-id="${addressId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
        const radio = selectedCard.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
    }
}

function showAddAddressModal() {
    // Use the inline address form from addresses.js (included via partial)
    if (typeof toggleAddressForm === 'function') {
        toggleAddressForm();
    } else {
        // Fallback to redirect if addresses.js not loaded
        window.location.href = '/user/profile/addresses?redirect=checkout';
    }
}

// editAddress function is already defined in addresses.js, 
// but we need a version that works inline on checkout
function editAddressCheckout(addressId) {
    // Use the inline edit from addresses.js
    if (typeof editAddress === 'function') {
        editAddress(addressId);
    } else {
        // Fallback to redirect
        window.location.href = `/user/profile/addresses?edit=${addressId}&redirect=checkout`;
    }
}

// =============================================
// PAYMENT METHOD SELECTION
// =============================================

function selectPayment(method) {
    const option = document.querySelector(`.payment-option[data-method="${method}"]`);
    if (option && option.classList.contains('disabled')) {
        showToast('This payment method is not available', 'warning');
        return;
    }

    // Check wallet balance
    if (method === 'wallet') {
        const cartTotal = parseFloat(document.getElementById('cartTotal').value);
        const walletBalance = parseFloat(document.querySelector('.payment-option[data-method="wallet"] .payment-info p')?.textContent?.match(/[\d.]+/)?.[0] || 0);

        if (walletBalance < cartTotal) {
            showToast('Insufficient wallet balance', 'warning');
            return;
        }
    }

    // Update state
    selectedPaymentMethod = method;

    // Update UI
    document.querySelectorAll('.payment-option').forEach(opt => {
        opt.classList.remove('selected');
        opt.querySelector('input[type="radio"]').checked = false;
    });

    const selectedOption = document.querySelector(`.payment-option[data-method="${method}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
        selectedOption.querySelector('input[type="radio"]').checked = true;
    }
}

// =============================================
// COUPON FUNCTIONALITY
// =============================================

async function applyCoupon() {
    const couponInput = document.getElementById('couponCode');
    const code = couponInput.value.trim().toUpperCase();

    if (!code) {
        showToast('Please enter a coupon code', 'warning');
        return;
    }

    try {
        const response = await axios.post('/user/checkout/apply-coupon', {
            couponCode: code
        });

        if (response.data.success) {
            appliedCouponCode = code;
            couponDiscount = response.data.data.discount;

            // Update UI
            document.querySelector('.coupon-input-group').style.display = 'none';
            document.getElementById('appliedCoupon').style.display = 'flex';
            document.getElementById('appliedCouponName').textContent = code;
            document.getElementById('couponSavings').textContent = `- ₹${couponDiscount.toFixed(2)}`;

            // Update price display
            updatePriceDisplay();

            showToast('Coupon applied successfully!', 'success');
        } else {
            showToast(response.data.message || 'Invalid coupon code', 'error');
        }
    } catch (error) {
        console.error('Error applying coupon:', error);
        showToast(error.response?.data?.message || 'Failed to apply coupon', 'error');
    }
}

function applyCouponCode(code) {
    document.getElementById('couponCode').value = code;
    applyCoupon();
}

async function removeCoupon() {
    try {
        await axios.post('/user/checkout/remove-coupon');

        appliedCouponCode = null;
        couponDiscount = 0;

        // Update UI
        document.querySelector('.coupon-input-group').style.display = 'flex';
        document.getElementById('appliedCoupon').style.display = 'none';
        document.getElementById('couponCode').value = '';

        // Update price display
        updatePriceDisplay();

        showToast('Coupon removed', 'success');
    } catch (error) {
        console.error('Error removing coupon:', error);
        showToast('Failed to remove coupon', 'error');
    }
}

function updatePriceDisplay() {
    const subtotal = parseFloat(document.getElementById('cartSubtotal').value);
    const shippingText = document.getElementById('shippingAmount').textContent;
    const shipping = shippingText === 'FREE' ? 0 : parseFloat(shippingText.replace('₹', ''));

    const discountRow = document.getElementById('discountRow');
    const discountAmount = document.getElementById('discountAmount');
    const totalAmount = document.getElementById('totalAmount');

    if (couponDiscount > 0) {
        discountRow.style.display = 'flex';
        discountAmount.textContent = `-₹${couponDiscount.toFixed(2)}`;
    } else {
        discountRow.style.display = 'none';
    }

    const newTotal = subtotal - couponDiscount + shipping;
    totalAmount.textContent = `₹${newTotal.toFixed(2)}`;
    document.getElementById('cartTotal').value = newTotal;
}

// =============================================
// PLACE ORDER
// =============================================

async function placeOrder() {
    // Validate address
    if (!selectedAddressId) {
        showToast('Please select a delivery address', 'warning');
        document.getElementById('addressSection').scrollIntoView({ behavior: 'smooth' });
        return;
    }

    // Validate payment method
    if (!selectedPaymentMethod) {
        showToast('Please select a payment method', 'warning');
        document.getElementById('paymentSection').scrollIntoView({ behavior: 'smooth' });
        return;
    }

    const placeOrderBtn = document.getElementById('placeOrderBtn');
    const originalContent = placeOrderBtn.innerHTML;

    // Loading state
    placeOrderBtn.disabled = true;
    placeOrderBtn.innerHTML = `
        <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-dasharray="31.4" stroke-dashoffset="10"></circle>
        </svg>
        Processing...
    `;

    try {
        const orderData = {
            addressId: selectedAddressId,
            paymentMethod: selectedPaymentMethod,
            couponCode: appliedCouponCode
        };

        if (selectedPaymentMethod === 'razorpay') {
            // Initialize Razorpay payment
            const response = await axios.post('/user/checkout/create-order', orderData);

            if (response.data.success) {
                if (response.data.data.razorpayOrderId) {
                    // Open Razorpay checkout
                    openRazorpayCheckout(response.data.data);
                }
            } else {
                showToast(response.data.message || 'Failed to create order', 'error');
                placeOrderBtn.disabled = false;
                placeOrderBtn.innerHTML = originalContent;
            }
        } else {
            // Direct order for COD and Wallet
            const response = await axios.post('/user/checkout/place-order', orderData);

            if (response.data.success) {
                // Redirect to confirmation page
                window.location.href = `/user/orders/confirmation/${response.data.data.orderId}`;
            } else {
                showToast(response.data.message || 'Failed to place order', 'error');
                placeOrderBtn.disabled = false;
                placeOrderBtn.innerHTML = originalContent;
            }
        }
    } catch (error) {
        console.error('Error placing order:', error);
        showToast(error.response?.data?.message || 'Something went wrong. Please try again.', 'error');
        placeOrderBtn.disabled = false;
        placeOrderBtn.innerHTML = originalContent;
    }
}
// =============================================
// PLACE ORDER (COD ONLY)
// =============================================
async function placeOrder() {
    // Validate address
    if (!selectedAddressId) {
        showToast('Please select a delivery address', 'warning');
        document.getElementById('addressSection').scrollIntoView({ behavior: 'smooth' });
        return;
    }
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    const originalContent = placeOrderBtn.innerHTML;
    // Loading state
    placeOrderBtn.disabled = true;
    placeOrderBtn.innerHTML = `
        <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-dasharray="31.4" stroke-dashoffset="10"></circle>
        </svg>
        Processing...
    `;
    try {
        const response = await axios.post('/user/checkout/place-order', {
            addressId: selectedAddressId
        });
        if (response.data.success) {
            // Redirect to confirmation page
            window.location.href = `/user/orders/confirmation/${response.data.data.orderId}`;
        } else {
            showToast(response.data.message || 'Failed to place order', 'error');
            placeOrderBtn.disabled = false;
            placeOrderBtn.innerHTML = originalContent;
        }
    } catch (error) {
        console.error('Error placing order:', error);
        showToast(error.response?.data?.message || 'Something went wrong. Please try again.', 'error');
        placeOrderBtn.disabled = false;
        placeOrderBtn.innerHTML = originalContent;
    }
}
// =============================================
// UTILITY FUNCTIONS
// =============================================
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
// =============================================
// INITIALIZATION
// =============================================
document.addEventListener('DOMContentLoaded', function () {
    // Select default address if available
    const defaultAddressCard = document.querySelector('.address-card.selected');
    if (defaultAddressCard) {
        selectedAddressId = defaultAddressCard.dataset.addressId;
    }
    // Add spinner animation style
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .spinner {
            animation: spin 1s linear infinite;
        }
    `;
    document.head.appendChild(style);
});
