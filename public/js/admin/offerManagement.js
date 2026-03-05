let currentTab = 'all';

function switchTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (typeof event !== 'undefined') {
        event.currentTarget.classList.add('active');
    }

    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}-offers`).classList.add('active');

    const addBtn = document.getElementById('addOfferBtn');
    if (addBtn) {
        if (tabName === 'referral' || tabName === 'all' || tabName === 'scheduled') {
            addBtn.style.display = 'none';
        } else {
            addBtn.style.display = 'flex';
        }
    }
}

function openAddModal() {
    const modal = document.getElementById(`${currentTab}OfferModal`);
    if (modal) {
        modal.classList.add('active');
        setDefaultDates(currentTab);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

function setDefaultDates(type) {
    const today = new Date().toISOString().split('T')[0];
    const form = document.getElementById(`add${type.charAt(0).toUpperCase() + type.slice(1)}OfferForm`);
    if (form) {
        const startInput = form.querySelector('input[name="startOn"]');
        if (startInput && !startInput.value) startInput.value = today;
    }
}

function selectDiscountType(btn, type, offerType) {
    // Update UI
    btn.parentElement.querySelectorAll('.discount-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Update hidden input
    document.getElementById(`${offerType}DiscountType`).value = type;

    // Update label
    const label = document.getElementById(`${offerType}DiscountLabel`);
    label.textContent = type === 'percentage' ? 'Discount Value (%)' : 'Discount Value (₹)';

    // Update input validation
    const form = document.getElementById(`add${offerType.charAt(0).toUpperCase() + offerType.slice(1)}OfferForm`);
    const input = form.querySelector('input[name="discountValue"]');
    if (type === 'percentage') {
        input.max = 99;
        input.placeholder = 'e.g. 20';
    } else {
        input.removeAttribute('max');
        input.placeholder = 'e.g. 500';
    }
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
        }
    });
});

async function searchProducts(query) {
    const suggestionsDiv = document.getElementById('productSuggestions');
    if (query.length < 1) {
        suggestionsDiv.style.display = 'none';
        return;
    }

    try {
        const { data: result } = await axios.get(`/api/admin/products/search?q=${encodeURIComponent(query)}`);

        suggestionsDiv.innerHTML = '';
        if (result.success && result.data.length > 0) {
            result.data.forEach(p => {
                const div = document.createElement('div');
                div.className = 'autocomplete-item';
                div.innerText = p.productName;
                div.onclick = () => {
                    document.getElementById('productSearch').value = p.productName;
                    document.getElementById('selectedProductId').value = p._id;
                    suggestionsDiv.style.display = 'none';
                };
                suggestionsDiv.appendChild(div);
            });
            suggestionsDiv.style.display = 'block';
        } else {
            suggestionsDiv.innerHTML = '<div class="autocomplete-item" style="color: #999;">No products found</div>';
            suggestionsDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Error searching products:', error);
    }
}

async function submitOffer(type) {
    const form = document.getElementById(`add${type.charAt(0).toUpperCase() + type.slice(1)}OfferForm`);
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Basic validation
    if (!data.name || !data.discountValue || !data.startOn || !data.expireOn) {
        Swal.fire({ icon: 'error', title: 'Missing Fields', text: 'Please fill all required fields.', confirmButtonColor: '#002366' });
        return;
    }

    // Type-specific validation
    if (type === 'product' && !data.productId) {
        Swal.fire({ icon: 'error', title: 'Missing Product', text: 'Please select a product.', confirmButtonColor: '#002366' });
        return;
    }
    if (type === 'category' && !data.categoryId) {
        Swal.fire({ icon: 'error', title: 'Missing Category', text: 'Please select a category.', confirmButtonColor: '#002366' });
        return;
    }
    if (type === 'brand' && !data.brandId) {
        Swal.fire({ icon: 'error', title: 'Missing Brand', text: 'Please select a brand.', confirmButtonColor: '#002366' });
        return;
    }

    // Date validation
    const startDate = new Date(data.startOn);
    const endDate = new Date(data.expireOn);
    if (endDate <= startDate) {
        Swal.fire({ icon: 'error', title: 'Invalid Dates', text: 'End date must be after start date.', confirmButtonColor: '#002366' });
        return;
    }

    // Discount validation
    const discountValue = parseFloat(data.discountValue);
    if (isNaN(discountValue) || discountValue < 1) {
        Swal.fire({ icon: 'error', title: 'Invalid Discount', text: 'Discount value must be at least 1.', confirmButtonColor: '#002366' });
        return;
    }
    if (data.discountType === 'percentage' && discountValue > 99) {
        Swal.fire({ icon: 'error', title: 'Invalid Discount', text: 'Percentage discount cannot exceed 99%.', confirmButtonColor: '#002366' });
        return;
    }

    try {
        const response = await axios.post(`/api/admin/offers/${type}/add`, data);

        const result = response.data;

        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Offer Created!',
                text: result.message,
                confirmButtonColor: '#002366'
            }).then(() => {
                closeModal(`${type}OfferModal`);
                location.reload();
            });
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message, confirmButtonColor: '#ef4444' });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Something went wrong. Please try again.', confirmButtonColor: '#ef4444' });
    }
}

async function deleteOffer(id, type) {
    Swal.fire({
        title: 'Delete Offer?',
        text: "This action cannot be undone.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const { data: data } = await axios.delete(`/api/admin/offers/${type}/${id}`);

                if (data.success) {
                    Swal.fire({ icon: 'success', title: 'Deleted!', text: data.message, confirmButtonColor: '#002366' }).then(() => location.reload());
                } else {
                    Swal.fire({ icon: 'error', title: 'Error!', text: data.message, confirmButtonColor: '#ef4444' });
                }
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Error!', text: 'Something went wrong.', confirmButtonColor: '#ef4444' });
            }
        }
    });
}

// Pagination System
const pageState = { all: 1, product: 1, category: 1, brand: 1, scheduled: 1 };
const itemsPerPage = 10;
const searchState = { all: '', product: '', category: '', brand: '', scheduled: '' };

function filterTable(tableId, query) {
    const type = tableId.replace('Table', '');
    searchState[type] = query.toLowerCase();
    pageState[type] = 1;
    paginateTable(type);
}

function paginateTable(type) {
    const tableId = type + 'Table';
    const table = document.getElementById(tableId);
    if (!table) return;

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr'));
    let dataRows = rows.filter(r => !r.classList.contains('empty-state'));
    const emptyRow = rows.find(r => r.classList.contains('empty-state'));

    const query = searchState[type];
    let visibleRows = [];

    // Filter
    dataRows.forEach(row => {
        if (!query) {
            visibleRows.push(row);
        } else {
            const text = row.textContent.toLowerCase();
            if (text.includes(query)) visibleRows.push(row);
        }
    });

    // Handle Empty State
    if (visibleRows.length === 0) {
        dataRows.forEach(r => r.style.display = 'none');
        if (emptyRow) emptyRow.style.display = '';
        renderPaginationControls(type, 0);
        return;
    }
    if (emptyRow) emptyRow.style.display = 'none';

    // Pagination
    const totalPages = Math.ceil(visibleRows.length / itemsPerPage);
    if (pageState[type] > totalPages) pageState[type] = totalPages || 1;
    if (pageState[type] < 1) pageState[type] = 1;

    const startIndex = (pageState[type] - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    // Hide all data rows
    dataRows.forEach(r => r.style.display = 'none');

    // Show slice
    visibleRows.slice(startIndex, endIndex).forEach(r => r.style.display = '');

    renderPaginationControls(type, totalPages);
}

function renderPaginationControls(type, totalPages) {
    const container = document.getElementById('pagination-' + type);
    if (!container) return;

    if (totalPages <= 1) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    let html = '';
    const currentPage = pageState[type];

    // Previous
    html += `<button class="btn-icon btn-sm" style="padding: 0.25rem 0.5rem; border: 1px solid #e2e8f0; border-radius: 4px; background: ${currentPage === 1 ? '#f1f5f9' : 'white'}; cursor: ${currentPage === 1 ? 'default' : 'pointer'}" 
            onclick="changeOfferPage('${type}', ${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="bi bi-chevron-left"></i>
            </button>`;

    // Pages
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            const isActive = currentPage === i;
            html += `<button class="btn-sm" style="padding: 0.25rem 0.75rem; border: 1px solid ${isActive ? '#002366' : '#e2e8f0'}; border-radius: 4px; background: ${isActive ? '#f0f4ff' : 'white'}; color: ${isActive ? '#002366' : '#64748b'}; font-weight: 500; margin: 0 2px;" 
                     onclick="changeOfferPage('${type}', ${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span style="color: #94a3b8; padding: 0 0.25rem;">...</span>`;
        }
    }

    // Next
    html += `<button class="btn-icon btn-sm" style="padding: 0.25rem 0.5rem; border: 1px solid #e2e8f0; border-radius: 4px; background: ${currentPage === totalPages ? '#f1f5f9' : 'white'}; cursor: ${currentPage === totalPages ? 'default' : 'pointer'}" 
            onclick="changeOfferPage('${type}', ${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="bi bi-chevron-right"></i>
            </button>`;

    container.innerHTML = html;
}

window.changeOfferPage = function (type, page) {
    pageState[type] = page;
    paginateTable(type);
};

// Init Pagination
document.addEventListener('DOMContentLoaded', () => {
    // Check if we are on the page that uses this script
    if (document.getElementById('allTable')) {
        ['all', 'product', 'category', 'brand', 'scheduled'].forEach(type => paginateTable(type));
    }
});

// Hide add button on initial load (All Offers tab)
document.addEventListener('DOMContentLoaded', () => {
    const addBtn = document.getElementById('addOfferBtn');
    if (addBtn) addBtn.style.display = 'none';

    // Initialize Tom Select for Category
    if (document.getElementById('categorySelect')) {
        new TomSelect("#categorySelect", {
            create: false,
            sortField: {
                field: "text",
                direction: "asc"
            },
            placeholder: 'Select a Category'
        });
    }

    // Initialize Tom Select for Brand
    if (document.getElementById('brandSelect')) {
        new TomSelect("#brandSelect", {
            create: false,
            sortField: {
                field: "text",
                direction: "asc"
            },
            placeholder: 'Select a Brand'
        });
    }
});

// ==========================================
// TOGGLE OFFER STATUS
// ==========================================
async function toggleOfferStatus(offerId, type, endDateISO, evt) {
    const checkbox = evt ? evt.target : null;
    const endDate = new Date(endDateISO);
    const now = new Date();

    // Helper function to reset checkbox
    const resetCheckbox = () => {
        if (checkbox) checkbox.checked = !checkbox.checked;
    };

    // Check if expired before making request
    if (endDate < now) {
        Swal.fire({
            icon: 'error',
            title: 'Cannot Activate',
            text: 'This offer has expired. Please extend the end date first by editing the offer.',
            confirmButtonColor: '#002366'
        });
        resetCheckbox();
        return;
    }

    try {
        const response = await axios.patch(`/api/admin/offers/${offerId}/toggle`);
        const result = response.data;

        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Status Updated!',
                text: result.message,
                timer: 1500,
                showConfirmButton: false
            }).then(() => location.reload());
        } else {
            // Show the actual error message from backend
            Swal.fire({
                icon: 'error',
                title: 'Cannot Activate',
                text: result.message || 'Something went wrong',
                confirmButtonColor: '#ef4444'
            });
            resetCheckbox();
        }
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Something went wrong. Please try again.',
            confirmButtonColor: '#ef4444'
        });
        resetCheckbox();
    }
}
// ==========================================
// EDIT OFFER MODAL FUNCTIONS
// ==========================================
function openEditModal(offerId, type, name, discountType, discountValue, startOn, expireOn) {
    // Fill form fields
    const modal = document.getElementById('editOfferModal');
    if (!modal) return;

    document.getElementById('editOfferId').value = offerId;
    document.getElementById('editOfferType').value = type;
    document.getElementById('editOfferName').value = name;
    document.getElementById('editDiscountType').value = discountType;
    document.getElementById('editDiscountValue').value = discountValue;
    document.getElementById('editStartDate').value = startOn;
    document.getElementById('editEndDate').value = expireOn;
    // Set discount type button active state
    selectEditDiscountType(discountType);
    // Open modal
    modal.classList.add('active');
}
function selectEditDiscountType(type) {
    const percentBtn = document.getElementById('editPercentageBtn');
    const fixedBtn = document.getElementById('editFixedBtn');
    const label = document.getElementById('editDiscountLabel');
    const input = document.getElementById('editDiscountValue');

    if (percentBtn) percentBtn.classList.remove('active');
    if (fixedBtn) fixedBtn.classList.remove('active');
    if (type === 'percentage') {
        if (percentBtn) percentBtn.classList.add('active');
        if (label) label.textContent = 'Discount Value (%)';
        if (input) input.max = 99;
    } else {
        if (fixedBtn) fixedBtn.classList.add('active');
        if (label) label.textContent = 'Discount Value (₹)';
        if (input) input.removeAttribute('max');
    }
    const editType = document.getElementById('editDiscountType');
    if (editType) editType.value = type;
}
async function submitEditOffer() {
    const form = document.getElementById('editOfferForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    // Validation
    if (!data.name || !data.discountValue || !data.startOn || !data.expireOn) {
        Swal.fire({ icon: 'error', title: 'Missing Fields', text: 'Please fill all required fields.', confirmButtonColor: '#002366' });
        return;
    }
    const startDate = new Date(data.startOn);
    const endDate = new Date(data.expireOn);
    if (endDate <= startDate) {
        Swal.fire({ icon: 'error', title: 'Invalid Dates', text: 'End date must be after start date.', confirmButtonColor: '#002366' });
        return;
    }
    const discountValue = parseFloat(data.discountValue);
    if (isNaN(discountValue) || discountValue < 1) {
        Swal.fire({ icon: 'error', title: 'Invalid Discount', text: 'Discount value must be at least 1.', confirmButtonColor: '#002366' });
        return;
    }
    if (data.discountType === 'percentage' && discountValue > 99) {
        Swal.fire({ icon: 'error', title: 'Invalid Discount', text: 'Percentage cannot exceed 99%.', confirmButtonColor: '#002366' });
        return;
    }
    try {
        const response = await axios.put(`/api/admin/offers/${data.offerId}`, data);
        const result = response.data;
        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Offer Updated!',
                text: result.message,
                confirmButtonColor: '#002366'
            }).then(() => {
                closeModal('editOfferModal');
                location.reload();
            });
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: result.message, confirmButtonColor: '#ef4444' });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Something went wrong. Please try again.', confirmButtonColor: '#ef4444' });
    }
}
