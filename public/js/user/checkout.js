// =============================================
// ZOUND - CHECKOUT PAGE JAVASCRIPT
// =============================================

// State
let selectedAddressId = document.getElementById('selectedAddressId')?.value || null;
let selectedPaymentMethod = 'razorpay'; // Default to razorpay
let appliedCouponCode = window.SERVER_DATA?.appliedCouponCode || null;
let couponDiscount = window.SERVER_DATA?.couponDiscount || 0;

// =============================================
// ADDRESS SELECTION
// =============================================

function selectAddress(addressId) {
    selectedAddressId = addressId;
    document.getElementById('selectedAddressId').value = addressId;

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
    if (typeof toggleAddressForm === 'function') {
        toggleAddressForm();
    } else {
        window.location.href = '/user/profile/addresses?redirect=checkout';
    }
}

function editAddress(addressId) {
    // Check if the addresses.js editAddress function is available
    if (typeof window.editAddress === 'function') {
        // Call the editAddress function from addresses.js
        window.editAddress(addressId);
    } else {
        // Fallback: redirect to addresses page with edit parameter
        window.location.href = `/user/profile/addresses?edit=${addressId}&redirect=checkout`;
    }
}

function deleteAddressCheckout(addressId) {
    // Check if the addresses.js deleteAddress function is available
    if (typeof window.deleteAddress === 'function') {
        // Call the deleteAddress function from addresses.js
        window.deleteAddress(addressId);
    } else {
        // Fallback: redirect to addresses page with delete parameter
        window.location.href = `/user/profile/addresses?delete=${addressId}&redirect=checkout`;
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

    // Check COD restriction - orders above ₹1000
    if (method === 'cod') {
        const cartTotal = parseFloat(document.getElementById('cartTotal').value);
        if (cartTotal > 1000) {
            showToast('Cash on Delivery is not available for orders above ₹1,000. Please choose online payment.', 'warning');
            return;
        }
    }

    selectedPaymentMethod = method;

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

// Toggle coupon section expand/collapse
function toggleCouponSection() {
    const section = document.querySelector('.coupon-section');
    section.classList.toggle('expanded');
}

async function applyCoupon() {
    const couponInput = document.getElementById('couponCode');
    const code = couponInput.value.trim().toUpperCase();

    if (!code) {
        showToast('Please enter a coupon code', 'warning');
        return;
    }
    const cartSubtotal = parseFloat(document.getElementById('cartSubtotal').value);

    try {
        const response = await axios.post('/api/user/checkout/apply-coupon', {
            code: code,
            cartSubtotal: cartSubtotal
        });

        if (response.data.success) {
            appliedCouponCode = code;
            couponDiscount = response.data.data.discountAmount;

            // Hide input row, show applied coupon
            document.querySelector('.coupon-input-row').style.display = 'none';
            document.getElementById('appliedCoupon').style.display = 'flex';
            document.getElementById('appliedCouponName').textContent = code;
            document.getElementById('couponSavings').textContent = `Saving ₹${couponDiscount.toFixed(2)}`;

            // Hide available coupons
            const availableCoupons = document.querySelector('.available-coupons-compact');
            if (availableCoupons) availableCoupons.style.display = 'none';

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
        await axios.delete('/api/user/checkout/remove-coupon');

        appliedCouponCode = null;
        couponDiscount = 0;

        // Show input row, hide applied coupon
        document.querySelector('.coupon-input-row').style.display = 'flex';
        document.getElementById('appliedCoupon').style.display = 'none';
        document.getElementById('couponCode').value = '';

        // Show available coupons again
        const availableCoupons = document.querySelector('.available-coupons-compact');
        if (availableCoupons) availableCoupons.style.display = 'flex';

        updatePriceDisplay();
        showToast('Coupon removed', 'success');
    } catch (error) {
        console.error('Error removing coupon:', error);
        showToast('Failed to remove coupon', 'error');
    }
}

function updatePriceDisplay() {
    const subtotal = parseFloat(document.getElementById('cartSubtotal').value) || 0;
    const shippingText = document.getElementById('shippingAmount').textContent.trim();
    const shippingMatch = shippingText.match(/[\d.]+/);
    const shipping = (shippingText === 'FREE' || !shippingMatch) ? 0 : parseFloat(shippingMatch[0]);

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
        if (selectedPaymentMethod === 'razorpay') {
            await handleRazorpayPayment(placeOrderBtn, originalContent);
        } else {
            // COD or Wallet
            await handleDirectPayment(placeOrderBtn, originalContent);
        }
    } catch (error) {
        console.error('Error placing order:', error);
        const errorMessage = error.response?.data?.message || 'Something went wrong. Please try again.';

        // Check if it's a stock/quantity error
        if (errorMessage.toLowerCase().includes('units of') ||
            errorMessage.toLowerCase().includes('out of stock') ||
            errorMessage.toLowerCase().includes('available')) {
            // Show SweetAlert with options for stock errors
            Swal.fire({
                icon: 'warning',
                title: 'Insufficient Stock',
                html: `<p>${errorMessage}</p><p class="text-muted mt-2">Choose an option to resolve this issue:</p>`,
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: '<i class="bi bi-trash"></i> Remove Unavailable Items',
                denyButtonText: '<i class="bi bi-cart"></i> Go to Cart',
                cancelButtonText: 'Stay Here',
                confirmButtonColor: '#dc2626',
                denyButtonColor: '#002366',
                cancelButtonColor: '#6c757d'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    // Remove unavailable items from cart
                    try {
                        Swal.fire({
                            title: 'Removing unavailable items...',
                            allowOutsideClick: false,
                            didOpen: () => Swal.showLoading()
                        });

                        const response = await axios.delete('/api/user/cart/remove-unavailable');

                        if (response.data.success) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Cart Updated!',
                                text: response.data.message,
                                confirmButtonColor: '#002366'
                            }).then(() => {
                                window.location.href = '/user/cart';
                            });
                        }
                    } catch (err) {
                        Swal.fire('Error', 'Failed to remove items', 'error');
                    }
                } else if (result.isDenied) {
                    // Just go to cart for manual editing
                    window.location.href = '/user/cart';
                }
            });
        } else {
            showToast(errorMessage, 'error');
        }

        placeOrderBtn.disabled = false;
        placeOrderBtn.innerHTML = originalContent;
    }
}

// =============================================
// RAZORPAY PAYMENT HANDLER
// =============================================

async function handleRazorpayPayment(placeOrderBtn, originalContent) {
    // Step 1: Get cart total for Razorpay order
    const cartTotal = parseFloat(document.getElementById('cartTotal').value);

    // Step 2: Create Razorpay order FIRST (without placing actual order)
    const razorpayResponse = await axios.post('/api/user/payment/create-order', {
        amount: cartTotal,
        // Don't pass orderId - we haven't created the order yet
    });

    if (!razorpayResponse.data.success) {
        throw new Error(razorpayResponse.data.message);
    }

    const razorpayData = razorpayResponse.data.data;

    // Step 3: Open Razorpay checkout modal
    const options = {
        key: razorpayData.keyId,
        amount: razorpayData.amount,
        currency: razorpayData.currency,
        name: 'ZOUND',
        description: 'Order Payment',
        image: '/images/logo.png',
        order_id: razorpayData.razorpayOrderId,
        handler: async function (response) {
            // Payment successful - NOW place the order
            try {
                // Step 4: Place order with payment details
                const orderResponse = await axios.post('/api/user/checkout/place-order', {
                    addressId: selectedAddressId,
                    paymentMethod: 'razorpay',
                    couponCode: appliedCouponCode,
                    paymentDetails: {
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature
                    }
                });

                if (orderResponse.data.success) {
                    const order = orderResponse.data.data;
                    window.location.href = `/user/orders/confirmation/${order.orderId}`;
                } else {
                    throw new Error(orderResponse.data.message || 'Failed to place order');
                }
            } catch (error) {
                console.error('Order creation error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Order Failed',
                    text: 'Payment was successful but order creation failed. Please contact support.',
                    confirmButtonColor: '#002366'
                });
            }
        },
        prefill: {
            name: '',
            email: '',
            contact: ''
        },
        theme: {
            color: '#002366'
        },
        modal: {
            ondismiss: function () {
                // User closed without payment - redirect to payment failed page
                window.location.href = '/user/checkout/payment-failed';
            }
        }
    };

    const razorpay = new Razorpay(options);

    razorpay.on('payment.failed', function (response) {
        // Payment failed - redirect to payment failed page
        console.error('Payment failed:', response.error);
        window.location.href = '/user/checkout/payment-failed';
    });

    razorpay.open();
}

// =============================================
// DIRECT PAYMENT (COD / WALLET)
// =============================================

async function handleDirectPayment(placeOrderBtn, originalContent) {
    const response = await axios.post('/api/user/checkout/place-order', {
        addressId: selectedAddressId,
        paymentMethod: selectedPaymentMethod,
        couponCode: appliedCouponCode
    });

    if (response.data.success) {
        window.location.href = `/user/orders/confirmation/${response.data.data.orderId}`;
    } else {
        showToast(response.data.message || 'Failed to place order', 'error');
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

    // Set default payment method
    const defaultPayment = document.querySelector('input[name="paymentMethod"]:checked');
    if (defaultPayment) {
        selectedPaymentMethod = defaultPayment.value;
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