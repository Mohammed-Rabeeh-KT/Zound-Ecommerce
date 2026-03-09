import { showSuccess, showError } from "/utils/swalUtils.js";

const catchAsync = (fn) => (...args) => fn(...args).catch((err) => {
    console.error(err);
    showError("Something went wrong");
});

// Global Cropper Variables
let cropper = null;
let currentInput = null;
let currentDropZone = null;
let currentToggleId = null;

document.addEventListener("DOMContentLoaded", () => {
    safeCall(loadBrands, 1);

    // -- Search & Filter --
    const searchInput = document.getElementById("searchInput");
    let debounceTimer;

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            const clearIcon = document.getElementById("clearSearchIcon");
            if (clearIcon) clearIcon.style.display = searchInput.value ? "block" : "none";
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => safeCall(loadBrands, 1), 350);
        });
    }

    // -- Global Click Handler --
    document.addEventListener("click", (e) => {
        if (e.target.closest("#clearSearchIcon")) {
            if (searchInput) {
                searchInput.value = "";
                document.getElementById("clearSearchIcon").style.display = "none";
                safeCall(loadBrands, 1);
            }
            return;
        }

        const pageBtn = e.target.closest(".page-btn");
        if (pageBtn) {
            safeCall(loadBrands, Number(pageBtn.dataset.page) || 1);
            return;
        }

        const editBtn = e.target.closest(".action-btn.edit");
        if (editBtn) {
            openEditModal(editBtn.dataset.id);
            return;
        }

        const toggleBtn = e.target.closest(".action-btn.toggle-status");
        if (toggleBtn) {
            openToggleModal(toggleBtn);
            return;
        }

        const closeBtn = e.target.closest("[data-close]");
        if (closeBtn) {
            const modalId = closeBtn.getAttribute("data-close");
            document.getElementById(modalId)?.classList.remove("active");

            // If closing cropper, destroy instance
            if (modalId === 'cropperModal' && cropper) {
                cropper.destroy();
                cropper = null;
                // Clear input if cancelled so user can re-select same file
                if (currentInput) currentInput.value = "";
            }
            return;
        }
    });

    // -- Status Filter --
    const statusSelect = document.getElementById("statusSelect");
    if (statusSelect) statusSelect.addEventListener("change", () => safeCall(loadBrands, 1));

    // -- Setup Premium Drop Zones with Cropper --
    setupDropZone("#addBrandDropZone", "#addBrandFile");
    setupDropZone("#editBrandDropZone", "#editBrandFile");

    // -- Add Brand Modal --
    const addBtn = document.getElementById("addBrandBtn");
    if (addBtn) {
        addBtn.addEventListener("click", () => {
            document.getElementById("addBrandForm").reset();
            resetDropZone("#addBrandDropZone");
            document.getElementById("addBrandModal").classList.add("active");
        });
    }

    // -- Form Submits --
    const addForm = document.getElementById("addBrandForm");
    if (addForm) addForm.addEventListener("submit", catchAsync(submitAddBrand));

    const editForm = document.getElementById("editBrandForm");
    if (editForm) editForm.addEventListener("submit", catchAsync(submitEditBrand));

    // -- Confirm Toggle --
    const confirmToggleBtn = document.getElementById("confirmToggleBtn");
    if (confirmToggleBtn) confirmToggleBtn.addEventListener("click", catchAsync(toggleStatusConfirm));

    // -- Crop Button Logic --
    document.getElementById("cropImageBtn").addEventListener("click", performCrop);
});

/* ============================
   Helpers
   ============================ */
function safeCall(fn, ...args) {
    return Promise.resolve().then(() => fn(...args)).catch((err) => {
        console.error(err);
        showError("Unexpected error");
    });
}

function resetDropZone(selector) {
    const dropZone = document.querySelector(selector);
    const thumb = dropZone.querySelector(".drop-zone-thumb");
    const prompt = dropZone.querySelector(".drop-zone-prompt");
    if (thumb) {
        thumb.style.backgroundImage = 'none';
        thumb.style.display = 'none';
    }
    if (prompt) prompt.style.display = 'flex';
}

/* ============================
   Load Brands & Render
   ============================ */
async function loadBrands(page = 1) {
    const search = document.getElementById("searchInput")?.value.trim() || "";
    const status = document.getElementById("statusSelect")?.value || "";

    const url = `/api/admin/brands/data?page=${page}&search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`;
    const { data: json } = await axios.get(url);

    if (!json.success) return showError(json.message);

    renderTable(json.data.brands, json.data.pagination.page, json.data.pagination.limit);
    renderPagination(json.data.pagination.totalBrands, json.data.pagination.page, json.data.pagination.limit);
}

function renderTable(brands, page, limit) {
    const tbody = document.getElementById("brandsTableBody");
    tbody.innerHTML = "";
    if (!brands.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">No brands found</td></tr>`;
        return;
    }

    brands.forEach((brand, idx) => {
        const logoUrl = brand.logo || '/images/placeholder.jpg';
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${(page - 1) * limit + (idx + 1)}</td>
            <td><img src="${logoUrl}" class="brand-logo-img"></td>
            <td>${brand.brandName}</td>
            <td class="text-center">${brand.productCount || 0}</td>
            <td><span class="status-badge ${brand.isListed ? "status-listed" : "status-unlisted"}">${brand.isListed ? "Listed" : "Unlisted"}</span></td>
            <td>${new Date(brand.createdAt).toLocaleDateString("en-GB")}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" data-id="${brand._id}">${editIcon()}</button>
                    <button class="action-btn toggle-status" data-id="${brand._id}" data-name="${brand.brandName}" data-status="${brand.isListed}">${brand.isListed ? unlistIcon() : listIcon()}</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderPagination(total, page, limit) {
    const container = document.getElementById("paginationContainer");
    container.innerHTML = "";
    const totalPages = Math.ceil(total / limit);
    if (totalPages <= 1) {
        container.style.display = "none";
        return;
    }
    container.style.display = "flex";

    // Simple pagination logic
    if (page > 1) container.innerHTML += `<button class="page-btn" data-page="${page - 1}">Prev</button>`;
    for (let i = 1; i <= totalPages; i++) container.innerHTML += `<button class="page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    if (page < totalPages) container.innerHTML += `<button class="page-btn" data-page="${page + 1}">Next</button>`;
}

/* ============================
   Add / Edit Logic
   ============================ */
async function submitAddBrand(e) {
    e.preventDefault();

    // Clear previous errors
    clearInlineErrors();

    const formData = new FormData(e.target);
    const statusEl = e.target.querySelector("input[name='isListed']");
    formData.set("isListed", statusEl && statusEl.checked ? "on" : "off");

    try {
        const { data: json } = await axios.post("/api/admin/brands", formData);

        if (!json.success) {
            // Show inline errors based on the error message
            showInlineError(json.message);
            return showError(json.message);
        }

        document.getElementById("addBrandModal").classList.remove("active");
        showSuccess("Brand added");
        safeCall(loadBrands, 1);
    } catch (error) {
        console.error('Error adding brand:', error);

        // Show inline errors for validation failures
        const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Something went wrong';
        showInlineError(errorMessage);
        showError(errorMessage);
    }
}

async function openEditModal(id) {
    const { data: json } = await axios.get(`/api/admin/brands/${id}`);
    if (!json.success) return showError("Error fetching brand");

    const brand = json.data;
    document.getElementById("editBrandId").value = brand._id;
    document.getElementById("editBrandName").value = brand.brandName;

    const statusEl = document.getElementById("editBrandStatus");
    if (statusEl) statusEl.checked = brand.isListed;

    const dropZone = document.querySelector("#editBrandDropZone");
    const thumb = dropZone.querySelector(".drop-zone-thumb");
    const prompt = dropZone.querySelector(".drop-zone-prompt");

    if (brand.logo) {
        thumb.style.display = "block";
        thumb.style.backgroundImage = `url('${brand.logo}')`;
        prompt.style.display = "none";
    } else {
        thumb.style.display = "none";
        prompt.style.display = "flex";
    }

    const form = document.getElementById("editBrandForm");
    if (form) {
        form.dataset.originalName = brand.brandName;
        form.dataset.originalStatus = brand.isListed;
    }

    document.getElementById("editBrandModal").classList.add("active");
}

async function submitEditBrand(e) {
    e.preventDefault();
    // Clear previous errors
    clearInlineErrors();
    // Rest of your code remains the same
    const id = document.getElementById("editBrandId").value;
    const formData = new FormData(e.target);
    const statusEl = document.getElementById("editBrandStatus");
    formData.set("isListed", statusEl && statusEl.checked ? "on" : "off");

    const formEl = document.getElementById("editBrandForm");
    const originalName = formEl?.dataset.originalName || "";
    const originalStatus = formEl?.dataset.originalStatus === "true";

    const currentName = document.getElementById("editBrandName").value.trim();
    const currentStatus = (statusEl && statusEl.checked);
    const hasImage = document.getElementById("editBrandFile")?.files?.length > 0;

    if (!hasImage && currentName === originalName && currentStatus === originalStatus) {
        showError("No changes made. Please update at least one field before saving.");
        return;
    }

    try {
        const { data: json } = await axios.patch(`/api/admin/brands/update/${id}`, formData);

        if (!json.success) {
            // Show inline errors based on the error message
            showInlineError(json.message);
            return showError(json.message);
        }

        document.getElementById("editBrandModal").classList.remove("active");
        showSuccess("Brand updated");
        safeCall(loadBrands, 1);
    } catch (error) {
        console.error('Error updating brand:', error);

        // Show inline errors for validation failures
        const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Something went wrong';
        showInlineError(errorMessage);
        showError(errorMessage);
    }
}

/* ============================
   Cropper & Drop Zone Logic
   ============================ */
function setupDropZone(zoneSelector, inputSelector) {
    const dropZone = document.querySelector(zoneSelector);
    const input = document.querySelector(inputSelector);

    if (!dropZone || !input) return;

    dropZone.addEventListener("click", () => input.click());

    input.addEventListener("change", (e) => {
        if (input.files && input.files[0]) {
            handleFileSelect(input.files[0], zoneSelector, input);
        }
    });

    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("drop-zone--over");
    });

    ["dragleave", "dragend"].forEach(type => {
        dropZone.addEventListener(type, () => dropZone.classList.remove("drop-zone--over"));
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("drop-zone--over");
        if (e.dataTransfer.files.length) {
            handleFileSelect(e.dataTransfer.files[0], zoneSelector, input);
        }
    });
}

function handleFileSelect(file, zoneSelector, inputElement) {
    // Validate Image
    if (!file.type.startsWith('image/')) {
        showError("Please select an image file");
        return;
    }

    // Set globals for the crop function to use
    currentInput = inputElement;
    currentDropZone = document.querySelector(zoneSelector);

    // Read file for Cropper
    const reader = new FileReader();
    reader.onload = (e) => {
        const image = document.getElementById('imageToCrop');
        image.src = e.target.result;

        // Open Cropper Modal
        document.getElementById("cropperModal").classList.add("active");

        // Initialize Cropper
        if (cropper) cropper.destroy();
        cropper = new Cropper(image, {
            aspectRatio: 1, // Force square for logos (optional)
            viewMode: 1,
            autoCropArea: 1,
        });
    };
    reader.readAsDataURL(file);
}

function performCrop() {
    if (!cropper) return;

    // Get cropped canvas
    const canvas = cropper.getCroppedCanvas({
        width: 300, // Resize to consistent width
        height: 300 // Resize to consistent height
    });

    // Convert to Blob
    canvas.toBlob((blob) => {
        // Create new File object
        const fileName = 'cropped-brand-logo.jpg';
        const croppedFile = new File([blob], fileName, { type: 'image/jpeg' });

        // Update the Input File List (Using DataTransfer)
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(croppedFile);
        currentInput.files = dataTransfer.files;

        // Update Thumbnail
        updateThumbnail(currentDropZone, croppedFile);

        // Close Cropper
        document.getElementById("cropperModal").classList.remove("active");
        cropper.destroy();
        cropper = null;
    }, 'image/jpeg');
}

function updateThumbnail(dropZone, file) {
    let thumb = dropZone.querySelector(".drop-zone-thumb");
    let prompt = dropZone.querySelector(".drop-zone-prompt");

    if (prompt) prompt.style.display = "none";
    if (thumb) {
        thumb.style.display = "block";
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            thumb.style.backgroundImage = `url('${reader.result}')`;
        };
    }
}

/* ============================
   Toggle & Icons
   ============================ */

function openToggleModal(btn) {
    currentToggleId = btn.dataset.id;
    const isListed = btn.dataset.status === "true";
    document.getElementById("toggleBrandName").innerText = btn.dataset.name;

    const titleEl = document.getElementById("toggleModalTitle");
    const confirmBtn = document.getElementById("confirmToggleBtn");
    const iconEl = document.getElementById("toggleModalIcon");

    if (isListed) {
        titleEl.innerText = "Unlist Brand";
        document.getElementById("toggleModalAction").innerText = "unlist";
        iconEl.innerHTML = redUnlistModalIcon();
        confirmBtn.innerText = "Unlist";
        confirmBtn.className = "btn-delete";
    } else {
        titleEl.innerText = "List Brand";
        document.getElementById("toggleModalAction").innerText = "list";
        iconEl.innerHTML = greenListModalIcon();
        confirmBtn.innerText = "List";
        confirmBtn.className = "btn-delete list";
    }
    document.getElementById("toggleModal").classList.add("active");
}

async function toggleStatusConfirm() {
    if (!currentToggleId) return;
    const { data: json } = await axios.patch(`/api/admin/brands/${currentToggleId}/toggle`);
    document.getElementById("toggleModal").classList.remove("active");
    if (!json.success) return showError("Action failed");
    showSuccess(json.message);
    safeCall(loadBrands, 1);
}

function editIcon() { return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5l4 4L7 21H3v-4z"></path></svg>`; }
function unlistIcon() { return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><line x1="5" y1="5" x2="19" y2="19"></line></svg>`; }
function listIcon() { return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1dbf4f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M9 12l2 2 4-4"></path></svg>`; }
function redUnlistModalIcon() {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#dc3545" fill-opacity="0.15"/>
        
        <path d="M12 8V12" stroke="#dc3545" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 16H12.01" stroke="#dc3545" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
}

function greenListModalIcon() {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#1dbf4f" fill-opacity="0.15"/>
        
        <path d="M8 12L11 15L16 9" stroke="#1dbf4f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
}

/* ============================
   Inline Error Handling
   ============================ */
function clearInlineErrors() {
    // Clear all inline error messages
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(element => {
        element.style.display = 'none';
        element.textContent = '';
    });
}

function showInlineError(errorMessage) {
    // Clear previous errors first
    clearInlineErrors();

    // Show error based on message content
    if (errorMessage.toLowerCase().includes('brand name') || errorMessage.toLowerCase().includes('name')) {
        const nameError = document.getElementById('addBrandNameError') || document.getElementById('editBrandNameError');
        if (nameError) {
            nameError.textContent = errorMessage;
            nameError.style.display = 'block';
        }
    }

    if (errorMessage.toLowerCase().includes('logo') || errorMessage.toLowerCase().includes('image')) {
        const logoError = document.getElementById('addBrandLogoError') || document.getElementById('editBrandLogoError');
        if (logoError) {
            logoError.textContent = errorMessage;
            logoError.style.display = 'block';
        }
    }

    // For duplicate errors, show under name field
    if (errorMessage.toLowerCase().includes('already exists') || errorMessage.toLowerCase().includes('duplicate')) {
        const nameError = document.getElementById('addBrandNameError') || document.getElementById('editBrandNameError');
        if (nameError) {
            nameError.textContent = errorMessage;
            nameError.style.display = 'block';
        }
    }
}

// Clear inline errors when user starts typing
document.addEventListener('DOMContentLoaded', () => {
    // Add brand form
    const addNameInput = document.getElementById('addBrandNameInput') || document.querySelector('#addBrandForm input[name="brandName"]');
    const addLogoInput = document.getElementById('addBrandFile');

    if (addNameInput) {
        addNameInput.addEventListener('input', () => {
            const nameError = document.getElementById('addBrandNameError');
            if (nameError) {
                nameError.style.display = 'none';
                nameError.textContent = '';
            }
        });
    }

    if (addLogoInput) {
        addLogoInput.addEventListener('change', () => {
            const logoError = document.getElementById('addBrandLogoError');
            if (logoError) {
                logoError.style.display = 'none';
                logoError.textContent = '';
            }
        });
    }

    // Edit brand form
    const editNameInput = document.getElementById('editBrandName');
    const editLogoInput = document.getElementById('editBrandFile');

    if (editNameInput) {
        editNameInput.addEventListener('input', () => {
            const nameError = document.getElementById('editBrandNameError');
            if (nameError) {
                nameError.style.display = 'none';
                nameError.textContent = '';
            }
        });
    }

    if (editLogoInput) {
        editLogoInput.addEventListener('change', () => {
            const logoError = document.getElementById('editBrandLogoError');
            if (logoError) {
                logoError.style.display = 'none';
                logoError.textContent = '';
            }
        });
    }
});