// Banner Management JavaScript
class BannerManagement {
    constructor() {
        this.currentPage = 1;
        this.banners = [];
        this.stats = {};
        this.init();
    }

    init() {
        this.loadBanners();
        this.loadStats();
        this.loadProducts();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Search functionality
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSearch();
            });
        }

        // Clear search
        const clearIcon = document.getElementById('clearSearchIcon');
        if (clearIcon) {
            clearIcon.addEventListener('click', () => {
                const searchInput = document.querySelector('.search-input');
                if (searchInput) {
                    searchInput.value = '';
                    clearIcon.style.display = 'none';
                }
            });
        }

        // Search input change
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const clearIcon = document.getElementById('clearSearchIcon');
                if (clearIcon) {
                    clearIcon.style.display = e.target.value ? 'block' : 'none';
                }
            });
        }

        // Filter changes
        const filterSelects = document.querySelectorAll('.filter-select');
        filterSelects.forEach(select => {
            select.addEventListener('change', () => this.handleSearch());
        });
    }

    async loadBanners() {
        try {
            const params = new URLSearchParams(window.location.search);
            const response = await fetch(`/api/admin/banners?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                this.banners = data.data.banners;
                this.renderBanners(data.data.banners);
                this.renderPagination(data.data.pagination);
            }
        } catch (error) {
            console.error('Error loading banners:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load banners. Please try again.',
                confirmButtonColor: '#002366'
            });
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/admin/banners/stats');
            const data = await response.json();

            if (data.success) {
                this.stats = data.data;
                this.renderStats();
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadProducts() {
        try {
            const response = await fetch('/api/admin/banners/products');
            const data = await response.json();

            if (data.success) {
                this.populateProductSelect(data.data);
            }
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    populateProductSelect(products) {
        const select = document.getElementById('productId');
        if (!select) return;

        // Clear existing options except the first one
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        // Add product options
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product._id;
            option.textContent = product.name;
            select.appendChild(option);
        });
    }

    renderBanners(banners) {
        const grid = document.getElementById('bannersGrid');
        if (!grid) return;

        grid.innerHTML = '';

        banners.forEach(banner => {
            const card = this.createBannerCard(banner);
            grid.appendChild(card);
        });
    }

    createBannerCard(banner) {
        const card = document.createElement('div');
        card.className = 'banner-card';
        card.innerHTML = `
            <div class="banner-image-container">
                ${banner.image ? 
                    `<img src="${banner.image}" alt="${banner.title}" class="banner-image">` : 
                    '<div class="banner-image placeholder">No Image</div>'
                }
            </div>
            <div class="banner-content">
                <h3 class="banner-title">${banner.title}</h3>
                ${banner.subtitle ? `<p class="banner-subtitle">${banner.subtitle}</p>` : ''}
                ${banner.description ? `<p class="banner-description">${banner.description}</p>` : ''}
                <div class="banner-meta">
                    <span class="banner-status ${banner.isActive ? 'active' : 'inactive'}">
                        ${banner.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span class="banner-order">Order: ${banner.order}</span>
                </div>
                ${banner.product ? 
                    `<div class="banner-product">Product: ${banner.product.name}</div>` : ''
                }
                <div class="banner-actions">
                    <button class="action-btn edit" onclick="editBanner('${banner._id}')">Edit</button>
                    <button class="action-btn toggle" onclick="toggleBanner('${banner._id}')">
                        ${banner.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="action-btn delete" onclick="deleteBanner('${banner._id}')">Delete</button>
                </div>
            </div>
        `;

        return card;
    }

    renderStats() {
        document.getElementById('totalCount').textContent = this.stats.total || 0;
        document.getElementById('activeCount').textContent = this.stats.active || 0;
        document.getElementById('inactiveCount').textContent = this.stats.inactive || 0;
        document.getElementById('withProductCount').textContent = this.stats.withProduct || 0;
    }

    renderPagination(pagination) {
        const paginationDiv = document.getElementById('pagination');
        if (!paginationDiv) return;

        let html = '';
        
        // Previous button
        if (pagination.current > 1) {
            html += `<button onclick="goToPage(${pagination.current - 1})">Previous</button>`;
        }

        // Page numbers
        for (let i = 1; i <= pagination.pages; i++) {
            const active = i === pagination.current ? 'active' : '';
            html += `<button class="${active}" onclick="goToPage(${i})">${i}</button>`;
        }

        // Next button
        if (pagination.current < pagination.pages) {
            html += `<button onclick="goToPage(${pagination.current + 1})">Next</button>`;
        }

        paginationDiv.innerHTML = html;
    }

    handleSearch() {
        const form = document.getElementById('searchForm');
        if (form) {
            const formData = new FormData(form);
            const params = new URLSearchParams(formData);
            window.location.href = `/admin/banners?${params.toString()}`;
        }
    }

    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Global functions for onclick handlers
window.openAddModal = () => {
    const modal = document.getElementById('bannerModal');
    const form = document.getElementById('bannerForm');
    
    if (modal && form) {
        document.getElementById('modalTitle').textContent = 'Add Banner';
        form.reset();
        document.getElementById('bannerId').value = '';
        
        // Set default values
        document.getElementById('buttonText').value = 'Shop Now';
        document.getElementById('isActive').value = 'true';
        document.getElementById('order').value = '0';
        
        // Set current date as start date
        const now = new Date();
        document.getElementById('startDate').value = now.toISOString().slice(0, 16);
        
        modal.style.display = 'block';
    }
};

window.editBanner = async (bannerId) => {
    try {
        const response = await fetch(`/api/admin/banners/${bannerId}`);
        const data = await response.json();

        if (data.success) {
            showEditModal(data.data);
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message || 'Failed to load banner details',
                confirmButtonColor: '#ef4444'
            });
        }
    } catch (error) {
        console.error('Error editing banner:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load banner details. Please try again.',
            confirmButtonColor: '#ef4444'
        });
    }
};

window.toggleBanner = async (bannerId) => {
    try {
        const response = await fetch(`/api/admin/banners/${bannerId}/toggle`, {
            method: 'PATCH'
        });
        const data = await response.json();

        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: `Banner ${data.data.isActive ? 'activated' : 'deactivated'} successfully`,
                timer: 1500,
                showConfirmButton: false
            }).then(() => location.reload());
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message || 'Failed to toggle banner status',
                confirmButtonColor: '#ef4444'
            });
        }
    } catch (error) {
        console.error('Error toggling banner:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to toggle banner status. Please try again.',
            confirmButtonColor: '#ef4444'
        });
    }
};

window.deleteBanner = async (bannerId) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;

    try {
        const response = await fetch(`/api/admin/banners/${bannerId}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Deleted',
                text: 'Banner deleted successfully',
                timer: 1500,
                showConfirmButton: false
            }).then(() => location.reload());
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message || 'Failed to delete banner',
                confirmButtonColor: '#ef4444'
            });
        }
    } catch (error) {
        console.error('Error deleting banner:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to delete banner. Please try again.',
            confirmButtonColor: '#ef4444'
        });
    }
};

window.goToPage = (page) => {
    const url = new URL(window.location);
    url.searchParams.set('page', page);
    window.location.href = url.toString();
};

window.showEditModal = (banner) => {
    const modal = document.getElementById('bannerModal');
    const form = document.getElementById('bannerForm');
    
    if (modal && form) {
        document.getElementById('modalTitle').textContent = 'Edit Banner';
        document.getElementById('bannerId').value = banner._id;
        document.getElementById('title').value = banner.title || '';
        document.getElementById('subtitle').value = banner.subtitle || '';
        document.getElementById('description').value = banner.description || '';
        document.getElementById('image').value = banner.image || '';
        document.getElementById('productId').value = banner.product?._id || '';
        document.getElementById('buttonText').value = banner.buttonText || 'Shop Now';
        document.getElementById('buttonLink').value = banner.buttonLink || '';
        document.getElementById('isActive').value = banner.isActive.toString();
        document.getElementById('order').value = banner.order || 0;
        
        if (banner.startDate) {
            document.getElementById('startDate').value = new Date(banner.startDate).toISOString().slice(0, 16);
        }
        
        if (banner.endDate) {
            document.getElementById('endDate').value = new Date(banner.endDate).toISOString().slice(0, 16);
        }
        
        updatePreview();
        modal.style.display = 'block';
    }
};

window.closeModal = () => {
    const modal = document.getElementById('bannerModal');
    if (modal) modal.style.display = 'none';
};

window.closeDeleteModal = () => {
    const modal = document.getElementById('deleteModal');
    if (modal) modal.style.display = 'none';
};

window.confirmDelete = () => {
    const bannerId = document.getElementById('deleteBannerId').value;
    deleteBanner(bannerId);
    closeDeleteModal();
};

window.updatePreview = () => {
    const title = document.getElementById('title').value;
    const subtitle = document.getElementById('subtitle').value;
    const image = document.getElementById('image').value;
    const buttonText = document.getElementById('buttonText').value;
    
    const previewTitle = document.getElementById('previewTitle');
    const previewSubtitle = document.getElementById('previewSubtitle');
    const previewImage = document.getElementById('previewImage');
    const previewButton = document.getElementById('previewButton');
    
    if (previewTitle) previewTitle.textContent = title || 'Banner Title';
    if (previewSubtitle) previewSubtitle.textContent = subtitle || 'Subtitle';
    if (previewImage) {
        if (image) {
            previewImage.src = image;
            previewImage.style.display = 'block';
        } else {
            previewImage.style.display = 'none';
        }
    }
    if (previewButton) previewButton.textContent = buttonText || 'Shop Now';
};

// Handle form submission
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('bannerForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Clear previous errors
            clearErrors();
            
            const bannerId = document.getElementById('bannerId').value;
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            
            // Validation
            let isValid = true;
            
            if (!data.title || data.title.trim().length < 3) {
                showError('titleError', 'Title must be at least 3 characters');
                isValid = false;
            }
            
            if (!data.image || data.image.trim().length === 0) {
                showError('imageError', 'Image URL is required');
                isValid = false;
            } else if (!isValidUrl(data.image)) {
                showError('imageError', 'Please enter a valid URL');
                isValid = false;
            }
            
            if (!isValid) return;
            
            try {
                const url = bannerId ? 
                    `/api/admin/banners/${bannerId}` : 
                    '/api/admin/banners';
                const method = bannerId ? 'PUT' : 'POST';
                
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
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
                        closeModal();
                        location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: result.message || 'Failed to save banner',
                        confirmButtonColor: '#ef4444'
                    });
                }
            } catch (error) {
                console.error('Error saving banner:', error);
                
                // Show backend validation error if available
                const errorMessage = error.response?.data?.message || 
                                  error.response?.data?.error || 
                                  'Failed to save banner. Please try again.';
                
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage,
                    confirmButtonColor: '#ef4444'
                });
            }
        });

        // Real-time preview updates
        const inputs = ['title', 'subtitle', 'image', 'buttonText'];
        inputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => {
                    updatePreview();
                    clearError(id + 'Error');
                });
            }
        });
    }

    // Initialize banner management
    new BannerManagement();
});

// Helper functions for validation
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        const formGroup = errorElement.closest('.form-group');
        if (formGroup) {
            formGroup.classList.add('error');
        }
    }
}

function clearError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = '';
        const formGroup = errorElement.closest('.form-group');
        if (formGroup) {
            formGroup.classList.remove('error');
        }
    }
}

function clearErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(element => {
        element.textContent = '';
        const formGroup = element.closest('.form-group');
        if (formGroup) {
            formGroup.classList.remove('error');
        }
    });
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}
