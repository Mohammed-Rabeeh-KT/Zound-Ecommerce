import { showSuccess, showError } from "/utils/swalUtils.js";

/* ------------------------
   Lightweight front-end catchAsync
   ------------------------ */
const catchAsync = (fn) => (...args) => fn(...args).catch((err) => {
    console.error(err);
    showError("Something went wrong");
});

/* ============================
   DOM Ready
   ============================ */
document.addEventListener("DOMContentLoaded", () => {
    // initial load
    safeCall(loadCategories, 1);

    // elements (may be missing during server-side render - guard)
    const searchInput = document.getElementById("searchInput");
    const clearIcon = document.getElementById("clearSearchIcon");

    // debounce
    let debounceTimer;
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            if (clearIcon) clearIcon.style.display = searchInput.value ? "block" : "none";
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => safeCall(loadCategories, 1), 350);
        });
    }

    // global click handler
    document.addEventListener("click", (e) => {
        // clear search icon
        if (e.target.closest && e.target.closest("#clearSearchIcon")) {
            if (searchInput) { searchInput.value = ""; if (clearIcon) clearIcon.style.display = "none"; safeCall(loadCategories, 1); }
            return;
        }

        // pagination
        const pageBtn = e.target.closest && e.target.closest(".page-btn");
        if (pageBtn) {
            const page = Number(pageBtn.dataset.page) || 1;
            safeCall(loadCategories, page);
            return;
        }

        // edit button
        const editBtn = e.target.closest && e.target.closest(".action-btn.edit");
        if (editBtn) {
            openEditModal(editBtn);
            return;
        }

        // toggle list/unlist button
        const toggleBtn = e.target.closest && e.target.closest(".action-btn.toggle-status");
        if (toggleBtn) {
            openToggleModal(toggleBtn);
            return;
        }

        // modal close (data-close attribute)
        const closeBtn = e.target.closest && e.target.closest("[data-close]");
        if (closeBtn) {
            const modalId = closeBtn.getAttribute("data-close");
            const modalEl = document.getElementById(modalId);
            if (modalEl) modalEl.classList.remove("active");
            return;
        }
    });

    // status filter change (if exists)
    const statusSelect = document.getElementById("statusSelect");
    if (statusSelect) statusSelect.addEventListener("change", () => safeCall(loadCategories, 1));

    // add modal open
    const addBtn = document.getElementById("addCategoryBtn");
    if (addBtn) {
        addBtn.addEventListener("click", () => {
            const form = document.getElementById("addCategoryForm");
            if (form) form.reset();
            const status = document.getElementById("addCategoryStatus");
            if (status) status.checked = true;
            const modal = document.getElementById("addCategoryModal");
            if (modal) modal.classList.add("active");
        });
    }

    // add submit
    const addForm = document.getElementById("addCategoryForm");
    if (addForm) addForm.addEventListener("submit", catchAsync(submitAddCategory));

    // edit submit
    const editForm = document.getElementById("editCategoryForm");
    if (editForm) editForm.addEventListener("submit", catchAsync(submitEditCategory));

    // confirm toggle (list/unlist)
    const confirmToggleBtn = document.getElementById("confirmToggleBtn");
    if (confirmToggleBtn) confirmToggleBtn.addEventListener("click", catchAsync(toggleStatusConfirm));
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

/* ============================
   Load Categories
   ============================ */
const DEFAULT_LIMIT = 10;
async function loadCategories(page = 1) {
    // defensive DOM refs
    const searchInput = document.getElementById("searchInput");
    const statusSelect = document.getElementById("statusSelect");

    const search = searchInput ? searchInput.value.trim() : "";
    const status = statusSelect ? statusSelect.value : "";

    const url = `/api/admin/categories/data?page=${page}&search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`;
    const { data: json } = await axios.get(url);

    if (!json || !json.success) {
        showError((json && json.message) ? json.message : "Failed to load categories");
        return;
    }

    const { categories = [], pagination = {} } = json.data || {};
    const pageNum = pagination.page || page;
    const limit = pagination.limit || DEFAULT_LIMIT;
    const total = pagination.totalCategories || (categories.length);

    renderTable(categories, pageNum, limit);
    renderPagination(total, pageNum, limit);
}

/* ============================
   Render Table
   ============================ */
function renderTable(categories, page, limit) {
    const tbody = document.getElementById("categoriesTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!categories || categories.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="no-users">No categories found</td></tr>`;
        return;
    }

    categories.forEach((cat, idx) => {
        const serial = (page - 1) * limit + (idx + 1);
        const desc = escapeAttr(cat.description || "");
        const nameAttr = escapeAttr(cat.name || "");
        const status = !!cat.isListed;

        // build row
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${serial}</td>
            <td>${escapeHtml(cat.name || "")}</td>
            <td class="desc-cell"
                data-description="${escapeAttr(cat.description || '')}"
                onclick="openDescription(this.getAttribute('data-description'))">
                ${escapeHtml(cat.description || "-")}
            </td>
            <td class="product-count-cell">${cat.productCount ?? 0}</td>
            <td><span class="status-badge ${status ? "status-active" : "status-inactive"}">${status ? "active" : "inactive"}</span></td>
            <td>${cat.createdAt ? new Date(cat.createdAt).toLocaleDateString("en-GB") : "-"}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn edit" data-id="${cat._id}" data-name="${nameAttr}" data-description="${desc}" data-status="${status}">
                        ${editIcon()}
                    </button>

                    <button class="action-btn toggle-status" data-id="${cat._id}" data-name="${nameAttr}" data-status="${status}">
                        ${status ? unlistIcon() : listIcon()}
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/* ============================
   Pagination
   ============================ */
function renderPagination(total, page, limit) {
    const container = document.getElementById("paginationContainer");
    if (!container) return;
    container.innerHTML = "";

    const totalPages = Math.ceil(total / limit);
    if (totalPages <= 1) {
        container.style.display = "none";
        return;
    }
    container.style.display = "flex";

    if (page > 1) container.innerHTML += `<button class="page-btn" data-page="${page - 1}">Prev</button>`;
    for (let i = 1; i <= totalPages; i++) {
        container.innerHTML += `<button class="page-btn ${i === page ? "active" : ""}" data-page="${i}">${i}</button>`;
    }
    if (page < totalPages) container.innerHTML += `<button class="page-btn" data-page="${page + 1}">Next</button>`;
}

/* ============================
   Add category
   ============================ */
async function submitAddCategory(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    let originalBtnText = '';

    // Clear previous errors
    const nameErrEl = document.getElementById('addCategoryNameError');
    const descErrEl = document.getElementById('addCategoryDescError');
    if (nameErrEl) nameErrEl.style.display = 'none';
    if (descErrEl) descErrEl.style.display = 'none';

    // Convert FormData to a plain JavaScript object
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Validation
    const nameEmpty = !data.name || !data.name.trim();
    const descEmpty = !data.description || !data.description.trim();

    if (nameEmpty && descEmpty) {
        showError("Please fill all input fields");
        if (nameErrEl) { nameErrEl.innerText = "Category Name is required"; nameErrEl.style.display = "block"; }
        if (descErrEl) { descErrEl.innerText = "Description is required"; descErrEl.style.display = "block"; }
        return;
    }

    let hasError = false;
    if (nameEmpty) {
        if (nameErrEl) { nameErrEl.innerText = "Category Name is required"; nameErrEl.style.display = "block"; }
        hasError = true;
    }
    if (descEmpty) {
        if (descErrEl) { descErrEl.innerText = "Description is required"; descErrEl.style.display = "block"; }
        hasError = true;
    }
    if (hasError) return;

    try {
        // Disable submit button to prevent double submission
        if (submitBtn) {
            originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        }

        // Handle the checkbox status
        const statusEl = document.getElementById("addCategoryStatus");
        data.isListed = statusEl && statusEl.checked ? "on" : "off";

        const res = await axios.post("/api/admin/categories/add", data);
        const json = res.data;

        if (!json || !json.success) {
            const errorMsg = json?.message || 'Failed to add category';
            throw new Error(errorMsg);
        }

        // Success - reset form and update UI
        form.reset();
        const modal = document.getElementById("addCategoryModal");
        if (modal) modal.classList.remove("active");

        showSuccess(json.message || "Category added successfully");
        safeCall(loadCategories, 1);
    } catch (error) {
        console.error('Error adding category:', error);
        const errMsg = error.response?.data?.message || error.message || "Failed to add category. Please try again.";
        showError(errMsg);
    } finally {
        // Re-enable submit button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText || 'Add Category';
        }
    }
}

/* ============================
   Edit category
   ============================ */
function openEditModal(btn) {
    if (!btn) return;
    const id = btn.dataset.id;
    const name = btn.dataset.name || "";
    const description = btn.dataset.description || "";
    const status = (btn.dataset.status === "true");

    const idEl = document.getElementById("editCategoryId");
    const nameEl = document.getElementById("editCategoryName");
    const descEl = document.getElementById("editCategoryDescription");
    const statusEl = document.getElementById("editCategoryStatus");
    const modal = document.getElementById("editCategoryModal");

    if (idEl) idEl.value = id;
    if (nameEl) nameEl.value = unescapeHtmlAttr(name);
    if (descEl) descEl.value = unescapeHtmlAttr(description);
    if (statusEl) statusEl.checked = status;

    const form = document.getElementById("editCategoryForm");
    if (form) {
        form.dataset.originalName = unescapeHtmlAttr(name);
        form.dataset.originalDescription = unescapeHtmlAttr(description);
        form.dataset.originalStatus = status;
    }

    if (modal) modal.classList.add("active");
}

async function submitEditCategory(e) {
    e.preventDefault();
    const id = document.getElementById("editCategoryId").value;
    const formData = new FormData(e.target);
    const statusEl = document.getElementById("editCategoryStatus");
    formData.set("isListed", statusEl && statusEl.checked ? "on" : "off");

    // convert to plain object and send JSON so req.body is defined on server
    const payload = Object.fromEntries(formData.entries());

    // Clear previous errors
    const nameErrEl = document.getElementById('editCategoryNameError');
    const descErrEl = document.getElementById('editCategoryDescError');
    if (nameErrEl) nameErrEl.style.display = 'none';
    if (descErrEl) descErrEl.style.display = 'none';

    // Validation
    const nameEmpty = !payload.name || !payload.name.trim();
    const descEmpty = !payload.description || !payload.description.trim();

    if (nameEmpty && descEmpty) {
        showError("Please fill all input fields");
        if (nameErrEl) { nameErrEl.innerText = "Category Name is required"; nameErrEl.style.display = "block"; }
        if (descErrEl) { descErrEl.innerText = "Description is required"; descErrEl.style.display = "block"; }
        return;
    }

    let hasError = false;
    if (nameEmpty) {
        if (nameErrEl) { nameErrEl.innerText = "Category Name is required"; nameErrEl.style.display = "block"; }
        hasError = true;
    }
    if (descEmpty) {
        if (descErrEl) { descErrEl.innerText = "Description is required"; descErrEl.style.display = "block"; }
        hasError = true;
    }
    if (hasError) return;

    const formEl = document.getElementById("editCategoryForm");
    const originalName = formEl?.dataset.originalName || "";
    const originalDescription = formEl?.dataset.originalDescription || "";
    const originalStatus = formEl?.dataset.originalStatus === "true";

    const currentName = payload.name.trim();
    const currentDescription = payload.description.trim();
    const currentStatus = payload.isListed === "on";

    if (currentName === unescapeHtmlAttr(originalName) && currentDescription === unescapeHtmlAttr(originalDescription) && currentStatus === originalStatus) {
        showError("No changes made. Please update at least one field before saving.");
        return;
    }

    try {
        const { data: json } = await axios.patch(`/api/admin/categories/update/${id}`, payload);

        if (!json || !json.success) {
            showError((json && json.message) ? json.message : "Failed to update");
            return;
        }
        const modal = document.getElementById("editCategoryModal");
        if (modal) modal.classList.remove("active");
        showSuccess("Category updated");
        safeCall(loadCategories, 1);
    } catch (error) {
        console.error('Error updating category:', error);
        const errMsg = error.response?.data?.message || error.message || "Failed to update category. Please try again.";
        showError(errMsg);
    }
}

/* ============================
   Toggle list/unlist via modal
   ============================ */
let currentToggleId = null;
let currentToggleStatus = null;

function openToggleModal(btn) {
    if (!btn) return;
    currentToggleId = btn.dataset.id;
    currentToggleStatus = btn.dataset.status === "true";
    const name = unescapeHtmlAttr(btn.dataset.name || "");

    const modal = document.getElementById("toggleModal");
    if (!modal) return;

    const titleEl = document.getElementById("toggleModalTitle");
    const actionEl = document.getElementById("toggleModalAction");
    const nameEl = document.getElementById("toggleCategoryName");
    const iconEl = document.getElementById("toggleModalIcon");
    const confirmBtn = document.getElementById("confirmToggleBtn");

    if (currentToggleStatus) {
        if (titleEl) titleEl.innerText = "Unlist Category";
        if (actionEl) actionEl.innerText = "unlist";
        if (iconEl) iconEl.innerHTML = redUnlistModalIcon();
        if (confirmBtn) { confirmBtn.innerText = "Unlist"; confirmBtn.className = "btn-delete"; }
    } else {
        if (titleEl) titleEl.innerText = "List Category";
        if (actionEl) actionEl.innerText = "list";
        if (iconEl) iconEl.innerHTML = greenListModalIcon();
        if (confirmBtn) { confirmBtn.innerText = "List"; confirmBtn.className = "btn-delete list"; }
    }

    if (nameEl) nameEl.innerText = name;
    modal.classList.add("active");
}

async function toggleStatusConfirm() {
    if (!currentToggleId) { showError("No category selected"); return; }

    try {
        const { data: json } = await axios.patch(`/api/admin/categories/toggle-status/${currentToggleId}`);

        const modal = document.getElementById("toggleModal");
        if (modal) modal.classList.remove("active");

        if (!json || !json.success) {
            showError((json && json.message) ? json.message : "Action failed");
            return;
        }

        showSuccess(json.message || "Action successful");
        safeCall(loadCategories, 1);
    } catch (error) {
        console.error('Error toggling category status:', error);
        showError(error.response?.data?.message || "Failed to conditionally toggle category.");
    }
}

/* ============================
   Description popup
   ============================ */
window.openDescription = function (text) {
    const decoded = text
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#10;/g, "\n");

    document.getElementById("fullDescText").innerText = decoded;
    document.getElementById("descModal").classList.add("active");
};
window.closeDescModal = function () {
    const modal = document.getElementById("descModal");
    if (modal) modal.classList.remove("active");
};

/* ============================
   Helpers & XSS-safe utilities
   ============================ */
function escapeHtml(str = "") {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
function escapeAttr(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "&#10;"); // FIX newline break
}

function unescapeHtmlAttr(str = "") {
    // reverse of escapeAttr for filling inputs (only simple)
    return String(str).replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

/* ============================
   SVG helpers
   ============================ */
function editIcon() {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
        viewBox="0 0 24 24" fill="none" stroke="#1e3a5f"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20h9"></path>
        <path d="M16.5 3.5l4 4L7 21H3v-4z"></path>
    </svg>`;
}

function unlistIcon() {
    return `
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
    viewBox="0 0 24 24" fill="none" stroke="#ef4444"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"></circle>
    <line x1="5" y1="5" x2="19" y2="19"></line>
</svg>
`
}

function listIcon() {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
        viewBox="0 0 24 24" fill="none" stroke="#1dbf4f"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9"></circle>
        <path d="M9 12l2 2 4-4"></path>
    </svg>`;
}

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
