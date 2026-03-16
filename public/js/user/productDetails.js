document.addEventListener('DOMContentLoaded', () => {
    // --- 1. SELECTORS ---
    const mainImage = document.getElementById('mainImage');
    const zoomResult = document.getElementById('zoomResult');
    const zoomLens = document.getElementById('zoomLens');
    const variantButtons = document.querySelectorAll('.variant-btn');
    const thumbnailGallery = document.getElementById('thumbnailGallery');

    // UI Elements
    const displayPrice = document.getElementById('currentPrice');
    const displayBasePrice = document.getElementById('originalPrice');
    const displaySku = document.getElementById('skuValue');
    const quantityInput = document.getElementById('quantity');
    const addToCartBtn = document.getElementById('addToCartBtn');
    const stockStatusContainer = document.getElementById('stockStatus');

    // Get Common Images from hidden EJS element
    const commonImageData = document.getElementById('commonImageData');
    const commonImages = commonImageData ? JSON.parse(commonImageData.dataset.common) : [];

    // --- 2. ZOOM HELPER FUNCTIONS ---
    function getRenderedImageDimensions() {
        // Calculate actual rendered image size inside the container (object-fit: contain)
        const container = mainImage.parentElement;
        if (!container || !mainImage.naturalWidth || !mainImage.naturalHeight) return null;

        const containerRect = container.getBoundingClientRect();
        const containerRatio = containerRect.width / containerRect.height;
        const imageRatio = mainImage.naturalWidth / mainImage.naturalHeight;

        let actualWidth, actualHeight, offsetLeft, offsetTop;

        if (imageRatio > containerRatio) {
            // Image is wider than container ratio - fits width
            actualWidth = containerRect.width;
            actualHeight = containerRect.width / imageRatio;
            offsetLeft = 0;
            offsetTop = (containerRect.height - actualHeight) / 2;
        } else {
            // Image is taller than container ratio - fits height
            actualWidth = containerRect.height * imageRatio;
            actualHeight = containerRect.height;
            offsetLeft = (containerRect.width - actualWidth) / 2;
            offsetTop = 0;
        }

        return { actualWidth, actualHeight, offsetLeft, offsetTop };
    }

    function updateZoomBackground() {
        // Prevent math errors if image isn't rendered yet or width is 0
        if (!mainImage || !zoomResult || !zoomLens || !mainImage.offsetWidth) return;

        const dims = getRenderedImageDimensions();
        if (!dims) return;

        zoomResult.style.backgroundImage = `url('${mainImage.src}')`;
        const cx = zoomResult.offsetWidth / zoomLens.offsetWidth;
        const cy = zoomResult.offsetHeight / zoomLens.offsetHeight;

        // Scale background based on actual rendered image width (not container width)
        zoomResult.style.backgroundSize = `${dims.actualWidth * cx}px ${dims.actualHeight * cy}px`;
    }

    // --- 3. GALLERY & UI UPDATE LOGIC ---
    function updateProductUI(variantData, variantImages = []) {
        // A. Update Text Elements
        // Check if the variant has a valid offer attached
        const hasOffer = variantData.offer && variantData.offer.hasOffer;
        if (displayPrice) {
            if (hasOffer) {
                displayPrice.textContent = `₹${variantData.offer.offerPrice.toLocaleString('en-IN')}`;
            } else {
                displayPrice.textContent = `₹${variantData.salePrice.toLocaleString('en-IN')}`;
            }
        }
        if (displaySku) displaySku.textContent = variantData.sku || 'N/A';
        if (displayBasePrice) {
            if (hasOffer) {
                // Show original price (strike-through)
                displayBasePrice.textContent = `₹${variantData.offer.basePrice.toLocaleString('en-IN')}`;
                displayBasePrice.style.display = 'block';
                // Update Badge Logic
                const badge = document.getElementById('discountBadge');
                if (badge) {
                    badge.textContent = `${variantData.offer.totalDiscountPercent}% OFF`;
                    badge.style.display = 'flex';
                }


                // Update Offer Breakdown
                const breakdown = document.getElementById('offerBreakdown');
                if (breakdown) {
                    let breakdownHTML = '';
                    if (variantData.offer.saleDiscountPercent > 0) {
                        breakdownHTML += `<div style="color: #6b7280; font-size: 0.8rem;">
                            <i class="bi bi-percent"></i> Sale: ${variantData.offer.saleDiscountPercent}% off
                        </div>`;
                    }
                    breakdownHTML += `<div style="color: #166534; font-size: 0.85rem; font-weight: 500;">
                        <i class="bi bi-tag-fill"></i> 
                        + ${variantData.offer.offerDiscountPercent}% (${variantData.offer.offerTitle} - ${variantData.offer.offerSource} offer)
                    </div>`;
                    breakdown.innerHTML = breakdownHTML;
                    breakdown.style.display = 'block';
                }
            } else if (variantData.salePrice < variantData.basePrice) {
                // Standard sale discount (no offer)
                displayBasePrice.textContent = `₹${variantData.basePrice.toLocaleString('en-IN')}`;
                displayBasePrice.style.display = 'block';
                const badge = document.getElementById('discountBadge');
                if (badge) {
                    const discount = Math.round(((variantData.basePrice - variantData.salePrice) / variantData.basePrice) * 100);
                    badge.textContent = `${discount}% OFF`;
                    badge.style.display = 'flex';
                }

                const breakdown = document.getElementById('offerBreakdown');
                if (breakdown) breakdown.style.display = 'none';
            } else {
                // No discount or offer
                displayBasePrice.style.display = 'none';
                const badge = document.getElementById('discountBadge');
                if (badge) badge.style.display = 'none';
                const breakdown = document.getElementById('offerBreakdown');
                if (breakdown) breakdown.style.display = 'none';
            }
        }

        // B. Update Stock Status and Quantity Input
        updateStockUI(variantData.stock);

        // C. Update Gallery (Zipper Logic: Variant + Common)
        let interleavedImages = [];
        const maxLength = Math.max(variantImages.length, commonImages.length);
        for (let i = 0; i < maxLength; i++) {
            if (variantImages[i]) interleavedImages.push(variantImages[i]);
            if (commonImages[i]) interleavedImages.push(commonImages[i]);
        }
        interleavedImages = [...new Set(interleavedImages)]; // Unique images only

        if (interleavedImages.length > 0) {
            thumbnailGallery.innerHTML = interleavedImages.map((img, index) => `
                <div class="thumbnail-item ${index === 0 ? 'active' : ''}" data-image="${img}">
                    <img src="${img}" alt="View ${index + 1}">
                </div>
            `).join('');

            mainImage.src = interleavedImages[0];
            // Ensure zoom resets when image source changes and finishes loading
            mainImage.onload = () => updateZoomBackground();
        }
    }

    // --- Stock UI Update Function ---
    function updateStockUI(stock) {
        // Update quantity input max value
        if (quantityInput) {
            quantityInput.max = stock;
            // Reset quantity to 1 if current value exceeds new stock
            if (parseInt(quantityInput.value) > stock) {
                quantityInput.value = Math.min(parseInt(quantityInput.value), stock) || 1;
            }
        }

        // Update stock status display
        if (stockStatusContainer) {
            let stockHTML = '';
            if (stock > 10) {
                stockHTML = `
                    <div class="stock-badge in-stock">
                        <div class="stock-dot"></div>
                        <span>In Stock</span>
                    </div>`;
            } else if (stock > 0) {
                stockHTML = `
                    <div class="stock-badge low-stock">
                        <div class="stock-dot"></div>
                        <span>Only ${stock} left in stock</span>
                    </div>`;
            } else {
                stockHTML = `
                    <div class="stock-badge out-of-stock">
                        <div class="stock-dot"></div>
                        <span>Out of Stock</span>
                    </div>`;
            }
            stockStatusContainer.innerHTML = stockHTML;
        }

        // Update Add to Cart button state
        if (addToCartBtn) {
            if (stock <= 0) {
                addToCartBtn.disabled = true;
                addToCartBtn.innerHTML = 'Out of Stock';
                addToCartBtn.classList.add('disabled');
            } else {
                addToCartBtn.disabled = false;
                addToCartBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    Add to Cart`;
                addToCartBtn.classList.remove('disabled');
            }
        }
    }

    // --- 4. QUANTITY LOGIC ---
    const decreaseBtn = document.getElementById('decreaseQty');
    const increaseBtn = document.getElementById('increaseQty');

    // Toast function for notifications
    function showToast(message, type = 'warning') {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
        });
        Toast.fire({
            icon: type,
            title: message
        });
    }

    if (decreaseBtn && increaseBtn && quantityInput) {
        decreaseBtn.addEventListener('click', () => {
            let val = parseInt(quantityInput.value);
            if (val > 1) {
                quantityInput.value = val - 1;
            } else {
                showToast('Minimum quantity is 1', 'info');
            }
        });

        increaseBtn.addEventListener('click', () => {
            let val = parseInt(quantityInput.value);
            let max = parseInt(quantityInput.max) || 10;
            let maxPerOrder = 10; // Maximum per order limit

            // Check max per order limit first
            if (val >= maxPerOrder) {
                showToast('Maximum 10 items per order', 'warning');
                return;
            }

            // Check stock limit
            if (val >= max) {
                showToast(`Only ${max} items available in stock`, 'warning');
                return;
            }

            quantityInput.value = val + 1;
        });
    }

    // --- 5. EVENT LISTENERS ---

    // Variant Switching
    variantButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            variantButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const variantData = JSON.parse(this.dataset.variant);
            const variantImages = JSON.parse(this.dataset.images) || [];

            updateProductUI(variantData, variantImages);

            // Update wishlist button with new variant ID
            if (typeof updateWishlistVariant === 'function') {
                updateWishlistVariant(variantData._id);
            }
        });
    });

    // Thumbnail Click (Delegation)
    thumbnailGallery.addEventListener('click', (e) => {
        const item = e.target.closest('.thumbnail-item');
        if (!item) return;

        document.querySelectorAll('.thumbnail-item').forEach(t => t.classList.remove('active'));
        item.classList.add('active');
        mainImage.src = item.dataset.image;
        updateZoomBackground();
    });

    // 5. ZOOM MOVE LOGIC
    mainImage.parentElement.addEventListener('mousemove', (e) => {
        const container = mainImage.parentElement;
        const rect = container.getBoundingClientRect();

        // 1. Calculate actual image dimensions inside the container (object-fit: contain)
        const dims = getRenderedImageDimensions();
        if (!dims) return;

        const { actualWidth: actualImgWidth, actualHeight: actualImgHeight, offsetLeft: imgLeft, offsetTop: imgTop } = dims;

        // 2. Get cursor position relative to the container
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        // 3. STRICT BOUNDARY: Hide if cursor is in the "white space"
        if (x < imgLeft || x > imgLeft + actualImgWidth || y < imgTop || y > imgTop + actualImgHeight) {
            zoomResult.style.display = "none";
            zoomLens.style.display = "none";
            return;
        } else {
            zoomResult.style.display = "block";
            zoomLens.style.display = "block";
        }

        // 4. Center the lens on the cursor and keep it inside the image area only
        let lensX = x - (zoomLens.offsetWidth / 2);
        let lensY = y - (zoomLens.offsetHeight / 2);

        if (lensX < imgLeft) lensX = imgLeft;
        if (lensX > imgLeft + actualImgWidth - zoomLens.offsetWidth) lensX = imgLeft + actualImgWidth - zoomLens.offsetWidth;
        if (lensY < imgTop) lensY = imgTop;
        if (lensY > imgTop + actualImgHeight - zoomLens.offsetHeight) lensY = imgTop + actualImgHeight - zoomLens.offsetHeight;

        zoomLens.style.left = lensX + 'px';
        zoomLens.style.top = lensY + 'px';

        // 5. CALCULATE THE ZOOM
        const cx = zoomResult.offsetWidth / zoomLens.offsetWidth;
        const cy = zoomResult.offsetHeight / zoomLens.offsetHeight;

        // Set background image and size on every move to ensure they're always correct
        zoomResult.style.backgroundImage = `url('${mainImage.src}')`;
        zoomResult.style.backgroundSize = `${actualImgWidth * cx}px ${actualImgHeight * cy}px`;

        const bgX = (lensX - imgLeft) * cx;
        const bgY = (lensY - imgTop) * cy;

        zoomResult.style.backgroundPosition = `-${bgX}px -${bgY}px`;
    });

    mainImage.parentElement.addEventListener('mouseleave', () => {
        zoomResult.style.display = "none";
        zoomLens.style.display = "none";
    });



    // --- 6. INITIALIZATION HELPERS ---



    const defaultVariantEl = document.getElementById('defaultVariantData');
    const activeBtn =
        document.querySelector('.variant-btn.active') ||
        document.querySelector('.variant-btn');

    let initialVariantData = null;
    let initialImages = [];

    // Priority order:
    // 1️. Active variant button
    // 2️. Any variant button
    // 3️. Backend-provided firstVariant (single-variant case)

    if (activeBtn) {
        try {
            initialVariantData = JSON.parse(activeBtn.dataset.variant);
            initialImages = JSON.parse(activeBtn.dataset.images || '[]');
            activeBtn.classList.add('active');
        } catch (e) {
            console.error('Variant button data error:', e);
        }
    } else if (defaultVariantEl) {
        try {
            initialVariantData = JSON.parse(defaultVariantEl.dataset.variant);
            initialImages = JSON.parse(defaultVariantEl.dataset.images || '[]');
        } catch (e) {
            console.error('Default variant data error:', e);
        }
    }

    if (!initialVariantData) {
        window.location.href = '/user/products';
        return;
    }

    updateProductUI(initialVariantData, initialImages);

    /**
     * FIX: This function ensures the zoom result is ready immediately.
     * We wait for the image pixels to be available, then trigger the math.
     */
    const triggerInitialZoom = () => {
        // requestAnimationFrame ensures the browser has finished the layout pass
        requestAnimationFrame(() => {
            setTimeout(() => {
                updateZoomBackground();
            }, 150); // 150ms is the "sweet spot" for initial rendering
        });
    };

    if (mainImage.complete) {
        triggerInitialZoom();
    } else {
        mainImage.addEventListener('load', triggerInitialZoom);
    }

    // Ensure ratios stay perfect if the user resizes the browser window
    window.addEventListener('resize', updateZoomBackground);

    // --- 8. ADD TO CART FUNCTIONALITY ---
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', async function () {
            const productId = this.dataset.productId;
            const quantity = parseInt(quantityInput?.value) || 1;

            // Get active variant ID if exists
            const activeVariantBtn = document.querySelector('.variant-btn.active');
            const variantId = activeVariantBtn?.dataset.variantId || null;

            // Disable button and show loading state
            const originalText = this.innerHTML;
            this.disabled = true;
            this.innerHTML = `
                <svg class="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" stroke-dasharray="31.4" stroke-dashoffset="10"></circle>
                </svg>
                Adding...
            `;

            try {
                const response = await axios.post('/api/user/cart/add', {
                    productId,
                    quantity,
                    variantId
                });

                if (response.data.success) {
                    // Show success notification
                    Swal.fire({
                        icon: 'success',
                        title: 'Added to Cart!',
                        text: response.data.message || 'Item added to your cart',
                        showConfirmButton: true,
                        confirmButtonText: 'View Cart',
                        showCancelButton: true,
                        cancelButtonText: 'Continue Shopping',
                        confirmButtonColor: '#002366',
                        timer: 5000,
                        timerProgressBar: true
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = '/user/cart';
                        }
                    });

                    // Update cart count in header if element exists
                    const cartCountBadge = document.querySelector('.cart-count-badge');
                    if (cartCountBadge && response.data.data?.cartCount) {
                        cartCountBadge.textContent = response.data.data.cartCount;
                        cartCountBadge.style.display = 'flex';
                    }
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Oops!',
                        text: response.data.message || 'Failed to add item to cart',
                        confirmButtonColor: '#002366'
                    });
                }
            } catch (error) {
                console.error('Add to cart error:', error);

                // Check if user is not logged in
                if (error.response?.status === 401) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Please Login',
                        text: error.response?.data?.message || 'You need to login to add items to cart',
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
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: error.response?.data?.message || 'Something went wrong. Please try again.',
                        confirmButtonColor: '#002366'
                    });
                }
            } finally {
                // Restore button state
                this.disabled = false;
                this.innerHTML = originalText;
            }
        });
    }

    // --- 9. TAB SWITCHING LOGIC ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            // Remove active class from all buttons and panes
            tabButtons.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

            // Add active class to clicked button and corresponding pane
            this.classList.add('active');
            const tabId = this.dataset.tab;
            const targetPane = document.getElementById(tabId);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });
});

// =============================================
// WISHLIST FUNCTIONALITY (VARIANT AWARE)
// =============================================

// Toggle wishlist from product detail page (reads active variant from data attribute)
async function toggleWishlistDetail() {
    const wishlistBtn = document.getElementById('wishlistBtn');
    if (!wishlistBtn) return;

    const productId = wishlistBtn.dataset.productId;
    const variantId = wishlistBtn.dataset.variantId || null;

    const isInWishlist = wishlistBtn.classList.contains('active');
    const icon = wishlistBtn.querySelector('svg');
    const textEl = wishlistBtn.querySelector('.wishlist-text');

    try {
        if (isInWishlist) {
            // Remove from wishlist
            let removeUrl = `/api/user/wishlist/remove/${productId}`;
            if (variantId) {
                removeUrl += `?variantId=${variantId}`;
            }
            const response = await axios.delete(removeUrl);
            if (response.data.success) {
                wishlistBtn.classList.remove('active');
                if (icon) icon.style.fill = 'none';
                if (textEl) textEl.textContent = 'Wishlist';
                showToast('Removed from wishlist', 'success');
            } else {
                showToast(response.data.message || 'Failed to remove', 'error');
            }
        } else {
            // Add to wishlist with variant
            const response = await axios.post('/api/user/wishlist/add', {
                productId,
                variantId
            });
            if (response.data.success) {
                wishlistBtn.classList.add('active');
                if (icon) icon.style.fill = '#ef4444';
                if (textEl) textEl.textContent = 'Wishlisted';
                showToast('Added to wishlist!', 'success');
            } else {
                showToast(response.data.message || 'Failed to add', 'error');
            }
        }
    } catch (error) {
        console.error('Error toggling wishlist:', error);
        if (error.response?.status === 401) {
            Swal.fire({
                icon: 'warning',
                title: 'Login Required',
                text: error.response?.data?.message || 'Please login to add items to your wishlist',
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
            showToast(error.response?.data?.message || 'Something went wrong', 'error');
        }
    }
}

// Update wishlist button's variant when user selects a different variant
function updateWishlistVariant(variantId) {
    const wishlistBtn = document.getElementById('wishlistBtn');
    if (wishlistBtn) {
        wishlistBtn.dataset.variantId = variantId;
        // Reset active state when variant changes
        wishlistBtn.classList.remove('active');
        const icon = wishlistBtn.querySelector('svg');
        const textEl = wishlistBtn.querySelector('.wishlist-text');
        if (icon) icon.style.fill = 'none';
        if (textEl) textEl.textContent = 'Wishlist';
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    if (typeof Swal !== 'undefined') {
        const Toast = Swal.mixin({
            toast: true,
            position: 'bottom-end',
            showConfirmButton: false,
            timer: 2000,
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
// REVIEWS - Load max 5 reviews with See More
// =============================================

document.addEventListener('DOMContentLoaded', function () {
    const reviewsList = document.getElementById('reviewsList');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    const averageRatingDisplay = document.getElementById('averageRatingDisplay');
    const averageRatingStars = document.getElementById('averageRatingStars');
    const totalReviewsCount = document.getElementById('totalReviewsCount');
    const ratingBreakdown = document.getElementById('ratingBreakdown');

    if (!reviewsList) return;

    // Extract productId from the page
    const addToCartBtn = document.getElementById('addToCartBtn');
    const wishlistBtn = document.getElementById('wishlistBtn');
    const productId = addToCartBtn?.dataset?.productId || wishlistBtn?.dataset?.productId;

    if (!productId) return;

    async function loadReviews() {
        try {
            const response = await axios.get(`/api/user/reviews/product/${productId}?limit=5`);
            const result = response.data;

            if (!result.success) return;

            const reviews = result.data?.reviews || [];
            const totalReviews = result.data?.pagination?.total || reviews.length;
            const breakdown = result.data?.ratingDistribution || null;

            // Calculate average rating from breakdown
            let avgRating = 0;
            if (breakdown) {
                let totalScore = 0, totalCount = 0;
                for (let i = 1; i <= 5; i++) {
                    totalScore += i * (breakdown[i] || 0);
                    totalCount += (breakdown[i] || 0);
                }
                avgRating = totalCount > 0 ? totalScore / totalCount : 0;
            }

            // Update summary
            if (averageRatingDisplay) {
                averageRatingDisplay.textContent = avgRating.toFixed(1);
            }
            if (totalReviewsCount) {
                totalReviewsCount.textContent = `${totalReviews} Review${totalReviews !== 1 ? 's' : ''}`;
            }

            // Update stars
            if (averageRatingStars) {
                const stars = averageRatingStars.querySelectorAll('.star');
                stars.forEach((star, index) => {
                    star.style.color = index < Math.round(avgRating) ? '#f59e0b' : '#d1d5db';
                });
            }

            // Update breakdown
            if (ratingBreakdown && breakdown) {
                let breakdownHTML = '';
                for (let i = 5; i >= 1; i--) {
                    const count = breakdown[i] || 0;
                    const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                    breakdownHTML += `
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                            <span style="font-size:13px;color:#6b7280;width:14px;">${i}</span>
                            <span style="color:#f59e0b;font-size:13px;">★</span>
                            <div style="flex:1;height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden;">
                                <div style="height:100%;width:${percent}%;background:linear-gradient(90deg,#f59e0b,#fbbf24);border-radius:4px;transition:width 0.3s;"></div>
                            </div>
                            <span style="font-size:12px;color:#9ca3af;width:24px;text-align:right;">${count}</span>
                        </div>`;
                }
                ratingBreakdown.innerHTML = breakdownHTML;
            }

            // Render reviews (max 5)
            const displayReviews = reviews.slice(0, 5);
            if (displayReviews.length === 0) {
                reviewsList.innerHTML = `
                    <div style="text-align:center;padding:60px 20px;background:linear-gradient(135deg,#f8fafc,#eef2ff);border-radius:16px;border:1px dashed #c7d2fe;">
                        <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#e0e7ff,#c7d2fe);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="1.5">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                            </svg>
                        </div>
                        <p style="font-size:17px;font-weight:600;color:#1f2937;margin:0 0 6px;">No reviews yet</p>
                        <p style="font-size:14px;color:#6b7280;margin:0;">Be the first to share your experience with this product!</p>
                    </div>`;
                if (loadMoreContainer) loadMoreContainer.style.display = 'none';
                return;
            }

            // Color palette for avatar backgrounds
            const avatarColors = [
                'linear-gradient(135deg,#002366,#2563eb)',
                'linear-gradient(135deg,#7c3aed,#a78bfa)',
                'linear-gradient(135deg,#059669,#34d399)',
                'linear-gradient(135deg,#dc2626,#f87171)',
                'linear-gradient(135deg,#d97706,#fbbf24)'
            ];

            let reviewsHTML = '';
            displayReviews.forEach((review, index) => {
                const reviewDate = new Date(review.createdAt).toLocaleDateString('en-IN', {
                    year: 'numeric', month: 'short', day: 'numeric'
                });

                let starsHTML = '';
                for (let s = 1; s <= 5; s++) {
                    starsHTML += `<span style="color:${s <= review.rating ? '#f59e0b' : '#e5e7eb'};font-size:15px;">★</span>`;
                }

                const userName = review.user?.name || 'Anonymous';
                const avatarBg = avatarColors[index % avatarColors.length];

                // Rating label
                const ratingLabels = { 5: 'Excellent', 4: 'Great', 3: 'Good', 2: 'Fair', 1: 'Poor' };
                const ratingLabel = ratingLabels[review.rating] || '';

                reviewsHTML += `
                    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;margin-bottom:16px;transition:all 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.04);"
                         onmouseover="this.style.boxShadow='0 8px 24px rgba(0,35,102,0.08)';this.style.borderColor='#c7d2fe';"
                         onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)';this.style.borderColor='#e5e7eb';">
                        
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
                            <div style="display:flex;align-items:center;gap:12px;">
                                <div style="width:42px;height:42px;border-radius:50%;background:${avatarBg};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;flex-shrink:0;">
                                    ${userName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div style="font-weight:600;font-size:15px;color:#1f2937;">${userName}</div>
                                    <div style="font-size:12px;color:#9ca3af;margin-top:2px;">${reviewDate}</div>
                                </div>
                            </div>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <div style="display:flex;gap:2px;">${starsHTML}</div>
                                <span style="font-size:12px;font-weight:600;color:#fff;background:${review.rating >= 4 ? '#16a34a' : review.rating >= 3 ? '#f59e0b' : '#ef4444'};padding:3px 10px;border-radius:20px;">${ratingLabel}</span>
                            </div>
                        </div>

                        ${review.title ? `<h4 style="font-size:15px;font-weight:700;color:#1f2937;margin:0 0 8px;letter-spacing:-0.01em;">${review.title}</h4>` : ''}
                        
                        <p style="font-size:14px;color:#4b5563;line-height:1.7;margin:0;padding-left:14px;border-left:3px solid #e0e7ff;">${review.comment || ''}</p>

                        <div style="display:flex;align-items:center;gap:6px;margin-top:14px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#16a34a" stroke="none">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <span style="font-size:12px;color:#16a34a;font-weight:500;">Verified Purchase</span>
                        </div>
                    </div>`;
            });
            reviewsList.innerHTML = reviewsHTML;

            // Show "See More Reviews" if total > 5
            if (loadMoreContainer) {
                loadMoreContainer.style.display = totalReviews > 5 ? 'flex' : 'none';
            }

        } catch (error) {
            console.error('Error loading reviews:', error);
            reviewsList.innerHTML = `
                <div style="text-align:center;padding:40px;color:#9ca3af;background:#f8fafc;border-radius:12px;">
                    <p style="margin:0;font-size:14px;">Unable to load reviews at this time.</p>
                </div>`;
        }
    }

    loadReviews();
});


// =============================================
// WRITE REVIEW MODAL (SweetAlert2)
// =============================================
function openReviewModal() {
    const addToCartBtn = document.getElementById('addToCartBtn');
    const wishlistBtn = document.getElementById('wishlistBtn');
    const productId = addToCartBtn?.dataset?.productId || wishlistBtn?.dataset?.productId;

    if (!productId) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Product not found.', confirmButtonColor: '#002366' });
        return;
    }

    Swal.fire({
        title: 'Write a Review',
        html: `
            <div style="text-align:left;">
                <label style="font-weight:600;font-size:14px;color:#374151;display:block;margin-bottom:8px;">Your Rating</label>
                <div id="swalStarRating" style="display:flex;gap:6px;margin-bottom:20px;cursor:pointer;">
                    ${[1, 2, 3, 4, 5].map(i => `
                        <span class="swal-star" data-value="${i}" style="font-size:32px;color:#d1d5db;transition:color 0.15s;">★</span>
                    `).join('')}
                </div>
                <input type="hidden" id="swalRatingValue" value="0">
                <label style="font-weight:600;font-size:14px;color:#374151;display:block;margin-bottom:8px;">Your Review</label>
                <textarea id="swalReviewComment" rows="4" placeholder="Share your experience with this product..."
                    style="width:100%;padding:12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;resize:vertical;font-family:inherit;outline:none;transition:border-color 0.2s;"
                    onfocus="this.style.borderColor='#002366'" onblur="this.style.borderColor='#e5e7eb'"></textarea>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Submit Review',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#002366',
        cancelButtonColor: '#6b7280',
        customClass: { popup: 'swal-review-popup' },
        didOpen: () => {
            const stars = document.querySelectorAll('#swalStarRating .swal-star');
            const ratingInput = document.getElementById('swalRatingValue');

            stars.forEach(star => {
                star.addEventListener('mouseenter', function () {
                    const val = parseInt(this.dataset.value);
                    stars.forEach((s, idx) => {
                        s.style.color = idx < val ? '#f59e0b' : '#d1d5db';
                    });
                });

                star.addEventListener('click', function () {
                    ratingInput.value = this.dataset.value;
                    const val = parseInt(this.dataset.value);
                    stars.forEach((s, idx) => {
                        s.style.color = idx < val ? '#f59e0b' : '#d1d5db';
                        s.dataset.selected = idx < val ? '1' : '0';
                    });
                });
            });

            document.getElementById('swalStarRating').addEventListener('mouseleave', () => {
                const selected = parseInt(ratingInput.value) || 0;
                stars.forEach((s, idx) => {
                    s.style.color = idx < selected ? '#f59e0b' : '#d1d5db';
                });
            });
        },
        preConfirm: () => {
            const rating = parseInt(document.getElementById('swalRatingValue').value);
            const comment = document.getElementById('swalReviewComment').value.trim();

            if (!rating || rating < 1) {
                Swal.showValidationMessage('Please select a rating');
                return false;
            }
            if (!comment) {
                Swal.showValidationMessage('Please write a comment');
                return false;
            }

            return { rating, comment };
        }
    }).then(async (result) => {
        if (!result.isConfirmed) return;

        const { rating, comment } = result.value;
        const activeVariantBtn = document.querySelector('.variant-btn.active');
        const variantId = activeVariantBtn?.dataset?.variantId || null;

        try {
            const response = await axios.post('/api/user/reviews', {
                productId,
                rating,
                comment,
                variantId
            });

            if (response.data.success) {
                const Toast = Swal.mixin({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true
                });
                Toast.fire({
                    icon: 'success',
                    title: 'Review submitted successfully!'
                }).then(() => {
                    location.reload();
                });
            }
        } catch (error) {
            if (error.response?.status === 401) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Login Required',
                    text: 'Please login to write a review.',
                    showConfirmButton: true,
                    confirmButtonText: 'Login Now',
                    showCancelButton: true,
                    cancelButtonText: 'Cancel',
                    confirmButtonColor: '#002366'
                }).then((res) => {
                    if (res.isConfirmed) {
                        window.location.href = '/user/login';
                    }
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.response?.data?.message || 'Failed to submit review. Please try again.',
                    confirmButtonColor: '#002366'
                });
            }
        }
    });
}
