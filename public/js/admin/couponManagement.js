
// Initialize icons
document.addEventListener('DOMContentLoaded', function () {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

// State variables
let allCouponsData = window.couponsData || [];
let currentTab = 'all';

// ========================
// Helper Functions
// ========================

function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById('couponCode').value = code;
}

function copyCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        Swal.fire({
            icon: 'success',
            title: 'Copied!',
            text: 'Code "' + code + '" copied to clipboard',
            timer: 1500,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    });
}

// ========================
// UI Interaction Functions
// ========================

let currentQuery = '';
let currentPage = 1;
const itemsPerPage = 10;

// Apply Pagination & Filters
function applyPagination() {
    const rows = Array.from(document.querySelectorAll('#couponsTable tbody tr'));
    let filteredRows = [];

    // Filter Step
    rows.forEach(row => {
        // Tab Filter
        const isActive = row.dataset.active === 'true';
        let matchesTab = false;
        if (currentTab === 'all') matchesTab = true;
        else if (currentTab === 'active') matchesTab = isActive;
        else if (currentTab === 'inactive') matchesTab = !isActive;

        // Search Filter
        let matchesSearch = true;
        if (currentQuery) {
            const code = row.querySelector('.coupon-code')?.textContent?.toLowerCase() || '';
            const description = row.querySelector('.coupon-description')?.textContent?.toLowerCase() || '';
            matchesSearch = code.includes(currentQuery) || description.includes(currentQuery);
        }

        if (matchesTab && matchesSearch) {
            filteredRows.push(row);
        } else {
            row.style.display = 'none';
        }
    });

    // Pagination Step
    const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages || 1;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    // Hide all first (already hidden non-matches, now hide matches outside page)
    filteredRows.forEach(row => row.style.display = 'none');

    // Show current page
    filteredRows.slice(startIndex, endIndex).forEach(row => row.style.display = '');

    renderPaginationControls(totalPages);
}

function renderPaginationControls(totalPages) {
    const container = document.getElementById('paginationControls');
    if (!container) return;

    if (totalPages <= 1) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    let html = '';

    // Previous Button
    html += `<button class="btn-icon btn-sm" style="padding: 0.25rem 0.5rem; border: 1px solid #e2e8f0; border-radius: 4px; background: ${currentPage === 1 ? '#f1f5f9' : 'white'}; cursor: ${currentPage === 1 ? 'default' : 'pointer'}" 
             onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
             <i data-lucide="chevron-left" style="width: 16px; height: 16px;"></i>
             </button>`;

    // Page Numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            const isActive = currentPage === i;
            html += `<button class="btn-sm" style="padding: 0.25rem 0.75rem; border: 1px solid ${isActive ? '#2563eb' : '#e2e8f0'}; border-radius: 4px; background: ${isActive ? '#eff6ff' : 'white'}; color: ${isActive ? '#2563eb' : '#64748b'}; font-weight: 500;" 
                     onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span style="color: #94a3b8; padding: 0 0.25rem;">...</span>`;
        }
    }

    // Next Button
    html += `<button class="btn-icon btn-sm" style="padding: 0.25rem 0.5rem; border: 1px solid #e2e8f0; border-radius: 4px; background: ${currentPage === totalPages ? '#f1f5f9' : 'white'}; cursor: ${currentPage === totalPages ? 'default' : 'pointer'}" 
             onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
             <i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i>
             </button>`;

    container.innerHTML = html;
    lucide.createIcons();
}

window.changePage = function (page) {
    currentPage = page;
    applyPagination();
};

function switchTab(tab) {
    currentTab = tab;
    currentPage = 1;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.tab-btn').classList.add('active');
    applyPagination();
}

function filterCoupons(query) {
    currentQuery = query.toLowerCase();
    currentPage = 1;
    applyPagination();
}

// Init pagination on load
document.addEventListener('DOMContentLoaded', () => {
    applyPagination();
});

function selectDiscountType(btn, type) {
    document.querySelectorAll('.discount-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('discountType').value = type;

    const label = document.getElementById('discountLabel');
    const input = document.getElementById('discountValue');

    if (type === 'percentage') {
        label.innerHTML = 'Discount Value (%) <span class="required">*</span>';
        input.max = 99;
        input.placeholder = 'e.g. 20';
    } else {
        label.innerHTML = 'Discount Value (₹) <span class="required">*</span>';
        input.removeAttribute('max');
        input.placeholder = 'e.g. 500';
    }
}

// ========================
// Modal Functions
// ========================

function openAddModal() {
    document.getElementById('couponForm').reset();
    document.getElementById('couponId').value = '';
    document.getElementById('modalTitle').textContent = 'Create New Coupon';
    document.getElementById('saveBtn').textContent = 'Create Coupon';

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = today;

    const defaultBtn = document.querySelector('.discount-type-btn');
    selectDiscountType(defaultBtn, 'percentage');

    document.getElementById('couponModal').classList.add('active');
}

async function openEditModal(couponId) {
    try {
        // Fetch coupon data from API instead of using embedded data
        const { data: result } = await axios.get('/api/admin/coupons/' + couponId);

        if (!result.success || !result.data?.coupon) {
            Swal.fire('Error', 'Coupon not found', 'error');
            return;
        }

        const coupon = result.data.coupon;

        document.getElementById('couponId').value = couponId;
        document.getElementById('modalTitle').textContent = 'Edit Coupon';
        document.getElementById('saveBtn').textContent = 'Update Coupon';

        document.getElementById('couponCode').value = coupon.code;
        document.getElementById('couponDescription').value = coupon.description || '';
        document.getElementById('discountValue').value = coupon.discountValue;
        document.getElementById('minPurchase').value = coupon.minPurchase || 0;
        document.getElementById('maxDiscount').value = coupon.maxDiscount || '';
        document.getElementById('usageLimit').value = coupon.usageLimit || '';
        document.getElementById('perUserLimit').value = coupon.perUserLimit || 1;

        document.getElementById('startDate').value = new Date(coupon.startDate).toISOString().split('T')[0];
        document.getElementById('endDate').value = new Date(coupon.endDate).toISOString().split('T')[0];

        const typeBtn = document.querySelectorAll('.discount-type-btn')[coupon.discountType === 'percentage' ? 0 : 1];
        selectDiscountType(typeBtn, coupon.discountType);

        document.getElementById('couponForm').dataset.originalValues = JSON.stringify({
            code: coupon.code,
            description: coupon.description || '',
            discountValue: String(coupon.discountValue),
            minPurchase: String(coupon.minPurchase || 0),
            maxDiscount: String(coupon.maxDiscount || ''),
            usageLimit: String(coupon.usageLimit || ''),
            perUserLimit: String(coupon.perUserLimit || 1),
            startDate: new Date(coupon.startDate).toISOString().split('T')[0],
            endDate: new Date(coupon.endDate).toISOString().split('T')[0],
            discountType: coupon.discountType
        });

        document.getElementById('couponModal').classList.add('active');
    } catch (error) {
        console.error('Error fetching coupon:', error);
        Swal.fire('Error', 'Failed to load coupon data', 'error');
    }
}

function closeModal() {
    document.getElementById('couponModal').classList.remove('active');
}

// Close modal on outside click
document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('couponModal');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === this) closeModal();
        });
    }
});

// ========================
// API Actions
// ========================

async function saveCoupon() {
    const form = document.getElementById('couponForm');
    const formData = new FormData(form);
    const couponId = formData.get('couponId');

    const data = {
        code: formData.get('code').toUpperCase().trim(),
        description: formData.get('description'),
        discountType: formData.get('discountType'),
        discountValue: Number(formData.get('discountValue')),
        minPurchase: Number(formData.get('minPurchase')) || 0,
        maxDiscount: formData.get('maxDiscount') ? Number(formData.get('maxDiscount')) : null,
        usageLimit: formData.get('usageLimit') ? Number(formData.get('usageLimit')) : null,
        perUserLimit: Number(formData.get('perUserLimit')) || 1,
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate')
    };

    // Validation
    document.querySelectorAll('#couponForm .error-message').forEach(el => el.textContent = '');
    let isValid = true;

    if (!data.code) {
        document.getElementById('couponCodeError').textContent = 'Coupon code is required';
        isValid = false;
    } else if (!/^[A-Z0-9]{3,20}$/.test(data.code)) {
        document.getElementById('couponCodeError').textContent = 'Must be 3-20 alphanumeric characters';
        isValid = false;
    }

    if (!data.description || data.description.trim() === '') {
        document.getElementById('couponDescriptionError').textContent = 'Description is required';
        isValid = false;
    }

    if (!data.discountValue || data.discountValue <= 0) {
        document.getElementById('discountValueError').textContent = 'Invalid discount value';
        isValid = false;
    } else if (data.discountType === 'percentage' && data.discountValue > 99) {
        document.getElementById('discountValueError').textContent = 'Percentage cannot exceed 99%';
        isValid = false;
    } else if (data.discountType === 'fixed' && data.discountValue > 50000) {
        document.getElementById('discountValueError').textContent = 'Fixed discount cannot exceed ₹50,000';
        isValid = false;
    }

    if (data.minPurchase === null || data.minPurchase === undefined || data.minPurchase < 0 || String(formData.get('minPurchase')).trim() === '') {
        document.getElementById('minPurchaseError').textContent = 'Minimum purchase limit is required';
        isValid = false;
    }
    if (formData.get('maxDiscount') && Number(formData.get('maxDiscount')) <= 0) {
        document.getElementById('maxDiscountError').textContent = 'Max discount must be greater than 0';
        isValid = false;
    }

    if (formData.get('usageLimit') !== null && formData.get('usageLimit').trim() !== '' && Number(formData.get('usageLimit')) <= 0) {
        document.getElementById('usageLimitError').textContent = 'Usage limit must be at least 1';
        isValid = false;
    }

    if (!formData.get('perUserLimit') || Number(formData.get('perUserLimit')) <= 0) {
        document.getElementById('perUserLimitError').textContent = 'Per user limit must be at least 1';
        isValid = false;
    }

    if (!data.startDate) {
        document.getElementById('startDateError').textContent = 'Start date is required';
        isValid = false;
    }

    if (!data.endDate) {
        document.getElementById('endDateError').textContent = 'End date is required';
        isValid = false;
    } else if (data.startDate && new Date(data.endDate) <= new Date(data.startDate)) {
        document.getElementById('endDateError').textContent = 'End date must be after start date';
        isValid = false;
    }

    if (!isValid) {
        Swal.fire({ icon: 'error', title: 'Invalid Input', text: 'Please fill all required fields correctly.', confirmButtonColor: '#002366' });
        return;
    }

    if (couponId && form.dataset.originalValues) {
        const currentValues = {
            code: formData.get('code').toUpperCase().trim(),
            description: formData.get('description') || '',
            discountValue: String(formData.get('discountValue')),
            minPurchase: String(formData.get('minPurchase') || 0),
            maxDiscount: String(formData.get('maxDiscount') || ''),
            usageLimit: String(formData.get('usageLimit') || ''),
            perUserLimit: String(formData.get('perUserLimit') || 1),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            discountType: formData.get('discountType')
        };

        if (JSON.stringify(currentValues) === form.dataset.originalValues) {
            Swal.fire('No changes made', 'Please update at least one field before saving.', 'error');
            return;
        }
    }

    try {
        const url = couponId ? '/api/admin/coupons/' + couponId : '/api/admin/coupons';
        const method = couponId ? 'PUT' : 'POST';

        const response = await axios({ method, url, data });

        const result = response.data;

        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: couponId ? 'Coupon updated successfully' : 'Coupon created successfully',
                timer: 1500,
                showConfirmButton: false
            }).then(() => location.reload());
        } else {
            Swal.fire('Error', result.message || 'Action failed', 'error');
        }
    } catch (error) {
        console.error('Error saving coupon:', error);

        // Show backend validation error if available
        const errorMessage = error.response?.data?.message ||
            error.response?.data?.error ||
            'Something went wrong. Please try again.';

        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage,
            confirmButtonColor: '#ef4444'
        });
    }
}

async function toggleCouponStatus(id, event) {
    const isActive = event.target.checked;

    try {
        const response = await axios.patch('/api/admin/coupons/' + id + '/toggle', { isActive });

        const result = response.data;

        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: isActive ? 'Coupon Activated' : 'Coupon Deactivated',
                timer: 1500,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
            setTimeout(() => location.reload(), 1500);
        } else {
            event.target.checked = !isActive;
            Swal.fire('Error', result.message || 'Failed to update status', 'error');
        }
    } catch (error) {
        console.error('Error toggling coupon status:', error);

        // Show backend validation error if available
        const errorMessage = error.response?.data?.message ||
            error.response?.data?.error ||
            'Something went wrong. Please try again.';

        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage,
            confirmButtonColor: '#ef4444'
        });

        event.target.checked = !isActive;
    }
}

async function deleteCoupon(id) {
    const confirm = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    });

    if (confirm.isConfirmed) {
        try {
            const { data: result } = await axios.delete('/api/admin/coupons/' + id);

            if (result.success) {
                Swal.fire('Deleted!', 'Coupon has been deleted.', 'success')
                    .then(() => location.reload());
            } else {
                Swal.fire('Error', result.message || 'Failed to delete', 'error');
            }
        } catch (error) {
            console.error('Error deleting coupon:', error);

            // Show backend validation error if available
            const errorMessage = error.response?.data?.message ||
                error.response?.data?.error ||
                'Something went wrong. Please try again.';

            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage,
                confirmButtonColor: '#ef4444'
            });
        }
    }
}
