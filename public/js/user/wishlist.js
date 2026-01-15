// =============================================
// ZOUND Wishlist Page - JavaScript Functions
// =============================================

// Remove item from wishlist (with variant support)
async function removeFromWishlist(productId, variantId = null) {
    const result = await Swal.fire({
        title: 'Remove from Wishlist?',
        text: 'This item will be removed from your wishlist.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#002366',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, Remove',
        cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
        try {
            let removeUrl = `/user/wishlist/remove/${productId}`;
            if (variantId) {
                removeUrl += `?variantId=${variantId}`;
            }
            const response = await axios.delete(removeUrl);

            if (response.data.success) {
                // Find and animate removal of the specific card
                let card;
                if (variantId) {
                    card = document.querySelector(`.wishlist-card[data-product-id="${productId}"][data-variant-id="${variantId}"]`);
                }
                if (!card) {
                    card = document.querySelector(`.wishlist-card[data-product-id="${productId}"]`);
                }

                if (card) {
                    card.classList.add('removing');
                    setTimeout(() => {
                        card.remove();
                        updateEmptyState();
                        updateWishlistCount();
                    }, 300);
                }

                Swal.fire({
                    icon: 'success',
                    title: 'Removed!',
                    text: 'Item removed from your wishlist.',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                showError(response.data.message || 'Failed to remove item');
            }
        } catch (error) {
            console.error('Error removing from wishlist:', error);
            showError(error.response?.data?.message || 'Something went wrong');
        }
    }
}

// Clear entire wishlist
async function clearWishlist() {
    const result = await Swal.fire({
        title: 'Clear Wishlist?',
        text: 'All items will be removed from your wishlist. This cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, Clear All',
        cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
        try {
            const response = await axios.delete('/user/wishlist/clear');

            if (response.data.success) {
                // Remove all cards with animation
                const cards = document.querySelectorAll('.wishlist-card');
                cards.forEach((card, index) => {
                    setTimeout(() => {
                        card.classList.add('removing');
                    }, index * 50);
                });

                setTimeout(() => {
                    location.reload();
                }, 500);

                Swal.fire({
                    icon: 'success',
                    title: 'Cleared!',
                    text: 'Your wishlist has been cleared.',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                showError(response.data.message || 'Failed to clear wishlist');
            }
        } catch (error) {
            console.error('Error clearing wishlist:', error);
            showError(error.response?.data?.message || 'Something went wrong');
        }
    }
}

// Add to cart from wishlist
async function addToCartFromWishlist(productId, variantId) {
    const btn = event.target.closest('.add-to-cart-btn');
    const originalContent = btn.innerHTML;

    // Show loading state
    btn.classList.add('loading');
    btn.innerHTML = '<span class="material-icons">sync</span> Adding...';

    try {
        const response = await axios.post('/user/cart/add', {
            productId,
            variantId: variantId || null,
            quantity: 1
        });

        if (response.data.success) {
            // Success animation
            btn.innerHTML = '<span class="material-icons">check</span> Added!';
            btn.style.background = '#10b981';

            // Update cart count in header if exists
            updateCartCount(response.data.data?.cartCount);

            Swal.fire({
                icon: 'success',
                title: 'Added to Cart!',
                text: 'Item has been added to your cart.',
                timer: 1500,
                showConfirmButton: false
            });

            // Reset button after delay
            setTimeout(() => {
                btn.innerHTML = originalContent;
                btn.style.background = '';
                btn.classList.remove('loading');
            }, 2000);

        } else {
            btn.innerHTML = originalContent;
            btn.classList.remove('loading');
            showError(response.data.message || 'Failed to add to cart');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        btn.innerHTML = originalContent;
        btn.classList.remove('loading');
        showError(error.response?.data?.message || 'Something went wrong');
    }
}

// Update cart count in header
function updateCartCount(count) {
    const cartBadge = document.querySelector('.cart-count, #cartCount, .header-cart-count');
    if (cartBadge && count !== undefined) {
        cartBadge.textContent = count;
        cartBadge.style.display = count > 0 ? 'flex' : 'none';
    }
}

// Update wishlist count
function updateWishlistCount() {
    const remainingCards = document.querySelectorAll('.wishlist-card').length;
    const countEl = document.querySelector('.count-highlight');
    const subheadlineEl = document.querySelector('.subheadline');

    if (countEl) {
        countEl.textContent = remainingCards;
    }

    if (subheadlineEl && remainingCards > 0) {
        subheadlineEl.innerHTML = `You have <span class="count-highlight">${remainingCards}</span> item${remainingCards > 1 ? 's' : ''} saved`;
    }
}

// Check if wishlist is empty and show empty state
function updateEmptyState() {
    const grid = document.querySelector('.wishlist-grid');
    const remainingCards = document.querySelectorAll('.wishlist-card').length;

    if (remainingCards === 0) {
        // Reload to show empty state
        location.reload();
    }
}

// Show error message
function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
        confirmButtonColor: '#002366'
    });
}

// Toggle wishlist (for product listing/detail pages)
async function toggleWishlist(productId, btnElement) {
    const isInWishlist = btnElement.classList.contains('active');
    const icon = btnElement.querySelector('.material-icons, .wishlist-icon');

    try {
        if (isInWishlist) {
            // Remove from wishlist
            const response = await axios.delete(`/user/wishlist/remove/${productId}`);
            if (response.data.success) {
                btnElement.classList.remove('active');
                if (icon) icon.textContent = 'favorite_border';
                showToast('Removed from wishlist');
            }
        } else {
            // Add to wishlist
            const response = await axios.post('/user/wishlist/add', { productId });
            if (response.data.success) {
                btnElement.classList.add('active');
                if (icon) icon.textContent = 'favorite';
                showToast('Added to wishlist');
            }
        }
    } catch (error) {
        console.error('Error toggling wishlist:', error);
        showError(error.response?.data?.message || 'Please login to add items to wishlist');
    }
}

// Show toast notification
function showToast(message) {
    const Toast = Swal.mixin({
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
    });

    Toast.fire({
        icon: 'success',
        title: message
    });
}
