// State
let selectedImages = []; // File objects (New uploads)
let existingImages = []; // Strings (Server paths)
let productFeatures = []; // Strings
let variants = []; // Variant objects
let isEditMode = false;
let editingId = null;

// Cropper State
let cropQueue = [];
let cropperInstance = null;
let currentCropFile = null;
let cropperContext = 'main'; // 'main' or 'variant'
let pendingVariantFile = null; // Deprecated but might be used
let currentVariantFiles = [];
let currentVariantExistingImages = [];

// Tom Select Instances
let brandSelect, categorySelect;

// 1. Filter Logic
function applyFilter(key, value) {
    const url = new URL(window.location.href);

    // Only reset page to 1 if it's not a page change
    if (key !== 'page') {
        url.searchParams.set('page', 1);
    }

    if (value) {
        url.searchParams.set(key, value);
    } else {
        url.searchParams.delete(key);
    }

    window.location.href = url.toString();
}

// Auto-open modal on page load (if 'edit' param exists)
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');

    if (editId) {
        // Ensure openModal is defined in this file or globally available
        if (typeof openModal === 'function') {
            openModal('edit', editId);

            // Clean URL (remove ?edit=123 without reloading)
            window.history.replaceState({}, document.title, window.location.pathname);
        } else {
            console.error("openModal function not found");
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('brandSelect')) {
        brandSelect = new TomSelect('#brandSelect', {
            create: false,
            sortField: { field: "text", direction: "asc" }
        });
    }
    if (document.getElementById('categorySelect')) {
        categorySelect = new TomSelect('#categorySelect', {
            create: false,
            sortField: { field: "text", direction: "asc" }
        });
    }
});

async function editVariantFromDetails(productId, variantIndex) {
    // If variants array is empty (meaning we haven't loaded the product data yet), fetch it first
    if (variants.length === 0) {
        await fetchProductData(productId, false); // false = don't open main modal
    }
    openVariantModal(variantIndex);
}

window.editProduct = function (id) {
    fetchProductData(id, true);
};

window.editVariantFromDetails = editVariantFromDetails;



function handleVariantImageSelect(input) {
    if (input.files && input.files.length > 0) {
        // Set context to 'variant' before handling files
        cropperContext = 'variant';
        handleFiles(input.files, 'variant');
    }
    input.value = '';
}

// =======================
// UI & MODAL
// =======================

function openModal() {
    isEditMode = false;
    editingId = null;
    document.getElementById('productModal').classList.add('show');
    document.getElementById('modalTitle').innerText = 'Add New Product';
    document.getElementById('productForm').reset();
    selectedImages = [];
    existingImages = [];
    productFeatures = [];
    variants = [];
    renderImages();
    renderFeatures();
    renderVariants();

    if (brandSelect) brandSelect.clear();
    if (categorySelect) categorySelect.clear();
}

function closeModal() {
    document.getElementById('productModal').classList.remove('show');
}

function removeVariantImage(type, index) {
    if (type === 'existing') {
        currentVariantExistingImages.splice(index, 1);
    } else {
        currentVariantFiles.splice(index, 1);
    }
    renderVariantImages();
}

function renderVariantImages() {
    const container = document.getElementById('variantPreviewContainer');
    if (!container) return;
    container.innerHTML = '';

    // Existing Images
    currentVariantExistingImages.forEach((src, index) => {
        const div = document.createElement('div');
        div.className = 'upload-preview-item';
        div.innerHTML = `
            <img src="${src}">
            <button type="button" class="remove-btn" onclick="removeVariantImage('existing', ${index})">
                <i class="bi bi-x-lg" style="font-size:14px;"></i>
            </button>
        `;
        container.appendChild(div);
    });

    // New Files
    currentVariantFiles.forEach((file, index) => {
        const div = document.createElement('div');
        div.className = 'upload-preview-item';
        const reader = new FileReader();
        reader.onload = (e) => {
            div.innerHTML = `
                <img src="${e.target.result}">
                <button type="button" class="remove-btn" onclick="removeVariantImage('new', ${index})">
                    <i class="bi bi-x-lg" style="font-size:14px;"></i>
                </button>
            `;
        }
        reader.readAsDataURL(file);
        // Add to container
        container.appendChild(div);
    });
}
// Duplicate function definitions removed

function openVariantModal(index = null) {
    const modal = document.getElementById('variantModal');
    const form = document.getElementById('variantForm');
    const title = document.getElementById('variantModalTitle');

    document.getElementById('variantIndex').value = index !== null ? index : '';

    if (index !== null) {
        title.innerText = 'Edit Variant';
        const v = variants[index];
        form.v_type.value = v.type || '';
        form.v_value.value = v.value || '';
        form.v_basePrice.value = v.basePrice || '';
        form.v_salePrice.value = v.salePrice || '';
        form.v_offer.value = v.offer || 0;
        form.v_stock.value = v.stock || '';
        if (document.getElementById('variantStatus')) {
            document.getElementById('variantStatus').value = v.status || 'Active';
        }

        if (v.images && v.images.length > 0) {
            currentVariantExistingImages = [...v.images];
        } else if (v.image) {
            currentVariantExistingImages = [v.image];
        } else {
            currentVariantExistingImages = [];
        }

        currentVariantFiles = v.imageFiles ? [...v.imageFiles] : [];



        renderVariantImages();

        calculateDiscount();
    } else {
        title.innerText = 'Add Variant';
        form.reset();

        currentVariantFiles = [];
        currentVariantExistingImages = [];
        renderVariantImages();

        document.getElementById('discountAmount').innerText = '₹0.00';
        document.getElementById('discountContainer').style.display = 'none';
        document.getElementById('variantStatus').value = 'Active';
    }

    modal.classList.add('show');
}

function closeVariantModal() {
    document.getElementById('variantModal').classList.remove('show');
    currentVariantFiles = [];
    currentVariantExistingImages = [];
}

function calculateFromPrice() {
    calculateDiscount();
}

function calculateDiscount() {
    const base = parseFloat(document.querySelector('input[name="v_basePrice"]').value) || 0;
    const saleInput = document.querySelector('input[name="v_salePrice"]').value;
    const sale = parseFloat(saleInput);

    const offerField = document.querySelector('input[name="v_offer"]');
    const discountLabel = document.getElementById('discountAmount');
    const discountContainer = document.getElementById('discountContainer');

    if (saleInput.trim() !== '') {
        discountContainer.style.display = 'flex';
    } else {
        discountContainer.style.display = 'none';
    }

    if (base > 0 && !Number.isNaN(sale) && sale >= 0) {
        if (sale > base) {
            discountLabel.innerText = "Sale > Base";
            discountLabel.style.color = "red";
            offerField.value = 0;
            return;
        }

        const discount = base - sale;
        const offer = ((discount / base) * 100).toFixed(0);

        offerField.value = offer > 0 ? offer : 0;
        discountLabel.innerText = `₹${discount.toFixed(2)}`;
        discountLabel.style.color = '#002366';
        return;
    }

    offerField.value = 0;
    discountLabel.innerText = '₹0.00';
    discountLabel.style.color = '#002366';
}

function calculateFromDiscount() {
    const base = parseFloat(document.querySelector('input[name="v_basePrice"]').value) || 0;
    const offer = parseFloat(document.querySelector('input[name="v_offer"]').value) || 0;
    const saleField = document.querySelector('input[name="v_salePrice"]');
    const discountLabel = document.getElementById('discountAmount');
    const discountContainer = document.getElementById('discountContainer');

    if (base > 0) {
        if (offer < 0 || offer > 100) return;
        const discountAmount = (base * offer) / 100;
        const salePrice = base - discountAmount;
        saleField.value = salePrice.toFixed(2);
        discountLabel.innerText = `₹${discountAmount.toFixed(2)}`;
        discountLabel.style.color = '#002366';
        discountContainer.style.display = 'flex';
    }
}

function saveVariant() {
    try {
        const form = document.getElementById('variantForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const type = form.v_type.value;
        const value = form.v_value.value;
        const basePrice = parseFloat(form.v_basePrice.value);
        const salePriceRaw = form.v_salePrice.value;
        const salePrice = salePriceRaw.trim() === '' ? basePrice : parseFloat(salePriceRaw);
        const stock = parseInt(form.v_stock.value);
        const index = parseInt(document.getElementById('variantIndex').value);
        const status = document.getElementById('variantStatus').value || 'Active';

        if (!Number.isFinite(basePrice) || basePrice <= 0) {
            Swal.fire('Error', 'Base price is required and must be greater than 0', 'error');
            return;
        }
        if (!Number.isFinite(salePrice) || salePrice < 0) {
            Swal.fire('Error', 'Selling price must be a valid number', 'error');
            return;
        }
        if (salePrice > basePrice) {
            Swal.fire('Error', 'Selling price cannot be greater than base price', 'error');
            return;
        }

        const variantTotalImages = (currentVariantExistingImages?.length || 0) + (currentVariantFiles?.length || 0);
        if (variantTotalImages < 3) {
            Swal.fire('Error', 'Please upload at least 3 images for this variant', 'error');
            return;
        }

        const variantObj = {
            type: type,
            color: type && type.toLowerCase() === 'color' ? value : '',
            value: value,
            basePrice,
            salePrice,
            stock,
            images: currentVariantExistingImages, // URLs
            imageFiles: currentVariantFiles,      // Files
            status: status
        };

        if (index >= 0) {
            variants[index] = variantObj;
        } else {
            variants.push(variantObj);
        }

        renderVariants();
        closeVariantModal();

        // If we are on the details page, we need to persist changes immediately
        if (window.location.pathname.includes('/details') && editingId) {
            persistVariantChanges();
        }
    } catch (error) {
        console.error("Error saving variant:", error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to save variant: ' + error.message
        });
    }
}

async function persistVariantChanges() {
    try {
        Swal.fire({
            title: 'Saving Changes...',
            text: 'Please wait while we update the product variants.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        const formData = new FormData();

        // Prepare variants data (excluding file objects which cause circular ref issues in JSON)
        const variantsData = variants.map(v => {
            const { imageFiles, ...rest } = v;
            return rest;
        });

        formData.append('variants', JSON.stringify(variantsData));

        // Append new images for each variant
        variants.forEach((v, idx) => {
            if (v.imageFiles && v.imageFiles.length > 0) {
                v.imageFiles.forEach(file => {
                    formData.append(`variantImage_${idx}`, file);
                });
            }
        });
        const res = await axios.put(`/api/admin/products/${editingId}`, formData);

        // Axios parses JSON automatically and puts it in `res.data`
        const json = res.data;

        if (json && json.success) {
            Swal.fire({
                icon: 'success',
                title: 'Saved',
                text: 'Variant details updated successfully',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                location.reload();
            });
        } else {
            throw new Error(json?.message || 'Failed to update variant');
        }

    } catch (error) {
        console.error("Persist Error:", error);

        // Handle Axios specific error responses
        if (error.response && error.response.data) {
            Swal.fire('Error', error.response.data.message || 'Failed to save changes to server', 'error');
        } else {
            Swal.fire('Error', 'Failed to save changes to server: ' + error.message, 'error');
        }
    }
}

function duplicateVariant(index) {
    const original = variants[index];
    const duplicate = {
        ...original,
        images: [...(original.images || [])],
        imageFiles: [...(original.imageFiles || [])]
    };
    variants.splice(index + 1, 0, duplicate);
    renderVariants();

    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Variant duplicated',
        showConfirmButton: false,
        timer: 1500
    });
}

function removeVariant(index) {
    variants.splice(index, 1);
    renderVariants();
}

// =======================
// IMAGE UPLOAD
// =======================

const dropZone = document.getElementById('imageDropZone');
const fileInput = document.getElementById('imageFileInput');

if (dropZone && fileInput) {
    dropZone.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON' && e.target !== fileInput) {
            fileInput.click();
        }
    });

    dropZone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
        fileInput.value = '';
    });
}

// Variant Drop Zone
const variantDropZone = document.getElementById('variantDropZone');
const variantInput = document.getElementById('variantImageInput');

if (variantDropZone && variantInput) {
    variantDropZone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        variantDropZone.classList.add('dragover');
    });

    variantDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        variantDropZone.classList.add('dragover');
    });

    variantDropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        variantDropZone.classList.remove('dragover');
    });

    variantDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        variantDropZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleVariantImageSelect({ files: e.dataTransfer.files });
        }
    });
}

// Global drop prevention to ensure dropped files outside the dropzone don't navigate away
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.body.addEventListener(eventName, (e) => {
        e.preventDefault();
    });
});

function handleFiles(files, context = 'main') {
    // Clear any existing queue if it's a new context
    if (cropperContext !== context) {
        cropQueue = [];
    }
    cropperContext = context;
    const newFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    // If a cropper is already open, add to queue
    if (document.getElementById('cropperModal').classList.contains('show')) {
        cropQueue = [...cropQueue, ...newFiles];
    } else {
        // Otherwise, set as new queue and process
        cropQueue = newFiles;
        processCropQueue();
    }
}

// =======================
// CROPPER LOGIC
// =======================

function processCropQueue() {
    if (document.getElementById('cropperModal').classList.contains('show')) return;
    if (cropQueue.length === 0) return;

    currentCropFile = cropQueue[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        openCropper(e.target.result);
    };
    reader.readAsDataURL(currentCropFile);
}

function openCropper(src) {
    const modal = document.getElementById('cropperModal');
    const image = document.getElementById('cropperImage');
    image.src = src;
    modal.classList.add('show');

    if (cropperInstance) cropperInstance.destroy();

    cropperInstance = new Cropper(image, {
        aspectRatio: NaN,
        viewMode: 1,
        background: false
    });
}

function saveCrop() {
    if (!cropperInstance) return;

    cropperInstance.getCroppedCanvas().toBlob((blob) => {
        const croppedFile = new File([blob], currentCropFile.name, {
            type: currentCropFile.type,
            lastModified: Date.now() // Ensure unique timestamp
        });

        if (cropperContext === 'main') {
            selectedImages.push(croppedFile);
            renderImages();
        } else if (cropperContext === 'variant') {
            currentVariantFiles.push(croppedFile);
            renderVariantImages();
        }

        // Clean up
        cropQueue.shift();
        document.getElementById('cropperModal').classList.remove('show');
        if (cropperInstance) {
            cropperInstance.destroy();
            cropperInstance = null;
        }

        // Process next in queue if any
        if (cropQueue.length > 0) {
            processCropQueue();
        }

    }, currentCropFile.type);
}

function closeCropper() {
    // Discard current crop and hide modal
    cropQueue.shift();
    document.getElementById('cropperModal').classList.remove('show');
    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }

    // Process next in queue if any
    if (cropQueue.length > 0) {
        processCropQueue();
    }
}



// =======================
// FEATURES
// =======================

function addFeature() {
    productFeatures.push('');
    renderFeatures();
}

function renderFeatures() {
    const container = document.getElementById('featuresContainer');

    if (productFeatures.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-list-ul" style="font-size:32px; color:var(--text-light);"></i>
                <p>No features added yet</p>
            </div>
        `;
        return;
    }

    container.innerHTML = productFeatures.map((feat, idx) => `
        <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:12px 16px; margin-bottom:10px; display:flex; align-items:center; gap:12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            <div style="flex:1;">
                <input type="text" class="form-input" placeholder="Enter feature" value="${feat}" 
                       oninput="productFeatures[${idx}] = this.value" 
                       style="border:none; padding:4px 0; font-size:14px; width:100%; outline:none; background:transparent;">
            </div>
            <button type="button" onclick="removeFeature(${idx})" 
                    style="background:#fee2e2; color:#ef4444; border:none; width:32px; height:32px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s;">
                <i class="bi bi-x-lg" style="font-size:14px;"></i>
            </button>
        </div>
    `).join('');
}

function removeFeature(index) {
    productFeatures.splice(index, 1);
    renderFeatures();
}

function renderVariants() {
    const container = document.getElementById('variantsContainer');

    if (variants.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-palette" style="font-size:32px; color:var(--text-light);"></i>
                <p>No variants added yet</p>
            </div>
        `;
        return;
    }

    container.innerHTML = variants.map((v, idx) => `
        <div class="variant-card" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:20px; margin-bottom:16px;">
            <!-- Header -->
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:16px;">
                <div>
                    <div style="font-size:16px; font-weight:700; color:#1e293b; text-transform:capitalize;">
                        ${v.type}: <span style="color:#3b82f6;">${v.value}</span>
                    </div>
                    <div style="font-size:13px; color:#64748b; margin-top:4px;">
                        Stock: ${v.stock} units
                    </div>
                </div>
                <button type="button" onclick="removeVariant(${idx})" 
                        style="background:#fee2e2; color:#ef4444; border:none; width:32px; height:32px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>

            <!-- Price Cards -->
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:20px;">
                <div style="background:white; padding:12px; border-radius:8px; border:1px solid #f1f5f9;">
                    <div style="font-size:11px; text-transform:uppercase; color:#64748b; letter-spacing:0.5px; margin-bottom:4px;">Base Price</div>
                    <div style="font-size:16px; font-weight:600; color:#1e293b;">₹${v.basePrice.toFixed(2)}</div>
                </div>
                <div style="background:white; padding:12px; border-radius:8px; border:1px solid #f1f5f9;">
                    <div style="font-size:11px; text-transform:uppercase; color:#64748b; letter-spacing:0.5px; margin-bottom:4px;">Selling Price</div>
                    <div style="font-size:16px; font-weight:600; color:#1e293b;">₹${v.salePrice.toFixed(2)}</div>
                </div>
                <div style="background:white; padding:12px; border-radius:8px; border:1px solid #f1f5f9;">
                    <div style="font-size:11px; text-transform:uppercase; color:#64748b; letter-spacing:0.5px; margin-bottom:4px;">Offer</div>
                    <div style="font-size:16px; font-weight:600; color:#1e293b;">
                        ${((v.basePrice - v.salePrice) / v.basePrice * 100).toFixed(0)}%
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div style="display:flex; justify-content:flex-end; gap: 10px;">
                <button type="button" onclick="duplicateVariant(${idx})" 
                        style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:8px 16px; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s;">
                    Duplicate
                </button>
                <button type="button" onclick="openVariantModal(${idx})" 
                        style="background:#bae6fd; color:#0369a1; border:none; padding:8px 16px; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.2s;">
                    Edit Variant
                </button>
            </div>
        </div>
    `).join('');
}


// =======================
// IMAGE RENDERING
// =======================

function renderImages() {
    const container = document.getElementById('imagePreviewContainer');
    if (!container) return;
    container.innerHTML = '';

    // Render Existing Images (Server)
    existingImages.forEach((src, index) => {
        const div = document.createElement('div');
        div.className = 'image-preview';
        div.innerHTML = `
            <img src="${src}" class="preview-img">
            <button type="button" class="remove-img" onclick="removeExistingImage(${index})">×</button>
        `;
        container.appendChild(div);
    });

    // Render New Images (Files)
    selectedImages.forEach((file, index) => {
        const div = document.createElement('div');
        div.className = 'image-preview';

        const reader = new FileReader();
        reader.onload = (e) => {
            div.innerHTML = `
                <img src="${e.target.result}" class="preview-img">
                <button type="button" class="remove-img" onclick="removeNewImage(${index})">×</button>
            `;
        };
        reader.readAsDataURL(file);

        container.appendChild(div);
    });
}

function removeExistingImage(index) {
    existingImages.splice(index, 1);
    renderImages();
}

function removeNewImage(index) {
    selectedImages.splice(index, 1);
    renderImages();
}

function removeImage(index) {
    removeNewImage(index);
}


// =======================
// SUBMIT PRODUCT
// =======================

async function submitProduct(e) {
    if (e) e.preventDefault();
    const form = document.getElementById('productForm');

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    if (selectedImages.length === 0 && existingImages.length === 0) {
        Swal.fire('Error', 'Please upload at least one product image', 'error');
        return;
    }

    if (productFeatures.filter(f => f.trim()).length === 0) {
        Swal.fire('Error', 'Please add at least one feature', 'error');
        return;
    }

    if (variants.length === 0) {
        Swal.fire('Error', 'Please add at least one variant', 'error');
        return;
    }

    const variantsWithIssues = variants
        .map((v, idx) => {
            const imgCount = (v.images?.length || 0) + (v.imageFiles?.length || 0);
            return { idx, imgCount, basePrice: v.basePrice, salePrice: v.salePrice, type: v.type, value: v.value };
        })
        .filter(v => {
            if (!Number.isFinite(v.basePrice) || v.basePrice <= 0) return true;
            if (!Number.isFinite(v.salePrice) || v.salePrice < 0) return true;
            if (v.salePrice > v.basePrice) return true;
            if (v.imgCount < 3) return true;
            return false;
        });

    if (variantsWithIssues.length > 0) {
        const first = variantsWithIssues[0];
        Swal.fire({
            title: 'Variant validation failed',
            text: `Fix variant #${first.idx + 1} (${first.type || 'Variant'}: ${first.value || ''}). Ensure base price > 0, selling price <= base price, and at least 3 images.`,
            icon: 'error'
        });
        return;
    }

    if (isEditMode) {
        const currentPayload = {
            productName: form.productName?.value?.trim() || '',
            description: form.description?.value?.trim() || '',
            category: form.category?.value || '',
            brand: form.brand?.value || '',
            status: form.status?.type === 'checkbox' ? (form.status.checked ? 'Active' : 'Inactive') : (form.status?.value || 'Active'),
            features: productFeatures.filter(f => f.trim()),
            variants: variants.map(v => ({
                type: (v.type || '').trim(),
                value: (v.value || '').trim(),
                basePrice: Number(v.basePrice),
                salePrice: Number(v.salePrice),
                stock: Number(v.stock),
                images: (v.images || []).slice().sort()
            }))
        };

        const baselinePayload = {
            productName: (form.dataset.originalProductName || '').trim(),
            description: (form.dataset.originalDescription || '').trim(),
            category: form.dataset.originalCategory || '',
            brand: form.dataset.originalBrand || '',
            status: form.dataset.originalStatus || 'Active',
            features: (() => {
                try { return JSON.parse(form.dataset.originalFeatures || '[]'); } catch { return []; }
            })(),
            variants: (() => {
                try { return JSON.parse(form.dataset.originalVariants || '[]'); } catch { return []; }
            })().map(v => ({
                type: (v.type || '').trim(),
                value: (v.value || '').trim(),
                basePrice: Number(v.basePrice),
                salePrice: Number(v.salePrice),
                stock: Number(v.stock),
                images: (v.images || []).slice().sort()
            }))
        };

        const imagesChanged = (selectedImages.length > 0) || ((existingImages || []).join('|') !== (form.dataset.originalImages || ''));
        const changed = imagesChanged || JSON.stringify(currentPayload) !== JSON.stringify(baselinePayload);
        if (!changed) {
            Swal.fire('No changes made', 'Please update at least one field before saving.', 'error');
            return;
        }
    }

    const formData = new FormData();
    formData.append('productName', form.productName.value);
    formData.append('description', form.description.value);
    formData.append('category', form.category.value);
    formData.append('brand', form.brand.value);

    // Handle Status (Checkbox or Select)
    const status = form.status.type === 'checkbox' ?
        (form.status.checked ? 'Active' : 'Inactive') :
        form.status.value;
    formData.append('status', status);

    formData.append('features', JSON.stringify(productFeatures.filter(f => f.trim())));

    existingImages.forEach(url => {
        formData.append('existingImages', url);
    });

    selectedImages.forEach(file => {
        formData.append('images', file);
    });

    const variantsData = variants.map(v => {
        const { imageFiles, ...rest } = v;
        // Ensure we send 'images' (existing URLs)
        // If strict migration needed, map 'image' to 'images' here too?
        // Schema handles it.
        return rest;
    });
    formData.append('variants', JSON.stringify(variantsData));

    variants.forEach((v, idx) => {
        if (v.imageFiles && v.imageFiles.length > 0) {
            v.imageFiles.forEach(file => {
                formData.append(`variantImage_${idx}`, file);
            });
        }
    });

    try {
        const url = isEditMode ? `/api/admin/products/${editingId}` : '/api/admin/products';
        const method = isEditMode ? 'PUT' : 'POST';

        const response = await axios({ method, url, data: formData });

        if (response.data.success) {
            Swal.fire('Success', response.data.message, 'success');
            closeModal();
            location.reload();
        } else {
            Swal.fire('Error', response.data.message, 'error');
        }
    } catch (err) {
        console.error('Product submission error:', err);

        // Handle axios error response
        if (err.response) {
            const errorMessage = err.response.data?.message || err.response.data?.error || 'Server error occurred';
            Swal.fire('Error', errorMessage, 'error');
        } else if (err.request) {
            Swal.fire('Error', 'Network error. Please check your connection.', 'error');
        } else {
            Swal.fire('Error', 'Something went wrong. Please try again.', 'error');
        }
    }
}


async function fetchProductData(id, openModal = true) {
    try {
        const { data: json } = await axios.get(`/api/admin/products/${id}`);

        if (json.success) {
            const product = json.data;
            isEditMode = true;
            editingId = id;

            if (openModal) {
                document.getElementById('productModal').classList.add('show');
                document.getElementById('modalTitle').innerText = 'Edit Product';
            }

            const form = document.getElementById('productForm');
            if (form.productName) form.productName.value = product.productName;
            if (form.description) form.description.value = product.description;

            if (categorySelect) categorySelect.setValue(product.category._id || product.category);
            if (brandSelect) brandSelect.setValue(product.brand._id || product.brand);

            if (form.status) {
                if (form.status.type === 'checkbox') {
                    form.status.checked = (product.status === 'Active');
                } else {
                    form.status.value = product.status;
                }
            }

            productFeatures = product.features || [];
            variants = product.variants || [];

            if (form) {
                form.dataset.originalProductName = product.productName || '';
                form.dataset.originalDescription = product.description || '';
                form.dataset.originalCategory = product.category?._id || product.category || '';
                form.dataset.originalBrand = product.brand?._id || product.brand || '';
                form.dataset.originalStatus = product.status || 'Active';
                form.dataset.originalFeatures = JSON.stringify(productFeatures || []);
                form.dataset.originalVariants = JSON.stringify((variants || []).map(v => ({
                    type: v.type,
                    value: v.value,
                    basePrice: v.basePrice,
                    salePrice: v.salePrice,
                    stock: v.stock,
                    images: v.images || []
                })));
                form.dataset.originalImages = (product.productImages || []).join('|');
            }

            renderFeatures();
            renderVariants();

            existingImages = product.productImages || [];
            selectedImages = [];
            renderImages();
        }
    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Failed to fetch product', 'error');
    }
}

function editProduct(id) {
    fetchProductData(id);
}

async function toggleProduct(id, currentStatus) {
    const isActive = currentStatus === 'Active';
    const action = isActive ? 'Unlist' : 'List';
    const confirmColor = isActive ? '#ef4444' : '#1dbf4f'; // Red : Green

    const result = await Swal.fire({
        title: `${action} Product?`,
        text: `Are you sure you want to ${action.toLowerCase()} this product?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: confirmColor,
        cancelButtonColor: '#6b7280',
        confirmButtonText: `Yes, ${action}!`
    });

    if (result.isConfirmed) {
        try {
            const { data: json } = await axios.patch(`/api/admin/products/${id}/toggle`);

            if (json.success) {
                await Swal.fire({
                    title: isActive ? 'Unlisted!' : 'Listed!',
                    text: json.message,
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                location.reload();
            } else {
                Swal.fire('Error', json.message, 'error');
            }
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Failed to toggle status', 'error');
        }
    }
}

// ==========================================
// DETAILS PAGE ACTIONS
// ==========================================




async function toggleVariantStatus(productId, variantId, currentStatus) {
    const isActive = currentStatus === 'Active';
    const newStatus = isActive ? 'Inactive' : 'Active';
    const action = isActive ? 'Unlist' : 'List';
    const confirmColor = isActive ? '#ef4444' : '#1dbf4f'; // Red : Green

    const result = await Swal.fire({
        title: `${action} Variant?`,
        text: `Are you sure you want to ${action.toLowerCase()} this variant?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: confirmColor,
        cancelButtonColor: '#6b7280',
        confirmButtonText: `Yes, ${action}!`
    });

    if (result.isConfirmed) {
        try {
            const res = await axios.patch('/api/admin/product/variant/toggle', { productId, variantId, status: newStatus });
            const json = res.data;

            if (json.success) {
                // Dynamic DOM Update (No Reload)
                const statusBadge = document.getElementById(`v-status-${variantId}`);
                const toggleBtn = document.getElementById(`v-btn-${variantId}`);

                if (statusBadge) {
                    statusBadge.className = `status-badge status-${newStatus}`;
                    statusBadge.innerText = newStatus;
                }

                if (toggleBtn) {
                    // Update onclick with new status for next toggle
                    toggleBtn.setAttribute('onclick', `toggleVariantStatus('${productId}', '${variantId}', '${newStatus}')`);
                    toggleBtn.setAttribute('title', isActive ? 'List Variant' : 'Unlist Variant');

                    if (isActive) {
                        // Was Active -> Now Inactive (Show Green List Icon)
                        toggleBtn.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                                viewBox="0 0 24 24" fill="none" stroke="#1dbf4f"
                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="9"></circle>
                                <path d="M9 12l2 2 4-4"></path>
                            </svg>`;
                    } else {
                        // Was Inactive -> Now Active (Show Red Unlist Icon)
                        toggleBtn.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                                viewBox="0 0 24 24" fill="none" stroke="#ef4444"
                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="9"></circle>
                                <line x1="5" y1="5" x2="19" y2="19"></line>
                            </svg>`;
                    }
                }

                await Swal.fire({
                    title: isActive ? 'Unlisted!' : 'Listed!',
                    text: 'Variant status updated.',
                    icon: 'success',
                    timer: 1000,
                    showConfirmButton: false
                });

            } else {
                Swal.fire('Error', json.message, 'error');
            }
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Failed to update status', 'error');
        }
    }
}


