
// =======================
// DROPDOWN VARIANT LOGIC
// =======================
const dropdown = document.getElementById('addMoneyDropdown');
const amountInput = document.getElementById('addAmount');

function toggleAddMoneyDropdown(e) {
    e.stopPropagation();
    if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
    } else {
        dropdown.style.display = 'block';
        amountInput.focus();
        updatePayButton();
    }
}

function setAmount(val, e) {
    if (e) e.stopPropagation();
    amountInput.value = val;
    updatePayButton();
}

function updatePayButton() {
    const val = amountInput.value || 0;
    const btn = document.getElementById('payBtnAmount');
    if (btn) btn.textContent = `₹${val}`;
}

// Close dropdown when clicking outside
window.addEventListener('click', function (event) {
    if (dropdown && !event.target.closest('.add-money-dropdown') && !event.target.closest('.add-money-btn')) {
        dropdown.style.display = 'none';
    }
});

if (dropdown) {
    // Prevent dropdown click from closing itself
    dropdown.onclick = function (e) {
        e.stopPropagation();
    }
}

async function processAddMoney() {
    const amount = amountInput.value;
    if (!amount || amount <= 0) {
        Swal.fire('Error', 'Please enter a valid amount', 'error');
        return;
    }

    try {
        const response = await axios.post('/api/user/wallet/add-money', { amount });
        if (response.data.success) {
            const { order } = response.data;
            initiateRazorpay(order);
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Something went wrong', 'error');
    }
}


// ====================
// MODAL VARIANT LOGIC
// ====================
const addMoneyModalOverlay = document.getElementById('addMoneyModal');
const modalAmountInput = document.getElementById('modalAddAmount');

function openAddMoneyModal() {
    if (addMoneyModalOverlay) {
        addMoneyModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        modalAmountInput.value = '';
        updateModalPayButton();
    }
}

function closeAddMoneyModal() {
    if (addMoneyModalOverlay) {
        addMoneyModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function setModalAmount(val) {
    if (!modalAmountInput) return;
    modalAmountInput.value = val;
    updateModalPayButton();
    // Add active class to clicked chip
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    // Note: event is accessible here if called from onclick
    if (window.event && window.event.target) {
        window.event.target.classList.add('active');
    }
}

function updateModalPayButton() {
    if (!modalAmountInput) return;
    const val = modalAmountInput.value || 0;
    const btn = document.getElementById('modalPayBtnAmount');
    if (btn) btn.textContent = `₹${Number(val).toLocaleString('en-IN')}`;
}

// Close modal on overlay click
if (addMoneyModalOverlay) {
    addMoneyModalOverlay.addEventListener('click', function (e) {
        if (e.target === addMoneyModalOverlay) {
            closeAddMoneyModal();
        }
    });
}

// Close modal on Escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeAddMoneyModal();
    }
});

async function processModalAddMoney() {
    const amount = modalAmountInput.value;
    if (!amount || amount <= 0) {
        Swal.fire('Error', 'Please enter a valid amount', 'error');
        return;
    }

    try {
        const response = await axios.post('/api/user/wallet/add-money', { amount });
        if (response.data.success) {
            closeAddMoneyModal(); // Close modal before opening RZP
            const { order } = response.data;
            initiateRazorpay(order);
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Something went wrong', 'error');
    }
}

// Common Razorpay Function
function initiateRazorpay(order) {
    if (typeof razorpayKeyId === 'undefined') {
        console.error('Razorpay Key ID not defined');
        Swal.fire('Error', 'Configuration error', 'error');
        return;
    }

    const options = {
        "key": razorpayKeyId,
        "amount": order.amount,
        "currency": "INR",
        "name": "ZOUND",
        "description": "Wallet Recharge",
        "order_id": order.id,
        "handler": async function (response) {
            try {
                const verifyRes = await axios.post('/api/user/wallet/verify-payment', {
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature
                });

                if (verifyRes.data.success) {
                    Swal.fire('Success', 'Money added successfully!', 'success')
                        .then(() => location.reload());
                } else {
                    Swal.fire('Error', 'Payment verification failed', 'error');
                }
            } catch (err) {
                console.error(err);
                Swal.fire('Error', 'Verification error', 'error');
            }
        },
        "theme": {
            "color": "#002366"
        }
    };
    const rzp1 = new Razorpay(options);
    rzp1.open();
}
