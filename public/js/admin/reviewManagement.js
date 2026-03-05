// Review Management JavaScript
class ReviewManagement {
    constructor() {
        this.currentPage = 1;
        this.selectedReviews = new Set();
        this.reviews = [];
        this.stats = {};
        this.init();
    }

    init() {
        this.loadReviews();
        this.loadStats();
        this.setupEventListeners();
        this.setupBulkActions();

        // Review-specific search functionality
        document.addEventListener('DOMContentLoaded', function() {
            const reviewSearchInput = document.getElementById('reviewSearchInput');
            const reviewClearIcon = document.getElementById('reviewClearSearchIcon');
            const reviewFilterForm = document.getElementById('reviewFilterForm');

            // Handle search input
            if (reviewSearchInput) {
                // Show/hide clear icon based on input value
                reviewSearchInput.addEventListener('input', function() {
                    if (this.value.trim()) {
                        reviewClearIcon.style.display = 'block';
                    } else {
                        reviewClearIcon.style.display = 'none';
                    }
                });

                // Handle clear icon click
                if (reviewClearIcon) {
                    reviewClearIcon.addEventListener('click', function() {
                        reviewSearchInput.value = '';
                        this.style.display = 'none';
                        reviewSearchInput.focus();
                    });
                }

                // Handle Enter key press
                reviewSearchInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        reviewFilterForm.submit();
                    }
                });
            }

            // Initialize clear icon visibility
            if (reviewSearchInput && reviewClearIcon) {
                if (reviewSearchInput.value.trim()) {
                    reviewClearIcon.style.display = 'block';
                }
            }
        });
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

        // Select all checkbox
        const selectAll = document.getElementById('selectAll');
        if (selectAll) {
            selectAll.addEventListener('change', () => this.toggleSelectAll());
        }
    }

    setupBulkActions() {
        // Bulk approve
        const bulkApproveBtn = document.querySelector('[onclick="bulkApprove()"]');
        if (bulkApproveBtn) {
            bulkApproveBtn.onclick = () => this.bulkApprove();
        }

        // Bulk reject
        const bulkRejectBtn = document.querySelector('[onclick="bulkReject()"]');
        if (bulkRejectBtn) {
            bulkRejectBtn.onclick = () => this.bulkReject();
        }
    }

    async loadReviews() {
        try {
            const params = new URLSearchParams(window.location.search);
            const response = await fetch(`/api/admin/reviews?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                this.reviews = data.data.reviews;
                this.renderReviews(data.data.reviews);
                this.renderPagination(data.data.pagination);
            }
        } catch (error) {
            console.error('Error loading reviews:', error);
            this.showToast('Error loading reviews', 'error');
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/admin/reviews/stats');
            const data = await response.json();

            if (data.success) {
                this.stats = data.data;
                this.renderStats();
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    renderReviews(reviews) {
        const tbody = document.getElementById('reviewsTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        reviews.forEach(review => {
            const row = this.createReviewRow(review);
            tbody.appendChild(row);
        });

        this.updateBulkActionsVisibility();
    }

    createReviewRow(review) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <input type="checkbox" class="review-checkbox" data-id="${review._id}" 
                       ${this.selectedReviews.has(review._id) ? 'checked' : ''}>
            </td>
            <td>
                <div class="product-info">
                    ${review.product?.productImage ? 
                        `<img src="${review.product.productImage}" alt="${review.product.name}" class="product-image">` : 
                        '<div class="product-image placeholder"></div>'
                    }
                    <div>
                        <div class="product-name">${review.product?.name || 'N/A'}</div>
                    </div>
                </div>
            </td>
            <td>
                <div class="user-info">
                    ${review.user?.profileImage ? 
                        `<img src="${review.user.profileImage}" alt="${review.user.name}" class="user-avatar">` : 
                        '<div class="user-avatar placeholder"></div>'
                    }
                    <div>
                        <div class="user-name">${review.user?.name || 'N/A'}</div>
                        <div class="user-email">${review.user?.email || ''}</div>
                    </div>
                </div>
            </td>
            <td>
                <div class="rating">
                    ${this.renderStars(review.rating)}
                </div>
            </td>
            <td>
                <div class="review-text">${review.comment || 'No comment'}</div>
            </td>
            <td>
                <span class="status-badge ${review.status}">${review.status}</span>
            </td>
            <td>
                ${new Date(review.createdAt).toLocaleDateString()}
            </td>
            <td>
                <div class="actions">
                    <button class="action-btn edit" onclick="viewReview('${review._id}')">View</button>
                    <button class="action-btn edit" onclick="editReview('${review._id}')">Edit</button>
                    ${review.status === 'pending' ? 
                        `<button class="action-btn approve" onclick="approveReview('${review._id}')">Approve</button>` : ''
                    }
                    ${review.status === 'pending' ? 
                        `<button class="action-btn reject" onclick="rejectReview('${review._id}')">Reject</button>` : ''
                    }
                    <button class="action-btn delete" onclick="deleteReview('${review._id}')">Delete</button>
                </div>
            </td>
        `;

        // Add checkbox event listener
        const checkbox = row.querySelector('.review-checkbox');
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    this.selectedReviews.add(review._id);
                } else {
                    this.selectedReviews.delete(review._id);
                }
                this.updateBulkActionsVisibility();
                this.updateSelectedCount();
            });
        }

        return row;
    }

    renderStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += `<span class="star ${i <= rating ? '' : 'empty'}">★</span>`;
        }
        return stars;
    }

    renderStats() {
        document.getElementById('pendingCount').textContent = this.stats.pending || 0;
        document.getElementById('approvedCount').textContent = this.stats.approved || 0;
        document.getElementById('rejectedCount').textContent = this.stats.rejected || 0;
        document.getElementById('averageRating').textContent = this.stats.averageRating || '0.0';
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
            window.location.href = `/admin/reviews?${params.toString()}`;
        }
    }

    toggleSelectAll() {
        const selectAll = document.getElementById('selectAll');
        const checkboxes = document.querySelectorAll('.review-checkbox');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll.checked;
            const reviewId = checkbox.dataset.id;
            if (selectAll.checked) {
                this.selectedReviews.add(reviewId);
            } else {
                this.selectedReviews.delete(reviewId);
            }
        });

        this.updateBulkActionsVisibility();
        this.updateSelectedCount();
    }

    updateSelectedCount() {
        const countElement = document.getElementById('selectedCount');
        if (countElement) {
            countElement.textContent = `${this.selectedReviews.size} items selected`;
        }
    }

    updateBulkActionsVisibility() {
        const bulkActions = document.getElementById('bulkActions');
        if (bulkActions) {
            bulkActions.style.display = this.selectedReviews.size > 0 ? 'flex' : 'none';
        }
    }

    async bulkApprove() {
        if (this.selectedReviews.size === 0) return;

        try {
            const response = await fetch('/api/admin/reviews/bulk-approve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reviewIds: Array.from(this.selectedReviews)
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showToast(data.message, 'success');
                this.selectedReviews.clear();
                this.loadReviews();
                this.loadStats();
            } else {
                this.showToast('Error approving reviews', 'error');
            }
        } catch (error) {
            console.error('Error bulk approving reviews:', error);
            this.showToast('Error approving reviews', 'error');
        }
    }

    async bulkReject() {
        if (this.selectedReviews.size === 0) return;

        try {
            const response = await fetch('/api/admin/reviews/bulk-reject', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reviewIds: Array.from(this.selectedReviews)
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showToast(data.message, 'success');
                this.selectedReviews.clear();
                this.loadReviews();
                this.loadStats();
            } else {
                this.showToast('Error rejecting reviews', 'error');
            }
        } catch (error) {
            console.error('Error bulk rejecting reviews:', error);
            this.showToast('Error rejecting reviews', 'error');
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
window.viewReview = async (reviewId) => {
    try {
        const response = await fetch(`/api/admin/reviews/${reviewId}`);
        const data = await response.json();

        if (data.success) {
            showReviewModal(data.data);
        } else {
            showToast('Error loading review details', 'error');
        }
    } catch (error) {
        console.error('Error viewing review:', error);
        showToast('Error loading review details', 'error');
    }
};

window.editReview = async (reviewId) => {
    try {
        const response = await fetch(`/api/admin/reviews/${reviewId}`);
        const data = await response.json();

        if (data.success) {
            showEditModal(data.data);
        } else {
            showToast('Error loading review for editing', 'error');
        }
    } catch (error) {
        console.error('Error editing review:', error);
        showToast('Error loading review for editing', 'error');
    }
};

window.approveReview = async (reviewId) => {
    try {
        const response = await fetch(`/api/admin/reviews/${reviewId}/approve`, {
            method: 'PATCH'
        });
        const data = await response.json();

        if (data.success) {
            showToast('Review approved successfully', 'success');
            location.reload();
        } else {
            showToast('Error approving review', 'error');
        }
    } catch (error) {
        console.error('Error approving review:', error);
        showToast('Error approving review', 'error');
    }
};

window.rejectReview = async (reviewId) => {
    try {
        const response = await fetch(`/api/admin/reviews/${reviewId}/reject`, {
            method: 'PATCH'
        });
        const data = await response.json();

        if (data.success) {
            showToast('Review rejected successfully', 'success');
            location.reload();
        } else {
            showToast('Error rejecting review', 'error');
        }
    } catch (error) {
        console.error('Error rejecting review:', error);
        showToast('Error rejecting review', 'error');
    }
};

window.deleteReview = async (reviewId) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
        const response = await fetch(`/api/admin/reviews/${reviewId}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (data.success) {
            showToast('Review deleted successfully', 'success');
            location.reload();
        } else {
            showToast('Error deleting review', 'error');
        }
    } catch (error) {
        console.error('Error deleting review:', error);
        showToast('Error deleting review', 'error');
    }
};

window.goToPage = (page) => {
    const url = new URL(window.location);
    url.searchParams.set('page', page);
    window.location.href = url.toString();
};

window.showReviewModal = (review) => {
    const modal = document.getElementById('reviewModal');
    const modalBody = document.getElementById('modalBody');
    
    if (modal && modalBody) {
        modalBody.innerHTML = `
            <div class="review-details">
                <div class="detail-row">
                    <strong>Product:</strong> ${review.product?.name || 'N/A'}
                </div>
                <div class="detail-row">
                    <strong>Customer:</strong> ${review.user?.name || 'N/A'}
                </div>
                <div class="detail-row">
                    <strong>Email:</strong> ${review.user?.email || 'N/A'}
                </div>
                <div class="detail-row">
                    <strong>Rating:</strong> ${new ReviewManagement().renderStars(review.rating)}
                </div>
                <div class="detail-row">
                    <strong>Review:</strong> ${review.comment || 'No comment'}
                </div>
                <div class="detail-row">
                    <strong>Status:</strong> <span class="status-badge ${review.status}">${review.status}</span>
                </div>
                <div class="detail-row">
                    <strong>Date:</strong> ${new Date(review.createdAt).toLocaleString()}
                </div>
            </div>
        `;
        modal.style.display = 'block';
    }
};

window.showEditModal = (review) => {
    const modal = document.getElementById('editModal');
    const form = document.getElementById('editReviewForm');
    
    if (modal && form) {
        document.getElementById('editReviewId').value = review._id;
        document.getElementById('editComment').value = review.comment || '';
        document.getElementById('editStatus').value = review.status;
        
        // Set rating stars
        const stars = form.querySelectorAll('.rating-input .star');
        stars.forEach((star, index) => {
            if (index < review.rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
        
        modal.style.display = 'block';
    }
};

window.closeModal = () => {
    const modal = document.getElementById('reviewModal');
    if (modal) modal.style.display = 'none';
};

window.closeEditModal = () => {
    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'none';
};

// Enhanced form validation and UI interactions
document.addEventListener('DOMContentLoaded', function() {
    const editReviewForm = document.getElementById('editReviewForm');
    const ratingStars = document.querySelectorAll('.rating-input .star');
    const commentTextarea = document.getElementById('editComment');
    const charCount = document.getElementById('charCount');
    const statusSelect = document.getElementById('editStatus');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusDescription = document.getElementById('statusDescription');

    // Initialize rating stars
    let selectedRating = 0;
    
    ratingStars.forEach(star => {
        star.addEventListener('click', function() {
            selectedRating = parseInt(this.dataset.rating);
            updateRatingStars(selectedRating);
            clearError('ratingError');
        });

        star.addEventListener('mouseenter', function() {
            const hoverRating = parseInt(this.dataset.rating);
            updateRatingStars(hoverRating);
        });
    });

    document.querySelector('.rating-input').addEventListener('mouseleave', function() {
        updateRatingStars(selectedRating);
    });

    function updateRatingStars(rating) {
        ratingStars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    // Character counter
    if (commentTextarea && charCount) {
        commentTextarea.addEventListener('input', function() {
            const length = this.value.length;
            charCount.textContent = length;
            
            // Update counter color based on length
            charCount.parentElement.classList.remove('warning', 'error');
            if (length > 450) {
                charCount.parentElement.classList.add('error');
            } else if (length > 400) {
                charCount.parentElement.classList.add('warning');
            }
            
            // Clear error when user starts typing
            if (length > 0) {
                clearError('editCommentError');
            }
        });
    }

    // Status change handler
    if (statusSelect) {
        statusSelect.addEventListener('change', function() {
            updateStatusDisplay(this.value);
        });
    }

    function updateStatusDisplay(status) {
        const statusConfig = {
            pending: {
                badge: '⏳ Pending',
                class: 'pending',
                description: 'Review is waiting for approval'
            },
            approved: {
                badge: '✅ Approved',
                class: 'approved',
                description: 'Review has been approved and is visible'
            },
            rejected: {
                badge: '❌ Rejected',
                class: 'rejected',
                description: 'Review has been rejected and will not be shown'
            }
        };

        const config = statusConfig[status];
        if (config && statusIndicator && statusDescription) {
            statusIndicator.innerHTML = `<span class="status-badge ${config.class}">${config.badge}</span>`;
            statusDescription.textContent = config.description;
        }
    }

    // Form submission
    if (editReviewForm) {
        editReviewForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Clear previous errors
            clearErrors();
            
            // Validate rating
            if (selectedRating === 0) {
                showError('ratingError', 'Please select a rating');
                return;
            }
            
            // Validate comment
            const comment = commentTextarea.value.trim();
            if (comment.length < 10) {
                showError('editCommentError', 'Comment must be at least 10 characters long');
                commentTextarea.focus();
                return;
            }
            
            if (comment.length > 500) {
                showError('editCommentError', 'Comment cannot exceed 500 characters');
                commentTextarea.focus();
                return;
            }
            
            // If validation passes, submit the form
            submitReview();
        });
    }

    function submitReview() {
        const reviewId = document.getElementById('editReviewId').value;
        const status = statusSelect.value;
        const comment = commentTextarea.value.trim();
        
        const formData = {
            rating: selectedRating,
            comment: comment,
            status: status
        };
        
        fetch(`/api/admin/reviews/${reviewId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccess('Review updated successfully!');
                setTimeout(() => {
                    closeEditModal();
                    location.reload();
                }, 1500);
            } else {
                showError('editCommentError', data.message || 'Failed to update review');
            }
        })
        .catch(error => {
            console.error('Error updating review:', error);
            showError('editCommentError', 'An error occurred while updating the review');
        });
    }

    // Helper functions
    function showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            const formGroup = errorElement.closest('.form-group');
            if (formGroup) {
                formGroup.classList.add('error');
                formGroup.classList.remove('success');
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

    function showSuccess(message) {
        // Create a temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }
});
