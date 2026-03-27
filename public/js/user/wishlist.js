// =============================================
// ZOUND Wishlist Page - JavaScript Functions
// =============================================

// Global render function used by ajax-pagination partial
function renderWishlistItems(data) {
    const products = data.products || [];
    if (products.length === 0) {
        return `<div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 0;">
            <p style="color: #6b7280; font-size: 1rem;">No items on this page.</p>
        </div>`;
    }

    return products.map(item => {
        const product = item.productId;
        if (!product) return '';

        // Find variant
        let variant = null;
        const itemVariantId = item.variantId ? item.variantId.toString() : null;
        if (itemVariantId && product.variants) {
            variant = product.variants.find(v => v._id.toString() === itemVariantId) || null;
        }
        if (!variant && product.variants && product.variants.length > 0) {
            variant = product.variants[0];
        }

        // Product image
        let productImage = '/images/placeholder.png';
        if (variant && variant.images && variant.images.length > 0) {
            productImage = variant.images[0];
        } else if (product.productImages && product.productImages.length > 0) {
            productImage = product.productImages[0];
        }

        const salePrice = variant ? variant.salePrice : 0;
        const basePrice = variant ? variant.basePrice : 0;
        const hasOffer = item.offer && item.offer.hasOffer;
        const effectivePrice = hasOffer ? item.offer.offerPrice : salePrice;
        const originalPrice = hasOffer ? item.offer.originalPrice : basePrice;
        const hasDiscount = hasOffer || (basePrice && salePrice < basePrice);
        let discountPercent = 0;
        if (hasOffer) {
            discountPercent = item.offer.discountType === 'percentage'
                ? item.offer.discount
                : Math.round((1 - effectivePrice / originalPrice) * 100);
        } else if (hasDiscount) {
            discountPercent = Math.round((1 - salePrice / basePrice) * 100);
        }
        const isOutOfStock = !variant || variant.stock <= 0;
        const isUnavailable = product.status !== 'Active' || product.isDeleted;
        const variantId = variant ? variant._id : '';

        // Badge HTML
        let badgeHTML = '';
        if (isOutOfStock && !isUnavailable) {
            badgeHTML = '<div class="stock-badge out-of-stock">Out of Stock</div>';
        } else if (isUnavailable) {
            badgeHTML = '<div class="stock-badge unavailable">Unavailable</div>';
        } else if (hasOffer) {
            const discLabel = item.offer.discountType === 'percentage'
                ? `-${item.offer.discount}%`
                : `-₹${item.offer.discount}`;
            badgeHTML = `<div class="discount-badge offer-badge">${discLabel}</div>`;
        } else if (hasDiscount) {
            badgeHTML = `<div class="discount-badge">-${discountPercent}%</div>`;
        }

        // Price HTML
        let priceHTML = '';
        if (!isOutOfStock && !isUnavailable) {
            if (hasOffer) {
                priceHTML = `<span class="current-price offer-price">₹${Number(effectivePrice).toFixed(2)}</span>
                             <span class="original-price">₹${Number(originalPrice).toFixed(2)}</span>`;
            } else if (hasDiscount) {
                priceHTML = `<span class="current-price">₹${Number(salePrice).toFixed(2)}</span>
                             <span class="original-price">₹${Number(basePrice).toFixed(2)}</span>`;
            } else {
                priceHTML = `<span class="current-price">₹${Number(salePrice).toFixed(2)}</span>`;
            }
        } else {
            priceHTML = '<span class="price-unavailable">Price unavailable</span>';
        }

        // Variant tag
        let variantHTML = '';
        if (variant && variant.value) {
            const colorDot = variant.color
                ? `<span class="color-dot" style="background-color: ${variant.color};"></span>`
                : '';
            variantHTML = `<div class="card-variant"><span class="variant-tag">${colorDot}${variant.value}</span></div>`;
        }

        // Brand
        const brandHTML = product.brand
            ? `<span class="card-brand">${product.brand.brandName}</span>`
            : '';

        // Date
        const addedDate = new Date(item.addedOn).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });

        // Action button
        let actionHTML = '';
        if (!isOutOfStock && !isUnavailable) {
            actionHTML = `<button class="add-to-cart-btn" onclick="addToCartFromWishlist('${product._id}', '${variantId}')">
                <span class="material-icons">shopping_cart</span> Add to Cart
            </button>`;
        } else {
            actionHTML = `<button class="add-to-cart-btn disabled" disabled>
                <span class="material-icons">block</span> ${isUnavailable ? 'Unavailable' : 'Out of Stock'}
            </button>`;
        }

        return `
        <div class="wishlist-card ${isOutOfStock || isUnavailable ? 'unavailable' : ''}"
             data-product-id="${product._id}" data-variant-id="${variantId}">
            <button class="remove-btn" onclick="removeFromWishlist('${product._id}', '${variantId}')" title="Remove from wishlist">
                <span class="material-icons">close</span>
            </button>
            <a href="/user/products/${product.slug}" class="card-image-link">
                <div class="card-image-wrapper">
                    <img src="${productImage}" alt="${product.productName}" class="card-image">
                    ${badgeHTML}
                </div>
            </a>
            <div class="card-info">
                ${brandHTML}
                <a href="/user/products/${product.slug}" class="card-title-link">
                    <h3 class="card-title">${product.productName}</h3>
                </a>
                ${variantHTML}
                <div class="card-price">${priceHTML}</div>
                <p class="added-date">Added on ${addedDate}</p>
            </div>
            <div class="card-actions">${actionHTML}</div>
        </div>`;
    }).join('');
}

// Remove item from wishlist (with variant support)
function removeFromWishlist(productId, variantId = null) {
    confirmAction('This item will be removed from your wishlist.', async () => {
        try {
            let removeUrl = `/api/user/wishlist/remove/${productId}`;
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

                toast.success('Removed from wishlist');
            } else {
                toast.error(response.data.message || 'Failed to remove item');
            }
        } catch (error) {
            console.error('Error removing from wishlist:', error);
            toast.error(error.response?.data?.message || 'Something went wrong');
        }
    });
}

// Clear entire wishlist
function clearWishlist() {
    confirmAction('All items will be removed from your wishlist. This cannot be undone.', async () => {
        try {
            const response = await axios.delete('/api/user/wishlist/clear');

            if (response.data.success) {
                // Remove all cards with animation
                const cards = document.querySelectorAll('.wishlist-card');
                cards.forEach((card, index) => {
                    setTimeout(() => {
                        card.classList.add('removing');
                    }, index * 50);
                });

                toast.success('Your wishlist has been cleared');
                
                setTimeout(() => {
                    location.reload();
                }, 1000);
            } else {
                toast.error(response.data.message || 'Failed to clear wishlist');
            }
        } catch (error) {
            console.error('Error clearing wishlist:', error);
            toast.error(error.response?.data?.message || 'Something went wrong');
        }
    });
}

// Add to cart from wishlist
async function addToCartFromWishlist(productId, variantId) {
    const btn = event.target.closest('.add-to-cart-btn');
    const originalContent = btn.innerHTML;
    // Show loading state
    btn.classList.add('loading');
    btn.innerHTML = '<span class="material-icons">sync</span> Moving...';
    try {
        const response = await axios.post('/api/user/wishlist/move-to-cart', {
            productId,
            variantId: variantId || null
        });
        if (response.data.success) {
            // Success animation on button
            btn.innerHTML = '<span class="material-icons">check</span> Added!';
            btn.style.background = '#10b981';
            // Update cart count in header
            updateCartCount(response.data.data?.cartCount);
            // Find and animate removal of the card
            let card;
            if (variantId) {
                card = document.querySelector(`.wishlist-card[data-product-id="${productId}"][data-variant-id="${variantId}"]`);
            }
            if (!card) {
                card = document.querySelector(`.wishlist-card[data-product-id="${productId}"]`);
            }
            toast.success('Item has been added to your cart');
            // Remove card from wishlist display after animation
            if (card) {
                setTimeout(() => {
                    card.classList.add('removing');
                    setTimeout(() => {
                        card.remove();
                        updateEmptyState();
                        updateWishlistCount();
                    }, 300);
                }, 500);
            }
        } else {
            btn.innerHTML = originalContent;
            btn.classList.remove('loading');
            toast.error(response.data.message || 'Failed to move to cart');
        }
    } catch (error) {
        console.error('Error moving to cart:', error);
        btn.innerHTML = originalContent;
        btn.classList.remove('loading');

        // Check if user is not logged in
        if (error.response?.status === 401) {
            Swal.fire({
                icon: 'warning',
                title: 'Login Required',
                text: error.response?.data?.message || 'Please log in to continue',
                confirmButtonText: 'Login Now',
                confirmButtonColor: '#002366'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/user/login';
                }
            });
        } else {
            toast.error(error.response?.data?.message || 'Something went wrong');
        }
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

// Toggle wishlist (for product listing/detail pages)
async function toggleWishlist(productId, btnElement) {
    const isInWishlist = btnElement.classList.contains('active');
    const icon = btnElement.querySelector('.material-icons, .wishlist-icon');

    try {
        if (isInWishlist) {
            // Remove from wishlist
            const response = await axios.delete(`/api/user/wishlist/remove/${productId}`);
            if (response.data.success) {
                btnElement.classList.remove('active');
                if (icon) icon.textContent = 'favorite_border';
                toast.success('Removed from wishlist');
            }
        } else {
            // Add to wishlist
            const response = await axios.post('/api/user/wishlist/add', { productId });
            if (response.data.success) {
                btnElement.classList.add('active');
                if (icon) icon.textContent = 'favorite';
                toast.success('Added to wishlist');
            }
        }
    } catch (error) {
        console.error('Error toggling wishlist:', error);
        if (error.response?.status === 401) {
            Swal.fire({
                icon: 'warning',
                title: 'Login Required',
                text: error.response?.data?.message || 'Please login to add items to wishlist',
                showConfirmButton: true,
                confirmButtonText: 'Login Now',
                showCancelButton: true,
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#002366'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/user/login';
                }
            });
        } else {
            toast.error(error.response?.data?.message || 'Something went wrong');
        }
    }
}
