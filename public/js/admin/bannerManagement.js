// Banner Management JavaScript
class BannerManagement {
    constructor() {
        this.currentPage = 1;
        this.banners = [];
        this.stats = {};
        this.searchDebounceTimer = null;
        this.init();
    }

    init() {
        this.loadBanners();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Status filter
        const statusSelect = document.getElementById('statusSelect');
        if (statusSelect) {
            statusSelect.addEventListener('change', () => this.handleSearch());
        }

        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            // Enter key triggers immediate search
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    clearTimeout(this.searchDebounceTimer);
                    this.handleSearch();
                }
            });

            // Live search with debounce (400ms delay)
            searchInput.addEventListener('input', (e) => {
                const clearIcon = document.getElementById('clearSearchIcon');
                if (clearIcon) {
                    clearIcon.style.display = e.target.value.trim() ? 'block' : 'none';
                }
                clearTimeout(this.searchDebounceTimer);
                this.searchDebounceTimer = setTimeout(() => this.handleSearch(), 400);
            });
        }

        // Clear search icon
        const clearIcon = document.getElementById('clearSearchIcon');
        if (clearIcon) {
            clearIcon.addEventListener('click', () => {
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.value = '';
                    clearIcon.style.display = 'none';
                    clearTimeout(this.searchDebounceTimer);
                    this.handleSearch();
                }
            });
        }
    }

    async loadBanners() {
        try {
            const params = new URLSearchParams(window.location.search);
            const response = await fetch(`/api/admin/banners?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                this.banners = data.data.banners;
                this.renderBanners(data.data.banners, params);
                this.renderPagination(data.data.pagination);
            }
        } catch (error) {
            console.error('Error loading banners:', error);
            Swal.fire('Error', 'Failed to load banners.', 'error');
        }
    }



    renderBanners(banners, params) {
        const grid = document.getElementById('bannersGrid');
        if (!grid) return;

        grid.innerHTML = '';

        if (banners.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #6c6c6c; background: white; border-radius: 12px; border: 1px solid #e3e6eb;">No banners found.</div>`;
            return;
        }

        banners.forEach((banner) => {
            const card = this.createBannerCard(banner);
            grid.appendChild(card);
        });
    }

    createBannerCard(banner) {
        const card = document.createElement('div');
        card.className = 'banner-card';

        const statusClass = banner.isActive ? 'status-active' : 'status-inactive';
        const statusText = banner.isActive ? 'Active' : 'Inactive';
        const startDate = banner.startDate ? new Date(banner.startDate).toLocaleDateString() : '--';
        const endDate = banner.endDate ? new Date(banner.endDate).toLocaleDateString() : '--';

        card.innerHTML = `
            <div class="banner-image-container">
                <img src="${banner.image || '/images/placeholder.png'}" alt="Banner" class="banner-image" onerror="this.src='/images/placeholder.png'">
                <div class="banner-status-badge">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>
            
            <div class="banner-content">
                <div class="banner-header">
                    <h3 class="banner-title" title="${banner.title}">${banner.title}</h3>
                </div>
                ${banner.subtitle ? `<p class="banner-subtitle">${banner.subtitle}</p>` : ''}
                
                <div class="banner-details">
                    <div class="detail-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <span>${startDate} — ${endDate}</span>
                    </div>
                    <div class="detail-item">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                        <span>Display Order: <strong>${banner.order || 0}</strong></span>
                    </div>
                </div>

                <div class="card-actions">
                    <button class="action-btn edit-btn" title="Edit" onclick="editBanner('${banner._id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        Edit
                    </button>
                    ${banner.isActive ? `
                        <button class="action-btn toggle-btn inactive" title="Deactivate" onclick="openToggleModal('${banner._id}', '${banner.title.replace(/'/g, "\\'")}', 'deactivate')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
                        </button>
                    ` : `
                        <button class="action-btn toggle-btn active" title="Activate" onclick="openToggleModal('${banner._id}', '${banner.title.replace(/'/g, "\\'")}', 'activate')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        </button>
                    `}
                    <button class="action-btn delete-btn" title="Delete" onclick="deleteBanner('${banner._id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
        `;
        return card;
    }

    renderPagination(pagination) {
        const paginationContainer = document.getElementById('paginationContainer');
        if (!paginationContainer) return;

        let html = '';
        if (pagination.current > 1) {
            html += `<button class="page-btn" onclick="goToPage(${pagination.current - 1})">Prev</button>`;
        }

        for (let i = 1; i <= pagination.pages; i++) {
            const active = (i === pagination.current) ? 'active' : '';
            html += `<button class="page-btn ${active}" onclick="goToPage(${i})">${i}</button>`;
        }

        if (pagination.current < pagination.pages) {
            html += `<button class="page-btn" onclick="goToPage(${pagination.current + 1})">Next</button>`;
        }

        paginationContainer.innerHTML = html;
    }

    handleSearch() {
        const searchInput = document.getElementById('searchInput');
        const statusSelect = document.getElementById('statusSelect');

        const params = new URLSearchParams();

        if (searchInput && searchInput.value.trim()) params.set('search', searchInput.value.trim());
        if (statusSelect && statusSelect.value) params.set('isActive', statusSelect.value);

        params.set('page', '1');

        // Update URL without full page reload
        const newUrl = `/admin/banners?${params.toString()}`;
        window.history.pushState({}, '', newUrl);

        // Re-fetch banners with new filters
        this.loadBanners();
    }
}

// Global scope functions for onclick
window.goToPage = (page) => {
    const url = new URL(window.location);
    url.searchParams.set('page', page);
    // Update URL without full page reload
    window.history.pushState({}, '', url.toString());
    // Re-fetch banners for the new page
    if (window.bannerManager) {
        window.bannerManager.loadBanners();
    }
};

window.openAddModal = () => {
    const modal = document.getElementById('bannerModal');
    const form = document.getElementById('bannerForm');

    if (modal && form) {
        document.getElementById('modalTitle').innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg> Add Banner
        `;
        form.reset();
        document.getElementById('bannerId').value = '';

        // Default values
        document.getElementById('buttonText').value = 'Shop Now';
        document.getElementById('isActive').checked = true;
        document.getElementById('order').value = '0';

        const now = new Date();
        document.getElementById('startDate').value = now.toISOString().slice(0, 16);

        modal.classList.add('active');
        clearFieldErrors();
    }
};

window.closeModal = () => {
    const modal = document.getElementById('bannerModal');
    if (modal) modal.classList.remove('active');
};

window.editBanner = async (bannerId) => {
    try {
        const response = await fetch(`/api/admin/banners/${bannerId}`);
        const data = await response.json();

        if (data.success) {
            showEditModal(data.data);
        } else {
            Swal.fire('Error', data.message || 'Failed to load banner details', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'Failed to load banner details. Please try again.', 'error');
    }
};

window.showEditModal = (banner) => {
    const modal = document.getElementById('bannerModal');
    const form = document.getElementById('bannerForm');

    if (modal && form) {
        document.getElementById('modalTitle').innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#007BFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg> Edit Banner
        `;
        document.getElementById('bannerId').value = banner._id;
        document.getElementById('title').value = banner.title || '';
        document.getElementById('subtitle').value = banner.subtitle || '';
        document.getElementById('description').value = banner.description || '';
        document.getElementById('image').value = banner.image || '';
        document.getElementById('buttonText').value = banner.buttonText || 'Shop Now';
        document.getElementById('buttonLink').value = banner.buttonLink || '';

        document.getElementById('isActive').checked = banner.isActive;
        document.getElementById('order').value = banner.order || 0;

        if (banner.startDate) {
            document.getElementById('startDate').value = new Date(banner.startDate).toISOString().slice(0, 16);
        }
        if (banner.endDate) {
            document.getElementById('endDate').value = new Date(banner.endDate).toISOString().slice(0, 16);
        }

        form.dataset.originalValues = JSON.stringify({
            title: document.getElementById('title').value,
            subtitle: document.getElementById('subtitle').value,
            description: document.getElementById('description').value,
            image: document.getElementById('image').value,
            buttonText: document.getElementById('buttonText').value,
            buttonLink: document.getElementById('buttonLink').value,
            isActive: document.getElementById('isActive').checked,
            order: document.getElementById('order').value,
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value
        });

        modal.classList.add('active');
        clearFieldErrors();
    }
};

window.deleteBanner = async (bannerId) => {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch(`/api/admin/banners/${bannerId}`, {
                method: 'DELETE'
            });
            const data = await response.json();

            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'Banner has been deleted.',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => location.reload());
            } else {
                Swal.fire('Error!', data.message || 'Failed to delete banner', 'error');
            }
        } catch (error) {
            Swal.fire('Error!', 'An error occurred', 'error');
        }
    }
};

window.openToggleModal = (bannerId, title, action) => {
    const modal = document.getElementById('toggleModal');
    if (!modal) return;

    document.getElementById('toggleBannerId').value = bannerId;
    document.getElementById('toggleModalAction').textContent = action;

    // Set icon & texts based on action
    const btn = document.getElementById('confirmToggleBtn');
    const iconContainer = document.getElementById('toggleModalIcon');
    const modalTitle = document.getElementById('toggleModalTitle');

    if (action === 'activate') {
        btn.textContent = 'Activate';
        btn.classList.remove('btn-delete');
        btn.classList.add('btn-activate');
        modalTitle.textContent = "Activate Banner";
        iconContainer.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#28a745" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
        `;
    } else {
        btn.textContent = 'Deactivate';
        btn.classList.remove('btn-activate');
        btn.classList.add('btn-delete');
        modalTitle.textContent = "Deactivate Banner";
        iconContainer.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#DC3545" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
        `;
    }

    modal.classList.add('active');
};

window.closeToggleModal = () => {
    const modal = document.getElementById('toggleModal');
    if (modal) modal.classList.remove('active');
};

window.confirmToggle = async () => {
    const bannerId = document.getElementById('toggleBannerId').value;
    try {
        const response = await fetch(`/api/admin/banners/${bannerId}/toggle`, {
            method: 'PATCH'
        });
        const data = await response.json();

        if (data.success) {
            closeToggleModal();
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: `Banner ${data.data.isActive ? 'activated' : 'deactivated'} successfully`,
                timer: 1500,
                showConfirmButton: false
            }).then(() => location.reload());
        } else {
            Swal.fire('Error', data.message || 'Failed to toggle status', 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'An error occurred', 'error');
    }
};

// Form handle setup
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('bannerForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            clearFieldErrors();

            const bannerId = document.getElementById('bannerId').value;
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            // Fix Checkbox for isActive since FormData will map 'on' or nothing.
            data.isActive = document.getElementById('isActive').checked;

            let isValid = true;

            // Title validation
            if (!data.title || data.title.trim() === '') {
                showFieldError('titleError', 'Title is required');
                isValid = false;
            } else if (data.title.trim().length < 3) {
                showFieldError('titleError', 'Title must be at least 3 characters');
                isValid = false;
            } else if (data.title.trim().length > 100) {
                showFieldError('titleError', 'Title cannot exceed 100 characters');
                isValid = false;
            }

            // Subtitle validation
            if (!data.subtitle || data.subtitle.trim() === '') {
                showFieldError('subtitleError', 'Subtitle is required');
                isValid = false;
            } else if (data.subtitle.trim().length > 150) {
                showFieldError('subtitleError', 'Subtitle cannot exceed 150 characters');
                isValid = false;
            }

            // Image URL validation
            if (!data.image || data.image.trim() === '') {
                showFieldError('imageError', 'Image URL is required');
                isValid = false;
            } else if (!isValidUrl(data.image.trim())) {
                showFieldError('imageError', 'Please enter a valid image URL (e.g. https://example.com/image.jpg)');
                isValid = false;
            }

            // Button Text validation
            if (!data.buttonText || data.buttonText.trim() === '') {
                showFieldError('buttonTextError', 'Button text is required');
                isValid = false;
            } else if (data.buttonText.trim().length > 30) {
                showFieldError('buttonTextError', 'Button text cannot exceed 30 characters');
                isValid = false;
            }

            // Button Link validation
            if (!data.buttonLink || data.buttonLink.trim() === '') {
                showFieldError('buttonLinkError', 'Button link is required');
                isValid = false;
            }

            // Start Date validation
            if (!data.startDate) {
                showFieldError('startDateError', 'Start date is required');
                isValid = false;
            }

            // End Date validation
            if (!data.endDate) {
                showFieldError('endDateError', 'End date is required');
                isValid = false;
            } else if (data.startDate && new Date(data.endDate) <= new Date(data.startDate)) {
                showFieldError('endDateError', 'End date must be after start date');
                isValid = false;
            }

            // Display Order validation
            const orderNum = parseInt(data.order);
            if (data.order === '' || data.order === undefined || data.order === null) {
                showFieldError('orderError', 'Display order is required');
                isValid = false;
            } else if (isNaN(orderNum)) {
                showFieldError('orderError', 'Display order must be a valid number');
                isValid = false;
            } else if (orderNum < 0) {
                showFieldError('orderError', 'Display order cannot be negative');
                isValid = false;
            } else if (orderNum > 999) {
                showFieldError('orderError', 'Display order cannot exceed 999');
                isValid = false;
            }

            // Description validation
            if (!data.description || data.description.trim() === '') {
                showFieldError('descriptionError', 'Description is required');
                isValid = false;
            } else if (data.description.trim().length > 500) {
                showFieldError('descriptionError', 'Description cannot exceed 500 characters');
                isValid = false;
            }

            if (!isValid) {
                scrollToFirstFieldError();
                return;
            }

            if (bannerId && form.dataset.originalValues) {
                const currentValues = {
                    title: document.getElementById('title').value,
                    subtitle: document.getElementById('subtitle').value,
                    description: document.getElementById('description').value,
                    image: document.getElementById('image').value,
                    buttonText: document.getElementById('buttonText').value,
                    buttonLink: document.getElementById('buttonLink').value,
                    isActive: document.getElementById('isActive').checked,
                    order: document.getElementById('order').value,
                    startDate: document.getElementById('startDate').value,
                    endDate: document.getElementById('endDate').value
                };

                if (JSON.stringify(currentValues) === form.dataset.originalValues) {
                    Swal.fire('No changes made', 'Please update at least one field before saving.', 'info');
                    return;
                }
            }

            try {
                const url = bannerId ? `/api/admin/banners/${bannerId}` : '/api/admin/banners';
                const method = bannerId ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Success',
                        text: bannerId ? 'Banner updated successfully' : 'Banner created successfully',
                        timer: 1500,
                        showConfirmButton: false
                    }).then(() => {
                        form.reset();
                        closeModal();
                        location.reload();
                    });
                } else {
                    // Map server-side errors to input fields
                    const msg = result.message || 'Failed to save banner';
                    let mapped = false;

                    const serverErrorMap = [
                        { keyword: 'title', errorId: 'titleError' },
                        { keyword: 'subtitle', errorId: 'subtitleError' },
                        { keyword: 'image', errorId: 'imageError' },
                        { keyword: 'button text', errorId: 'buttonTextError' },
                        { keyword: 'button link', errorId: 'buttonLinkError' },
                        { keyword: 'start date', errorId: 'startDateError' },
                        { keyword: 'end date', errorId: 'endDateError' },
                        { keyword: 'order', errorId: 'orderError' },
                        { keyword: 'description', errorId: 'descriptionError' }
                    ];

                    const msgLower = msg.toLowerCase();
                    for (const entry of serverErrorMap) {
                        if (msgLower.includes(entry.keyword)) {
                            showFieldError(entry.errorId, msg);
                            scrollToFirstFieldError();
                            mapped = true;
                            break;
                        }
                    }

                    if (!mapped) {
                        Swal.fire('Error', msg, 'error');
                    }
                }
            } catch (error) {
                Swal.fire('Error', 'Failed to save banner. Please try again.', 'error');
            }
        });
    }

    window.bannerManager = new BannerManagement();
});
// Error ID to input ID mapping
const errorToInputMap = {
    'titleError': 'title',
    'subtitleError': 'subtitle',
    'imageError': 'image',
    'buttonTextError': 'buttonText',
    'buttonLinkError': 'buttonLink',
    'startDateError': 'startDate',
    'endDateError': 'endDate',
    'orderError': 'order',
    'descriptionError': 'description'
};

function showFieldError(errorId, message) {
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('visible');
    }

    // Also highlight the corresponding input with red border
    const inputId = errorToInputMap[errorId];
    if (inputId) {
        const inputEl = document.getElementById(inputId);
        if (inputEl) {
            inputEl.classList.add('input-error');
        }
    }
}

function clearFieldErrors() {
    // Clear error text and hide
    document.querySelectorAll('.error-message').forEach(el => {
        el.textContent = '';
        el.classList.remove('visible');
    });

    // Remove red border from all inputs
    document.querySelectorAll('.input-error').forEach(el => {
        el.classList.remove('input-error');
    });
}

function scrollToFirstFieldError() {
    const firstError = document.querySelector('.error-message.visible');
    if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}
