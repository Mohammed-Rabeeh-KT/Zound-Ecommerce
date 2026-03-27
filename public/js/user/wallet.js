// =======================
// PAGINATION RENDERER
// =======================
window.renderWalletTransactions = function(data) {
    const transactions = data.transactions || [];
    
    if (transactions.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-icon">
                    <span class="material-icons">account_balance_wallet</span>
                </div>
                <h3>No transactions found</h3>
                <p>There are no transactions on this page.</p>
            </div>
        `;
    }

    return transactions.map(t => {
        const isCredit = t.type === 'Credit';
        const iconClass = isCredit ? 'credit' : 'debit';
        const iconName = isCredit ? 'arrow_downward' : 'arrow_upward';
        const title = t.description || (isCredit ? 'Money Added' : 'Payment');
        const sign = isCredit ? '+' : '-';
        const amountStr = Number(t.amount).toFixed(2);
        
        const dateStr = new Date(t.date).toLocaleDateString('en-US', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        return `
            <div class="transaction-item">
                <div class="t-left">
                    <div class="t-icon ${iconClass}">
                        <span class="material-icons">${iconName}</span>
                    </div>
                    <div class="t-details">
                        <h4>${title}</h4>
                        <p>${dateStr}</p>
                    </div>
                </div>
                <div class="t-right">
                    <span class="t-amount ${iconClass}">${sign}₹${amountStr}</span>
                    <span class="t-status">Success</span>
                </div>
            </div>
        `;
    }).join('');
};

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
        toast.error('Please enter a valid amount');
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
        toast.error('Something went wrong');
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
        toast.error('Please enter a valid amount');
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
        toast.error('Something went wrong');
    }
}

// Common Razorpay Function
function initiateRazorpay(order) {
    if (typeof razorpayKeyId === 'undefined') {
        console.error('Razorpay Key ID not defined');
        toast.error('Configuration error');
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
                    toast.success('Money added successfully!');
                    setTimeout(() => location.reload(), 1000);
                } else {
                    toast.error('Payment verification failed');
                }
            } catch (err) {
                console.error(err);
                toast.error('Verification error');
            }
        },
        "theme": {
            "color": "#002366"
        }
    };
    const rzp1 = new Razorpay(options);
    rzp1.open();
}
