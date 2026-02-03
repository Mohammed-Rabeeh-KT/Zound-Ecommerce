// =============================================
// ZOUND - CHECKOUT PAGE JAVASCRIPT
// =============================================

// State
let selectedAddressId = document.getElementById('selectedAddressId')?.value || null;
let selectedPaymentMethod = 'razorpay'; // Default to razorpay
let appliedCouponCode = null;
let couponDiscount = 0;

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

function editAddressCheckout(addressId) {
    if (typeof editAddress === 'function') {
        editAddress(addressId);
    } else {
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

            document.querySelector('.coupon-input-group').style.display = 'none';
            document.getElementById('appliedCoupon').style.display = 'flex';
            document.getElementById('appliedCouponName').textContent = code;
            document.getElementById('couponSavings').textContent = `- ₹${couponDiscount.toFixed(2)}`;

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

        document.querySelector('.coupon-input-group').style.display = 'flex';
        document.getElementById('appliedCoupon').style.display = 'none';
        document.getElementById('couponCode').value = '';

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
        if (selectedPaymentMethod === 'razorpay') {
            await handleRazorpayPayment(placeOrderBtn, originalContent);
        } else {
            // COD or Wallet
            await handleDirectPayment(placeOrderBtn, originalContent);
        }
    } catch (error) {
        console.error('Error placing order:', error);
        showToast(error.response?.data?.message || 'Something went wrong. Please try again.', 'error');
        placeOrderBtn.disabled = false;
        placeOrderBtn.innerHTML = originalContent;
    }
}

// =============================================
// RAZORPAY PAYMENT HANDLER
// =============================================

async function handleRazorpayPayment(placeOrderBtn, originalContent) {
    // Step 1: Create order in backend first (with Pending payment status)
    const orderResponse = await axios.post('/user/checkout/place-order', {
        addressId: selectedAddressId,
        paymentMethod: 'razorpay',
        couponCode: appliedCouponCode
    });

    if (!orderResponse.data.success) {
        throw new Error(orderResponse.data.message);
    }

    const order = orderResponse.data.data;

    // Step 2: Create Razorpay order
    const razorpayResponse = await axios.post('/user/create-razorpay-order', {
        amount: order.finalAmount || parseFloat(document.getElementById('cartTotal').value),
        orderId: order.orderId
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
            // Payment successful - verify on server
            try {
                const verifyResponse = await axios.post('/user/verify-payment', {
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    orderId: order.orderId
                });

                if (verifyResponse.data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Payment Successful!',
                        text: 'Your order has been placed successfully.',
                        confirmButtonColor: '#002366'
                    }).then(() => {
                        window.location.href = `/user/orders/confirmation/${order.orderId}`;
                    });
                } else {
                    throw new Error('Payment verification failed');
                }
            } catch (error) {
                console.error('Verification error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Verification Failed',
                    text: 'Payment verification failed. Please contact support.',
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
            ondismiss: async function () {
                // User closed without payment
                await axios.post('/user/handle-payment-failure', {
                    orderId: order.orderId,
                    error: { description: 'Payment cancelled by user' }
                });

                placeOrderBtn.disabled = false;
                placeOrderBtn.innerHTML = originalContent;

                Swal.fire({
                    icon: 'info',
                    title: 'Payment Cancelled',
                    text: 'You can retry payment from your orders page.',
                    confirmButtonColor: '#002366'
                });
            }
        }
    };

    const razorpay = new Razorpay(options);

    razorpay.on('payment.failed', async function (response) {
        await axios.post('/user/handle-payment-failure', {
            orderId: order.orderId,
            error: response.error
        });

        placeOrderBtn.disabled = false;
        placeOrderBtn.innerHTML = originalContent;

        Swal.fire({
            icon: 'error',
            title: 'Payment Failed',
            text: response.error.description || 'Payment failed. Please try again.',
            confirmButtonColor: '#002366'
        });
    });

    razorpay.open();
}

// =============================================
// DIRECT PAYMENT (COD / WALLET)
// =============================================

async function handleDirectPayment(placeOrderBtn, originalContent) {
    const response = await axios.post('/user/checkout/place-order', {
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