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
    function updateZoomBackground() {
        // Prevent math errors if image isn't rendered yet or width is 0
        if (!mainImage || !zoomResult || !zoomLens || !mainImage.offsetWidth) return; 
         
        zoomResult.style.backgroundImage = `url('${mainImage.src}')`;
        const cx = zoomResult.offsetWidth / zoomLens.offsetWidth;
        const cy = zoomResult.offsetHeight / zoomLens.offsetHeight;
        
        // Scale background based on visible image width vs lens ratio
        zoomResult.style.backgroundSize = `${mainImage.offsetWidth * cx}px ${mainImage.offsetHeight * cy}px`;
    }

    // --- 3. GALLERY & UI UPDATE LOGIC ---
    function updateProductUI(variantData, variantImages = []) {
        // A. Update Text Elements
        if (displayPrice) displayPrice.textContent = `₹${variantData.salePrice.toLocaleString('en-IN')}`;
        if (displaySku) displaySku.textContent = variantData.sku || 'N/A';
        
        if (displayBasePrice) {
            if (variantData.salePrice < variantData.basePrice) {
                displayBasePrice.textContent = `₹${variantData.basePrice.toLocaleString('en-IN')}`;
                displayBasePrice.style.display = 'block';
            } else {
                displayBasePrice.style.display = 'none';
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

    // --- 4. QUANTITY LOGIC ---
    const decreaseBtn = document.getElementById('decreaseQty');
    const increaseBtn = document.getElementById('increaseQty');

    if (decreaseBtn && increaseBtn && quantityInput) {
        decreaseBtn.addEventListener('click', () => {
            let val = parseInt(quantityInput.value);
            if (val > 1) quantityInput.value = val - 1;
        });

        increaseBtn.addEventListener('click', () => {
            let val = parseInt(quantityInput.value);
            let max = parseInt(quantityInput.max) || 1;
            if (val < max) quantityInput.value = val + 1;
        });
    }

    // --- 5. EVENT LISTENERS ---

    // Variant Switching
    variantButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            variantButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const variantData = JSON.parse(this.dataset.variant);
            const variantImages = JSON.parse(this.dataset.images) || [];
            
            updateProductUI(variantData, variantImages);
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
        const containerRatio = rect.width / rect.height;
        const imageRatio = mainImage.naturalWidth / mainImage.naturalHeight;
        
        let actualImgWidth, actualImgHeight, imgLeft, imgTop;

        if (imageRatio > containerRatio) {
            actualImgWidth = rect.width;
            actualImgHeight = rect.width / imageRatio;
            imgLeft = 0;
            imgTop = (rect.height - actualImgHeight) / 2;
        } else {
            actualImgWidth = rect.height * imageRatio;
            actualImgHeight = rect.height;
            imgLeft = (rect.width - actualImgWidth) / 2;
            imgTop = 0;
        }

        // 2. Get cursor position relative to the container
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;

        // 3. STRICT BOUNDARY: Magically hide if cursor is in the "white space"
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

        // 5. CALCULATE THE "TRUE" BACKGROUND POSITION
        // We calculate movement relative to the actual image pixels, not the white box
        const cx = zoomResult.offsetWidth / zoomLens.offsetWidth;
        const cy = zoomResult.offsetHeight / zoomLens.offsetHeight;

        const bgX = (lensX - imgLeft) * cx;
        const bgY = (lensY - imgTop) * cy;

        zoomResult.style.backgroundPosition = `-${bgX}px -${bgY}px`;
    });

    mainImage.parentElement.addEventListener('mouseleave', () => {
        zoomResult.style.display = "none";
        zoomLens.style.display = "none";
    });

    

    // --- 6. INITIALIZATION HELPERS ---
    function updateStockUI(stock) {
        if (!quantityInput || !stockStatusContainer) return;

        quantityInput.max = stock;
        if (parseInt(quantityInput.value) > stock) {
            quantityInput.value = stock > 0 ? 1 : 0;
        }

        let stockHTML = '';
        if (stock > 10) {
            stockHTML = `<div class="stock-badge in-stock"><div class="stock-dot"></div><span>In Stock</span></div>`;
            addToCartBtn.disabled = false;
            addToCartBtn.innerHTML = 'Add to Cart';
        } else if (stock > 0) {
            stockHTML = `<div class="stock-badge low-stock"><div class="stock-dot"></div><span>Only ${stock} left</span></div>`;
            addToCartBtn.disabled = false;
            addToCartBtn.innerHTML = 'Add to Cart';
        } else {
            stockHTML = `<div class="stock-badge out-of-stock"><div class="stock-dot"></div><span>Out of Stock</span></div>`;
            addToCartBtn.disabled = true;
            addToCartBtn.innerHTML = 'Out of Stock';
        }
        stockStatusContainer.innerHTML = stockHTML;
    }


// --- 7. INITIAL EXECUTION (FIXED FOR SINGLE VARIANT) ---

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
});












